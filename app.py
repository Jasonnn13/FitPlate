import os
from functools import wraps
from datetime import datetime, timedelta, date 
import uuid 
import json # For parsing JSON string from FormData

import firebase_admin
from firebase_admin import credentials, auth, firestore
from flask import Flask, jsonify, request, session, abort
from flask_cors import CORS
from dotenv import load_dotenv
from pydantic import FilePath
import requests 
import cloudinary
import cloudinary.uploader
import cloudinary.api

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)

# --- Flask App Configuration ---
app.config['SECRET_KEY'] = os.environ.get("FLASK_SECRET_KEY")
if not app.config['SECRET_KEY']:
    app.logger.warning("FLASK_SECRET_KEY is not set. Sessions will not be secure and might not work.")
    # In a production environment, you might want to exit or use a default but warn heavily.
    # For development, a placeholder can be used, but it's not secure.
    app.config['SECRET_KEY'] = 'dev-secret-key-replace-for-prod' 


app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7) # Example: 7 days

# --- CORS Configuration ---
NEXTJS_URL = os.environ.get("NEXTJS_FRONTEND_URL", "http://localhost:3000")
CORS(
    app,
    origins=[NEXTJS_URL], # Pass NEXTJS_URL as a list with one item, or origins_list if multiple
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"], # Explicitly list allowed methods
    headers=["Content-Type", "Authorization"], # Explicitly list allowed headers client can send
    supports_credentials=True,
    expose_headers=["Content-Type", "Authorization"] # Headers client can read from response
)

try:
    from google.cloud.firestore_v1.field_path import FieldPath as FirestoreFieldPath
except ImportError:
    # Handle case where library might not be installed or if using firebase-admin's FieldPath
    # For firebase-admin, it would be something like:
    # from firebase_admin.firestore import FieldPath as FirestoreFieldPath
    FirestoreFieldPath = None 
    app.logger.error("Failed to import FirestoreFieldPath. Ensure google-cloud-firestore or firebase-admin is installed and configured.")

# --- Firebase Admin SDK Initialization ---
db = None # Initialize db to None
firebase_app = None # Initialize firebase_app to None
try:
    cred_path = os.environ.get("FIREBASE_SERVICE_ACCOUNT_KEY_PATH")
    if not cred_path:
        raise ValueError("FIREBASE_SERVICE_ACCOUNT_KEY_PATH environment variable not set.")
    if not os.path.exists(cred_path):
        raise FileNotFoundError(f"Firebase service account key file not found at: {cred_path}")

    cred = credentials.Certificate(cred_path)
    firebase_app = firebase_admin.initialize_app(cred) # Store the app instance
    db = firestore.client() # Assign db client after successful initialization
    app.logger.info("Firebase Admin SDK initialized successfully.")
except Exception as e:
    app.logger.error(f"CRITICAL: Error initializing Firebase Admin SDK: {e}")
    # db remains None, endpoints relying on it should check

# --- Firebase Web API Key ---
FIREBASE_WEB_API_KEY = os.environ.get("FIREBASE_WEB_API_KEY")
if not FIREBASE_WEB_API_KEY:
    app.logger.warning("FIREBASE_WEB_API_KEY is not set. Some auth operations (like password reset, email verification) might fail if they rely on REST API calls that need it.")

# --- Cloudinary Configuration ---
try:
    cloudinary.config( 
        cloud_name = os.environ.get("CLOUDINARY_CLOUD_NAME"), 
        api_key = os.environ.get("CLOUDINARY_API_KEY"), 
        api_secret = os.environ.get("CLOUDINARY_API_SECRET"),
        secure=True # Recommended
    )
    app.logger.info("Cloudinary SDK configured successfully.")
except Exception as e:
    app.logger.error(f"CRITICAL: Error configuring Cloudinary SDK: {e}. Image uploads will fail.")

# --- Authentication Decorator ---
def firebase_auth_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not db or not firebase_app: # Check firebase_app as well
            app.logger.error("Attempted to access protected route, but Firebase Admin SDK not initialized.")
            return jsonify({"error": "Backend server configuration error. Please try again later."}), 503

        id_token = None
        if 'firebase_id_token' in session:
            id_token = session['firebase_id_token']
            app.logger.debug("Token found in session.")
        else:
            auth_header = request.headers.get('Authorization')
            if auth_header and auth_header.startswith('Bearer '):
                id_token = auth_header.split('Bearer ')[1]
                app.logger.debug("Token found in Authorization header (stateless attempt).")
            else:
                app.logger.debug("No token found in session or Authorization header.")
                return jsonify({"error": "Unauthorized: Authentication token not provided"}), 401

        if not id_token: # Should be caught above, but as a safeguard
            return jsonify({"error": "Unauthorized: Authentication token not available"}), 401

        try:
            decoded_token = auth.verify_id_token(id_token, app=firebase_app) # Pass the app instance
            request.user = decoded_token # Attach decoded token to request
            app.logger.debug(f"Token successfully verified for UID: {decoded_token.get('uid')}")
        except firebase_admin.auth.ExpiredIdTokenError:
            app.logger.warning("Expired ID token received.")
            if 'firebase_id_token' in session: session.pop('firebase_id_token', None)
            return jsonify({"error": "Unauthorized: Token has expired. Please log in again."}), 401
        except firebase_admin.auth.FirebaseAuthError as e:
            app.logger.error(f"Firebase auth error during token verification: {e}")
            if 'firebase_id_token' in session: session.pop('firebase_id_token', None)
            return jsonify({"error": "Unauthorized: Invalid Firebase ID token", "details": str(e)}), 401
        except Exception as e:
            app.logger.error(f"Unexpected token verification error: {e}")
            return jsonify({"error": "Unauthorized: Token verification failed", "details": str(e)}), 401
        return f(*args, **kwargs)
    return decorated_function

# --- Helper Functions ---

def get_float_from_data(data_dict, key, default=0.0):
    """Safely get a float value from a dictionary, handling None or non-numeric."""
    val = data_dict.get(key)
    if val is None: return default
    try: return float(val)
    except (ValueError, TypeError): 
        app.logger.warning(f"Invalid numeric value for '{key}': {val} in data. Defaulting to {default}.")
        return default

