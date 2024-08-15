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

    return (
        <div style={{ textAlign: "center", margin: "20px", marginTop: "40px" }}>
            <p style={{ fontSize: "24px", fontWeight: "bold" }}>
               Upload your OCT scan for an AI-powered analysis. 
            </p>
            <p style={{ fontSize: "18px", color: "#666" }}>
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
                    marginTop: "30px"
                }}
            >
                Upload Image
            </label>

            {/* Display the image if one is selected */}
            {image && (
                <div style={{ marginTop: "20px" }}>
                    <img
                        src={image}
                        alt="uploaded"
                        style={{ width: "100%", height: "auto", maxWidth: "600px" }}
                    />
                </div>
            )}
        </div>
    );
}

export default ImageUpload;