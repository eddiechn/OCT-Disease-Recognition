"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Upload,
  User,
  Stethoscope,
  CalendarIcon,
  AlertCircle,
  CheckCircle,
  Search,
  Clock,
  PlusCircle,
} from "lucide-react"
import { format } from "date-fns"
import { scanAPI, patientAPI, authAPI } from "../api/api"
import { AuthContainer } from "../components/auth/AuthContainer"
import { AppHeader } from "../components/layout/AppHeader"
import { RoleGuard } from "../components/auth/RoleGuard"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// Data interfaces
interface Scan {
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

interface Patient {
  id: string
  name: string
  age: number
  gender: string
  currentAppointment?: string
  scans: Scan[]
}


// useState returns an array. first element is the state while second iterm is a function that updates that value

export default function MedicalClassificationApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (authAPI.isAuthenticated()) {
        try {
          await authAPI.getCurrentUser()
          setIsAuthenticated(true)
        } catch (error) {
          authAPI.logout()
          setIsAuthenticated(false)
        }
      }
      setLoading(false)
    }
    
    checkAuth()
  }, [])

  const handleAuthSuccess = () => {
    setIsAuthenticated(true)
  }

  const handleLogout = () => {
    setIsAuthenticated(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <AuthContainer onAuthSuccess={handleAuthSuccess} />
  }

  return <MainApp onLogout={handleLogout} />
}