def get_author_display_name(author_uid):
    if not db:
        app.logger.warning(f"Firestore not available, cannot fetch display name for UID {author_uid}")
        return "Unknown Author"
    try:
        user_profile = get_user_profile_and_ensure_daily_reset(author_uid)
        if user_profile and user_profile.get("displayName"):
            return user_profile.get("displayName")
        elif user_profile and user_profile.get("username"):
            return user_profile.get("username")
        auth_user = auth.get_user(author_uid, app=firebase_app)
        if auth_user and auth_user.display_name:
            return auth_user.display_name
        if auth_user and auth_user.email:
            return auth_user.email.split('@')[0] # Fallback to email prefix
        return "User " + author_uid[:6] # Generic fallback
    except Exception as e:
        app.logger.error(f"Error fetching author display name for UID {author_uid}: {e}")
        return "Unknown Author"
    
def get_current_user_id():
    if hasattr(request, 'user') and request.user:
        return request.user.get('uid')
    return None

def get_user_profile_and_ensure_daily_reset(uid):

    if not db: 
        app.logger.error("get_user_profile_and_ensure_daily_reset: Firestore client not available.")
        return None

    user_doc_ref = db.collection('user').document(uid)
    
    @firestore.transactional # Use a transaction for atomic read and conditional write
    def _update_in_transaction(transaction, user_ref_for_tx):
        user_snapshot = user_ref_for_tx.get(transaction=transaction)
        if not user_snapshot.exists:
            app.logger.warning(f"User profile not found for UID: {uid} within transaction.")
            return None # Or raise an exception

        user_data_tx = user_snapshot.to_dict()
        today_str = date.today().isoformat()
        last_activity_date_str = user_data_tx.get('lastActivityDate')

        # Initialize daily fields if they don't exist (for older users)
        daily_fields_to_ensure = {
            'caloriesToday': 0, 'consumedToday': [], 'proteinToday': 0.0, 'fatToday': 0.0,
            'carbsToday': 0.0, 'cholesterolToday': 0.0, 'sodiumToday': 0.0,
            'potassiumToday': 0.0, 'ironToday': 0.0
        }
        needs_initialization_update = False
        for field, default_value in daily_fields_to_ensure.items():
            if field not in user_data_tx:
                user_data_tx[field] = default_value # Update local dict
                needs_initialization_update = True
        
        if last_activity_date_str != today_str or needs_initialization_update:
            app.logger.info(f"Daily reset or initialization for user {uid}. Last: {last_activity_date_str}, Today: {today_str}")
            
            fields_to_update_in_db = {
                'caloriesToday': 0, 'consumedToday': [], 'proteinToday': 0.0, 'fatToday': 0.0,
                'carbsToday': 0.0, 'cholesterolToday': 0.0, 'sodiumToday': 0.0,
                'potassiumToday': 0.0, 'ironToday': 0.0,
                'lastActivityDate': today_str, 'updatedAt': firestore.SERVER_TIMESTAMP
            }
            # If only initialization was needed but day is same, preserve existing values
            if last_activity_date_str == today_str and needs_initialization_update and not (last_activity_date_str != today_str):
                for key in daily_fields_to_ensure:
                    if key in user_data_tx: # Preserve existing values if day is the same but fields were missing
                        fields_to_update_in_db[key] = user_data_tx[key]
                fields_to_update_in_db['lastActivityDate'] = last_activity_date_str # Keep old date if it's same day
            
            transaction.update(user_ref_for_tx, fields_to_update_in_db)
            app.logger.info(f"User {uid} daily consumption data updated/reset in Firestore transaction.")
            
            # Update user_data_tx to reflect these resets for the current response
            for key, value in fields_to_update_in_db.items():
                if key != 'updatedAt': user_data_tx[key] = value
        
        return user_data_tx

    try:
        transaction = db.transaction()
        final_user_data = _update_in_transaction(transaction, user_doc_ref)
        return final_user_data
    except Exception as e_tx:
        app.logger.error(f"Transaction failed for user {uid} daily reset: {e_tx}")
        user_doc_fallback = user_doc_ref.get()
        if user_doc_fallback.exists: return user_doc_fallback.to_dict()
        return None


DEFAULT_CALORIE_GOAL_VALUE = 2240 # Define default for global use

# --- Error Handlers ---
@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not Found", "message": "The requested URL was not found on the server."}), 404

@app.errorhandler(500)
def server_error(error):
    app.logger.error(f"Server Error: {error} at {request.url}")
    return jsonify({"error": "Internal Server Error", "message": "An unexpected error occurred on the server."}), 500

@app.errorhandler(400)
def bad_request(error):
    message = str(error.description if hasattr(error, 'description') else error)
    return jsonify({"error": "Bad Request", "message": message}), 400

@app.errorhandler(503) # Service unavailable
def service_unavailable(error):
    message = str(error.description if hasattr(error, 'description') else error)
    return jsonify({"error": "Service Unavailable", "message": message}), 503

@app.errorhandler(401) # Unauthorized
def unauthorized(error):
    message = str(error.description if hasattr(error, 'description') else "Unauthorized")
    return jsonify({"error": "Unauthorized", "message": message}), 401

@app.errorhandler(403) # Forbidden
def forbidden(error):
    message = str(error.description if hasattr(error, 'description') else "Forbidden")
    return jsonify({"error": "Forbidden", "message": message}), 403


# --- API ---

@app.route('/api/health', methods=['GET'])
def health_check():
    if not db or not firebase_app:
        return jsonify({"status": "error", "message": "Firebase Admin SDK not initialized. Backend is not healthy."}), 503
    return jsonify({"status": "ok", "message": "Flask backend is running and Firebase SDK is initialized."}), 200

# --- Authentication Endpoints ---
@app.route('/api/auth/register', methods=['POST'])
def register_user():
    if not db or not firebase_app: return jsonify({"error": "Authentication service not ready."}), 503
    data = request.get_json()
    if not data: return jsonify({"error": "Request body is missing JSON."}), 400
    
    email = data.get('email')
    password = data.get('password')
    display_name = data.get('displayName')
    username = data.get('username')

    if not email or not password: return jsonify({"error": "Email and password are required"}), 400
    
    if not username: username = email.split('@')[0] + uuid.uuid4().hex[:4]

    try:
        user_record = auth.create_user(email=email, password=password, display_name=display_name, app=firebase_app)
        app.logger.info(f"User created successfully in Firebase Auth: {user_record.uid}")

        user_profile_data = {
            'uid': user_record.uid, 'email': user_record.email, 'username': username,
            'displayName': user_record.display_name or username,
            'createdAt': firestore.SERVER_TIMESTAMP, 'lastActivityDate': date.today().isoformat(),
            'dailyCalorieGoal': DEFAULT_CALORIE_GOAL_VALUE,
            'caloriesToday': 0, 'consumedToday': [], 
            'proteinToday': 0.0, 'fatToday': 0.0, 'carbsToday': 0.0,
            'cholesterolToday': 0.0, 'sodiumToday': 0.0, 
            'potassiumToday': 0.0, 'ironToday': 0.0,
            'favouriteRecipes': [], 'recipeMade': []
        }
        db.collection('user').document(user_record.uid).set(user_profile_data)
        app.logger.info(f"User profile created in Firestore for UID: {user_record.uid}")
        return jsonify({"message": "User registered successfully. Please log in.", "uid": user_record.uid}), 201
    except firebase_admin.auth.EmailAlreadyExistsError:
        return jsonify({"error": "Email already exists"}), 409
    except Exception as e_reg:
        app.logger.error(f"Error during registration: {e_reg}")
        return jsonify({"error": "Registration failed.", "details": str(e_reg)}), 500


