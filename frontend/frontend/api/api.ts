// API client for connecting to the FastAPI backend
import type {
  PatientCreate,
  PatientResponse,
  PatientWithScans,
  ScanCreate,
  ScanResponse,
  PredictionResult,
  Patient,
  Scan,
  UploadAndCreateScanResult,
} from "../types"

// Base URL for API requests - adjust this based on your deployment environment
const API_BASE_URL = "http://localhost:8000"

// Helper function for handling API responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || `API error: ${response.status}`)
  }
  return response.json() as Promise<T>
}

// Patient API functions
export const patientAPI = {
  // Get all patients
  async getAll(): Promise<PatientResponse[]> {
    const response = await fetch(`${API_BASE_URL}/patients`)
    return handleResponse<PatientResponse[]>(response)
  },

  // Get a specific patient by ID
  async getById(id: string): Promise<PatientResponse> {
    const response = await fetch(`${API_BASE_URL}/patients/${id}`)
    return handleResponse<PatientResponse>(response)
  },

  // Get all patients with their scans
  async getAllWithScans(): Promise<PatientWithScans[]> {
    // First get all patients
    const patients = await this.getAll()

    // Then get scans for each patient
    const patientsWithScans = await Promise.all(
      patients.map(async (patient: PatientResponse) => {
        const scans = await this.getScansForPatient(patient.id)
        return {
          ...patient,
          scans: scans || [],
        }
      }),
    )

    return patientsWithScans
  },

  // Create a new patient
  async create(patientData: PatientCreate): Promise<PatientResponse> {
    const response = await fetch(`${API_BASE_URL}/patients`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patientData),
    })
    return handleResponse<PatientResponse>(response)
  },

  // Update an existing patient
  async update(id: string, patientData: PatientCreate): Promise<PatientResponse> {
    const response = await fetch(`${API_BASE_URL}/patients/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patientData),
    })
    return handleResponse<PatientResponse>(response)
  },

  // Delete a patient
  async delete(id: string): Promise<PatientResponse> {
    const response = await fetch(`${API_BASE_URL}/patients/${id}`, {
      method: "DELETE",
    })
    return handleResponse<PatientResponse>(response)
  },

  // Get scans for a specific patient
  async getScansForPatient(patientId: string): Promise<ScanResponse[]> {
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}/scans`)
    return handleResponse<ScanResponse[]>(response)
  },
}

// Scan API functions
export const scanAPI = {
  // Get all scans
  async getAll(): Promise<ScanResponse[]> {
    const response = await fetch(`${API_BASE_URL}/scans`)
    return handleResponse<ScanResponse[]>(response)
  },

  // Create a new scan
  async create(scanData: ScanCreate): Promise<ScanResponse> {
    const response = await fetch(`${API_BASE_URL}/scans`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(scanData),
    })
    return handleResponse<ScanResponse>(response)
  },

  // Update an existing scan
  async update(id: string, scanData: ScanCreate): Promise<ScanResponse> {
    const response = await fetch(`${API_BASE_URL}/scans/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(scanData),
    })
    return handleResponse<ScanResponse>(response)
  },

  // Upload an image for prediction
  async predictImage(file: File): Promise<PredictionResult> {
    const formData = new FormData()
    formData.append("file", file)

    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: "POST",
      body: formData,
    })

    return handleResponse<PredictionResult>(response)
  },

  // Upload image, get prediction, and create scan in one operation
  async uploadAndCreateScan(patientId: string, file: File): Promise<UploadAndCreateScanResult> {

    const Response = await fetch(`${API_BASE_URL}/scans/${patientId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ patient_id: patientId, file_name: file.name }),
    })
    // First, upload the image and get prediction
    const prediction = await this.predictImage(file)

    // Then create a scan with the prediction results
    const scanData: ScanCreate = {
      patient_id: patientId,
      image_url: prediction.image_url,
      upload_date: new Date().toISOString(),
      prediction_condition: prediction.predicted_class,
      prediction_confidence: prediction.predicted_probability,
    }

    const scan = await this.create(scanData)

    // Return both the prediction and the created scan
    return {
      prediction,
      scan,
    }
  },
}

// Data transformation utilities
export const dataTransformers = {
  // Convert backend patient format to frontend format
  transformPatient(backendPatient: PatientResponse): Patient {
    return {
      id: backendPatient.id,
      name: backendPatient.name,
      age: backendPatient.age,
      gender: backendPatient.gender,
      currentAppointment: backendPatient.current_appointment,
      scans: [],
    }
  },

  // Convert backend scan format to frontend format
  transformScan(backendScan: ScanResponse): Scan {
    return {
      id: backendScan.id || String(Math.random()).slice(2), // Generate ID if not provided
      patientId: backendScan.patient_id,
      imageUrl: backendScan.image_url,
      uploadDate: backendScan.upload_date?.split("T")[0] || new Date().toISOString().split("T")[0],
      prediction: {
        condition: backendScan.prediction_condition,
        confidence: backendScan.prediction_confidence,
      },
      doctorAssessment: backendScan.doctor_notes
        ? {
            notes: backendScan.doctor_notes,
            confirmed: backendScan.doctor_confirmed || false,
            correctedDiagnosis: backendScan.doctor_corrected_diagnosis,
            assessedBy: backendScan.assessed_by || "Unknown Doctor",
            assessedDate: backendScan.assessed_date?.split("T")[0] || new Date().toISOString().split("T")[0],
          }
        : undefined,
    }
  },
}
