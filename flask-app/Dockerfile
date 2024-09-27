# Use an official Python 3.9 runtime as a parent image
FROM python:3.9-slim

# Set the working directory in the container
WORKDIR /flask-app

# Install necessary system dependencies for TensorFlow and Python packages
RUN apt-get update && apt-get install -y \
    build-essential \
    python3-dev \
    libatlas-base-dev \
    libhdf5-dev \
    libhdf5-serial-dev \
    libhdf5-103 \
    gfortran \
    libc6-dev \
    libffi-dev \
    libssl-dev \
    python3-distutils \
    wget \
    curl

# Copy the current directory contents into the container at /flask-app
COPY . /flask-app

# Install necessary Python dependencies from requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Install TensorFlow 2.17
RUN pip install tensorflow==2.17.0

# Make port 5000 available to the outside world
EXPOSE 5000

# Define the command to run the Flask app
CMD ["python", "predict.py"]