@app.route('/api/auth/login', methods=['POST'])
def session_login():
    if not db or not firebase_app: return jsonify({"error": "Authentication service not ready."}), 503
    if not FIREBASE_WEB_API_KEY:
        app.logger.error("CRITICAL: FIREBASE_WEB_API_KEY is not set. Cannot perform password-based login via REST API.")
        return jsonify({"error": "Server configuration error affecting authentication"}), 500

    data = request.get_json()
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"error": "Email and password are required"}), 400

    email = data.get('email')
    password = data.get('password')
    
    rest_api_url = f"https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={FIREBASE_WEB_API_KEY}"
    payload = {"email": email, "password": password, "returnSecureToken": True}

    try:
        response = requests.post(rest_api_url, json=payload, timeout=10)
        response.raise_for_status() # Raises HTTPError for bad responses (4xx or 5xx)
        response_data = response.json()

        if 'idToken' in response_data:
            session['firebase_id_token'] = response_data['idToken']
            session.permanent = True # Use app.config['PERMANENT_SESSION_LIFETIME']
            app.logger.info(f"User {response_data.get('email')} logged in successfully. Session created.")

            firebase_uid = response_data.get('localId')
            user_profile_data = get_user_profile_and_ensure_daily_reset(firebase_uid)

            if not user_profile_data:
                app.logger.warning(f"User UID {firebase_uid} authenticated but no profile found in Firestore. Attempting to create one.")
                auth_user_info = auth.get_user(firebase_uid, app=firebase_app)
                new_profile_data = {
                    'email': auth_user_info.email,
                    'username': (auth_user_info.email.split('@')[0] + uuid.uuid4().hex[:4]) if auth_user_info.email else "user_" + firebase_uid[:6],
                    'displayName': auth_user_info.display_name,
                    'uid': firebase_uid,
                    'createdAt': firestore.SERVER_TIMESTAMP,
                    'caloriesToday': 0,
                    'fatToday': 0, # Default value
                    'proteinToday': 0, # Default value
                    'ironToday': 0, # Default value
                    'cholesterolToday': 0, # Default value
                    'sodiumToday': 0, # Default value
                    'potassiumToday': 0, # Default value
                    'consumedToday': [],
                    'favouriteRecipes': [],
                    'recipeMade': []
                }
                try:
                    db.collection('user').document(firebase_uid).set(new_profile_data)
                    user_profile_data = new_profile_data
                    app.logger.info(f"Successfully created missing Firestore profile for UID {firebase_uid} upon login.")
                except Exception as e_fs_create:
                    app.logger.error(f"Failed to create missing Firestore profile for UID {firebase_uid} upon login: {e_fs_create}")
                    user_profile_data = {
                        "uid": firebase_uid,
                        "email": auth_user_info.email,
                        "displayName": auth_user_info.display_name
                    }


            return jsonify({"message": "Login successful", "user": user_profile_data, "token": response_data['idToken']}), 200
        else:
            app.logger.warning(f"Firebase REST API login issue for {email}: 'idToken' not in response. Data: {response_data}")
            return jsonify({"error": "Authentication failed, idToken not received."}), 401

    except requests.exceptions.HTTPError as http_err:
        error_details = "Invalid credentials or Firebase error."
        status_code = 500 # Default status code
        if http_err.response is not None:
            status_code = http_err.response.status_code
            try:
                error_response_data = http_err.response.json()
                firebase_error_message = error_response_data.get("error", {}).get("message", "")
                if firebase_error_message == "INVALID_LOGIN_CREDENTIALS" or firebase_error_message == "INVALID_PASSWORD" or firebase_error_message == "EMAIL_NOT_FOUND":
                    error_details = "Invalid email or password."
                    status_code = 401 # Unauthorized for bad credentials
                elif firebase_error_message:
                    error_details = f"Firebase Auth Error: {firebase_error_message}"
            except ValueError: # If response is not JSON
                error_details = f"HTTP Error {status_code}. Could not parse error response."
        
        app.logger.warning(f"Firebase REST API login failed for {email}: {error_details} (Status: {status_code})")
        return jsonify({"error": error_details}), status_code
    except requests.exceptions.RequestException as e: # Timeout, connection error, etc.
        app.logger.error(f"Request to Firebase REST API failed: {e}")
        return jsonify({"error": "Failed to connect to authentication service. Please try again later."}), 503


@app.route('/api/auth/logout', methods=['POST'])
@firebase_auth_required 
def session_logout():
    user_email = request.user.get('email', 'Unknown user') # request.user is from @firebase_auth_required
    
    session.pop('firebase_id_token', None)
    app.logger.info(f"User {user_email} (UID: {get_current_user_id()}) logged out. Session cleared.")
    return jsonify({"message": "Logout successful"}), 200



