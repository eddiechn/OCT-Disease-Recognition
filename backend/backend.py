from dotenv import load_dotenv
import numpy as np
import pandas as pd
from fastapi import FastAPI, File, UploadFile, HTTPException, Body, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from tensorflow.keras.preprocessing.image import img_to_array
from PIL import Image
from typing import List, Dict, Optional
from pydantic import BaseModel  
import io
import os
import psycopg2
from tensorflow.keras.applications.inception_v3 import InceptionV3
from psycopg2.extras import RealDictCursor
import uuid
import tensorflow as tf
import jwt
from datetime import datetime, timedelta
import bcrypt
from functools import wraps
from dotenv import load_dotenv
import requests
import json

load_dotenv()

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # or your frontend origin
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://eddie:ed123456@localhost:5432/oct_disease')
SECRET_KEY = os.environ.get('SECRET_KEY')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Backboard API Configuration
BACKBOARD_API_KEY = os.environ.get('BACKBOARD_API_KEY')
BACKBOARD_BASE_URL = "https://app.backboard.io/api"
BACKBOARD_HEADERS = {"X-API-Key": BACKBOARD_API_KEY}

security = HTTPBearer()

def get_db_connection():
    return psycopg2.connect(DATABASE_URL)


def _run_sql_file(path: str):
    """Run SQL statements from a file against the configured database."""
    if not os.path.isfile(path):
        print(f"SQL file not found: {path}")
        return

    sql = open(path, "r").read()
    conn = None
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(sql)
        conn.commit()
        cursor.close()
        print(f"Executed SQL file: {path}")
    except Exception as e:
        print(f"Failed to execute SQL file {path}: {e}")
        if conn:
            conn.rollback()
    finally:
        if conn:
            conn.close()


@app.on_event("startup")
def ensure_chatbot_tables():
    """Ensure chatbot-related tables exist by running migration SQL on startup."""
    try:
        base_dir = os.path.dirname(__file__)
        sql_path = os.path.join(base_dir, "create_chatbot_tables.sql")
        _run_sql_file(sql_path)
    except Exception as e:
        print(f"Error ensuring chatbot tables: {e}")

model = tf.keras.models.load_model('../dummy_model.h5')

# helper functions
def preprocess_image(image):
    img = image.resize((299, 299))
    img_array = img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)  # Add batch dimension
    return img_array

# Authentication helper functions
def hash_password(password: str) -> str:
    """Hash a password for storing."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a stored password against one provided by user."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a new access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Get the current user from the JWT token."""
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Get user from database
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        cursor.execute("SELECT * FROM users WHERE username = %s", (username,))
        user = cursor.fetchone()
        if user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return user
    finally:
        cursor.close()
        conn.close()

def require_role(allowed_roles: List[str]):
    """Decorator to require specific roles."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Get current_user from kwargs (injected by FastAPI)
            current_user = kwargs.get('current_user')
            if not current_user or current_user.get('role') not in allowed_roles:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not enough permissions"
                )
            return await func(*args, **kwargs)
        return wrapper
    return decorator


# Backboard API helper functions
def create_backboard_assistant(patient_data: Dict) -> str:
    """Create a Backboard assistant for patient medical consultation."""
    patient_info = f"""Patient Information:
- Name: {patient_data.get('name', 'Unknown')}
- Age: {patient_data.get('age', 'Unknown')}
- Gender: {patient_data.get('gender', 'Unknown')}
- Medical History: {patient_data.get('medical_history', 'Not available')}
"""
    
    system_prompt = f"""You are a medical consultation chatbot assistant for OCT (Optical Coherence Tomography) disease diagnosis. 
{patient_info}

You have access to the patient's OCT scan records and diagnosis history. 

Your responsibilities:
- Provide information about the patient's OCT scans and diagnoses
- Answer questions about their eye conditions (Choroidal Neovascularization, Diabetic Macular Edema, Drusen, or Normal)
- Help track disease progression
- Answer clinical questions about diagnosis and treatment
- Remember important details about the patient across conversations
- Flag any concerning symptoms or changes for doctor review

