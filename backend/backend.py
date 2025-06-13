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

model = InceptionV3(weights='imagenet', include_top=True)
# model = tf.keras.models.load_model('./models/InceptionV3_tuning.keras') 



# helper functions
def preprocess_image(image):
    image = image.convert('L')  
    image = image.resize((299, 299))  # Resize image for the model
    img_array = img_to_array(image)  # Convert image to array
    img_array = img_array / 255.0  # Normalize the image
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

class ScanCreate(ScanBase):
    pass

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
        # Read the uploaded file
        image = Image.open(io.BytesIO(await file.read()))
        processed_image = preprocess_image(image)
        prediction = model.predict(processed_image)
        
        predicted_class = np.argmax(prediction, axis=1)[0]
        predicted_probability = prediction[0][predicted_class]
        accuracy = round(float(predicted_probability) * 100, 2)

        class_labels = ['Choroidal Neovascularization', 'Diabetic Macular Edema', 'Drusen', 'Normal']
        predicted_class_label = class_labels[predicted_class]

        os.makedirs('uploads', exist_ok=True)
        image_filename = f"uploads_{uuid.uuid4()}.jpg"
        image_path = os.path.join('uploads', image_filename)
        image.save(image_path)
        
        return {
            'predicted_class': predicted_class_label,
            'predicted_probability': accuracy/100,
            'image_url': image_path
        }

    except Exception as e:
        return {'error': str(e)}
    
@app.post("/scans/{patient_id}", response_model=Scan)
async def create_scan(patient_id: str, scan: ScanCreate):
    conn = get_db_connection()
    cursor = conn.cursor(cursor_factory=RealDictCursor)

    try:
        cursor.execute(
            "INSERT INTO scans (patient_id, image_url, upload_date, prediction_condition, prediction_confidence) "
            "VALUES (%s, %s, %s, %s, %s) RETURNING *",
            (patient_id, scan.image_url, datetime.now(), scan.prediction_condition, scan.prediction_confidence)
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


@app.get("/test")
def test():
    return {'message': 'success'}
