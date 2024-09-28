import React, { useState } from "react";
import '../styles/ImageUpload.css'; 
import { Link } from "react-router-dom";

function ImageUpload() {
    const [image, setImage] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [result, setResult] = useState(null);
    const [accuracy, setAccuracy] = useState(null);
    const [message, setMessage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null); 

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAnalysis = async () => {
        if (!imageFile) {
            setError("Please select an image before analysis.");
            return;
        }
        setIsLoading(true);
        const formData = new FormData();
        formData.append("file", imageFile);

        try {
            const response = await fetch("http://localhost:5000/predict", {
                method: "POST",
                body: formData,
            });
            const data = await response.json();
            setResult(data.class);
            setAccuracy(data.accuracy);
            setMessage(data.message);
            setError(null); // Clear previous errors if any
        } catch (error) {
            setError('Error: Unable to process the image. Please try again.');
        } finally {
            setIsLoading(false); // Stop loading after completion
        }
    };

    return (
        <div className="upload-container">
            <div className="upload-header">
                <h1>Upload Your OCT Scan for AI Analysis</h1>
                <p>Results are for educational use only and not a medical diagnosis.</p>
            </div>

            <div className="upload-content">
                <div className={image ? "upload-left": 'centered-button-container'}>
                    {/* Upload button */}
                    <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        id="file-upload"
                        className="file-input"
                    />
                    <label htmlFor="file-upload" className={image ? "upload-button" : 'centered-button'}>
                        <p>Upload Image</p>
                    </label>

                    {/* Display an error message if any */}
                    {error && <div className="error-message">{error}</div>}

                    {/* Result section and analysis button */}
                    {image && (
                        <div className="result-box">
                            <button className="analysis-button" onClick={handleAnalysis}>
                                {isLoading ? "Analyzing..." : "Start AI Analysis"}
                            </button>

                            

                            {result && (
                                <div className="result-content">
                                    <p><strong>AI detects:</strong> {result}</p>
                                    <p><strong>Accuracy:</strong> {accuracy}</p>
                                </div>
                            )}

                            {/* Conditionally show the "Learn More" link after analysis */}
                            {result && (
                                <Link
                                    to="/results"
                                    className="upload-button"
                                    state={{ result, message }}  // Passing result as state
                                >
                                    Learn More
                                </Link>
                            )}
                        </div>
                    )}
                </div>

                {/* Image preview on the right side */}
                {image && (
                    <div className="image-result-container">
                        <img
                            src={image}
                            alt="Uploaded"
                            className="uploaded-image"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

export default ImageUpload;