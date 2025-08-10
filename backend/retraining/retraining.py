from celery import Celery
from celery.schedules import crontab
import tensorflow as tf
import os
import psycopg2
from psycopg2.extras import RealDictCursor
import numpy as np
from PIL import Image
import os
from tensorflow.keras.preprocessing.image import img_to_array

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, 'dummy_model.h5')
UPLOADS_PATH = os.path.join(BASE_DIR, 'uploads')

# Initialize Celery with Redis backend
app = Celery('oct_disease',
             broker='redis://localhost:6379/0',
             backend='redis://localhost:6379/0')

# Celery configuration
app.conf.update(
    result_expires=3600,  # Results expire in 1 hour
    enable_utc=True,
    timezone='UTC'
)

# Schedule the retraining task to run every 7 days
app.conf.beat_schedule = {
    'retrain-model-weekly': {
        'task': 'celery_app.retrain_model',
        'schedule': crontab(day_of_week='0', hour='0', minute='0'),  # Run at midnight on Sundays
        'args': ()
    }
}

@app.task
def retrain_model():
    try:
        # Load the current model
        current_model = tf.keras.models.load_model(MODEL_PATH)

        # Get new training data
        new_data = get_new_training_data()
        
        if new_data:
            # Retrain the model
            history = current_model.fit(
                new_data['x_train'],
                new_data['y_train'],
                epochs=5,
                validation_split=0.2
            )
            
            # Save the retrained model
            new_model_path = os.path.join(BASE_DIR, 'dummy_model_new.h5')
            current_model.save(new_model_path)

            # If save successful, replace old model
            os.replace(new_model_path, MODEL_PATH)

            return {
                'status': 'success',
                'metrics': {
                    'accuracy': history.history['accuracy'][-1],
                    'loss': history.history['loss'][-1]
                }
            }
        
        return {'status': 'no_new_data'}
        
    except Exception as e:
        return {'status': 'error', 'message': str(e)}

def get_new_training_data():
    """
    Fetch new training data from uploads folder and doctor assessments from database
    Returns a dict with 'x_train' and 'y_train' if new data exists
    """
    try:
        # Connect to database
        conn = psycopg2.connect(
            "postgresql://eddie:ed123456@localhost:5432/oct_disease"
        )
        cursor = conn.cursor(cursor_factory=RealDictCursor)

        # Get scans with doctor assessments
        cursor.execute("""
            SELECT image_url, prediction_condition, doctor_corrected_diagnosis
            FROM scans
            WHERE doctor_confirmed = true 
            AND doctor_notes IS NOT NULL
        """)
        
        scans = cursor.fetchall()
        
        if not scans:
            return None

        x_train = []
        y_train = []
        
        for scan in scans:
            try:
                # Get image path from URL
                image_path = scan['image_url'].replace('http://localhost:8000/uploads/', '')
                full_path = os.path.join(UPLOADS_PATH, image_path)

                # Load and preprocess image
                img = Image.open(full_path)
                img = img.resize((299, 299))
                img_array = img_to_array(img)
                img_array = np.expand_dims(img_array, axis=0)
                
                # Use corrected diagnosis if available, otherwise use original prediction
                label = scan['doctor_corrected_diagnosis'] or scan['prediction_condition']
                
                x_train.append(img_array[0])
                y_train.append(label)
                
            except Exception as e:
                print(f"Error processing image {scan['image_url']}: {str(e)}")
                continue
        
        if not x_train or not y_train:
            return None
            
        # Convert to numpy arrays
        x_train = np.array(x_train)
        
        # Convert labels to one-hot encoding
        unique_labels = list(set(y_train))
        label_to_index = {label: i for i, label in enumerate(unique_labels)}
        y_train = np.array([label_to_index[label] for label in y_train])
        y_train = tf.keras.utils.to_categorical(y_train)
        
        return {
            'x_train': x_train,
            'y_train': y_train,
            'label_mapping': label_to_index
        }
        
    except Exception as e:
        print(f"Error getting training data: {str(e)}")
        return None
        
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()