@app.route('/api/auth/forgot-password', methods=['POST'])
def forgot_password():
    if not FIREBASE_WEB_API_KEY:
        app.logger.error("CRITICAL: FIREBASE_WEB_API_KEY is not set. Cannot send password reset email.")
        return jsonify({"error": "Password reset service is currently unavailable."}), 503

    data = request.get_json()
    if not data or not data.get('email'):
        return jsonify({"error": "Email is required"}), 400
    
    email = data.get('email')
    rest_api_url = f"https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key={FIREBASE_WEB_API_KEY}"
    payload = {
        "requestType": "PASSWORD_RESET",
        "email": email
    }

    try:
        response = requests.post(rest_api_url, json=payload, timeout=10)
        response.raise_for_status() # Check for HTTP errors
        app.logger.info(f"Password reset email sent successfully to {email}.")
        return jsonify({"message": "Password reset email sent. Please check your inbox."}), 200
    except requests.exceptions.HTTPError as http_err:
        error_message = "Failed to send password reset email."
        if http_err.response is not None:
            try:
                error_data = http_err.response.json().get("error", {})
                fb_message = error_data.get("message")
                if fb_message == "EMAIL_NOT_FOUND":
                    error_message = "Email address not found."
                elif fb_message:
                    error_message = f"Firebase error: {fb_message}"
                app.logger.warning(f"Failed to send password reset for {email}: {error_message} (Status: {http_err.response.status_code})")
                return jsonify({"error": error_message}), http_err.response.status_code
            except ValueError:
                app.logger.warning(f"Failed to send password reset for {email}: Non-JSON error response (Status: {http_err.response.status_code})")
        else:
            app.logger.error(f"Failed to send password reset for {email}: {http_err}")
        return jsonify({"error": "Failed to send password reset email due to a server error."}), 500
    except requests.exceptions.RequestException as e:
        app.logger.error(f"Request to Firebase for password reset failed: {e}")
        return jsonify({"error": "Failed to connect to authentication service for password reset."}), 503

@app.route('/api/user/home', methods=['GET'])
@firebase_auth_required
def get_user_home_data():
    uid = get_current_user_id()
    if not db: return jsonify({"error": "Database service unavailable."}), 503

    user_data = get_user_profile_and_ensure_daily_reset(uid)

    if not user_data:
        return jsonify({"error": "User profile not found or error during reset."}), 404

    globally_recommended_recipe_details = None
    try:
        recipes_ref = db.collection('recipe')
        query = recipes_ref.order_by('likes', direction=firestore.Query.DESCENDING).limit(1)
        top_liked_recipe_docs = list(query.stream()) 

        if top_liked_recipe_docs:
            top_recipe_data = top_liked_recipe_docs[0].to_dict()
            globally_recommended_recipe_details = {
                "id": top_liked_recipe_docs[0].id,
                "name": top_recipe_data.get("name", "Top Rated Dish"),
                "image": top_recipe_data.get("image", top_recipe_data.get("imageUrl")),
                "description": top_recipe_data.get("description", "A community favorite!"), 
                "calories": top_recipe_data.get("calories"), 
                "likes": top_recipe_data.get("likes", 0)
            }
        else:
            app.logger.info(f"No recipes found with 'likes' field for global recommendation.")
    except Exception as e_rec:
        app.logger.error(f"Error fetching globally recommended recipe: {e_rec}. Check Firestore indexes for 'recipe' collection on 'likes' (descending).")

    consumed_today_ids = user_data.get('consumedToday', [])
    consumed_today_detailed_list = []
    if consumed_today_ids: 
        unique_consumed_ids = list(set(consumed_today_ids)) 
        for r_id in unique_consumed_ids:
            try:
                recipe_doc_snap = db.collection('recipe').document(r_id).get()
                if recipe_doc_snap.exists:
                    r_details = recipe_doc_snap.to_dict()
                    consumed_today_detailed_list.append({
                        "id": recipe_doc_snap.id,
                        "name": r_details.get("name", "N/A"),
                        "calories": r_details.get("calories"), "image": r_details.get("image", r_details.get("imageUrl")),
                        "protein": r_details.get("protein"), "fat": r_details.get("fat"), "carbs": r_details.get("carbs"),
                    })
            except Exception as e_consumed_item_fetch:
                 app.logger.error(f"Error fetching detail for consumed recipe ID {r_id} for user {uid}: {e_consumed_item_fetch}")
    
    ordered_consumed_details = []
    if consumed_today_ids and consumed_today_detailed_list:
        recipe_map_by_id = {recipe['id']: recipe for recipe in consumed_today_detailed_list}
        for r_id in consumed_today_ids: 
            if r_id in recipe_map_by_id:
                ordered_consumed_details.append(dict(recipe_map_by_id[r_id]))

    home_payload = {
        "displayName": user_data.get("displayName", "User"),
        "caloriesToday": user_data.get("caloriesToday", 0),
        "dailyCalorieGoal": user_data.get("dailyCalorieGoal", DEFAULT_CALORIE_GOAL_VALUE),
        "consumedTodayDetails": ordered_consumed_details, 
        "globallyRecommendedRecipe": globally_recommended_recipe_details,
        "totalProteinToday": round(user_data.get("proteinToday", 0.0), 1),
        "totalFatToday": round(user_data.get("fatToday", 0.0), 1),
        "totalCarbsToday": round(user_data.get("carbsToday", 0.0), 1),
        "totalCholesterolToday": round(user_data.get("cholesterolToday", 0.0), 1),
        "totalSodiumToday": round(user_data.get("sodiumToday", 0.0), 1),
        "totalPotassiumToday": round(user_data.get("potassiumToday", 0.0), 1),
        "totalIronToday": round(user_data.get("ironToday", 0.0), 1),
        "totalRecipes": len(user_data.get("recipeMade", [])),
        "favoriteRecipesCount": len(user_data.get("favouriteRecipes", [])),
    }
    return jsonify(home_payload), 200