Be professional, accurate, and always recommend human medical professional review for critical decisions.
Conditions you should know about:
1. Choroidal Neovascularization (CNV) - abnormal blood vessel growth
2. Diabetic Macular Edema (DME) - swelling in the macula due to diabetes
3. Drusen - yellow deposits under the retina
4. Normal - no disease detected"""
    
    response = requests.post(
        f"{BACKBOARD_BASE_URL}/assistants",
        headers=BACKBOARD_HEADERS,
        json={
            "name": f"OCT Assistant - {patient_data.get('name', 'Patient')}",
            "system_prompt": system_prompt,
            "embedding_provider": "openai",
            "embedding_model_name": "text-embedding-3-small",
            "embedding_dims": 1536,
            "memory": "Auto"
        }
    )
    
    if response.status_code != 200:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create Backboard assistant: {response.text}"
        )
    
    return response.json()["assistant_id"]

def create_backboard_thread(assistant_id: str) -> str:
    """Create a conversation thread with Backboard assistant."""
    response = requests.post(
        f"{BACKBOARD_BASE_URL}/assistants/{assistant_id}/threads",
        headers=BACKBOARD_HEADERS,
        json={}
    )
    
    if response.status_code != 200:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create conversation thread: {response.text}"
        )
    
    return response.json()["thread_id"]

def add_patient_memory(assistant_id: str, patient_id: str):
    """Add patient scan history and diagnosis to assistant memory."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Get patient info
        cursor.execute("SELECT * FROM patients WHERE id = %s", (patient_id,))
        patient = cursor.fetchone()
        
        # Get patient scans
        cursor.execute(
            "SELECT * FROM scans WHERE patient_id = %s ORDER BY upload_date DESC LIMIT 10",
            (patient_id,)
        )
        scans = cursor.fetchall()
        
        if patient and scans:
            # Create memory content with patient history
            memory_content = f"""Patient {patient['name']} ({patient['age']}yo {patient['gender']}):
Recent scan history:
"""
            for scan in scans:
                memory_content += f"- {scan['upload_date'].strftime('%Y-%m-%d')}: {scan['prediction_condition']} (confidence: {scan['prediction_confidence']*100:.1f}%)"
                if scan['doctor_corrected_diagnosis']:
                    memory_content += f" - Doctor corrected to: {scan['doctor_corrected_diagnosis']}"
                memory_content += "\n"
            
            # Add memory to assistant
            response = requests.post(
                f"{BACKBOARD_BASE_URL}/assistants/{assistant_id}/memories",
                headers=BACKBOARD_HEADERS,
                json={"content": memory_content}
            )
            
            if response.status_code != 200:
                print(f"Warning: Could not add memory to assistant: {response.text}")
    
    finally:
        cursor.close()
        conn.close()

def send_backboard_message(thread_id: str, message_content: str) -> str:
    """Send a message to Backboard and get response."""
    response = requests.post(
        f"{BACKBOARD_BASE_URL}/threads/{thread_id}/messages",
        headers=BACKBOARD_HEADERS,
        data={
            "content": message_content,
            "stream": "false",
            "memory": "Auto"
        }
    )
    
    if response.status_code != 200:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to send message: {response.text}"
        )
    
    return response.json()["content"]


# Authentication models
class UserBase(BaseModel):
    username: str
    email: str
    role: str  # 'doctor' or 'technician'

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class User(UserBase):
    id: str
    created_at: datetime
    class Config:
        arbitrary_types_allowed = True
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

# Data models
class PatientBase(BaseModel):
    id: str
    name: str
    age: int
    gender: str
    current_appointment: Optional[datetime] = None

class PatientCreate(PatientBase):
    pass
class Patient(PatientBase):
    class Config:
        arbitrary_types_allowed = True
        from_attributes = True

class ScanBase(BaseModel):
    id: str
    patient_id: str
    image_url: str
    upload_date: datetime
    prediction_condition: str
    prediction_confidence: float
    doctor_notes: Optional[str] = None
    doctor_confirmed: Optional[bool] = None
    doctor_corrected_diagnosis: Optional[str] = None
    assessed_by: Optional[str] = None
    assessed_date: Optional[datetime] = None

class ScanCreate(BaseModel):  # Separate create model without id
    patient_id: str
    image_url: str
    upload_date: datetime
    prediction_condition: str
    prediction_confidence: float
    doctor_notes: Optional[str] = None
    doctor_confirmed: Optional[bool] = None
    doctor_corrected_diagnosis: Optional[str] = None
    assessed_by: Optional[str] = None
    assessed_date: Optional[datetime] = None

class Scan(ScanBase):
    class Config:
        arbitrary_types_allowed = True
        from_attributes = True


# Chatbot models
class ChatMessage(BaseModel):
    content: str
    role: str  # 'user' or 'assistant'
    created_at: Optional[datetime] = None

