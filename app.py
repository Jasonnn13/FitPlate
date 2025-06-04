import os
from functools import wraps
from datetime import timedelta # For session lifetime
import uuid # For generating default usernames or other unique IDs if needed

import firebase_admin
from firebase_admin import credentials, auth, firestore
from flask import Flask, jsonify, request, session, abort
from flask_cors import CORS
from dotenv import load_dotenv
import requests # For calling Firebase REST API

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
CORS(app, resources={r"/api/*": {"origins": NEXTJS_URL}}, supports_credentials=True)

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
    """Fetches user profile data from Firestore."""
    if not db:
        app.logger.error("Firestore client not available in get_user_profile_from_firestore.")
        return None
    try:
        user_doc_ref = db.collection('user').document(uid)
        user_doc = user_doc_ref.get()
        if user_doc.exists:
            firestore_user_data = user_doc.to_dict()
            # Ensure essential fields are present, potentially falling back to auth data
            auth_user_info = auth.get_user(uid, app=firebase_app) if firebase_app else None
            
            profile_data = {
                "uid": uid,
                "email": firestore_user_data.get("email", auth_user_info.email if auth_user_info else None),
                "username": firestore_user_data.get("username"),
                "displayName": firestore_user_data.get("displayName", auth_user_info.display_name if auth_user_info else None),
                "caloriesToday": firestore_user_data.get("caloriesToday"),
                "consumedToday": firestore_user_data.get("consumedToday", []),
                "favouriteRecipes": firestore_user_data.get("favouriteRecipes", []),
                "recipeMade": firestore_user_data.get("recipeMade", [])
            }
            return profile_data
        else:
            app.logger.warning(f"No Firestore profile found for UID {uid} in 'user' collection.")
            # Fallback to auth data if Firestore profile doesn't exist
            auth_user_info = auth.get_user(uid, app=firebase_app) if firebase_app else None
            if auth_user_info:
                return {
                    "uid": uid,
                    "email": auth_user_info.email,
                    "displayName": auth_user_info.display_name,
                    "username": None, # Or derive from email if needed
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


@app.route('/api/auth/me', methods=['GET'])
@firebase_auth_required
def get_current_user_info():
    """Returns detailed information about the currently authenticated user from Firestore."""
    user_uid = get_current_user_id()
    if not user_uid: # Should not happen if firebase_auth_required worked
        return jsonify({"error": "User not identifiable"}), 401 
        
    user_profile = get_user_profile_from_firestore(user_uid)
    if user_profile:
        return jsonify(user_profile), 200
    else:
        # This case implies that the user is authenticated (token is valid)
        # but their profile is missing from Firestore and couldn't be auto-created by get_user_profile_from_firestore.
        # This is unusual if login logic works correctly.
        # Fallback to token data if Firestore profile is truly missing.
        app.logger.warning(f"Firestore profile for UID {user_uid} still not found for /me endpoint. Falling back to token data.")
        token_user = request.user
        return jsonify({
            "uid": token_user.get("uid"),
            "email": token_user.get("email"),
            "displayName": token_user.get("name"), # 'name' in token often maps to displayName
            "picture": token_user.get("picture"),
            # Indicate that these are from token and might be incomplete
            "message": "Partial user data from token; Firestore profile missing."
        }), 200 # Still 200 as user is authenticated, but data is partial.


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


# --- Ingredients Endpoints ---
@app.route('/api/ingredients', methods=['POST'])
@firebase_auth_required
def add_ingredient():
    if not db: return jsonify({"error": "Database service not ready."}), 503
    try:
        data = request.get_json()
        if not data or 'name' not in data or 'unit' not in data or 'nutrition' not in data:
            return jsonify({"error": "Missing required fields: name, unit, nutrition"}), 400
        if not isinstance(data.get('nutrition'), dict):
            return jsonify({"error": "Invalid nutrition data: must be an object"}), 400
        
        # Consider adding validation for nutrition fields (e.g., calories, protein are numbers)

        ingredient_ref = db.collection('ingredients').document()
        ingredient_data = {
            'name': data['name'],
            'unit': data['unit'], # e.g., "100g", "1 piece". This is the unit for which nutrition is defined.
            'nutrition': data['nutrition'], # e.g., {"calories": 100, "protein": 10}
            'createdAt': firestore.SERVER_TIMESTAMP,
            'createdBy': get_current_user_id(),
            'updatedAt': firestore.SERVER_TIMESTAMP,
        }
        ingredient_ref.set(ingredient_data)
        
        # Return the created ingredient with its ID
        created_ingredient = ingredient_data.copy()
        created_ingredient['id'] = ingredient_ref.id
        # Convert timestamp for JSON response if needed, or client handles it
        # created_ingredient['createdAt'] = created_ingredient['createdAt'].isoformat() if hasattr(created_ingredient['createdAt'], 'isoformat') else str(created_ingredient['createdAt'])
        # created_ingredient['updatedAt'] = created_ingredient['updatedAt'].isoformat() if hasattr(created_ingredient['updatedAt'], 'isoformat') else str(created_ingredient['updatedAt'])


        app.logger.info(f"Ingredient '{data['name']}' added by user {get_current_user_id()}.")
        return jsonify({"message": "Ingredient added successfully", "ingredient": created_ingredient}), 201
    except Exception as e:
        app.logger.error(f"Error adding ingredient: {e}")
        return jsonify({"error": "Failed to add ingredient", "details": str(e)}), 500

@app.route('/api/ingredients', methods=['GET'])
def get_ingredients(): # Publicly accessible or @firebase_auth_required? Assuming public for now.
    if not db: return jsonify({"error": "Database service not ready."}), 503
    try:
        # Consider pagination for large datasets: .limit(X).offset(Y) or .start_after(doc_snapshot)
        ingredients_query = db.collection('ingredients').order_by('name')
        
        # Example: Search by name prefix if query param 'name' is provided
        search_name = request.args.get('name')
        if search_name:
            app.logger.debug(f"Searching ingredients with name starting with: {search_name}")
            # Firestore prefix search: >= search_name and <= search_name + '\uf8ff'
            ingredients_query = ingredients_query.where('name', '>=', search_name).where('name', '<=', search_name + u'\uf8ff')

        ingredients_stream = ingredients_query.stream()
        ingredients = []
        for ingredient_doc in ingredients_stream:
            ing_data = ingredient_doc.to_dict()
            ing_data['id'] = ingredient_doc.id
            ingredients.append(ing_data)
        return jsonify(ingredients), 200
    except Exception as e:
        app.logger.error(f"Error fetching ingredients: {e}")
        return jsonify({"error": "Failed to fetch ingredients", "details": str(e)}), 500

@app.route('/api/ingredients/<ingredient_id>', methods=['GET'])
def get_ingredient_by_id(ingredient_id):
    if not db: return jsonify({"error": "Database service not ready."}), 503
    try:
        ingredient_doc = db.collection('ingredients').document(ingredient_id).get()
        if not ingredient_doc.exists:
            return jsonify({"error": "Ingredient not found"}), 404
        
        ingredient_data = ingredient_doc.to_dict()
        ingredient_data['id'] = ingredient_doc.id
        return jsonify(ingredient_data), 200
    except Exception as e:
        app.logger.error(f"Error fetching ingredient {ingredient_id}: {e}")
        return jsonify({"error": "Failed to fetch ingredient", "details": str(e)}), 500


@app.route('/api/ingredients/<ingredient_id>', methods=['PUT'])
@firebase_auth_required # Or admin only, depending on rules
def update_ingredient(ingredient_id):
    if not db: return jsonify({"error": "Database service not ready."}), 503
    
    user_id = get_current_user_id() # For logging or ownership check if applicable
    
    try:
        ingredient_ref = db.collection('ingredients').document(ingredient_id)
        ingredient_doc = ingredient_ref.get()

        if not ingredient_doc.exists:
            return jsonify({"error": "Ingredient not found"}), 404

        # Optional: Check if user is allowed to update (e.g., original creator or admin)
        # original_creator_uid = ingredient_doc.to_dict().get('createdBy')
        # if original_creator_uid != user_id and not user_is_admin(user_id): # Assuming user_is_admin function
        #     return jsonify({"error": "Forbidden: You are not allowed to update this ingredient"}), 403

        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided for update"}), 400

        update_payload = {}
        if 'name' in data: update_payload['name'] = data['name']
        if 'unit' in data: update_payload['unit'] = data['unit']
        if 'nutrition' in data:
            if not isinstance(data['nutrition'], dict):
                return jsonify({"error": "Invalid nutrition data: must be an object"}), 400
            update_payload['nutrition'] = data['nutrition']
        
        if not update_payload:
            return jsonify({"error": "No updatable fields provided"}), 400

        update_payload['updatedAt'] = firestore.SERVER_TIMESTAMP
        
        ingredient_ref.update(update_payload)
        
        updated_doc = ingredient_ref.get() # Fetch the updated document
        response_data = updated_doc.to_dict()
        response_data['id'] = updated_doc.id

        app.logger.info(f"Ingredient {ingredient_id} updated by user {user_id}.")
        return jsonify({"message": "Ingredient updated successfully", "ingredient": response_data}), 200
    except Exception as e:
        app.logger.error(f"Error updating ingredient {ingredient_id}: {e}")
        return jsonify({"error": "Failed to update ingredient", "details": str(e)}), 500

@app.route('/api/ingredients/<ingredient_id>', methods=['DELETE'])
@firebase_auth_required # Or admin only
def delete_ingredient(ingredient_id):
    if not db: return jsonify({"error": "Database service not ready."}), 503
    user_id = get_current_user_id()

    try:
        ingredient_ref = db.collection('ingredients').document(ingredient_id)
        ingredient_doc = ingredient_ref.get()

        if not ingredient_doc.exists:
            return jsonify({"error": "Ingredient not found"}), 404

        # Optional: Ownership/admin check
        # original_creator_uid = ingredient_doc.to_dict().get('createdBy')
        # if original_creator_uid != user_id and not user_is_admin(user_id):
        #     return jsonify({"error": "Forbidden: You are not allowed to delete this ingredient"}), 403
        
        # Note: Deleting an ingredient might affect recipes that use it.
        # Consider how to handle this (e.g., soft delete, warning, disallow if in use).
        # For this implementation, it's a hard delete.
        ingredient_ref.delete()
        app.logger.info(f"Ingredient {ingredient_id} deleted by user {user_id}.")
        return jsonify({"message": "Ingredient deleted successfully"}), 200 # Or 204 No Content
    except Exception as e:
        app.logger.error(f"Error deleting ingredient {ingredient_id}: {e}")
        return jsonify({"error": "Failed to delete ingredient", "details": str(e)}), 500


# --- Recipes Endpoints (largely from prototype, with minor adjustments) ---
@app.route('/api/recipes', methods=['POST'])
@firebase_auth_required
def create_recipe():
    if not db: return jsonify({"error": "Database service not ready."}), 503
    user_id = get_current_user_id()
    try:
        data = request.get_json()
        required_fields = ['name', 'ingredients', 'instructions']
        if not data or not all(field in data for field in required_fields):
            # Be more specific about which field is missing
            missing = [field for field in required_fields if field not in data]
            return jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400
        
        if not isinstance(data['ingredients'], list) or not data['ingredients']:
            return jsonify({"error": "Ingredients must be a non-empty list"}), 400

        for item in data['ingredients']:
            if not all(k in item for k in ('ingredientId', 'quantity', 'unit')):
                return jsonify({"error": "Each recipe ingredient must have ingredientId, quantity, and unit"}), 400
            if not (isinstance(item['quantity'], (int, float)) and item['quantity'] > 0):
                return jsonify({"error": f"Invalid quantity for ingredient item: {item.get('ingredientId', 'Unknown')}. Must be a positive number."}), 400
            if not item.get('unit') or not isinstance(item.get('unit'), str):
                 return jsonify({"error": f"Invalid unit for ingredient item: {item.get('ingredientId', 'Unknown')}. Must be a non-empty string."}), 400


        recipe_ref = db.collection('recipes').document()
        recipe_data = {
            'userId': user_id,
            'name': data['name'],
            'instructions': data['instructions'],
            'ingredients': data['ingredients'], # List of {ingredientId, quantity, unit}
            'description': data.get('description', ''), # Optional
            'category': data.get('category', ''), # Optional
            'imageUrl': data.get('imageUrl', ''), # Optional
            'prepTime': data.get('prepTime', ''), # Optional, e.g., "30 minutes"
            'cookTime': data.get('cookTime', ''), # Optional
            'servings': data.get('servings', 0), # Optional
            'createdAt': firestore.SERVER_TIMESTAMP,
            'updatedAt': firestore.SERVER_TIMESTAMP
        }
        recipe_ref.set(recipe_data)
        
        created_recipe = recipe_data.copy()
        created_recipe['id'] = recipe_ref.id
        
        app.logger.info(f"Recipe '{data['name']}' created by user {user_id}.")
        return jsonify({"message": "Recipe created successfully", "recipe": created_recipe}), 201
    except Exception as e:
        app.logger.error(f"Error creating recipe for user {user_id}: {e}")
        return jsonify({"error": "Failed to create recipe", "details": str(e)}), 500

@app.route('/api/recipes', methods=['GET'])
def get_all_recipes(): # Public or auth_required? Assuming public for now.
    if not db: return jsonify({"error": "Database service not ready."}), 503
    try:
        recipes_query = db.collection('recipes')
        
        user_id_filter = request.args.get('userId')
        if user_id_filter:
            recipes_query = recipes_query.where('userId', '==', user_id_filter)
        
        # Add more filters, e.g., by category, name search
        category_filter = request.args.get('category')
        if category_filter:
            recipes_query = recipes_query.where('category', '==', category_filter)

        # Default ordering, consider making this configurable
        recipes_query = recipes_query.order_by('updatedAt', direction=firestore.Query.DESCENDING)
        
        # Pagination
        limit = request.args.get('limit', default=10, type=int)
        start_after_id = request.args.get('startAfter')
        
        if start_after_id:
            last_doc_snapshot = db.collection('recipes').document(start_after_id).get()
            if last_doc_snapshot.exists:
                recipes_query = recipes_query.start_after(last_doc_snapshot)
        
        recipes_query = recipes_query.limit(limit)
        
        recipes_stream = recipes_query.stream()
        recipes = []
        last_doc_id_for_next_page = None
        for recipe_doc in recipes_stream:
            recipe_data = recipe_doc.to_dict()
            recipe_data['id'] = recipe_doc.id
            recipes.append(recipe_data)
            last_doc_id_for_next_page = recipe_doc.id
            
        response = {"recipes": recipes}
        if last_doc_id_for_next_page and len(recipes) == limit : # More items might exist
             response["nextPageStartAfter"] = last_doc_id_for_next_page

        return jsonify(response), 200
    except Exception as e:
        app.logger.error(f"Error fetching recipes: {e}")
        return jsonify({"error": "Failed to fetch recipes", "details": str(e)}), 500

@app.route('/api/recipes/<recipe_id>', methods=['GET'])
def get_recipe(recipe_id):
    if not db: return jsonify({"error": "Database service not ready."}), 503
    try:
        recipe_doc = db.collection('recipes').document(recipe_id).get()
        if not recipe_doc.exists:
            return jsonify({"error": "Recipe not found"}), 404
        
        recipe_data = recipe_doc.to_dict()
        recipe_data['id'] = recipe_doc.id
        return jsonify(recipe_data), 200
    except Exception as e:
        app.logger.error(f"Error fetching recipe {recipe_id}: {e}")
        return jsonify({"error": "Failed to fetch recipe", "details": str(e)}), 500

@app.route('/api/recipes/<recipe_id>', methods=['PUT'])
@firebase_auth_required
def update_recipe(recipe_id):
    if not db: return jsonify({"error": "Database service not ready."}), 503
    user_id = get_current_user_id()
    try:
        recipe_ref = db.collection('recipes').document(recipe_id)
        recipe_doc = recipe_ref.get()
        if not recipe_doc.exists: return jsonify({"error": "Recipe not found"}), 404
        
        recipe_owner_uid = recipe_doc.to_dict().get('userId')
        if recipe_owner_uid != user_id:
            # Add admin override possibility if you have roles
            # if not user_is_admin(user_id): 
            return jsonify({"error": "Forbidden: You are not the owner of this recipe"}), 403

        data = request.get_json()
        if not data: return jsonify({"error": "No data provided for update"}), 400
        
        update_payload = {}
        allowed_fields = ['name', 'instructions', 'ingredients', 'description', 'category', 'imageUrl', 'prepTime', 'cookTime', 'servings']
        for field in allowed_fields:
            if field in data:
                if field == 'ingredients':
                    if not isinstance(data['ingredients'], list):
                        return jsonify({"error": "Ingredients must be a list"}), 400
                    for item in data['ingredients']: # Validate each ingredient item
                        if not all(k in item for k in ('ingredientId', 'quantity', 'unit')):
                            return jsonify({"error": "Each recipe ingredient must have ingredientId, quantity, and unit"}), 400
                        if not (isinstance(item['quantity'], (int, float)) and item['quantity'] > 0):
                             return jsonify({"error": f"Invalid quantity for ingredient item: {item.get('ingredientId', 'Unknown')}"}), 400
                        if not item.get('unit') or not isinstance(item.get('unit'), str):
                            return jsonify({"error": f"Invalid unit for ingredient item: {item.get('ingredientId', 'Unknown')}"}), 400
                update_payload[field] = data[field]

        if not update_payload: return jsonify({"error": "No updatable fields provided or fields are not allowed for update"}), 400
        
        update_payload['updatedAt'] = firestore.SERVER_TIMESTAMP
        
        recipe_ref.update(update_payload)
        updated_doc_dict = recipe_ref.get().to_dict() # Fetch after update
        updated_doc_dict['id'] = recipe_ref.id
        
        app.logger.info(f"Recipe {recipe_id} updated by user {user_id}.")
        return jsonify({"message": "Recipe updated successfully", "recipe": updated_doc_dict}), 200
    except Exception as e:
        app.logger.error(f"Error updating recipe {recipe_id} for user {user_id}: {e}")
        return jsonify({"error": "Failed to update recipe", "details": str(e)}), 500

@app.route('/api/recipes/<recipe_id>', methods=['DELETE'])
@firebase_auth_required
def delete_recipe(recipe_id):
    if not db: return jsonify({"error": "Database service not ready."}), 503
    user_id = get_current_user_id()
    try:
        recipe_ref = db.collection('recipes').document(recipe_id)
        recipe_doc = recipe_ref.get()
        if not recipe_doc.exists: return jsonify({"error": "Recipe not found"}), 404
        
        recipe_owner_uid = recipe_doc.to_dict().get('userId')
        if recipe_owner_uid != user_id:
            # Add admin override
            # if not user_is_admin(user_id):
            return jsonify({"error": "Forbidden: You are not the owner of this recipe"}), 403

        recipe_ref.delete()
        app.logger.info(f"Recipe {recipe_id} deleted by user {user_id}.")
        return jsonify({"message": "Recipe deleted successfully"}), 200 # Or 204 No Content
    except Exception as e:
        app.logger.error(f"Error deleting recipe {recipe_id} for user {user_id}: {e}")
        return jsonify({"error": "Failed to delete recipe", "details": str(e)}), 500

# --- Nutrition Calculation Endpoint (from prototype, with minor logging) ---
@app.route('/api/recipes/<recipe_id>/nutrition', methods=['GET'])
def calculate_recipe_nutrition(recipe_id):
    if not db: return jsonify({"error": "Database service not ready."}), 503
    try:
        recipe_doc = db.collection('recipes').document(recipe_id).get()
        if not recipe_doc.exists: return jsonify({"error": "Recipe not found"}), 404

        recipe_data = recipe_doc.to_dict()
        recipe_ingredients_list = recipe_data.get('ingredients', [])
        if not recipe_ingredients_list:
            return jsonify({"totalNutrition": {}, "message": "Recipe has no ingredients"}), 200

        total_nutrition = {}
        calculation_warnings = []
        ingredient_details_cache = {} 

        for item in recipe_ingredients_list:
            ingredient_id = item.get('ingredientId')
            quantity_in_recipe = item.get('quantity') # This is the quantity of 'unit_in_recipe'
            unit_in_recipe = item.get('unit', "").strip().lower() # e.g., "g", "ml", "tbsp", "piece"

            if not (ingredient_id and isinstance(quantity_in_recipe, (int, float)) and quantity_in_recipe > 0 and unit_in_recipe):
                calculation_warnings.append(f"Skipped invalid ingredient entry in recipe: {item}")
                continue
            
            master_ingredient_data = ingredient_details_cache.get(ingredient_id)
            if not master_ingredient_data:
                master_ingredient_doc = db.collection('ingredients').document(ingredient_id).get()
                if not master_ingredient_doc.exists:
                    calculation_warnings.append(f"Master data for ingredient ID '{ingredient_id}' not found.")
                    continue
                master_ingredient_data = master_ingredient_doc.to_dict()
                ingredient_details_cache[ingredient_id] = master_ingredient_data

            nutrition_per_standard_unit = master_ingredient_data.get('nutrition', {}) # e.g. {"calories": 300}
            # This is the unit for which 'nutrition_per_standard_unit' is defined.
            # e.g., "100g", "1 piece", "100ml"
            standard_unit_definition_from_db = master_ingredient_data.get('unit', "").strip().lower() 

            if not standard_unit_definition_from_db or not nutrition_per_standard_unit:
                calculation_warnings.append(f"Ingredient '{master_ingredient_data.get('name', ingredient_id)}' has incomplete master data (missing unit or nutrition values).")
                continue

            scaling_factor = 1.0
            # --- UNIT CONVERSION LOGIC ---
            # This is still simplified. A robust solution needs a proper unit conversion library
            # or a more structured way to define conversions (e.g., density for g <-> ml, standard sizes for pieces).
            # Current logic:
            # 1. If recipe unit matches master unit definition (e.g., recipe uses "100g", master is "100g")
            #    -> scaling_factor = quantity_in_recipe (meaning recipe uses X of the master units)
            # 2. If master unit is "100g" and recipe unit is "g"
            #    -> scaling_factor = quantity_in_recipe / 100
            # 3. If master unit is "1kg" and recipe unit is "g"
            #    -> scaling_factor = quantity_in_recipe / 1000
            # 4. If master unit is "1 piece" and recipe unit is "piece" (or "pieces")
            #    -> scaling_factor = quantity_in_recipe
            # ... and so on. This needs to be very carefully managed.

            try:
                if standard_unit_definition_from_db == unit_in_recipe:
                    scaling_factor = float(quantity_in_recipe)
                # Example: Master is "100g", recipe uses "g"
                elif standard_unit_definition_from_db == "100g" and unit_in_recipe == "g":
                    scaling_factor = float(quantity_in_recipe) / 100.0
                elif standard_unit_definition_from_db == "1kg" and unit_in_recipe == "g":
                     scaling_factor = float(quantity_in_recipe) / 1000.0
                elif standard_unit_definition_from_db == "1kg" and unit_in_recipe == "kg":
                     scaling_factor = float(quantity_in_recipe)
                # Example: Master is "1 piece", recipe uses "piece"
                elif (standard_unit_definition_from_db == "1 piece" or standard_unit_definition_from_db == "piece") and \
                     (unit_in_recipe == "piece" or unit_in_recipe == "pieces"):
                    scaling_factor = float(quantity_in_recipe)
                # Add more common conversions like ml to l, tbsp to ml (approximate) if needed
                # For tbsp, tsp, cup to grams, it's highly ingredient-dependent.
                else:
                    # If no direct conversion rule, and units are different, add a warning.
                    # If units are the same but not covered by specific rules (e.g. master "250ml", recipe "ml")
                    # this part needs to be smarter.
                    if standard_unit_definition_from_db != unit_in_recipe:
                         calculation_warnings.append(f"Unit conversion not explicitly supported between '{standard_unit_definition_from_db}' (master) and '{unit_in_recipe}' (recipe) for ingredient '{master_ingredient_data.get('name', ingredient_id)}'. Assuming direct quantity scaling if units are numerically compatible or identical, otherwise results may be inaccurate.")
                         # Fallback: if units are just numbers like "100" and "1", it's ambiguous.
                         # For now, if not matched, it defaults to scaling_factor = 1.0 which is likely wrong if units differ.
                         # A better default if units mismatch and no rule applies might be to skip or use a more prominent error.
                         # Let's assume quantity_in_recipe is the multiplier for the master unit's nutrition if no other rule applies.
                         # This is a risky assumption if units are truly different without conversion.
                         # A safer approach for unhandled different units:
                         # scaling_factor = 0 # Or skip this ingredient
                         # calculation_warnings.append(f"Cannot convert units for '{master_ingredient_data.get('name', ingredient_id)}'. Skipped.")
                         # continue
                         # For now, let's stick to the prototype's implicit behavior if no rule matches,
                         # which was to effectively use quantity_in_recipe as a multiplier of the base nutrition.
                         # This is only correct if unit_in_recipe IS the standard_unit_definition_from_db.
                         # The prototype had a more complex extraction of numbers from units.
                         # Let's refine it slightly:
                         
                         # Try to extract numeric part of standard unit if it's like "100g"
                         std_unit_val_str = ''.join(filter(str.isdigit, standard_unit_definition_from_db.split(unit_in_recipe)[0])) if unit_in_recipe and unit_in_recipe in standard_unit_definition_from_db else "1"
                         if not std_unit_val_str: std_unit_val_str = "1" # Default if no numeric prefix found (e.g. master "g", recipe "g")
                         
                         try:
                            std_unit_numeric_base = float(std_unit_val_str)
                            if std_unit_numeric_base == 0: raise ValueError("Base unit quantity cannot be zero.")
                            
                            if unit_in_recipe in standard_unit_definition_from_db: # e.g. master "100g", recipe "g"
                                scaling_factor = float(quantity_in_recipe) / std_unit_numeric_base
                            elif standard_unit_definition_from_db in unit_in_recipe: # e.g. master "g", recipe "100g" - less common
                                scaling_factor = (float(quantity_in_recipe) * std_unit_numeric_base) # This logic might need review
                            else: # Units are different and not directly related by simple prefix/suffix
                                calculation_warnings.append(f"Incompatible units or complex conversion needed for '{master_ingredient_data.get('name', ingredient_id)}' ('{standard_unit_definition_from_db}' vs '{unit_in_recipe}'). Calculation may be inaccurate.")
                                # Default to 1, or skip by 'continue'
                                scaling_factor = 1.0 # Defaulting to 1 is risky, but for demonstration.

                         except ValueError:
                            calculation_warnings.append(f"Could not parse numeric base from master unit '{standard_unit_definition_from_db}' for ingredient '{master_ingredient_data.get('name', ingredient_id)}'.")
                            continue # Skip this ingredient if unit parsing fails

            except ValueError as ve:
                calculation_warnings.append(f"Error processing units for ingredient '{master_ingredient_data.get('name', ingredient_id)}': {ve}. Results may be inaccurate.")
                continue
            
            for nutrient, value in nutrition_per_standard_unit.items():
                if isinstance(value, (int, float)):
                    total_nutrition[nutrient] = total_nutrition.get(nutrient, 0) + (value * scaling_factor)
                else: # Log if a nutrient value is not a number
                    calculation_warnings.append(f"Nutrient '{nutrient}' for ingredient '{master_ingredient_data.get('name', ingredient_id)}' has non-numeric value '{value}'.")
        
        response_payload = {
            "recipeId": recipe_id,
            "recipeName": recipe_data.get("name"),
            "totalNutrition": {k: round(v, 2) for k, v in total_nutrition.items()}, # Round to 2 decimal places
        }
        if calculation_warnings:
            response_payload["warnings"] = calculation_warnings
            app.logger.info(f"Nutrition calculation for recipe {recipe_id} (Name: {recipe_data.get('name')}) completed with warnings: {calculation_warnings}")
        else:
            app.logger.info(f"Nutrition calculation for recipe {recipe_id} (Name: {recipe_data.get('name')}) completed successfully.")

        return jsonify(response_payload), 200

    except Exception as e:
        app.logger.error(f"Error calculating nutrition for recipe {recipe_id}: {e}", exc_info=True) # exc_info for traceback
        return jsonify({"error": "Failed to calculate nutrition", "details": str(e)}), 500


if __name__ == '__main__':
    is_development = os.environ.get('FLASK_ENV', 'production').lower() == 'development'
    # Use PORT environment variable for deployment platforms like Heroku, Google App Engine
    port = int(os.environ.get('PORT', 5000)) # Changed default to 5001 to avoid conflict with Next.js dev server (often 3000) or other common ports
    app.run(host='0.0.0.0', port=port, debug=is_development)