function MainApp({ onLogout }: { onLogout: () => void }) {
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [newPatientName, setNewPatientName] = useState("")
  const [newPatientAge, setNewPatientAge] = useState("")
  const [newPatientGender, setNewPatientGender] = useState("")
  const [newPatientId, setNewPatientId] = useState("")
  const [assessmentNotes, setAssessmentNotes] = useState("")
  const [correctedDiagnosis, setCorrectedDiagnosis] = useState("")
  const [newAppointmentDate, setNewAppointmentDate] = useState<Date>()
  const [showRescheduling, setShowRescheduling] = useState(false)
  const [isEditingAssessment, setIsEditingAssessment] = useState(false)
  const [isEditingPatient, setIsEditingPatient] = useState(false)
  const [editPatientData, setEditPatientData] = useState({ id: "", name: "", age: "", gender: "" })
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [showDeleteScanConfirm, setShowDeleteScanConfirm] = useState<string | null>(null)
  const [showAddPatientModal, setShowAddPatientModal] = useState(false)
  const [reschedulingHistory, setReschedulingHistory] = useState<
    Array<{ patientId: string; daysSaved: number; date: string }>
  >([])
  const [showStatsModal, setShowStatsModal] = useState(false)

  // Filter patients based on search term - search by name or ID
  const filteredPatients = patients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.id.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleImageUpload = async (patientId: string, file: File) => {
    try {

      // Use the API to upload image, get prediction and create scan
      const result = await scanAPI.uploadAndCreateScan(patientId, file)

      // Create a new scan object for the UI
      const newScan: Scan = {
        id: result.scan.id,
        patientId,
        imageUrl: result.prediction.image_url,
        uploadDate: result.prediction.upload_date || new Date().toISOString().split("T")[0],
        prediction: {
          condition: result.prediction.predicted_class,
          confidence: result.prediction.predicted_probability,
        },
      }

      // Update local state
      setPatients((prev) =>
        prev.map((patient) =>
          patient.id === patientId ? { ...patient, scans: [...patient.scans, newScan] } : patient,
        ),
      )


      // Update selectedPatient to include the new scan
      setSelectedPatient((prev) =>
        prev?.id === patientId ? { ...prev, scans: [...prev.scans, newScan] } : prev
      )


      // Could show success message here
    } catch (error) {
      console.error("Error uploading image:", error)
      // Could show error message to user here
    }
  }

  // Add this effect to load patients from the backend when the component mounts
  useEffect(() => {
    async function loadPatients() {
      try {
        const patientsData = await patientAPI.getAllWithScans()
        if (patientsData && patientsData.length > 0) {
          // Map API response to local Patient and Scan 
          const mappedPatients: Patient[] = patientsData.map((p: any) => ({
            id: p.id,
            name: p.name,
            age: p.age,
            gender: p.gender,
            currentAppointment: p.current_appointment,
            scans: (p.scans || []).map((s: any) => ({
              id: s.id,
              patientId: s.patient_id,
              imageUrl: s.image_url,
              uploadDate: s.upload_date,
              prediction: {
                condition: s.predicted_class,
                confidence: s.predicted_probability,
              },
              doctorAssessment: s.doctor_assessment
                ? {
                    notes: s.doctor_assessment.notes,
                    confirmed: s.doctor_assessment.confirmed,
                    correctedDiagnosis: s.doctor_assessment.corrected_diagnosis,
                    assessedBy: s.doctor_assessment.assessed_by,
                    assessedDate: s.doctor_assessment.assessed_date,
                  }
                : undefined,
            })),
          }))
          setPatients(mappedPatients)
        }
      } catch (error) {
        console.error("Failed to load patients:", error)
        // If API fails, we'll keep using the mock patients
      }
    }

    loadPatients()
  }, [])

  // Update addNewPatient function to use the API
  const addNewPatient = async () => {
    if (!newPatientName.trim() || !newPatientAge || !newPatientGender) return

    try {
      // Generate a patient ID if not provided
      const patientId = newPatientId.trim() || `PT-${String(patients.length + 1).padStart(3, "0")}`

      // Check if ID already exists
      if (patients.some((p) => p.id === patientId)) {
        alert("Patient ID already exists. Please use a different ID.")
        return
      }

      const newPatientData = {
        id: patientId,
        name: newPatientName,
        age: Number.parseInt(newPatientAge),
        gender: newPatientGender,
        current_appointment: undefined,
      }

      // Create patient via API
      await patientAPI.create(newPatientData)

      // Update local state
      const newPatient = {
        id: patientId,
        name: newPatientName,
        age: Number.parseInt(newPatientAge),
        gender: newPatientGender,
        scans: [],
      }

      setPatients((prev) => [...prev, newPatient])
      setNewPatientName("")
      setNewPatientAge("")
      setNewPatientGender("")
      setNewPatientId("")
      setShowAddPatientModal(false)
    } catch (error) {
      console.error("Failed to create patient:", error)
      alert("Failed to create patient. Please try again.")
    }
  }

  const handleDoctorAssessment = (scanId: string) => {
    if (!assessmentNotes.trim()) return

    const assessment = {
      notes: assessmentNotes,
      confirmed: !correctedDiagnosis,
      correctedDiagnosis: correctedDiagnosis || undefined,
      assessedBy: isEditingAssessment ? "Current Doctor (Updated)" : "Current Doctor",
      assessedDate: new Date().toISOString().split("T")[0],
    }

    setPatients((prev) =>
      prev.map((patient) => ({
        ...patient,
        scans: patient.scans.map((scan) => (scan.id === scanId ? { ...scan, doctorAssessment: assessment } : scan)),
      })),
    )

    setAssessmentNotes("")
    setCorrectedDiagnosis("")
    setIsEditingAssessment(false)
    setSelectedScan(null)
  }

  const handleReschedule = async () => {
    if (!selectedPatient || !newAppointmentDate) return

    try {

      await patientAPI.update(selectedPatient.id, {
        id: selectedPatient.id,
        name: selectedPatient.name,
        age: selectedPatient.age,
        gender: selectedPatient.gender, 
        current_appointment: format(newAppointmentDate, "yyyy-MM-dd"),
      })


      const daysSaved = selectedPatient.currentAppointment 
          ? calculateDaysSaved(selectedPatient.currentAppointment, newAppointmentDate): 0


        // Track rescheduling history
        if (daysSaved !== 0) {
          setReschedulingHistory((prev) => [
            ...prev,
            {
              patientId: selectedPatient.id,
              daysSaved,
              date: new Date().toISOString().split("T")[0],
            },
          ])
        }


        // local state update
        setPatients((prev) =>
          prev.map((patient) =>
            patient.id === selectedPatient.id
              ? { ...patient, currentAppointment: format(newAppointmentDate, "yyyy-MM-dd") }
              : patient,
          ),
        )

        setNewAppointmentDate(undefined)
        setShowRescheduling(false)


    }
    catch (error) {
      console.error("Failed to reschedule appointment:", error)
      alert("Failed to reschedule appointment. Please try again.")
    }


  }

  const handleEditPatient = (patient: Patient) => {

    setEditPatientData({
      id: patient.id,
      name: patient.name,
      age: patient.age.toString(),
      gender: patient.gender,
    })
    setIsEditingPatient(true)
  }

  const savePatientEdit = async () => {
    if (!selectedPatient || !editPatientData.name.trim() || !editPatientData.age || !editPatientData.gender) return

    // Check if ID already exists and is different from current patient
    if (editPatientData.id !== selectedPatient.id && patients.some((p) => p.id === editPatientData.id)) {
      alert("Patient ID already exists. Please use a different ID.")
      return
    }

    try {
      await patientAPI.update(editPatientData.id, {
        id: editPatientData.id,
        name: editPatientData.name,
        age: Number.parseInt(editPatientData.age),
        gender: editPatientData.gender, 
        current_appointment: selectedPatient.currentAppointment,
        
      })

    // local state update
    setPatients((prev) =>
      prev.map((patient) =>
        patient.id === selectedPatient.id
          ? {
              ...patient,
              id: editPatientData.id,
              name: editPatientData.name,
              age: Number.parseInt(editPatientData.age),
              gender: editPatientData.gender,
            }
          : patient,
      ),
    )

    setSelectedPatient((prev) =>
      prev
        ? {
            ...prev,
            id: editPatientData.id,
            name: editPatientData.name,
            age: Number.parseInt(editPatientData.age),
            gender: editPatientData.gender,
          }
        : null,
    )

    setIsEditingPatient(false)
    setEditPatientData({ id: "", name: "", age: "", gender: "" })
  } catch (error) {
      console.error("Failed to update patient:", error)
      alert("Failed to update patient. Please try again.")
    }

  }

  const deletePatient = async (patientId: string) => {
    try {
      await patientAPI.delete(patientId)
    
      setPatients((prev) => prev.filter((patient) => patient.id !== patientId)) // removes local state by creating a new array without the deleted patient
      if (selectedPatient?.id === patientId) {
        setSelectedPatient(null)
      }
      setShowDeleteConfirm(null)
      } catch (error) {
        console.error("Failed to delete patient:", error)
        alert("Failed to delete patient. Please try again.")
      }
  }

  const calculateStats = () => {
    const totalPatients = patients.length
    const totalDaysSaved = reschedulingHistory.reduce((sum, record) => sum + record.daysSaved, 0)

    const allScansWithAssessments = patients.flatMap((patient) => patient.scans.filter((scan) => scan.doctorAssessment))

    const correctAssessments = allScansWithAssessments.filter((scan) => scan.doctorAssessment?.confirmed).length

    const assessmentAccuracy =
      allScansWithAssessments.length > 0 ? (correctAssessments / allScansWithAssessments.length) * 100 : 0

    return {
      totalPatients,
      totalDaysSaved,
      assessmentAccuracy: Math.round(assessmentAccuracy * 10) / 10,
      totalAssessments: allScansWithAssessments.length,
      correctAssessments,
    }
  }

  const calculateDaysSaved = (currentDate: string, newDate: Date) => {
    const current = new Date(currentDate)
    const daysDiff = Math.floor((current.getTime() - newDate.getTime()) / (1000 * 60 * 60 * 24))
    return daysDiff
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <AppHeader onLogout={onLogout} />

      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Sidebar - Patient List */}
        <div className="w-80 bg-white border-r flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2 mb-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search patients..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button size="icon" onClick={() => setShowAddPatientModal(true)}>
                <PlusCircle className="h-5 w-5" />
                <span className="sr-only">Add Patient</span>
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {filteredPatients.map((patient) => (
                <Card
                  key={patient.id}
                  className={`cursor-pointer transition-colors ${
                    selectedPatient?.id === patient.id ? "ring-2 ring-blue-500 bg-blue-50" : "hover:bg-gray-50"
                  }`}
                  onClick={() => setSelectedPatient(patient)}
                >
                  <CardContent className="p-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm">{patient.name}</h3>
                        <Badge variant="outline" className="text-xs">
                          {patient.scans.length} scans
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600">
                        <p>
                          ID: {patient.id} • {patient.age} years, {patient.gender}
                        </p>
                        {patient.currentAppointment && (
                          <div className="flex items-center gap-1 mt-1">
                            <CalendarIcon className="w-3 h-3" />
                            <span>Next: {patient.currentAppointment?.split('T')[0]}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="p-3 border-t">
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              onClick={() => setShowAddPatientModal(true)}
            >
              <PlusCircle className="h-4 w-4" />
              Add New Patient
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto">
          {selectedPatient ? (
            <div className="p-6">
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    {isEditingPatient ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label htmlFor="patient-id" className="text-sm">
                              Patient ID
                            </Label>
                          <Input
                            id="patient-id"
                            value={selectedPatient.id}
                            className="h-auto p-2 bg-grey-50 text-grey-600"
                            disabled
                            readOnly
                          />
                          </div>
                          <div>
                            <Label htmlFor="patient-name" className="text-sm">
                              Patient Name
                            </Label>
                            <Input
                              id="patient-name"
                              value={editPatientData.name}
                              onChange={(e) => setEditPatientData((prev) => ({ ...prev, name: e.target.value }))}
                              placeholder="Patient name"
                              className="h-auto p-2"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <div>
                            <Label htmlFor="patient-age" className="text-sm">
                              Age
                            </Label>
                            <Input
                              id="patient-age"
                              type="number"
                              value={editPatientData.age}
                              onChange={(e) => setEditPatientData((prev) => ({ ...prev, age: e.target.value }))}
                              placeholder="Age"
                              className="w-20"
                            />
                          </div>
                          <div className="flex-1">
                            <Label htmlFor="patient-gender" className="text-sm">
                              Gender
                            </Label>
                            <Select
                              value={editPatientData.gender}
                              onValueChange={(value) => setEditPatientData((prev) => ({ ...prev, gender: value }))}
                            >
                              <SelectTrigger id="patient-gender">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Male">Male</SelectItem>
                                <SelectItem value="Female">Female</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <h2 className="text-2xl font-bold">{selectedPatient.name}</h2>
                        <p className="text-gray-600">
                          ID: {selectedPatient.id} • {selectedPatient.age} years, {selectedPatient.gender}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {isEditingPatient ? (
                      <>
                        <Button onClick={savePatientEdit} size="sm">
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setIsEditingPatient(false)
                            setEditPatientData({ id: "", name: "", age: "", gender: "" })
                          }}
                          size="sm"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button variant="outline" onClick={() => handleEditPatient(selectedPatient)} size="sm">
                          Edit Patient
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => setShowDeleteConfirm(selectedPatient.id)}
                          size="sm"
                        >
                          Delete Patient
                        </Button>
                      </>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setShowRescheduling(!showRescheduling)}
                      className="flex items-center gap-2"
                    >
                      <Clock className="w-4 h-4" />
                      Reschedule
                    </Button>
                  </div>
                </div>

                {/* Rescheduling Tool */}
                {showRescheduling && (
                  <Card className="mb-6">
                    <CardHeader>
                      <CardTitle>Reschedule Appointment</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <Label className="text-sm font-medium">Current Appointment</Label>
                          <div className="mt-1 p-2 bg-gray-100 rounded text-sm">
                            {selectedPatient.currentAppointment?.split('T')[0] || "No appointment scheduled"}
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Select New Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button variant="outline" className="w-full justify-start text-left font-normal mt-1">
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {newAppointmentDate ? format(newAppointmentDate, "PPP") : "Pick a date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={newAppointmentDate}
                                onSelect={setNewAppointmentDate}
                                disabled={(date) => date < new Date()}
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      {newAppointmentDate && selectedPatient.currentAppointment && (
                        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                          <div className="text-sm">
                            <span className="font-medium">Days saved: </span>
                            <span className="text-blue-600 font-bold">
                              {calculateDaysSaved(selectedPatient.currentAppointment, newAppointmentDate)} days
                            </span>
                            {calculateDaysSaved(selectedPatient.currentAppointment, newAppointmentDate) > 0 ? (
                              <span className="text-green-600 ml-2">(Earlier appointment)</span>
                            ) : (
                              <span className="text-red-600 ml-2">(Later appointment)</span>
                            )}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-2 mt-4">
                        <Button onClick={handleReschedule} disabled={!newAppointmentDate}>
                          Confirm Reschedule
                        </Button>
                        <Button variant="outline" onClick={() => setShowRescheduling(false)}>
                          Cancel
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <Tabs defaultValue="scans" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="scans">Medical Scans</TabsTrigger>
                  <TabsTrigger value="upload">Upload New Scan</TabsTrigger>
                </TabsList>

                <TabsContent value="scans" className="space-y-6">
                  {selectedPatient.scans.length > 0 ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {selectedPatient.scans.map((scan) => (
                        <Card
                          key={scan.id}
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => setSelectedScan(scan)}
                        >
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              <img
                                src={scan.imageUrl || "/placeholder.svg"}
                                alt="Medical scan"
                                className="w-full h-32 object-cover rounded-md bg-gray-100"
                              />
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <CalendarIcon className="w-4 h-4 text-gray-500" />
                                  <span className="text-sm">{scan.uploadDate}</span>
                                </div>
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">{scan.prediction.condition}</span>
                                  </div>
                                  <div className="text-sm text-gray-600">
                                    Confidence: {(scan.prediction.confidence * 100).toFixed(1)}%
                                  </div>
                                </div>
                                {scan.doctorAssessment && (
                                  <div className="flex items-center gap-2 text-sm">
                                    {scan.doctorAssessment.confirmed ? (
                                      <CheckCircle className="w-4 h-4 text-green-500" />
                                    ) : (
                                      <AlertCircle className="w-4 h-4 text-orange-500" />
                                    )}
                                    <span className="text-gray-600">Doctor reviewed</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card>
                      <CardContent className="p-8 text-center">
                        <p className="text-gray-500">No scans available for this patient.</p>
                        <p className="text-sm text-gray-400 mt-1">Upload a scan to get started.</p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="upload" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Upload Medical Scan</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div>
                        <Label htmlFor="image-upload">Medical Scan Image</Label>
                        <div className="mt-2">
                          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                            <div className="flex flex-col items-center justify-center pt-5 pb-6">
                              <Upload className="w-8 h-8 mb-2 text-gray-500" />
                              <p className="text-sm text-gray-500">Click to upload medical scan</p>
                            </div>
                            <input
                              id="image-upload"
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file && selectedPatient) {
                                  handleImageUpload(selectedPatient.id, file)
                                }
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>


              </Tabs>
            </div>
          ) : (
            <div className="p-6">
              <Card>
                <CardContent className="p-8 text-center">
                  <h3 className="text-lg font-semibold mb-2">Select a Patient</h3>
                  <p className="text-gray-500">
                    Choose a patient from the sidebar to view their details and manage scans.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Add Patient Modal */}
      {showAddPatientModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Add New Patient</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="new-patient-id">Patient ID</Label>
                  <Input
                    id="new-patient-id"
                    value={newPatientId}
                    onChange={(e) => setNewPatientId(e.target.value)}
                    placeholder="PT-XXX (optional, will auto-generate if empty)"
                  />
                </div>
                <div>
                  <Label htmlFor="new-patient-name">Patient Name</Label>
                  <Input
                    id="new-patient-name"
                    value={newPatientName}
                    onChange={(e) => setNewPatientName(e.target.value)}
                    placeholder="Full name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="new-patient-age">Age</Label>
                    <Input
                      id="new-patient-age"
                      type="number"
                      value={newPatientAge}
                      onChange={(e) => setNewPatientAge(e.target.value)}
                      placeholder="Age"
                    />
                  </div>
                  <div>
                    <Label htmlFor="new-patient-gender">Gender</Label>
                    <Select value={newPatientGender} onValueChange={setNewPatientGender}>
                      <SelectTrigger id="new-patient-gender">
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 justify-end mt-4">
                  <Button variant="outline" onClick={() => setShowAddPatientModal(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addNewPatient}>Add Patient</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Statistics Modal */}
      {showStatsModal && (
        <Dialog open={showStatsModal} onOpenChange={setShowStatsModal}>
          <DialogContent className="max-w-none !max-w-[70vw]">
            <DialogHeader>
              <DialogTitle>Statistics Dashboard</DialogTitle>
              <DialogDescription>
                Analysis and metrics
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-10">
              <div className="grid gap-5 grid-cols-3">
                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{calculateStats().totalPatients}</div>
                      <p className="text-sm text-gray-600">Total Patients</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold">
                        {calculateStats().assessmentAccuracy}
                      </div>
                      <p className="text-sm text-gray-600">Assessment Accuracy (%)</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className="text-2xl font-bold">{calculateStats().totalAssessments}</div>
                      <p className="text-sm text-gray-600">Total Assessments</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Detailed Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <h4 className="font-semibold mb-2">Assessment Breakdown</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Confirmed Assessments:</span>
                            <span className="font-medium">
                              {calculateStats().correctAssessments}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Corrected Assessments:</span>
                            <span className="font-medium">
                              {calculateStats().totalAssessments - calculateStats().correctAssessments}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span> Accuracy Rate (%):</span>
                            <span className="font-medium">{calculateStats().assessmentAccuracy}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="font-semibold mb-2">Patient Overview</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span>Total Patients:</span>
                            <span className="font-medium">{calculateStats().totalPatients}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Patients with Scans:</span>
                            <span className="font-medium">{patients.filter((p) => p.scans.length > 0).length}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Average Scans per Patient:</span>
                            <span className="font-medium">
                              {calculateStats().totalPatients > 0
                                ? Math.round(
                                    (patients.reduce((sum, p) => sum + p.scans.length, 0) /
                                      calculateStats().totalPatients) *
                                      10
                                  ) / 10
                                : 0}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <DialogFooter>
              <Button onClick={() => setShowStatsModal(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Scan Details Modal */}
      {selectedScan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Scan Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <img
                    src={selectedScan.imageUrl || "/placeholder.svg"}
                    alt="Medical scan"
                    className="w-full h-64 object-cover rounded-md bg-gray-100"
                  />
                </div>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">AI Prediction</h3>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span>Condition:</span>
                        <span className="font-medium">{selectedScan.prediction.condition}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Confidence:</span>
                        <span>{(selectedScan.prediction.confidence * 100).toFixed(1)}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Upload Date:</span>
                        <span>{selectedScan.uploadDate}</span>
                      </div>
                    </div>
                  </div>

                  {selectedScan.doctorAssessment && (
                    <div>
                      <h3 className="font-semibold mb-2">Doctor Assessment</h3>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {selectedScan.doctorAssessment.confirmed ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-orange-500" />
                          )}
                          <span className="text-sm">
                            {selectedScan.doctorAssessment.confirmed ? "Confirmed" : "Corrected"}
                          </span>
                        </div>
                        {selectedScan.doctorAssessment.correctedDiagnosis && (
                          <div>
                            <span className="text-sm font-medium">Corrected Diagnosis: </span>
                            <span className="text-sm">{selectedScan.doctorAssessment.correctedDiagnosis}</span>
                          </div>
                        )}
                        <div className="text-sm text-gray-600">
                          <p>{selectedScan.doctorAssessment.notes}</p>
                          <p className="mt-1">
                            By {selectedScan.doctorAssessment.assessedBy} on{" "}
                            {selectedScan.doctorAssessment.assessedDate}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <RoleGuard allowedRoles={["doctor"]}>
                    {selectedScan.doctorAssessment && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setAssessmentNotes(selectedScan.doctorAssessment?.notes || "")
                          setCorrectedDiagnosis(selectedScan.doctorAssessment?.correctedDiagnosis || "")
                          setIsEditingAssessment(true)
                        }}
                        className="mt-2"
                      >
                        Edit Assessment
                      </Button>
                    )}

                    {(!selectedScan.doctorAssessment || isEditingAssessment) && (
                      <div className="space-y-4">
                        <h3 className="font-semibold">{isEditingAssessment ? "Edit Assessment" : "Add Assessment"}</h3>
                      <div className="space-y-3">
                        <div>
                          <Label htmlFor="corrected-diagnosis">Corrected Diagnosis (if needed)</Label>
                          <Input
                            id="corrected-diagnosis"
                            value={correctedDiagnosis}
                            onChange={(e) => setCorrectedDiagnosis(e.target.value)}
                            placeholder="Leave empty if AI prediction is correct"
                          />
                        </div>
                        <div>
                          <Label htmlFor="assessment-notes">Assessment Notes</Label>
                          <Textarea
                            id="assessment-notes"
                            value={assessmentNotes}
                            onChange={(e) => setAssessmentNotes(e.target.value)}
                            placeholder="Enter your assessment notes..."
                            rows={3}
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => handleDoctorAssessment(selectedScan.id)}>
                            {isEditingAssessment ? "Update Assessment" : "Submit Assessment"}
                          </Button>
                          {isEditingAssessment && (
                            <Button
                              variant="outline"
                              onClick={() => {
                                setIsEditingAssessment(false)
                                setAssessmentNotes("")
                                setCorrectedDiagnosis("")
                              }}
                            >
                              Cancel Edit
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    )}
                  </RoleGuard>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedScan(null)
                    setIsEditingAssessment(false)
                    setAssessmentNotes("")
                    setCorrectedDiagnosis("")
                  }}
                >
                  Close
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    if (!selectedScan) return;
                    setShowDeleteScanConfirm(selectedScan.id);
                  }}
                >
                  Delete Scan
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Delete Patient</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete this patient? This action cannot be undone and will remove all
                associated scans and assessments.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowDeleteConfirm(null)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={() => deletePatient(showDeleteConfirm)}>
                  Delete Patient
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
      {/* Delete Scan Confirmation Modal */}
      {showDeleteScanConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="max-w-md w-full">
            <CardHeader>
              <CardTitle>Delete Scan</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Are you sure you want to delete this scan? This action cannot be undone.
              </p>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowDeleteScanConfirm(null)}>
                  Cancel
                </Button>
                <Button 
                  variant="destructive" 
                  onClick={async () => {
                    if (!showDeleteScanConfirm || !selectedScan) return;
                    try {
                      await scanAPI.delete(showDeleteScanConfirm);

                      // Update local state
                      setPatients((prev) =>
                        prev.map((patient) =>
                          patient.id === selectedScan.patientId
                            ? { ...patient, scans: patient.scans.filter((s) => s.id !== showDeleteScanConfirm) }
                            : patient
                        )
                      );


                      // Update selectedPatient to reflect the change
                      setSelectedPatient((prev) => 
                        prev 
                          ? { ...prev, scans: prev.scans.filter((s) => s.id !== showDeleteScanConfirm) }
                          : null
                      );
                      setShowDeleteScanConfirm(null);
                      setSelectedScan(null);
                    } catch (error) {
                      console.error("Failed to delete scan:", error);
                      alert("Failed to delete scan.");
                    }
                  }}
                >
                  Delete Scan
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      
    </div>
  )
}