class ChatThread(BaseModel):
    id: str
    assistant_id: str
    patient_id: Optional[str] = None
    user_id: str
    created_at: datetime
    updated_at: datetime
    class Config:
        arbitrary_types_allowed = True
        from_attributes = True

class ChatResponse(BaseModel):
    message: ChatMessage
    thread_id: str


# Authentication endpoints
@app.post("/register", response_model=Token)
async def register(user: UserCreate):
    """Register a new user."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Check if user already exists
        cursor.execute("SELECT id FROM users WHERE username = %s OR email = %s", (user.username, user.email))
        if cursor.fetchone():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Username or email already registered"
            )
        
        # Create new user
        user_id = str(uuid.uuid4())
        hashed_password = hash_password(user.password)
        
        cursor.execute(
            """INSERT INTO users (id, username, email, password_hash, role, created_at) 
               VALUES (%s, %s, %s, %s, %s, %s) RETURNING *""",
            (user_id, user.username, user.email, hashed_password, user.role, datetime.utcnow())
        )
        
        new_user = cursor.fetchone()
        conn.commit()
        
        # Create access token
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": new_user["username"]}, expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": new_user
        }
        
    except psycopg2.Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.post("/login", response_model=Token)
async def login(user_credentials: UserLogin):
    """Login user and return access token."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cursor.execute("SELECT * FROM users WHERE username = %s", (user_credentials.username,))
        user = cursor.fetchone()
        
        if not user or not verify_password(user_credentials.password, user["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect username or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(
            data={"sub": user["username"]}, expires_delta=access_token_expires
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "user": user
        }
        
    finally:
        cursor.close()
        conn.close()

@app.get("/users/me", response_model=User)
async def read_users_me(current_user: dict = Depends(get_current_user)):
    """Get current user profile."""
    return current_user


# Chatbot endpoints
@app.post("/chat/threads/{patient_id}", response_model=ChatThread)
async def start_chat_thread(patient_id: str, current_user: dict = Depends(get_current_user)):
    """Start a new chat session for a patient."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Get patient info
        cursor.execute("SELECT * FROM patients WHERE id = %s", (patient_id,))
        patient = cursor.fetchone()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        
        # Check if assistant exists for this patient, if not create one
        cursor.execute("SELECT backboard_assistant_id FROM chat_assistants WHERE patient_id = %s", (patient_id,))
        assistant_result = cursor.fetchone()
        
        if assistant_result:
            assistant_id = assistant_result["backboard_assistant_id"]
        else:
            # Create new assistant for this patient
            assistant_id = create_backboard_assistant(patient)
            
            # Save assistant to database
            cursor.execute(
                "INSERT INTO chat_assistants (patient_id, backboard_assistant_id) VALUES (%s, %s) RETURNING *",
                (patient_id, assistant_id)
            )
            conn.commit()
            
            # Add patient scan history to memory
            add_patient_memory(assistant_id, patient_id)
        
        # Create new thread
        thread_id = create_backboard_thread(assistant_id)
        
        # Save thread to database
        chat_thread_id = str(uuid.uuid4())
        cursor.execute(
            """INSERT INTO chat_threads 
               (id, assistant_id, backboard_thread_id, patient_id, user_id, created_at, updated_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s)
               RETURNING *""",
            (chat_thread_id, assistant_id, thread_id, patient_id, current_user["id"], datetime.utcnow(), datetime.utcnow())
        )
        new_thread = cursor.fetchone()
        conn.commit()
        
        return new_thread
    except psycopg2.Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.get("/chat/threads/{thread_id}")
async def get_chat_thread(thread_id: str, current_user: dict = Depends(get_current_user)):
    """Get a chat thread with all messages."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Get thread
        cursor.execute(
            "SELECT * FROM chat_threads WHERE id = %s AND user_id = %s",
            (thread_id, current_user["id"])
        )
        thread = cursor.fetchone()
        if not thread:
            raise HTTPException(status_code=404, detail="Thread not found")
        
        # Get messages
        cursor.execute(
            "SELECT * FROM chat_messages WHERE thread_id = %s ORDER BY created_at ASC",
            (thread_id,)
        )
        messages = cursor.fetchall()
        
        return {
            "thread": thread,
            "messages": messages
        }
    finally:
        cursor.close()
        conn.close()

@app.post("/chat/threads/{thread_id}/messages", response_model=ChatResponse)
async def send_chat_message(thread_id: str, message_content: str = Body(..., embed=True), current_user: dict = Depends(get_current_user)):
    """Send a message to the chatbot."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Get thread
        cursor.execute(
            "SELECT * FROM chat_threads WHERE id = %s AND user_id = %s",
            (thread_id, current_user["id"])
        )
        thread = cursor.fetchone()
        if not thread:
            raise HTTPException(status_code=404, detail="Thread not found")
        
        # Save user message
        user_msg_id = str(uuid.uuid4())
        cursor.execute(
            "INSERT INTO chat_messages (id, thread_id, content, role, created_at) VALUES (%s, %s, %s, %s, %s)",
            (user_msg_id, thread_id, message_content, "user", datetime.utcnow())
        )
        conn.commit()
        
        # Send to Backboard
        assistant_response = send_backboard_message(thread["backboard_thread_id"], message_content)
        
        # Save assistant response
        assistant_msg_id = str(uuid.uuid4())
        cursor.execute(
            "INSERT INTO chat_messages (id, thread_id, content, role, created_at) VALUES (%s, %s, %s, %s, %s)",
            (assistant_msg_id, thread_id, assistant_response, "assistant", datetime.utcnow())
        )
        
        # Update thread updated_at
        cursor.execute(
            "UPDATE chat_threads SET updated_at = %s WHERE id = %s",
            (datetime.utcnow(), thread_id)
        )
        conn.commit()
        
        return {
            "message": {
                "content": assistant_response,
                "role": "assistant",
                "created_at": datetime.utcnow()
            },
            "thread_id": thread_id
        }
    except psycopg2.Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.get("/chat/patient/{patient_id}/threads")
async def get_patient_chat_threads(patient_id: str, current_user: dict = Depends(get_current_user)):
    """Get all chat threads for a patient (by current user)."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cursor.execute(
            """SELECT * FROM chat_threads 
               WHERE patient_id = %s AND user_id = %s
               ORDER BY updated_at DESC""",
            (patient_id, current_user["id"])
        )
        threads = cursor.fetchall()
        return threads
    finally:
        cursor.close()
        conn.close()

