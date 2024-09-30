# python version to use for 2.17 tensorflow
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /flask-app


# Copy the current directory contents into the container at /flask-app
COPY . /flask-app

# Install necessary Python dependencies from requirements.txt
RUN pip install --no-cache-dir -r requirements.txt


# Make port 5000 available to the outside world. the port that the Flask app runs on
EXPOSE 5000 

# Define the command to run the Flask app
CMD ["python", "predict.py"]