import gc
import requests
from PIL import Image
import numpy as np
from tensorflow.keras.applications.mobilenet_v2 import preprocess_input, decode_predictions
from tensorflow.keras.preprocessing.image import img_to_array
from tensorflow.keras.models import load_model
from io import BytesIO
import sys
sys.stdout.reconfigure(encoding='utf-8')


model= load_model('./fine_tuned_model_v9_256x256_randomize.h5')
#version 2 class
#class_labels = ['Abyssinian', 'American Staffordshire Terrier', 'Bengal', 'Birman', 'Boxer', 'British Shorthair', 'English Foxhound', 'German Shepherd', 'Golden Retriever', 'Persian']
#version 3 class
#class_labels=['Abyssinian', 'Bengal', 'Birman', 'Boxer', 'English Foxhound', 'French Bulldog', 'German Shepherd', 'Persian', 'Samoyed',"Sphynx"]
#version 4 class
#class_labels=['Abyssinian', 'Bengal', 'Birman', 'Boxer', 'English Foxhound', 'French Bulldog', 'German Shepherd', 'Persian', 'Samoyed',"Tuxedu"]
#version 5 class
#class_labels=['Abyssinian', 'Bengal', 'Bombay', 'English Foxhound', 'German Shepherd', 'Giant Schnauzer', 'Italian Greyhound', 'Persian', 'Samoyed',"Tuxedu"]
#version 6 class
#class_labels=['Abyssinian', 'Bengal', 'Birman', 'Boxer', 'English Foxhound', 'German Shepherd', 'Persian', 'Samoyed', 'Tuxedu','Yorkshire Terrier']
#version 7 class
#class_labels=['Abyssinian', 'Basenji', 'Bengal', 'Birman', 'EntleBucher', 'Persian', 'Samoyed', 'Scottish Deerhound', 'Siberian Husky','Tuxedu']
#versipon 8 class
#class_labels=['Abyssinian', 'African hunting Dog', 'Bengal', 'Birman', 'Brabacon Griffon', 'Cardigan', 'Dhole', 'Mexican Hairless', 'Persian','Tuxedu']
#versipon 9 class
class_labels=['Abyssinian', 'Bengal', 'Birman', 'EntleBucher', 'Samoyed', 'Scottish Deerhound','Tuxedu']



def preprocess_image_from_url(image_url):
    response = requests.get(image_url)
    img = Image.open(BytesIO(response.content))
    img = img.resize((256, 256))  # Resize the image to match MobileNetV2 input shape
    img_array = np.array(img)
    if len(img_array.shape) == 2:
            img_array = np.stack((img_array,) * 3, axis=-1)
    img_array=img_array / 255.0
    del img # Clean up memory to avoid memory errors (Gerek olmayabilir)
    gc.collect() # Clean up memory to avoid memory errors (Gerek olmayabilir)
    img_array = img_array.reshape((1, 256, 256, 3)) 
    return img_array




def predict_image(image_url):
    try:
        preprocessed_image = preprocess_image_from_url(image_url)
        predictions = model.predict(preprocessed_image)
        return predictions
    except Exception as e:
        print(f"Error predicting image: {e}")
        return []





if __name__ == "__main__":
    # Read the base64 encoded image from standard input
    image_url = sys.stdin.read().strip()
    predictions = predict_image(image_url)
    predicted_class_index = np.argmax(predictions)
    predicted_class_label = class_labels[predicted_class_index]
    predicted_probability = predictions[0][predicted_class_index]   
    print(f"&%/(){predicted_class_label}:{predicted_probability} &%/()")

   
        