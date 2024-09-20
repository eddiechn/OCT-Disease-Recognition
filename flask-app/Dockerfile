# Use an official Python runtime as a parent image
FROM python:3.8-slim

# Install system dependencies for h5py
RUN apt-get update && apt-get install -y \
    pkg-config \
    libhdf5-dev \
    gcc \
    python3-dev \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /flask-app

# Copy the current directory contents into the container at /flask-app
COPY . /flask-app

# Install any necessary dependencies from requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Make port 5000 available to the outside world
EXPOSE 5000

# Define the command to run the Flask app
CMD ["python", "predict.py"]