@app.delete("/chat/threads/{thread_id}")
async def delete_chat_thread(thread_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a chat thread."""
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        # Verify ownership
        cursor.execute(
            "SELECT * FROM chat_threads WHERE id = %s AND user_id = %s",
            (thread_id, current_user["id"])
        )
        thread = cursor.fetchone()
        if not thread:
            raise HTTPException(status_code=404, detail="Thread not found")
        
        # Delete messages first (cascade should handle this, but being explicit)
        cursor.execute("DELETE FROM chat_messages WHERE thread_id = %s", (thread_id,))
        
        # Delete thread
        cursor.execute("DELETE FROM chat_threads WHERE id = %s RETURNING *", (thread_id,))
        deleted_thread = cursor.fetchone()
        conn.commit()
        
        return deleted_thread
    except psycopg2.Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

# api routes
@app.get("/patients", response_model=List[Patient])
async def get_patients():
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute("SELECT * FROM patients")
        patients = cursor.fetchall()
        return patients
    finally:
        cursor.close()
        conn.close()

@app.get("/patients/{patient_id}", response_model=Patient)
async def get_patient(patient_id: str):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute("SELECT * FROM patients WHERE id = %s", (str(patient_id),))
        patient = cursor.fetchone()
        if not patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        return patient
    finally:
        cursor.close()
        conn.close()

@app.post("/patients", response_model=Patient)
async def create_patient(patient: PatientCreate):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute(
            "INSERT INTO patients (id, name, age, gender, current_appointment) VALUES (%s, %s, %s, %s, %s) RETURNING *",
            (patient.id, patient.name, patient.age, patient.gender, patient.current_appointment)
        )
        new_patient = cursor.fetchone()
        conn.commit()
        return new_patient
    except psycopg2.Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.put("/patients/{patient_id}", response_model=Patient)
async def update_patient(patient_id: str, patient: PatientCreate):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute(
            "UPDATE patients SET name = %s, age = %s, gender = %s, current_appointment = %s WHERE id = %s RETURNING *",
            (patient.name, patient.age, patient.gender, patient.current_appointment, str(patient_id))
        )
        updated_patient = cursor.fetchone()
        if not updated_patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        conn.commit()
        return updated_patient
    except psycopg2.Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.delete("/patients/{patient_id}", response_model=Patient)
async def delete_patient(patient_id: str):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute("DELETE FROM patients WHERE id = %s RETURNING *", (str(patient_id),))
        deleted_patient = cursor.fetchone()
        if not deleted_patient:
            raise HTTPException(status_code=404, detail="Patient not found")
        conn.commit()
        return deleted_patient
    except psycopg2.Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()


@app.get("/scans", response_model=List[Scan])
async def get_scans():
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute("SELECT * FROM scans")
        scans = cursor.fetchall()
        return scans
    finally:
        cursor.close()
        conn.close()

@app.get("/patients/{patient_id}/scans", response_model=List[Scan])
async def get_scans_by_patient(patient_id: str):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute("SELECT * FROM scans WHERE patient_id = %s", (str(patient_id),))
        scans = cursor.fetchall()
        return scans
    finally:
        cursor.close()
        conn.close()


@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    try:
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))

        if image.mode != 'RGB':
            image = image.convert('RGB')

        # Create uploads directory if it doesn't exist
        os.makedirs("uploads", exist_ok=True)
        
        # Save the file with a unique name to avoid conflicts
        filename = f"{uuid.uuid4()}_{file.filename}"
        file_path = os.path.join("uploads", filename)

        image.save(file_path)
        
        img_array = preprocess_image(image)
        prediction = model.predict(img_array)
        predicted_class = np.argmax(prediction, axis=1)[0]
        predicted_probability = prediction[0][predicted_class]
        accuracy = round(float(predicted_probability) * 100, 2)

        class_labels = ['Choroidal Neovascularization', 'Diabetic Macular Edema', 'Drusen', 'Normal']
        predicted_class = class_labels[predicted_class]

        print(predicted_class)

        return {
            'predicted_class': str(predicted_class),
            'predicted_probability': accuracy / 100,
            'image_url': f"uploads/{filename}",
            'upload_date': datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    
@app.post("/scans/{patient_id}", response_model=Scan)
async def create_scan(patient_id: str, scan: ScanCreate):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        scan_id = str(uuid.uuid4())
        cursor.execute(
            """
            INSERT INTO scans 
            (id, patient_id, image_url, upload_date, prediction_condition, 
            prediction_confidence, doctor_notes, doctor_confirmed, 
            doctor_corrected_diagnosis, assessed_by, assessed_date) 
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s) 
            RETURNING *
            """,
            (
                scan_id, 
                patient_id, 
                scan.image_url, 
                scan.upload_date, 
                scan.prediction_condition,
                scan.prediction_confidence, 
                scan.doctor_notes,
                scan.doctor_confirmed,
                scan.doctor_corrected_diagnosis,
                scan.assessed_by,
                scan.assessed_date
            )
        )
        new_scan = cursor.fetchone()
        conn.commit()
        return new_scan
    except psycopg2.Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()
    
@app.put("/scans/{scan_id}", response_model=Scan)
async def update_scan(scan_id: str, scan: ScanCreate, current_user: dict = Depends(get_current_user)):
    # Only doctors can update scans with assessments
    if scan.doctor_notes or scan.doctor_confirmed is not None or scan.doctor_corrected_diagnosis:
        if current_user.get('role') != 'doctor':
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only doctors can provide assessments"
            )
    
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute(
            """UPDATE scans SET patient_id = %s, image_url = %s, upload_date = %s, 
               prediction_condition = %s, prediction_confidence = %s, doctor_notes = %s,
               doctor_confirmed = %s, doctor_corrected_diagnosis = %s, assessed_by = %s, 
               assessed_date = %s WHERE id = %s RETURNING *""",
            (scan.patient_id, scan.image_url, scan.upload_date, scan.prediction_condition, 
             scan.prediction_confidence, scan.doctor_notes, scan.doctor_confirmed,
             scan.doctor_corrected_diagnosis, current_user.get('username') if scan.doctor_notes else scan.assessed_by,
             datetime.utcnow() if scan.doctor_notes else scan.assessed_date, str(scan_id))
        )
        updated_scan = cursor.fetchone()
        if not updated_scan:
            raise HTTPException(status_code=404, detail="Scan not found")
        conn.commit()
        return updated_scan
    except psycopg2.Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.delete("/scans/{scan_id}", response_model=Scan)
async def delete_scan(scan_id: str):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)
    try:
        print(f"Deleting scan with ID: {scan_id}")  # Debug log
        cursor.execute("DELETE FROM scans WHERE id = %s RETURNING *", (scan_id,))
        deleted_scan = cursor.fetchone()
        if not deleted_scan:
            raise HTTPException(status_code=404, detail="Scan not found")
        conn.commit()
        return deleted_scan
    except psycopg2.Error as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cursor.close()
        conn.close()

@app.get("/test")
def test():
    return {'message': 'success'}
