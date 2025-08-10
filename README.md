# OCT Scan Disease Recognition


---

## 🚀 Project Idea

Working as a healthcare technician, I witnessed firsthand the challenges and inefficiencies in the healthcare system, particularly in diagnostic workflows. From delays in diagnosis to overburdened healthcare providers, I realized how these flaws could impact patient outcomes. This motivated me to explore how I could leverage my technical skills to contribute to improving healthcare.

Optical Coherence Tomography (OCT) is a widely used imaging technique in ophthalmology to visualize the structure of the retina. Early detection of retinal conditions like Diabetic Macular Edema (DME), Choroidal Neovascularization (CNV), Drusen, and Normal retinal states can significantly improve treatment outcomes and patient care.

This project automates the analysis of OCT scans using deep learning, aiming to:

- Classify retinal conditions like DME, CNV, Drusen, and Normal states.
- Provide a reliable and quick second opinion for healthcare professionals, helping to reduce delays and enhance diagnostic accuracy.

By combining my hands-on experience in healthcare with my technical expertise, this project represents a step toward bridging the gap between healthcare systems and innovative AI solutions to make tangible, impactful changes in patient care.

---

## 💻 Tech Stack

- **Model Architecture**: Convolutional Neural Networks (CNN), InceptionV3  
- **Data Source**: Kaggle ([Kermany2018 OCT Dataset](https://www.kaggle.com/datasets/paultimothymooney/kermany2018))  
- **Database**: PostgreSQL
- **Frontend**: NextJS, TypeScript
- **Backend**: FastAPI

---

## 📊 Metrics and Results

The model achieved exceptional performance on the test dataset, demonstrating its effectiveness in classifying retinal conditions:

- **Recall**: 0.99  
- **Precision**: 0.99  
- **AUC (Area Under the Curve)**: 1.00  

### Classification Report

| Class | Precision | Recall | F1-Score | Data |
|-------|-----------|--------|----------|---------|
| CNV    | 0.99      | 1.00   | 0.99     | 242     |
| DME   | 0.99      | 1.00   | 0.99     | 242     |
| DRUSEN    | 1.00      | 0.99   | 0.99     | 242     |
| NORMAL    | 1.00      | 1.00   | 1.00     | 242     |

**Overall Performance**:
- **Macro Average**: Precision 0.99, Recall 0.99, F1-Score 0.99  
- **Weighted Average**: Precision 0.99, Recall 0.99, F1-Score 0.99  

## Contact 

You can contact me using my information below: 

- Eddie Chen : eddiechn12@gmail.com