@app.route('/api/recipes/my-recipes', methods=['GET'])
@firebase_auth_required
def get_my_recipes():
    uid = get_current_user_id()
    if not uid:
        return jsonify({"error": "Unauthorized - User ID not found"}), 401

    try:
        user_doc_ref = db.collection('user').document(uid) 
        user_doc = user_doc_ref.get()

        if not user_doc.exists:
            return jsonify({"error": "User profile not found"}), 404

        user_data = user_doc.to_dict()
        recipe_made_id_list = user_data.get("recipeMade", []) 
        recipe_made_ids = set()
        for item_id in recipe_made_id_list:
            if isinstance(item_id, str) and item_id.strip():
                recipe_made_ids.add(item_id.strip())
            elif item_id is not None: 
                app.logger.warning(f"Unexpected item type or empty ID in recipeMade for user {uid}: '{item_id}' (type: {type(item_id)})")
        
        favourite_recipe_ids_list = user_data.get("favouriteRecipes", [])
        favourite_recipe_ids_set = {
            str(fav_id).strip() for fav_id in favourite_recipe_ids_list 
            if fav_id is not None and isinstance(fav_id, str) and fav_id.strip()
        }
        for fav_item in favourite_recipe_ids_list:
            if not (isinstance(fav_item, str) and fav_item.strip()):
                 app.logger.warning(f"Unexpected item type or empty ID in favouriteRecipes for user {uid}: '{fav_item}' (type: {type(fav_item)})")

        all_recipe_ids_to_fetch = list(recipe_made_ids.union(favourite_recipe_ids_set))

        if not all_recipe_ids_to_fetch:
            app.logger.info(f"User {uid} has no valid 'recipeMade' or 'favouriteRecipes' IDs to fetch.")
            return jsonify([]), 200 
        recipes_collection_ref = db.collection('recipe') 
        fetched_recipes_list = []
        
        MAX_IN_QUERY_ARGS = 30 

        for i in range(0, len(all_recipe_ids_to_fetch), MAX_IN_QUERY_ARGS):
            batch_ids = all_recipe_ids_to_fetch[i:i + MAX_IN_QUERY_ARGS]
            
            if not batch_ids: 
                continue
            
            query = recipes_collection_ref.where(FirestoreFieldPath.document_id(), 'in', batch_ids)
            docs_stream = query.stream() 

            for doc in docs_stream:
                if doc.exists:
                    recipe_data = doc.to_dict()
                    recipe_data['id'] = doc.id 
                    recipe_data['isFavorite'] = doc.id in favourite_recipe_ids_set
                    fetched_recipes_list.append(recipe_data)
                else:
                    app.logger.warning(f"Recipe ID {doc.id} from user {uid}'s list not found in 'recipes' collection.")
        
        app.logger.info(f"Successfully fetched {len(fetched_recipes_list)} recipes for user {uid}.")
        return jsonify(fetched_recipes_list), 200

    except Exception as e:
        app.logger.error(f"Error fetching user's recipes from collection for UID {uid}: {e}")
        import traceback
        app.logger.error(traceback.format_exc())
        return jsonify({"error": "Failed to fetch recipes due to an internal server error"}), 500
    
@app.route('/api/recipes/toggle-favorite', methods=['POST'])
@firebase_auth_required
def toggle_recipe_favorite():
    """Toggles a recipe's favorite status for the current user."""
    uid = get_current_user_id()
    if not uid:
        return jsonify({"error": "Unauthorized - User ID not found"}), 401

    data = request.get_json()
    recipe_id = data.get('recipeId')

    if not recipe_id:
        return jsonify({"error": "recipeId is required"}), 400

    try:
        user_doc_ref = db.collection('user').document(uid)
        user_doc = user_doc_ref.get()

        if not user_doc.exists:
            return jsonify({"error": "User profile not found"}), 404
        
        user_data = user_doc.to_dict()
        favourite_recipes = user_data.get("favouriteRecipes", [])
        
        is_currently_favorite = False
        if recipe_id in favourite_recipes:
            favourite_recipes.remove(recipe_id)
            is_currently_favorite = False
        else:
            favourite_recipes.append(recipe_id)
            is_currently_favorite = True
        
        user_doc_ref.update({"favouriteRecipes": favourite_recipes})
        
        return jsonify({"message": "Favorite status updated", "recipeId": recipe_id, "isFavorite": is_currently_favorite}), 200

    except Exception as e:
        app.logger.error(f"Error toggling favorite for recipe {recipe_id}, user {uid}: {e}")
        return jsonify({"error": "Failed to update favorite status"}), 500
    

@app.route('/api/recipes/public', methods=['GET'])
def get_public_recipes():
    if not db:
        return jsonify({"error": "Database service not available"}), 503
    try:
        recipes_ref = db.collection('recipe')
        recipes_query = recipes_ref.limit(50) 
        
        public_recipes_list = []
        for doc in recipes_query.stream():
            recipe_data = doc.to_dict()
            recipe_data['id'] = doc.id 
            
            formatted_recipe = {
                "id": recipe_data.get('id'),
                "name": recipe_data.get('name', 'Untitled Recipe'),
                "description": recipe_data.get('description', ''),
                "imageUrl": recipe_data.get('image', recipe_data.get('imageUrl')), # Prioritize 'image' if present
                "category": recipe_data.get('category', 'General'),
                "difficulty": recipe_data.get('difficulty', 'N/A'),
                "cookTime": f"{recipe_data.get('time', 'N/A')} min" if isinstance(recipe_data.get('time'), (int, float)) else recipe_data.get('cookTime', 'N/A'),
                "caloriesPerServing": recipe_data.get('calories', recipe_data.get('caloriesPerServing')), # Prioritize 'calories'
                "servings": recipe_data.get('serving', recipe_data.get('servings')), # Prioritize 'serving'
                
                "authorName": recipe_data.get('maker', recipe_data.get('authorName', 'Unknown Author')),
                "ratingAvg": recipe_data.get('ratingAvg', 0), # Assuming ratingAvg is directly stored
                "savesCount": recipe_data.get('likes', recipe_data.get('savesCount', 0)), # Prioritize 'likes' for savesCount
                "isPopular": recipe_data.get('isPopular', False),
                
                "carbs": recipe_data.get('carbs'),
                "cholesterol": recipe_data.get('cholestrol', recipe_data.get('cholesterol')), # Handle typo
                "fat": recipe_data.get('fat'),
                "protein": recipe_data.get('protein'),
                "sodium": recipe_data.get('sodium'),
                "potassium": recipe_data.get('potassium'),
                "iron": recipe_data.get('iron'),

                "ingredients": recipe_data.get('ingredients', {}), # Expects a map
                "steps": recipe_data.get('steps', []), # Expects an array of strings
                
                "createdAt": recipe_data['createdAt'].isoformat() if 'createdAt' in recipe_data and isinstance(recipe_data['createdAt'], datetime) else None,
                "updatedAt": recipe_data['updatedAt'].isoformat() if 'updatedAt' in recipe_data and isinstance(recipe_data['updatedAt'], datetime) else None,
            }
            public_recipes_list.append(formatted_recipe)
        
        auth_header = request.headers.get('Authorization')
        current_user_saved_ids = []
        if auth_header and auth_header.startswith('Bearer '):
            try:
                id_token = auth_header.split('Bearer ')[1]
                decoded_token = auth.verify_id_token(id_token, app=firebase_app, check_revoked=True)
                uid = decoded_token.get('uid')
                if uid:
                    user_doc = db.collection('user').document(uid).get()
                    if user_doc.exists:
                        current_user_saved_ids = user_doc.to_dict().get('favoriteRecipes', [])
            except Exception: 
                pass 
        
        for recipe in public_recipes_list:
            recipe['isSavedByCurrentUser'] = recipe['id'] in current_user_saved_ids if recipe.get('id') else False

        return jsonify(public_recipes_list), 200
    except Exception as e:
        app.logger.error(f"Error fetching public recipes: {e}")
        return jsonify({"error": "Failed to fetch public recipes"}), 500

