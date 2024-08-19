from flask import Flask, request, jsonify
from flask_cors import CORS
from tensorflow.keras.models import load_model # type: ignore
from tensorflow.keras.preprocessing.image import load_img, ImageDataGenerator, img_to_array # type: ignore
import numpy as np
from PIL import Image
import io

app = Flask(__name__)
CORS(app) #handle requests from other origins

model = load_model('../InceptionV3_tuning.keras')


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
        predicted_probability = prediction[0][predicted_class]

        class_label = ['Choroidal neovascularization', 'Diabetic Macular Edema', 'Drusen', 'Normal']

        predicted_class_label = class_label[predicted_class[0]]

        if predicted_class_label == 'Normal':
            response_message = f"There are no signs of disease in the selected eye. The model is {round(float(predicted_probability) * 100, 2)}% confident in this prediction. There is no need to advance the patient's appointment."
        else:
            response_message = f"The model has identified the selected eye as having {class_label[predicted_class[0]]}. The model is {round(float(predicted_probability) * 100, 2)}% confident in this prediction."



        return jsonify({'class': class_label[predicted_class[0]], 
                        'accuracy': round(float(predicted_probability) * 100, 2),
                        'message' : response_message}
                       ), 200
        
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    
@app.route('/test', methods=['GET'])
def test():
    return jsonify({'message': 'success'}), 200
    
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')



        


    

