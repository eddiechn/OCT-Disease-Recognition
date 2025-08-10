import numpy as np
import pandas as pd
from fastapi import FastAPI, File, UploadFile, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from tensorflow.keras.preprocessing.image import img_to_array
from PIL import Image
from typing import List, Dict, Optional
from pydantic import BaseModel  
import io
import os
import datetime
import psycopg2
from tensorflow.keras.applications.inception_v3 import InceptionV3
from psycopg2.extras import RealDictCursor
import uuid
import tensorflow as tf

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allow all methods
    allow_headers=["*"],  # Allow all headers
)

DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://eddie:ed123456@localhost:5432/oct_disease')

def get_db_connection():
    return psycopg2.connect(DATABASE_URL)

model = tf.keras.models.load_model('../dummy_model.h5')

# helper functions
def preprocess_image(image):
    img = image.resize((299, 299))
    img_array = img_to_array(img)
    img_array = np.expand_dims(img_array, axis=0)  # Add batch dimension
    return img_array


# Data models
class PatientBase(BaseModel):
    id: str
    name: str
    age: int
    gender: str
    current_appointment: Optional[datetime.datetime] = None

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
    upload_date: datetime.datetime
    prediction_condition: str
    prediction_confidence: float
    doctor_notes: Optional[str] = None
    doctor_confirmed: Optional[bool] = None
    doctor_corrected_diagnosis: Optional[str] = None
    assessed_by: Optional[str] = None
    assessed_date: Optional[datetime.datetime] = None

class ScanCreate(BaseModel):  # Separate create model without id
    patient_id: str
    image_url: str
    upload_date: datetime.datetime
    prediction_condition: str
    prediction_confidence: float
    doctor_notes: Optional[str] = None
    doctor_confirmed: Optional[bool] = None
    doctor_corrected_diagnosis: Optional[str] = None
    assessed_by: Optional[str] = None
    assessed_date: Optional[datetime.datetime] = None

class Scan(ScanBase):
    class Config:
        arbitrary_types_allowed = True
        from_attributes = True


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
            'upload_date': datetime.datetime.now().isoformat()
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
async def update_scan(scan_id: str, scan: ScanCreate):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute(
            "UPDATE scans SET patient_id = %s, image_url = %s, upload_date = %s, prediction_condition = %s, "
            "prediction_confidence = %s WHERE id = %s RETURNING *",
            (scan.patient_id, scan.image_url, scan.upload_date, scan.prediction_condition, scan.prediction_confidence, str(scan_id))
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