@app.route('/api/recipes/public/toggle-save', methods=['POST'])
@firebase_auth_required 
def toggle_public_recipe_save():
    uid = get_current_user_id()
    data = request.get_json()
    public_recipe_id = data.get('recipeId')

    if not public_recipe_id: return jsonify({"error": "recipeId is required"}), 400

    try:
        user_doc_ref = db.collection('user').document(uid)
        public_recipe_doc_ref = db.collection('recipe').document(public_recipe_id)
        
        public_recipe_doc = public_recipe_doc_ref.get()
        if not public_recipe_doc.exists: return jsonify({"error": "Public recipe not found"}), 404

        saved_ids = []
        user_doc = user_doc_ref.get()
        if user_doc.exists: saved_ids = user_doc.to_dict().get('favouriteRecipes', [])
        
        is_now_saved = False
        if public_recipe_id in saved_ids:
            saved_ids.remove(public_recipe_id)
            public_recipe_doc_ref.update({"likes": firestore.Increment(-1)}) 
            is_now_saved = False
        else:
            saved_ids.append(public_recipe_id)
            public_recipe_doc_ref.update({"likes": firestore.Increment(1)})
            is_now_saved = True
        
        if user_doc.exists: user_doc_ref.update({"favouriteRecipes": saved_ids})
        else: user_doc_ref.set({"favouriteRecipes": saved_ids}, merge=True)
        
        # Fetch the updated likes count to return
        updated_recipe_doc = public_recipe_doc_ref.get()
        updated_likes = updated_recipe_doc.to_dict().get('likes', 0)

        return jsonify({
            "message": "Recipe save status updated", 
            "recipeId": public_recipe_id, 
            "isSaved": is_now_saved,
            "newLikesCount": updated_likes
        }), 200
    except Exception as e:
        app.logger.error(f"Error toggling save for public recipe {public_recipe_id}, user {uid}: {e}")
        return jsonify({"error": "Failed to update recipe save status"}), 500
    
@app.route('/api/recipes/add', methods=['POST'])
@firebase_auth_required
def add_user_recipe():
    uid = get_current_user_id()
    if not uid: 
        return jsonify({"error": "User authentication failed."}), 401

    app.logger.info(f"--- Add Recipe Request for UID: {uid} ---")
    app.logger.info(f"Request Form Data: {request.form.to_dict()}")
    app.logger.info(f"Request Files: {request.files.to_dict()}")
    
    if 'recipeData' not in request.form:
        return jsonify({"error": "Missing recipeData in form"}), 400

    try:
        data_str = request.form['recipeData']
        data = json.loads(data_str)
    except json.JSONDecodeError:
        return jsonify({"error": "Invalid JSON format for recipeData"}), 400
    except Exception as e:
        app.logger.error(f"Error accessing form data: {e}")
        return jsonify({"error": "Could not process form data"}), 400

    recipe_name = data.get('recipeName')
    ingredients_list = data.get('ingredients', []) 
    steps_list = data.get('steps', [])
    category = data.get('category')

    if not recipe_name or not isinstance(recipe_name, str) or not recipe_name.strip():
        return jsonify({"error": "Recipe name is required and must be a non-empty string."}), 400
    if not category or not isinstance(category, str) or not category.strip():
        return jsonify({"error": "Category is required."}), 400
    if not ingredients_list or not isinstance(ingredients_list, list) or not all(isinstance(item, str) for item in ingredients_list):
        return jsonify({"error": "Ingredients are required and must be a list of strings."}), 400
    if not steps_list or not isinstance(steps_list, list) or not all(isinstance(item, str) for item in steps_list):
        return jsonify({"error": "Steps are required and must be a list of strings."}), 400
    
    valid_ingredients = [ing.strip() for ing in ingredients_list if ing.strip()]
    valid_steps = [step.strip() for step in steps_list if step.strip()]

    if not valid_ingredients:
        return jsonify({"error": "At least one valid ingredient is required."}), 400
    if not valid_steps:
        return jsonify({"error": "At least one valid step is required."}), 400

    uploaded_image_url = data.get('imageUrl', '') # For pre-filled image URL if no new file

    if 'recipeImageFile' in request.files:
        file_to_upload = request.files['recipeImageFile']
        if file_to_upload and file_to_upload.filename != '':
            if not (os.environ.get("CLOUDINARY_CLOUD_NAME") and os.environ.get("CLOUDINARY_API_KEY") and os.environ.get("CLOUDINARY_API_SECRET")):
                app.logger.error("Cloudinary credentials not configured for image upload.")
                return jsonify({"error": "Image upload service not configured."}), 500
            try:
                upload_result = cloudinary.uploader.upload(
                    file_to_upload,
                    folder="FitPlate_Recipes",
                    overwrite=True, 
                    resource_type="image"
                )
                uploaded_image_url = upload_result.get('secure_url')
                app.logger.info(f"Image uploaded to Cloudinary: {uploaded_image_url}")
            except Exception as e:
                app.logger.error(f"Cloudinary upload failed: {e}")
                return jsonify({"error": f"Image upload failed: {str(e)}"}), 500
    
    new_recipe_id = str(uuid.uuid4()) 
    
    def get_float_or_none(value_str):
        if value_str is None or (isinstance(value_str, str) and not value_str.strip()):
            return None
        try:
            return float(value_str)
        except (ValueError, TypeError):
            return None 

    new_recipe_entry = {
        "name": recipe_name.strip(),
        "description": data.get('description', '').strip(),
        "category": category.strip(),
        "time": int(data.get('cookingTime', 0) or 0), 
        "image": uploaded_image_url,
        "ingredients": valid_ingredients,
        "steps": valid_steps,           
        "maker": uid,                  
        "serving": int(data.get('servings', 1) or 1),
        "likes": 0, # Initial likes count
        "createdAt": firestore.SERVER_TIMESTAMP,
        "updatedAt": firestore.SERVER_TIMESTAMP,
        "createdFrom": data.get("createdFrom", "manual"),

        # Nutrition Facts (handle None for empty inputs)
        "calories": get_float_or_none(data.get('calories')),
        "protein": get_float_or_none(data.get('protein')),
        "fat": get_float_or_none(data.get('fat')),
        "carbs": get_float_or_none(data.get('carbs')),
        "cholesterol": get_float_or_none(data.get('cholesterol')), 
        "sodium": get_float_or_none(data.get('sodium')),
        "potassium": get_float_or_none(data.get('potassium')),
        "iron": get_float_or_none(data.get('iron')),
    }
    new_recipe_entry = {k: v for k, v in new_recipe_entry.items() if v is not None}


    try:
        recipe_doc_ref = db.collection('recipe').document(new_recipe_id)
        recipe_doc_ref.set(new_recipe_entry)
        app.logger.info(f"Recipe {new_recipe_id} added to 'recipe' collection by user {uid}.")

        user_doc_ref = db.collection('user').document(uid)
        user_doc_ref.update({
            "recipeMade": firestore.ArrayUnion([new_recipe_id])
        })
        app.logger.info(f"User {uid} recipeMade list updated with {new_recipe_id}.")
        
        response_data = new_recipe_entry.copy()
        response_data.pop('createdAt', None) 
        response_data.pop('updatedAt', None)
        response_data['id'] = new_recipe_id 

        return jsonify({"message": "Recipe added successfully!", "recipeId": new_recipe_id, "recipeData": response_data}), 201
    except Exception as e:
        app.logger.error(f"Error saving recipe for user {uid} to Firestore: {e}")
        import traceback
        app.logger.error(traceback.format_exc())
        return jsonify({"error": "Failed to save recipe to database due to a server issue."}), 500
    
