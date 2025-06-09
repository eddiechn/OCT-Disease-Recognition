"use client"

import { useState } from "react"
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

// Mock data
const mockPatients: Patient[] = [
  {
    id: "00001",
    name: "John Smith",
    age: 45,
    gender: "Male",
    currentAppointment: "2024-01-20",
    scans: [
      {
        id: "scan1",
        patientId: "00001",
        imageUrl: "/placeholder.svg?height=300&width=300",
        uploadDate: "2024-01-15",
        prediction: {
          condition: "Pneumonia",
          confidence: 0.87,
        },
        doctorAssessment: {
          notes: "Confirmed pneumonia in lower right lobe. Patient responding well to treatment.",
          confirmed: true,
          assessedBy: "Dr. Johnson",
          assessedDate: "2024-01-15",
        },
      },
    ],
  },
]

export default function MedicalClassificationApp() {
  const [currentRole, setCurrentRole] = useState<"Doctor" | "Technician">("Technician")
  const [patients, setPatients] = useState<Patient[]>(mockPatients)
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
  const [showAddPatientModal, setShowAddPatientModal] = useState(false)
  const [reschedulingHistory, setReschedulingHistory] = useState<
    Array<{ patientId: string; daysSaved: number; date: string }>
  >([])

  // Filter patients based on search term
  const filteredPatients = patients.filter(
    (patient) =>
      patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      patient.id.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  const handleImageUpload = (patientId: string, file: File) => {
    // Mock prediction generation
    const mockPredictions = [
      { condition: "Pneumonia", confidence: 0.85, severity: "Medium" as const },
      { condition: "COVID-19", confidence: 0.72, severity: "High" as const },
      { condition: "Normal", confidence: 0.91, severity: "Low" as const },
      { condition: "Tuberculosis", confidence: 0.68, severity: "High" as const },
    ]

    const randomPrediction = mockPredictions[Math.floor(Math.random() * mockPredictions.length)]

    const newScan: Scan = {
      id: `scan_${Date.now()}`,
      patientId,
      imageUrl: URL.createObjectURL(file),
      uploadDate: new Date().toISOString().split("T")[0],
      prediction: randomPrediction,
    }

    setPatients((prev) =>
      prev.map((patient) => (patient.id === patientId ? { ...patient, scans: [...patient.scans, newScan] } : patient)),
    )
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

  const addNewPatient = () => {
    if (!newPatientName.trim() || !newPatientAge || !newPatientGender) return

    // Generate a patient ID if not provided
    const patientId = newPatientId.trim() || `PT-${String(patients.length + 1).padStart(3, "0")}`

    // Check if ID already exists
    if (patients.some((p) => p.id === patientId)) {
      alert("Patient ID already exists. Please use a different ID.")
      return
    }

    const newPatient: Patient = {
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
  }

  const handleReschedule = () => {
    if (!selectedPatient || !newAppointmentDate) return

    const daysSaved = selectedPatient.currentAppointment
      ? calculateDaysSaved(selectedPatient.currentAppointment, newAppointmentDate)
      : 0

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

  const handleEditPatient = (patient: Patient) => {
    setEditPatientData({
      id: patient.id,
      name: patient.name,
      age: patient.age.toString(),
      gender: patient.gender,
    })
    setIsEditingPatient(true)
  }

  const savePatientEdit = () => {
    if (!selectedPatient || !editPatientData.name.trim() || !editPatientData.age || !editPatientData.gender) return

    // Check if ID already exists and is different from current patient
    if (editPatientData.id !== selectedPatient.id && patients.some((p) => p.id === editPatientData.id)) {
      alert("Patient ID already exists. Please use a different ID.")
      return
    }

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
  }

  const deletePatient = (patientId: string) => {
    setPatients((prev) => prev.filter((patient) => patient.id !== patientId))
    if (selectedPatient?.id === patientId) {
      setSelectedPatient(null)
    }
    setShowDeleteConfirm(null)
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
      <div className="bg-white border-b px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Medical Image Classification</h1>
          <div className="flex items-center gap-4">
            <Label htmlFor="role-select">Current Role:</Label>
            <Select value={currentRole} onValueChange={(value: "Doctor" | "Technician") => setCurrentRole(value)}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Technician">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Technician
                  </div>
                </SelectItem>
                <SelectItem value="Doctor">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4" />
                    Doctor
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Badge variant={currentRole === "Doctor" ? "default" : "secondary"} className="text-sm">
              {currentRole === "Doctor" ? "Full Access" : "Upload & View Only"}
            </Badge>
          </div>
        </div>
      </div>

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
                            <span>Next: {patient.currentAppointment}</span>
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
                              value={editPatientData.id}
                              onChange={(e) => setEditPatientData((prev) => ({ ...prev, id: e.target.value }))}
                              placeholder="Patient ID"
                              className="h-auto p-2"
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
                            {selectedPatient.currentAppointment || "No appointment scheduled"}
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
                                initialFocus
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
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="scans">Medical Scans</TabsTrigger>
                  <TabsTrigger value="upload">Upload New Scan</TabsTrigger>
                  <TabsTrigger value="stats">Statistics</TabsTrigger>
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

                <TabsContent value="stats" className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                      <CardContent className="p-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-blue-600">{calculateStats().totalPatients}</div>
                          <p className="text-sm text-gray-600">Total Patients</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{calculateStats().totalDaysSaved}</div>
                          <p className="text-sm text-gray-600">Days Saved</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-purple-600">
                            {calculateStats().assessmentAccuracy}%
                          </div>
                          <p className="text-sm text-gray-600">Assessment Accuracy</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-orange-600">{calculateStats().totalAssessments}</div>
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
                                <span className="font-medium text-green-600">
                                  {calculateStats().correctAssessments}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Corrected Assessments:</span>
                                <span className="font-medium text-orange-600">
                                  {calculateStats().totalAssessments - calculateStats().correctAssessments}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span>Accuracy Rate:</span>
                                <span className="font-medium">{calculateStats().assessmentAccuracy}%</span>
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
                                          10,
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

                  {currentRole === "Doctor" && selectedScan.doctorAssessment && (
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

                  {currentRole === "Doctor" && (!selectedScan.doctorAssessment || isEditingAssessment) && (
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
    </div>
  )
}
