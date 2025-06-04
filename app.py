import os
from functools import wraps
from datetime import datetime, timedelta 
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
def get_current_user_id():
    if hasattr(request, 'user') and request.user:
        return request.user.get('uid')
    return None

def get_user_profile_from_firestore(uid):
    """Fetches and formats user profile data from Firestore."""
    if not db:
        app.logger.error("Firestore client not available in get_user_profile_from_firestore.")
        return None
    try:
        user_doc_ref = db.collection('user').document(uid)
        user_doc = user_doc_ref.get()
        
        if user_doc.exists:
            firestore_user_data = user_doc.to_dict()
            auth_user_info = auth.get_user(uid, app=firebase_app) if firebase_app else None
            
            join_date_formatted = "N/A"
            created_at = firestore_user_data.get("createdAt")
            if created_at and isinstance(created_at, datetime):
                join_date_formatted = created_at.strftime("%B %Y") # e.g., "June 2025"
            elif isinstance(created_at, str): # Basic parsing if it's already a string (less ideal)
                try:
                    # Attempt to parse if it's a known string format, e.g., ISO
                    dt_obj = datetime.fromisoformat(created_at.replace("Z", "+00:00")) # Example for ISO
                    join_date_formatted = dt_obj.strftime("%B %Y")
                except ValueError:
                    # If it's the custom string "1 June 2025 at 19:20:16 UTC+7"
                    # This parsing is specific and might need adjustment based on actual string format
                    try:
                        parts = created_at.split(" at ")[0] # "1 June 2025"
                        dt_obj = datetime.strptime(parts, "%d %B %Y")
                        join_date_formatted = dt_obj.strftime("%B %Y")
                    except:
                        join_date_formatted = "N/A" # Fallback for unknown string format
                        
            recipe_made_id_list = firestore_user_data.get("recipeMade", []) # Expecting a list of strings
        recipe_made_ids = set()
        for item_id in recipe_made_id_list:
            if isinstance(item_id, str) and item_id.strip(): # Check if it's a non-empty string
                recipe_made_ids.add(item_id.strip())
            elif item_id is not None: # Log if it's not a string but also not None (e.g. a number, or empty string after strip)
                app.logger.warning(f"Unexpected item type or empty ID in recipeMade for user {uid}: '{item_id}' (type: {type(item_id)})")
    
                
            profile_data = {
                "uid": uid,
                "email": firestore_user_data.get("email", auth_user_info.email if auth_user_info else None),
                "username": firestore_user_data.get("username"),
                "displayName": firestore_user_data.get("displayName", auth_user_info.display_name if auth_user_info else None),
                "joinDate": join_date_formatted, # Formatted join date
                "totalRecipes": len(firestore_user_data.get("recipeMade", [])),
                "favoriteRecipesCount": len(firestore_user_data.get("favouriteRecipes", [])),
                # Include other raw data if needed by other parts of the app
                "caloriesToday": firestore_user_data.get("caloriesToday"),
                "consumedToday": firestore_user_data.get("consumedToday", []),
                "favouriteRecipes": firestore_user_data.get("favouriteRecipes", []), # Full array
                "recipeMade": firestore_user_data.get("recipeMade", []) # Full array
            }
            
            
            
            
            return profile_data
        else:
            app.logger.warning(f"No Firestore profile found for UID {uid} in 'user' collection.")
            # Fallback to auth data if Firestore profile doesn't exist
            auth_user_info = auth.get_user(uid, app=firebase_app) if firebase_app else None
            if auth_user_info:
                join_date_formatted = "N/A"
                if auth_user_info.user_metadata and auth_user_info.user_metadata.creation_timestamp:
                    # Firebase creation_timestamp is in milliseconds since epoch
                    dt_obj = datetime.fromtimestamp(auth_user_info.user_metadata.creation_timestamp / 1000)
                    join_date_formatted = dt_obj.strftime("%B %Y")

                return {
                    "uid": uid,
                    "email": auth_user_info.email,
                    "displayName": auth_user_info.display_name or (auth_user_info.email.split('@')[0] if auth_user_info.email else "User"),
                    "username": None,
                    "joinDate": join_date_formatted,
                    "totalRecipes": 0,
                    "favoriteRecipesCount": 0,
                    "caloriesToday": None,
                    "consumedToday": [],
                    "favouriteRecipes": [],
                    "recipeMade": []
                }
            return None
    except Exception as e:
        app.logger.error(f"Error fetching Firestore profile for UID {uid}: {e}")
        return None

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


