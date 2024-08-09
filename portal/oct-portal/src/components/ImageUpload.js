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
        <div>
            <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
            />
            {image && (
                <img
                    src={image}
                    alt="uploaded"
                    style={{ width: "100%", height: "auto" }}
                />
            )}
        </div>
    );



}

export default ImageUpload;