@app.route('/api/recipes/public/<string:recipe_id>', methods=['GET'])
def get_public_recipe_detail(recipe_id):
    if not db:
        return jsonify({"error": "Database service not available"}), 503
    try:
        recipe_doc_ref = db.collection('recipe').document(recipe_id)
        recipe_doc = recipe_doc_ref.get()

        if not recipe_doc.exists:
            return jsonify({"error": "Recipe not found"}), 404

        recipe_data = recipe_doc.to_dict()
        author_name = "Unknown Author"
        if recipe_data.get('maker'):
            author_name = get_author_display_name(recipe_data['maker'])

        cook_time_str = "N/A"
        time_val = recipe_data.get('time')
        if isinstance(time_val, (int, float)):
            cook_time_str = f"{int(time_val)} Mins"
        elif isinstance(time_val, str) and time_val.strip():
             cook_time_str = time_val


        formatted_recipe = {
            "id": recipe_doc.id,
            "name": recipe_data.get('name', 'Untitled Recipe'),
            "author": author_name,
            "authorId": recipe_data.get('maker'),
            "likes": recipe_data.get('likes', 0),
            "cookTime": cook_time_str,
            "servings": recipe_data.get('serving', recipe_data.get('servings', 1)),
            "image": recipe_data.get('image', recipe_data.get('imageUrl')), 
            "description": recipe_data.get('description', ''),
            "nutrition": {
                "calories": recipe_data.get('calories'),
                "totalFat": recipe_data.get('fat'),
                "protein": recipe_data.get('protein'),
                "carbohydrates": recipe_data.get('carbs'),
                "cholesterol": recipe_data.get('cholestrol', recipe_data.get('cholesterol')),
                "sodium": recipe_data.get('sodium'),
                "iron": recipe_data.get('iron'),
                "potassium": recipe_data.get('potassium'),
            },
            "ingredients": recipe_data.get('ingredients', []),
            "steps": recipe_data.get('steps', []), 
            "category": recipe_data.get('category', 'General'),
            "createdAt": recipe_data['createdAt'].isoformat() if 'createdAt' in recipe_data and isinstance(recipe_data['createdAt'], datetime) else recipe_data.get('createdAt'),
            "updatedAt": recipe_data['updatedAt'].isoformat() if 'updatedAt' in recipe_data and isinstance(recipe_data['updatedAt'], datetime) else None,
        }
        
        is_favorite_by_current_user = False
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            try:
                id_token = auth_header.split('Bearer ')[1]
                decoded_token = auth.verify_id_token(id_token, app=firebase_app, check_revoked=True)
                uid = decoded_token.get('uid')
                if uid:
                    user_doc = db.collection('user').document(uid).get()
                    if user_doc.exists:
                        user_data = user_doc.to_dict()
                        if recipe_doc.id in user_data.get('favouriteRecipes', []) or \
                           recipe_doc.id in user_data.get('favoriteRecipes', []):
                           is_favorite_by_current_user = True
            except Exception as e_auth:
                app.logger.info(f"Could not determine favorite status for recipe {recipe_id} (user not logged in or token error): {e_auth}")
        
        formatted_recipe['isFavoriteByCurrentUser'] = is_favorite_by_current_user


        return jsonify(formatted_recipe), 200

    except Exception as e:
        app.logger.error(f"Error fetching recipe detail for {recipe_id}: {e}")
        import traceback
        app.logger.error(traceback.format_exc())
        return jsonify({"error": "Failed to fetch recipe details"}), 500
    
