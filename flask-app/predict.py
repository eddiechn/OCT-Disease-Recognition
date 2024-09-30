from flask import Flask, request, jsonify
from flask_cors import CORS
from tensorflow.keras.preprocessing.image import img_to_array
import numpy as np
from PIL import Image
import io
import os
import datetime
import psycopg2
import tensorflow as tf


app = Flask(__name__)
CORS(app)  # Enable CORS for cross-origin requests

# Load model from the environment variable path or default location
# MODEL_PATH = os.getenv('MODEL_PATH', './models/octmodel')

# layer = tf.keras.layers.TFSMLayer('./models/octmodel', call_endpoint='serving_default')
# input_layer = tf.keras.Input(shape = (299, 299, 1)) 
# outputs = layer(input_layer)
# model = tf.keras.Model(input_layer, outputs)

model = tf.keras.models.load_model('./models/InceptionV3_tuning.keras')


# Image preprocessing for model input
def preprocess_image(image):
    image = image.convert('L')  # Convert image to grayscale
    image = image.resize((299, 299))  # Resize image for the model
    img_array = img_to_array(image)  # Convert image to array
    img_array = img_array / 255.0  # Normalize the image
    img_array = np.expand_dims(img_array, axis=0)  # Add batch dimension
    return img_array

# Prediction route for analyzing eye images
@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    

    file = request.files['file']

    try:
        image = Image.open(io.BytesIO(file.read()))
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

        return jsonify({
            'class': predicted_class_label,
            'accuracy': accuracy,
            'message': response_message
        }), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Test route for checking if the server is running
@app.route('/test', methods=['GET'])
def test():
    return jsonify({'message': 'success'}), 200



DATABASE_URL = os.getenv('DATABASE_URL')

def get_db_connection():
    return psycopg2.connect(DATABASE_URL)

# Route to save appointment details including days saved and percentage saved
@app.route('/add_appointment', methods=['POST'])
def add_appointment():
    try:
        data = request.get_json()
        original_date = datetime.datetime.strptime(data['original_date'], '%Y-%m-%d').date()
        new_date = datetime.datetime.strptime(data['new_date'], '%Y-%m-%d').date()

        # Calculate days saved and percentage saved
        days_saved = (original_date - new_date).days if original_date > new_date else 0
        total_days = (original_date - datetime.date.today()).days
        percentage_saved = (days_saved / total_days) * 100 if total_days > 0 else 0

        conn = get_db_connection()
        cursor = conn.cursor()
        
        insert_query = """
            INSERT INTO appointments (original_date, new_date, days_saved, percentage_saved)
            VALUES (%s, %s, %s, %s)
        """
        cursor.execute(insert_query, (original_date, new_date, days_saved, percentage_saved))

        conn.commit()

        cursor.close()
        conn.close()



        return jsonify({
            'days_saved': days_saved,
            'percentage_saved': percentage_saved
        }), 200

    except Exception as e:
        print(e)
        return jsonify({'error': str(e)}), 500
    

# DATABASE CONNECTION


DATABASE_URL = os.environ.get('DATABASE_URL', 'postgresql://eddie:ed123456@db:5432/oct_disease')
    
@app.route('/stats', methods=['GET'])
def stats():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        select_query = """
            SELECT * FROM appointments
        """
        cursor.execute(select_query)
        data = cursor.fetchall()

        cursor.close()
        conn.close()

        total_saved_days = sum([row[2] for row in data])
        total_patients = len(data)
        average_percentage_saved = sum([row[3] for row in data]) / total_patients if total_patients > 0 else 0

        return jsonify(
            {
                'totalDaysSaved': total_saved_days,
                'totalAppointments': total_patients,
                'avgPercentageSaved': round(average_percentage_saved, 2)
            }
        ), 200

    except Exception as e:
        print(e)
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')