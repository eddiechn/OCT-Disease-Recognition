import React from 'react';
import ImageUpload from '../components/ImageUpload';

function Home() {
    return (
        <div className="home">
            <div>
                <h1>OCT Portal</h1>
                <br />
                <ImageUpload />
            </div>
        </div>
    );
}

export default Home;