@app.route('/api/user/pick-recipe', methods=['POST'])
@firebase_auth_required
def consume_recipe_and_update_totals():
    uid = get_current_user_id()
    if not db: return jsonify({"error": "Database service unavailable."}), 503

    data = request.get_json()
    recipe_id = data.get('recipeId')
    if not recipe_id: return jsonify({"error": "recipeId is required."}), 400

    try:
        recipe_doc_ref = db.collection('recipe').document(recipe_id)
        recipe_doc = recipe_doc_ref.get()
        if not recipe_doc.exists: return jsonify({"error": "Recipe not found."}), 404
        
        recipe_data = recipe_doc.to_dict()
        
        nutrients_from_recipe = {
            'calories': get_float_from_data(recipe_data, 'calories'),
            'protein': get_float_from_data(recipe_data, 'protein'),
            'fat': get_float_from_data(recipe_data, 'fat'),
            'carbs': get_float_from_data(recipe_data, 'carbs'),
            'cholesterol': get_float_from_data(recipe_data, 'cholesterol', recipe_data.get('cholestrol')),
            'sodium': get_float_from_data(recipe_data, 'sodium'),
            'potassium': get_float_from_data(recipe_data, 'potassium'),
            'iron': get_float_from_data(recipe_data, 'iron')
        }

        user_doc_ref = db.collection('user').document(uid)

        @firestore.transactional
        def _update_consumption_in_transaction(transaction, user_ref_for_tx):
            user_snapshot = user_ref_for_tx.get(transaction=transaction)
            if not user_snapshot.exists:
                raise Exception("User profile not found during transaction.") 

            user_data_tx = user_snapshot.to_dict()
            today_str_tx = date.today().isoformat() 
            last_activity_date_tx = user_data_tx.get('lastActivityDate')

            update_fields_tx = {
                'lastActivityDate': today_str_tx,
                'updatedAt': firestore.SERVER_TIMESTAMP
            }

            if last_activity_date_tx != today_str_tx:
                app.logger.info(f"Daily reset for user {uid} in consume_recipe TX. Last: {last_activity_date_tx}, Today: {today_str_tx}")
                update_fields_tx['consumedToday'] = [recipe_id] 
                for key, value in nutrients_from_recipe.items():
                    update_fields_tx[key + 'Today'] = value 
            else:
                update_fields_tx['consumedToday'] = firestore.ArrayUnion([recipe_id])
                for key, value in nutrients_from_recipe.items():
                    update_fields_tx[key + 'Today'] = firestore.Increment(value)
            
            transaction.update(user_ref_for_tx, update_fields_tx)
            return update_fields_tx, last_activity_date_tx != today_str_tx 

        updated_fields, was_reset = _update_consumption_in_transaction(db.transaction(), user_doc_ref)
        
        action_type = "set (new day)" if was_reset else "incremented"
        app.logger.info(f"User {uid} consumed recipe {recipe_id}. Nutritionals {action_type}.")
        
        final_user_data_doc = user_doc_ref.get()
        final_user_data = final_user_data_doc.to_dict() if final_user_data_doc.exists else {}

        return jsonify({
            "message": "Recipe consumed successfully.",
            "consumedRecipeId": recipe_id,
            "recipeName": recipe_data.get("name"),
            "recipeCalories": nutrients_from_recipe['calories'],
            "dailyTotals": {
                "caloriesToday": final_user_data.get('caloriesToday', 0),
                "proteinToday": final_user_data.get('proteinToday', 0.0),
                "fatToday": final_user_data.get('fatToday', 0.0),
                "carbsToday": final_user_data.get('carbsToday', 0.0),
                "cholesterolToday": final_user_data.get('cholesterolToday', 0.0),
                "sodiumToday": final_user_data.get('sodiumToday', 0.0),
                "potassiumToday": final_user_data.get('potassiumToday', 0.0),
                "ironToday": final_user_data.get('ironToday', 0.0),
            },
            "consumedTodayList": final_user_data.get('consumedToday', [])
        }), 200

    except Exception as e:
        app.logger.error(f"Error in consume_recipe_and_update_totals for {recipe_id}, user {uid}: {e}")
        import traceback
        app.logger.error(traceback.format_exc())
        return jsonify({"error": "Failed to record recipe consumption."}), 500
    
@app.route('/api/user/todays-consumed-recipes', methods=['GET'])
@firebase_auth_required
def get_todays_consumed_recipes_detailed():
    uid = get_current_user_id()

    if not db:
        app.logger.error("Firestore client (db) is not initialized for todays-consumed-recipes.")
        return jsonify({"error": "Database service not available."}), 503

    try:
        user_doc_ref = db.collection('user').document(uid)
        user_doc = user_doc_ref.get()

        if not user_doc.exists:
            app.logger.warning(f"User profile not found for UID: {uid} in get_todays_consumed_recipes_detailed")
            return jsonify({"error": "User profile not found."}), 404

        user_data = user_doc.to_dict()
        today_str = date.today().isoformat()  

        consumed_today_ids = user_data.get('consumedToday', [])
        last_activity_date_str = user_data.get('lastActivityDate')
        
        if last_activity_date_str != today_str:
            app.logger.info(f"Daily reset triggered for user {uid}. Last activity: {last_activity_date_str}, Today: {today_str}")
            consumed_today_ids = [] 
            user_doc_ref.update({
                'caloriesToday': 0,
                'consumedToday': [], 
                'lastActivityDate': today_str,
                'updatedAt': firestore.SERVER_TIMESTAMP 
            })
            app.logger.info(f"User {uid} daily consumption data reset in Firestore.")
        
        if not consumed_today_ids:
            return jsonify([]), 200

        detailed_consumed_recipes = []
        
        for recipe_id in list(set(consumed_today_ids)): # Use set to avoid duplicate fetches if IDs are repeated
            if not recipe_id or not isinstance(recipe_id, str): # Skip invalid IDs
                app.logger.warning(f"Skipping invalid recipe ID: {recipe_id} for user {uid}")
                continue

            recipe_doc_ref = db.collection('recipe').document(recipe_id)
            recipe_doc_snap = recipe_doc_ref.get()
            
            if recipe_doc_snap.exists:
                recipe_details = recipe_doc_snap.to_dict()
                
                cook_time_str = "N/A"
                time_val = recipe_details.get('time')
                if isinstance(time_val, (int, float)):
                    cook_time_str = f"{int(time_val)} min"
                elif isinstance(time_val, str) and time_val.strip():
                    cook_time_str = time_val
                
                formatted = {
                    "id": recipe_doc_snap.id,
                    "name": recipe_details.get('name', 'N/A'),
                    "image": recipe_details.get('image', recipe_details.get('imageUrl')),
                    "calories": recipe_details.get('calories'), 
                    "ingredients": recipe_details.get('ingredients', []),
                    "steps": recipe_details.get('steps', []),
                    "protein": recipe_details.get('protein'),
                    "fat": recipe_details.get('fat'),
                    "carbs": recipe_details.get('carbs'),
                    "servings": recipe_details.get('serving', recipe_details.get('servings')),
                    "cookTime": cook_time_str,
                    "description": recipe_details.get('description'),
                    "category": recipe_details.get('category'),
                }
                detailed_consumed_recipes.append(formatted)
            else:
                app.logger.warning(f"Recipe ID {recipe_id} from user {uid}'s consumedToday not found in 'recipe' collection.")
        
        final_ordered_list = []
        recipe_map_by_id = {recipe['id']: recipe for recipe in detailed_consumed_recipes}
        for r_id in consumed_today_ids: # Iterate through the original list (which may have duplicates)
            if r_id in recipe_map_by_id:
                
                final_ordered_list.append(dict(recipe_map_by_id[r_id])) 
            else:
                # This case should ideally be caught by the logger above if a recipe ID wasn't found
                app.logger.warning(f"Recipe ID {r_id} was in consumed_today_ids but not found/fetched for final list for user {uid}.")
        
        return jsonify(final_ordered_list), 200

    except Exception as e:
        app.logger.error(f"Error fetching today's consumed recipes for user {uid}: {e}")
        import traceback
        app.logger.error(traceback.format_exc())
        return jsonify({"error": "Failed to fetch consumed recipes due to a server error."}), 500



if __name__ == '__main__':
    is_development = os.environ.get('FLASK_ENV', 'production').lower() == 'development'
    port = int(os.environ.get('PORT', 5000)) 
    app.run(host='0.0.0.0', port=port, debug=is_development)
