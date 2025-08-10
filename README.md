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

## 📸 Screenshots

### Dashboard with patients and scans
<img src="https://github.com/user-attachments/assets/47d29272-36de-4be0-b7ad-a39ae8875c31" alt="Dashboard with patients and scans" width="800">

### Reschedule appointments
<img src="https://github.com/user-attachments/assets/651cc6ec-91a1-4ff8-bd1c-4d376b69868f" alt="Reschedule appointments" width="800">

| **Doctor role** | **Technician role** |
|-----------------|---------------------|
| <img src="https://github.com/user-attachments/assets/98be9a9c-6806-4ca1-a830-abeee2860def" alt="Doctor role" width="400"> | <img src="https://github.com/user-attachments/assets/19829eca-4aac-4c0e-b193-c85aa3b0f792" alt="Technician role" width="400"> |

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

## 🔄 Running the Retraining Service

### 1️⃣ Start Redis Server
```bash
# Start Redis (if not already running)
brew services start redis

# Verify Redis is running
redis-cli ping
# Should return "PONG"
```

### 2️⃣ Start Celery Workers
```bash
# Navigate to retraining directory
cd OCT-Disease-Recognition/backend/retraining

# Start Celery worker
celery -A retraining.app worker --loglevel=INFO

# In a new terminal, start Celery beat for scheduled tasks
celery -A retraining.app beat --loglevel=INFO
```


## 📂 Folder Structure
```
OCT-Disease-Recognition/
├── backend/        # FastAPI backend and retraining
├── frontend/       # Next.js frontend
└── README.md
```

## 📜 License
This project is licensed under the MIT License.

## 🙏 Acknowledgements
- Kermany et al., 2018 for the OCT dataset

### Author
Eddie Chen  
📧 eddiechn12@gmail.com
