# OCT Scan Disease Recognition

![Python](https://img.shields.io/badge/python-v3.8+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.68.0+-green.svg)
![Next.js](https://img.shields.io/badge/Next.js-12.0+-black.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

## 🚀 Project Overview
Working as a healthcare technician, I saw firsthand how delays in diagnosis and overburdened providers could negatively impact patient outcomes. These challenges inspired me to combine my healthcare experience with technical skills to create a solution that improves diagnostic workflows.

Optical Coherence Tomography (OCT) is widely used in ophthalmology to visualize the retina and detect conditions such as:

- Diabetic Macular Edema (DME)
- Choroidal Neovascularization (CNV)
- Drusen
- Normal retinal states

This project automates OCT scan analysis using deep learning, providing healthcare professionals with quick, reliable predictions.

## ✨ Features

- 📅 **Appointment Rescheduling** – Easily reschedule patient OCT appointments
- 📤 **Scan Upload** – Securely upload OCT scans
- ⚡ **Instant AI Prediction** – Classifies scans into DME, CNV, Drusen, or Normal
- 🔄 **Weekly Model Retraining** – Automated retraining every 7 days using **Celery** + **Redis**
- 📊 **Integrated Dashboard** – View predictions, patient scan history, and analytics
- 👨‍⚕️ **Technician and Doctor Roles** - Only doctors are allowed to review scans

## 💻 Tech Stack

- **Model Architecture**: CNN (InceptionV3)
- **Data Source**: [Kermany2018 OCT Dataset](https://www.kaggle.com/datasets/paultimothymooney/kermany2018)
- **Backend**: FastAPI, Celery, Redis
- **Frontend**: Next.js, TypeScript
- **Database**: PostgreSQL

## 📊 Performance Metrics

| Class  | Precision | Recall | F1-Score | Data |
|--------|-----------|--------|----------|------|
| CNV    | 0.99      | 1.00   | 0.99     | 242  |
| DME    | 0.99      | 1.00   | 0.99     | 242  |
| Drusen | 1.00      | 0.99   | 0.99     | 242  |
| Normal | 1.00      | 1.00   | 1.00     | 242  |

**Macro Avg**: Precision 0.99 | Recall 0.99 | F1-Score 0.99  
**Weighted Avg**: Precision 0.99 | Recall 0.99 | F1-Score 0.99

## 🛠 Setup & Installation

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/yourusername/oct-scan-recognition.git
cd oct-scan-recognition
```

### 2️⃣ Create a Virtual Environment
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

### 3️⃣ Install Dependencies
```bash
pip install -r requirements.txt
```

### 4️⃣ Set Up Database
```bash
# Make sure PostgreSQL is running
createdb oct_scans
```

### 5️⃣ Configure Environment Variables
Create a `.env` file in the project root:
```ini
DATABASE_URL=postgresql://user:password@localhost/oct_scans
REDIS_URL=redis://localhost:6379
```

### 6️⃣ Run Backend
```bash
uvicorn main:app --reload
```

### 7️⃣ Run Frontend
```bash
cd frontend
npm install
npm run dev
```

## 📂 Folder Structure
```
oct-scan-recognition/
├── backend/        # FastAPI backend & ML inference
├── frontend/       # Next.js frontend
├── models/         # Trained model files
├── data/          # Dataset storage
├── scripts/       # Utility scripts (training, evaluation)
└── README.md
```

## 📜 License
This project is licensed under the MIT License.

## 🙏 Acknowledgements
- Kermany et al., 2018 for the OCT dataset
- TensorFlow / Keras for the deep learning framework

### Author
Eddie Chen  
📧 eddiechn12@gmail.com
