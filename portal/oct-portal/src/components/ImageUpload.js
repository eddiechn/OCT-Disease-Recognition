import { useState } from "react";

function ImageUpload() {
    const [image, setImage] = useState(null);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onloadend = () => {
            setImage(reader.result);
        };
        reader.readAsDataURL(file);
    };

    const handleAnalysis = () => {
        alert("Analysis started. Please wait a moment for the results.");
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
                    <div style={{ display : "flex", flexDirection: "column", alignItems: "center"}} >
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
                            color: "#fff",
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


        </div>
    );
}

export default ImageUpload;