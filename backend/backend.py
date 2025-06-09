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

        # Customize the response based on prediction confidence
        if accuracy < 90.0:
            response_message = f"The model is not confident in its prediction. The model is {accuracy}% confident in this prediction."
            predicted_class_label = 'Unknown'
        elif predicted_class_label == 'Normal':
            response_message = f"No signs of disease detected. The model is {accuracy}% confident in this prediction."
        else:
            response_message = f"The model detected {predicted_class_label} with {accuracy}% confidence."

        return {
            'class': predicted_class_label,
            'accuracy': accuracy,
            'message': response_message
        }

    except Exception as e:
        return {'error': str(e)}
    

@app.get("/test")
def test():
    return {'message': 'success'}
    

