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
  UserCreate,
  UserLogin,
  Token,
  User,
} from "../types"

// Base URL for API requests - adjust this based on your deployment environment
const API_BASE_URL = "http://localhost:8000"

// Helper function to get auth headers
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('access_token')
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` })
  }
}

// Helper function for handling API responses
async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.detail || `API error: ${response.status}`)
  }
  return response.json() as Promise<T>
}

// Authentication API functions
export const authAPI = {
  // Register a new user
  async register(userData: UserCreate): Promise<Token> {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userData),
    })
    const token = await handleResponse<Token>(response)
    localStorage.setItem('access_token', token.access_token)
    localStorage.setItem('user', JSON.stringify(token.user))
    return token
  },

  // Login user
  async login(credentials: UserLogin): Promise<Token> {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    })
    const token = await handleResponse<Token>(response)
    localStorage.setItem('access_token', token.access_token)
    localStorage.setItem('user', JSON.stringify(token.user))
    return token
  },

  // Get current user
  async getCurrentUser(): Promise<User> {
    const response = await fetch(`${API_BASE_URL}/users/me`, {
      headers: getAuthHeaders(),
    })
    return handleResponse<User>(response)
  },

  // Logout
  logout() {
    localStorage.removeItem('access_token')
    localStorage.removeItem('user')
  },

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token')
  },

  // Get stored user
  getStoredUser(): User | null {
    const userStr = localStorage.getItem('user')
    return userStr ? JSON.parse(userStr) : null
  },
}

// Patient API functions
export const patientAPI = {
  // Get all patients
  async getAll(): Promise<PatientResponse[]> {
    const response = await fetch(`${API_BASE_URL}/patients`, {
      headers: getAuthHeaders(),
    })
    return handleResponse<PatientResponse[]>(response)
  },

  // Get a specific patient by ID
  async getById(id: string): Promise<PatientResponse> {
    const response = await fetch(`${API_BASE_URL}/patients/${id}`, {
      headers: getAuthHeaders(),
    })
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
      headers: getAuthHeaders(),
      body: JSON.stringify(patientData),
    })
    return handleResponse<PatientResponse>(response)
  },

  // Update an existing patient
  async update(id: string, patientData: PatientCreate): Promise<PatientResponse> {
    const response = await fetch(`${API_BASE_URL}/patients/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(patientData),
    })
    return handleResponse<PatientResponse>(response)
  },

  // Delete a patient
  async delete(id: string): Promise<PatientResponse> {
    const response = await fetch(`${API_BASE_URL}/patients/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    })
    return handleResponse<PatientResponse>(response)
  },

  // Get scans for a specific patient
  async getScansForPatient(patientId: string): Promise<ScanResponse[]> {
    const response = await fetch(`${API_BASE_URL}/patients/${patientId}/scans`, {
      headers: getAuthHeaders(),
    })
    return handleResponse<ScanResponse[]>(response)
  },
}

// Scan API functions
export const scanAPI = {
  // Get all scans
  async getAll(): Promise<ScanResponse[]> {
    const response = await fetch(`${API_BASE_URL}/scans`, {
      headers: getAuthHeaders(),
    })
    return handleResponse<ScanResponse[]>(response)
  },

  // Create a new scan
  async create(scanData: ScanCreate): Promise<ScanResponse> {
    const response = await fetch(`${API_BASE_URL}/scans`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(scanData),
    })
    return handleResponse<ScanResponse>(response)
  },

  // Update an existing scan
  async update(id: string, scanData: ScanCreate): Promise<ScanResponse> {
    const response = await fetch(`${API_BASE_URL}/scans/${id}`, {
      method: "PUT",
      headers: getAuthHeaders(),
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
    try {
      console.log("Starting upload for patient:", patientId);

      // First, upload the image and get prediction
      console.log("Uploading image for prediction...");
      const prediction = await this.predictImage(file);
      console.log("Prediction received:", prediction);

      // Prepare scan data
      const scanData: ScanCreate = {
        patient_id: patientId,
        image_url: prediction.image_url,
        upload_date: prediction.upload_date || new Date().toISOString(),
        prediction_condition: prediction.predicted_class,
        prediction_confidence: prediction.predicted_probability,
        doctor_notes: '',
        doctor_confirmed: false,
        doctor_corrected_diagnosis: '',
        assessed_by: 'Unknown Doctor',
        assessed_date: new Date().toISOString(),
      };

      console.log("Creating scan with data:", scanData);

        // Create the scan
        const scan = await fetch(`${API_BASE_URL}/scans/${patientId}`, {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(scanData),
        }).then((res) => {
          console.log("Scan creation response status:", res.status);
          return handleResponse<ScanResponse>(res);
        });      console.log("Scan created successfully:", scan);

      return {
        prediction,
        scan,
      };
    } catch (error) {
      console.error("Error in uploadAndCreateScan:", error);
      throw error;
    }
  },

  async delete(id: string): Promise<ScanResponse> {
    const response = await fetch(`${API_BASE_URL}/scans/${id}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    })
    return handleResponse<ScanResponse>(response)
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

  transformScan(backendScan: ScanResponse): Scan {
    return {
      id:
        backendScan.id ||
        `${backendScan.patient_id}_${backendScan.image_url}_${backendScan.upload_date}`.replace(/\W/g, ""),
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
