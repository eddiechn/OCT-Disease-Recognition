import { useState } from "react";
import Popup from './PopUp';


function ImageUpload() {
    const [image, setImage] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [result, setResult] = useState(null);
    const [accuracy, setAccuracy] = useState(null);
    const [message, setMessage] = useState(null);

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
            console.error("No image selected!");
            return;
        }
        const fromData = new FormData();
        fromData.append("file", imageFile);

        try {
            const response = await fetch("http://localhost:5000/predict", {
                method: "POST",
                body: fromData,
            });
            const data = await response.json();
            console.log(data);
            setResult(data.class);
            setAccuracy(data.accuracy);
            setMessage(data.message);
    
        }
        catch (error) {
            console.error('Error: ', error);
    }


};

    return (
        <div style={{ textAlign: "center", margin: "20px", marginTop: "30px" }}>
            <p style={{ fontSize: "24px", fontWeight: "bold" }}>
               Upload your OCT scan for an AI-powered analysis. 
            </p>
            <p style={{ fontSize: "15px", color: "#666" }}>
            Results are for educational use only and not a medical diagnosis.
            </p>
            {/* Hidden file input */}
            <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                id="file-upload"
                style={{ display: "none" }}
            />

            {/* Custom button styled as a big button */}
            <label
                htmlFor="file-upload"
                style={{
                    display: "inline-block",
                    padding: "20px 40px",
                    backgroundColor: "#007bff",
                    color: "#fff",
                    fontSize: "18px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    fontWeight: "bold",
                    transition: "background-color 0.3s",
                    marginTop: "10px"
                }}
            >
                Upload Image
            </label>

            {/* Display the image if one is selected uaing the && 'and' operator*/}
            {image && (
                <div style={{ marginTop: "20px", textAlign: "center"}}>
                    <div style={{ display : "flex", flexDirection: "column", alignItems: "center", overflowY: "auto" }} >
                    <img
                        src={image}
                        alt="uploaded"
                        style={{ width: "100%", height: "30%", maxWidth: "600px", maxHeight: "300px" }}
                    />
                    <button
                        style={{
                            marginTop: "20px",
                            padding: "10px 20px",
                            backgroundColor: "#007bff",
                            color: "#fff",
                            display: "inline-block",
                            fontWeight: "bold",
                            borderRadius: "8px",
                            border: "none",
                            cursor: "pointer"
                        }}

                        onClick={handleAnalysis}
                        >
                        Start AI Analysis
                    </button>
                    </div>
                </div>
                
            )}

            {/* Display results here */}
            {result && (
                <div style={{ marginTop: "20px",maxWidth: "600px", width: "100%", textAlign: "center", margin: "0 auto" }}>
                    <p style={{ fontSize: "18px", fontWeight: "bold" }}>AI detects: {result}</p>
                    <Popup result={result} accuracy={accuracy} message={message} />
                </div>
)}


        </div>
    );

}

export default ImageUpload;