from flask import Flask, request, jsonify
import tensorflow as tf
from tensorflow.keras.models import load_model
from tensorflow.keras.preprocessing.image import load_img, ImageDataGenerator, img_to_array
import numpy as np
from PIL import Image
import io

app = Flask(__name__)

model = load_model('InceptionV3_tuning.keras')


def preprocess_image(image):
    image = image.resize((299, 299))  # Resize the image to the target size
    img_array = img_to_array(image)  # Convert the image to a NumPy array
    img_array = img_array / 255.0  # Normalize the image
    img_array = np.expand_dims(img_array, axis=0)  # Add the batch dimension
    return img_array

@app.route('/predict', methods=['POST'])
def predict():

    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file  = request.files['file']

    try: 
        print(f"File received: {file.filename}")  # Print file information
        image = Image.open(io.BytesIO(file.read()))
        processed_image = preprocess_image(image)
        prediction = model.predict(processed_image)
        predicted_class = np.argmax(prediction, axis=1)

        class_label = ['CNV', 'DME', 'DRUSEN', 'NORMAL']

        return jsonify({'class': class_label[predicted_class[0]]})
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/test', methods=['GET'])
def test():
    return jsonify({'message': 'success'}), 200
    
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')



        


    

