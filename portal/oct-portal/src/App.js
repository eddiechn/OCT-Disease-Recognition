import React from 'react';
import ImageUpload from './components/ImageUpload';
import Header from './components/Header';
import Footer from './components/Footer';
import './App.css';

function App() {
  return (
    <div className="App" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header />
      <div style={{ flex: 1 }}>
        <ImageUpload />
      </div>
      <Footer />

    </div>
  );
}

export default App;