# --- API Endpoints ---

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
    if not data:
        return jsonify({"error": "Request body is missing JSON."}), 400
        
    email = data.get('email')
    password = data.get('password')
    display_name = data.get('displayName')
    username = data.get('username') # Optional username

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400
    
    if not username and display_name: # Use displayName as username if username not provided
        username = display_name
    elif not username and email: # Fallback to part of email if no username/displayName
        username = email.split('@')[0] + uuid.uuid4().hex[:4] # Make it somewhat unique
    elif not username:
        username = "user_" + uuid.uuid4().hex[:6] # Generic fallback


    try:
        # Create user in Firebase Authentication
        user_record = auth.create_user(
            email=email,
            password=password,
            display_name=display_name,
            app=firebase_app
        )
        app.logger.info(f"User created successfully in Firebase Auth: {user_record.uid}")

        # Create user profile in Firestore
        user_profile_data = {
            'email': user_record.email,
            'username': username,
            'displayName': user_record.display_name or username,
            'uid': user_record.uid,
            'createdAt': firestore.SERVER_TIMESTAMP,
            'caloriesToday': 0, # Default value
            'consumedToday': [],
            'favouriteRecipes': [],
            'recipeMade': []
        }
        db.collection('user').document(user_record.uid).set(user_profile_data)
        app.logger.info(f"User profile created in Firestore for UID: {user_record.uid}")
        
        # Optionally, you could log the user in directly here by generating a token
        # and setting the session, but typically registration is separate from immediate login.
        # For now, just return success.

        return jsonify({"message": "User registered successfully. Please log in.", "uid": user_record.uid}),    

    except firebase_admin.auth.EmailAlreadyExistsError:
        app.logger.warning(f"Registration attempt with existing email: {email}")
        return jsonify({"error": "Email already exists"}), 409 # 409 Conflict
    except firebase_admin.auth.FirebaseAuthError as e:
        app.logger.error(f"Firebase Auth error during registration: {e}")
        return jsonify({"error": "Registration failed due to a Firebase error", "details": str(e)}), 500
    except Exception as e:
        app.logger.error(f"Unexpected error during registration: {e}")
        # If user was created in Auth but failed in Firestore, you might want to clean up Auth user.
        # This is complex rollback logic not implemented here for brevity.
        return jsonify({"error": "An unexpected error occurred during registration.", "details": str(e)}), 500


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
            user_profile_data = get_user_profile_from_firestore(firebase_uid)

            if not user_profile_data:
                # This case means user exists in Auth but not in Firestore 'user' collection.
                # This could happen if Firestore profile creation failed during registration or manual deletion.
                # Create a basic profile now or handle as an error.
                app.logger.warning(f"User UID {firebase_uid} authenticated but no profile found in Firestore. Attempting to create one.")
                auth_user_info = auth.get_user(firebase_uid, app=firebase_app)
                new_profile_data = {
                    'email': auth_user_info.email,
                    'username': (auth_user_info.email.split('@')[0] + uuid.uuid4().hex[:4]) if auth_user_info.email else "user_" + firebase_uid[:6],
                    'displayName': auth_user_info.display_name,
                    'uid': firebase_uid,
                    'createdAt': firestore.SERVER_TIMESTAMP,
                    'caloriesToday': 0,
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
                    # Proceed with auth data only if Firestore creation fails
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
    
    # To properly invalidate the token on Firebase side for web, it's tricky.
    # Firebase Admin SDK's revoke_refresh_tokens is for managing user sessions broadly.
    # For a single session logout, clearing the client-side token (and session here) is standard.
    # If you need to ensure the ID token cannot be replayed until expiry,
    # you'd implement a token blocklist, which is more complex.
    
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

@app.route('/api/user/profile', methods=['GET'])
@firebase_auth_required
def get_user_profile():
    """Endpoint to get the authenticated user's profile data."""
    uid = get_current_user_id()
    if not uid:
        # This should ideally not happen if @firebase_auth_required works correctly
        return jsonify({"error": "Unauthorized - User ID not found in token"}), 401 

    user_profile = get_user_profile_from_firestore(uid)

    if user_profile:
        return jsonify(user_profile), 200
    else:
        # This case could mean the user exists in Firebase Auth but not in Firestore,
        # and the fallback in get_user_profile_from_firestore also failed, 
        # or a general error occurred.
        # The get_user_profile_from_firestore function already logs errors.
        return jsonify({"error": "User profile not found or error fetching data."}), 404

@app.route('/api/recipes/my-recipes', methods=['GET'])
@firebase_auth_required
def get_my_recipes():
    """
    Fetches recipes from the main 'recipes' collection that are either made by the user
    or are in their favorites list. Includes 'isFavorite' status.
    """
    uid = get_current_user_id()
    if not uid:
        return jsonify({"error": "Unauthorized - User ID not found"}), 401

    try:
        user_doc_ref = db.collection('user').document(uid) 
        user_doc = user_doc_ref.get()

        if not user_doc.exists:
            return jsonify({"error": "User profile not found"}), 404

        user_data = user_doc.to_dict()
        
        # 1. Extract IDs from recipeMade (list of strings/IDs)
        # These are recipes the user has marked as "made".
        recipe_made_id_list = user_data.get("recipeMade", []) # Expecting a list of strings
        recipe_made_ids = set()
        for item_id in recipe_made_id_list:
            if isinstance(item_id, str) and item_id.strip(): # Check if it's a non-empty string
                recipe_made_ids.add(item_id.strip())
            elif item_id is not None: # Log if it's not a string but also not None (e.g. a number, or empty string after strip)
                app.logger.warning(f"Unexpected item type or empty ID in recipeMade for user {uid}: '{item_id}' (type: {type(item_id)})")
        
        # 2. Extract IDs from favouriteRecipes (list of strings/IDs)
        # These are recipes the user has marked as "favorite".
        favourite_recipe_ids_list = user_data.get("favouriteRecipes", [])
        # Ensure all elements are strings and filter out None or empty strings
        favourite_recipe_ids_set = {
            str(fav_id).strip() for fav_id in favourite_recipe_ids_list 
            if fav_id is not None and isinstance(fav_id, str) and fav_id.strip()
        }
        # Log if any favorite items were not strings or were empty
        for fav_item in favourite_recipe_ids_list:
            if not (isinstance(fav_item, str) and fav_item.strip()):
                 app.logger.warning(f"Unexpected item type or empty ID in favouriteRecipes for user {uid}: '{fav_item}' (type: {type(fav_item)})")


        # 3. Combine into a unique set of all recipe IDs to fetch from the 'recipes' collection
        all_recipe_ids_to_fetch = list(recipe_made_ids.union(favourite_recipe_ids_set))

        if not all_recipe_ids_to_fetch:
            app.logger.info(f"User {uid} has no valid 'recipeMade' or 'favouriteRecipes' IDs to fetch.")
            return jsonify([]), 200 # No recipes to fetch

        # 4. Fetch full recipe details from the 'recipes' collection
        recipes_collection_ref = db.collection('recipe') # Master collection for all recipes
        fetched_recipes_list = []
        
        # Firestore 'in' query limit (typically 30)
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
    """Fetches all recipes from the 'publicRecipes' collection with detailed attributes."""
    if not db:
        return jsonify({"error": "Database service not available"}), 503
    try:
        recipes_ref = db.collection('recipe')
        recipes_query = recipes_ref.limit(50) 
        
        public_recipes_list = []
        for doc in recipes_query.stream():
            recipe_data = doc.to_dict()
            recipe_data['id'] = doc.id 
            
            # Map and provide defaults based on the new detailed schema
            # User provided: 'image' -> map to 'imageUrl'
            # User provided: 'maker' -> map to 'authorName'
            # User provided: 'time' (number) -> format to 'cookTime' (string)
            # User provided: 'calories' (number) -> use as 'caloriesPerServing' (number)
            # User provided: 'likes' -> map to 'savesCount' for consistency with current UI save action
            
            # Ensure all expected fields by frontend are present or defaulted
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

                # Nutritional info (new fields from user's list)
                "carbs": recipe_data.get('carbs'),
                "cholesterol": recipe_data.get('cholestrol', recipe_data.get('cholesterol')), # Handle typo
                "fat": recipe_data.get('fat'),
                "protein": recipe_data.get('protein'),
                "sodium": recipe_data.get('sodium'),
                "potassium": recipe_data.get('potassium'),
                "iron": recipe_data.get('iron'),

                # Complex fields
                "ingredients": recipe_data.get('ingredients', {}), # Expects a map
                "steps": recipe_data.get('steps', []), # Expects an array of strings
                
                # Timestamps
                "createdAt": recipe_data['createdAt'].isoformat() if 'createdAt' in recipe_data and isinstance(recipe_data['createdAt'], datetime) else None,
                "updatedAt": recipe_data['updatedAt'].isoformat() if 'updatedAt' in recipe_data and isinstance(recipe_data['updatedAt'], datetime) else None,
            }
            public_recipes_list.append(formatted_recipe)
        
        # Mark saved recipes if user is authenticated (same logic as before)
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
                        current_user_saved_ids = user_doc.to_dict().get('savedPublicRecipeIds', [])
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
        if user_doc.exists: saved_ids = user_doc.to_dict().get('savedPublicRecipeIds', [])
        
        is_now_saved = False
        # Use 'likes' field from publicRecipe doc for savesCount if that's the intention
        # The frontend currently uses 'savesCount' from the fetched recipe data.
        # We will update the 'likes' field on the publicRecipe document.
        if public_recipe_id in saved_ids:
            saved_ids.remove(public_recipe_id)
            public_recipe_doc_ref.update({"likes": firestore.Increment(-1)}) # Decrement 'likes'
            is_now_saved = False
        else:
            saved_ids.append(public_recipe_id)
            public_recipe_doc_ref.update({"likes": firestore.Increment(1)}) # Increment 'likes'
            is_now_saved = True
        
        if user_doc.exists: user_doc_ref.update({"savedPublicRecipeIds": saved_ids})
        else: user_doc_ref.set({"savedPublicRecipeIds": saved_ids}, merge=True)
        
        # Fetch the updated likes count to return
        updated_recipe_doc = public_recipe_doc_ref.get()
        updated_likes = updated_recipe_doc.to_dict().get('likes', 0)

        return jsonify({
            "message": "Recipe save status updated", 
            "recipeId": public_recipe_id, 
            "isSaved": is_now_saved,
            "newLikesCount": updated_likes # Send back the new likes count
        }), 200
    except Exception as e:
        app.logger.error(f"Error toggling save for public recipe {public_recipe_id}, user {uid}: {e}")
        return jsonify({"error": "Failed to update recipe save status"}), 500
    
