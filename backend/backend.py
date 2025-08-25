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

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://eddie:ed123456@localhost:5432/oct_disease')
SECRET_KEY = os.environ.get('SECRET_KEY')
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

security = HTTPBearer()

def get_db_connection():
    return psycopg2.connect(DATABASE_URL)

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
