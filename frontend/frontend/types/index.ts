// Patient types
export interface PatientBase {
  id: string
  name: string
  age: number
  gender: string
  current_appointment?: string
}

export interface PatientCreate extends PatientBase {}

export interface PatientResponse extends PatientBase {}

export interface PatientWithScans extends PatientResponse {
  scans: ScanResponse[]
}

// Authentication types
export interface UserBase {
  username: string
  email: string
  role: 'doctor' | 'technician'
}

export interface UserCreate extends UserBase {
  password: string
}

export interface UserLogin {
  username: string
  password: string
}

export interface User extends UserBase {
  id: string
  created_at: string
}

export interface Token {
  access_token: string
  token_type: string
  user: User
}

// Scan types
export interface ScanBase {
  patient_id: string
  image_url: string
  upload_date: string
  prediction_condition: string
  prediction_confidence: number
  doctor_notes?: string
  doctor_confirmed?: boolean
  doctor_corrected_diagnosis?: string
  assessed_by?: string
  assessed_date?: string
}

export interface ScanCreate extends ScanBase {}

export interface ScanResponse extends ScanBase {
  id: string
}

// Frontend types
export interface Patient {
  id: string
  name: string
  age: number
  gender: string
  currentAppointment?: string
  scans: Scan[]
}

export interface Scan {
  id: string
  patientId: string
  imageUrl: string
  uploadDate: string
  prediction: {
    condition: string
    confidence: number
  }
  doctorAssessment?: {
    notes: string
    confirmed: boolean
    correctedDiagnosis?: string
    assessedBy: string
    assessedDate: string
  }
}

// Prediction types
export interface PredictionResult {
  scan_id: string
  predicted_class: string
  predicted_probability: number
  image_url: string
  upload_date?: string
}

// API response types
export interface ApiResponse<T> {
  data: T
  error?: string
}

// Upload and create scan result
export interface UploadAndCreateScanResult {
  prediction: PredictionResult
  scan: ScanResponse
}