@app.route('/api/recipes/add', methods=['POST'])
@firebase_auth_required
def add_user_recipe():
    
    app.logger.info(f"--- Add Recipe Request ---")
    app.logger.info(f"Content-Type Header from Flask: {request.content_type}") # Very important
    app.logger.info(f"Request Headers from Flask: {request.headers}")
    app.logger.info(f"Request Form Data: {request.form.to_dict()}")
    app.logger.info(f"Request Files: {request.files.to_dict()}")
    app.logger.info(f"--- End Add Recipe Request Log ---")
    
    
    uid = get_current_user_id()
    user_display_name = request.user.get('name', request.user.get('email', 'Unknown User'))

    if 'recipeData' not in request.form:
        return jsonify({"error": "Missing recipeData in form"}), 400

    try:
        data_str = request.form['recipeData']
        data = json.loads(data_str) # Parse the JSON string from FormData
    except json.JSONDecodeError:
        return jsonify({"error": "Invalid JSON format for recipeData"}), 400
    except Exception as e:
        app.logger.error(f"Error accessing form data: {e}")
        return jsonify({"error": "Could not process form data"}), 400


    recipe_name = data.get('recipeName')
    ingredients_data = data.get('ingredients', []) 
    steps_data = data.get('steps', [])

    if not recipe_name or not ingredients_data or not steps_data:
        return jsonify({"error": "Missing required fields: recipeName, ingredients, or steps"}), 400

    uploaded_image_url = data.get('imageUrl', '') 

    # Handle file upload if present
    if 'recipeImageFile' in request.files:
        file_to_upload = request.files['recipeImageFile']
        if file_to_upload and file_to_upload.filename != '':
            if not (os.environ.get("CLOUDINARY_CLOUD_NAME") and os.environ.get("CLOUDINARY_API_KEY") and os.environ.get("CLOUDINARY_API_SECRET")):
                app.logger.error("Cloudinary credentials not configured. Cannot upload image.")
                return jsonify({"error": "Image upload service not configured on server."}), 500
            try:
                app.logger.info(f"Attempting to upload {file_to_upload.filename} to Cloudinary.")
                # You might want to specify a folder or public_id strategy
                upload_result = cloudinary.uploader.upload(
                    file_to_upload,
                    folder="FitPlate", # Example folder
                    overwrite=True, 
                    resource_type="image"
                )
                uploaded_image_url = upload_result.get('secure_url')
                app.logger.info(f"Image uploaded to Cloudinary: {uploaded_image_url}")
            except Exception as e:
                app.logger.error(f"Cloudinary upload failed: {e}")
                return jsonify({"error": f"Image upload failed: {e}"}), 500
        elif data.get('imageUrl'): # If no new file, but an old imageUrl was passed
             uploaded_image_url = data.get('imageUrl')
        else: # No new file and no old image URL
            uploaded_image_url = '' # Or a default placeholder URL

    new_recipe_id = str(uuid.uuid4()) 
    
    try:
        cooking_time_minutes = int(data.get('cookingTime', 0))
    except ValueError:
        cooking_time_minutes = 0
    
    processed_ingredients = []
    total_carbs, total_cholesterol, total_fat, total_protein = 0.0, 0.0, 0.0, 0.0
    total_sodium, total_potassium, total_iron, total_calories_from_ingredients = 0.0, 0.0, 0.0, 0.0

    for ing_data in ingredients_data:
        processed_ingredient = {
            "id": ing_data.get("id"),  
        }
        processed_ingredients.append(processed_ingredient)
        try:
            total_carbs += float(ing_data.get('carbs', 0) or 0)
            total_cholesterol += float(ing_data.get('cholesterol', ing_data.get('cholestrol', 0)) or 0)
            total_fat += float(ing_data.get('fat', 0) or 0)
            total_protein += float(ing_data.get('protein', 0) or 0)
            total_sodium += float(ing_data.get('sodium', 0) or 0)
            total_potassium += float(ing_data.get('potassium', 0) or 0)
            total_iron += float(ing_data.get('iron', 0) or 0)
            total_calories_from_ingredients += float(ing_data.get('calories', 0) or 0)
        except (ValueError, TypeError) as e:
            app.logger.warning(f"Nutritional parse error for ingredient {ing_data.get('name')}: {e}")

    servings = int(data.get('servings', 1) or 1)
    if servings < 1: servings = 1 # Ensure servings is at least 1

    new_recipe_entry = {
        "id": new_recipe_id,
        "name": recipe_name,
        "description": data.get('description', ''),
        "category": data.get('category', 'Uncategorized'),
        "time": cooking_time_minutes, 
        "imageUrl": uploaded_image_url, # Use the URL from Cloudinary or existing
        "ingredients": processed_ingredients,
        "steps": steps_data,
        "makerId": uid,
        "servings": servings,
        "calories": data.get('calories') if data.get('calories') is not None else (round(total_calories_from_ingredients / servings, 2) if servings > 0 else round(total_calories_from_ingredients, 2)),
        "carbs": round(total_carbs, 2),
        "cholesterol": round(total_cholesterol, 2),
        "fat": round(total_fat, 2),
        "protein": round(total_protein, 2),
        "sodium": round(total_sodium, 2),
        "potassium": round(total_potassium, 2),
        "iron": round(total_iron, 2),
        "createdAt": firestore.SERVER_TIMESTAMP
    }
    if data.get('calories') is not None:
        try: new_recipe_entry["calories"] = float(data.get('calories'))
        except (ValueError, TypeError): pass 

    try:
        user_doc_ref = db.collection('user').document(uid)
        user_doc_ref.update({
            "recipeMade": firestore.ArrayUnion([new_recipe_entry])
        })
        app.logger.info(f"User {uid} added new recipe: {new_recipe_id}")
        return jsonify({"message": "Recipe added successfully!", "recipeId": new_recipe_id, "recipeData": new_recipe_entry}), 201
    except Exception as e:
        app.logger.error(f"Error saving recipe for user {uid}: {e}")
        return jsonify({"error": "Failed to save recipe"}), 500

if __name__ == '__main__':
    is_development = os.environ.get('FLASK_ENV', 'production').lower() == 'development'
    # Use PORT environment variable for deployment platforms like Heroku, Google App Engine
    port = int(os.environ.get('PORT', 5000)) # Changed default to 5001 to avoid conflict with Next.js dev server (often 3000) or other common ports
    app.run(host='0.0.0.0', port=port, debug=is_development)
