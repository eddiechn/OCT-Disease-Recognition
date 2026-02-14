# OCT Medical Chatbot Setup Guide

## Overview
This chatbot integration uses **Backboard AI** to provide intelligent medical consultations about patient OCT (Optical Coherence Tomography) scans. The chatbot remembers patient history and can track disease progression.

## Features
- ✅ Real-time conversations with persistent memory
- ✅ Patient diagnosis history integration
- ✅ Disease progression tracking
- ✅ Available to both doctors and technicians
- ✅ Floating widget in patient dashboards
- ✅ Cross-thread memory for consistent context

## Prerequisites

### 1. Backboard API Account
1. Visit [Backboard Dashboard](https://app.backboard.io/)
2. Create a new account or sign in
3. Go to **Settings → API Keys**
4. Click **Create New API Key**
5. Copy and securely store your API key

### 2. Environment Variables
Add the following to your `.env` file in the backend directory:

```bash
BACKBOARD_API_KEY=your_api_key_here
```

## Database Setup

### 1. Create Chatbot Tables
Run the migration script to create the necessary database tables:

```bash
psql -U eddie -d oct_disease -f backend/create_chatbot_tables.sql
```

This creates:
- `chat_threads` - Stores conversation sessions
- `chat_messages` - Stores individual messages
- `chat_assistants` - Stores assistant metadata per patient

### 2. Verify Tables
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'chat_%';
```

## Backend Integration

### 1. Installation
All required dependencies are already in `requirements.txt`. If you need to install:

```bash
pip install requests
```

### 2. Running the Backend
```bash
cd backend
python backend.py
```

The following new endpoints are available:

#### Chat Thread Management
- `POST /chat/threads/{patient_id}` - Start a new chat session
- `GET /chat/threads/{thread_id}` - Get thread with all messages
- `GET /chat/patient/{patient_id}/threads` - Get all threads for a patient
- `DELETE /chat/threads/{thread_id}` - Delete a thread

#### Messaging
- `POST /chat/threads/{thread_id}/messages` - Send a message to the chatbot

All endpoints require authentication via JWT token.

## Frontend Integration

### 1. Add Chat Components to Your Pages

#### Option A: Full Patient Chat Page
```typescript
import { PatientChatPage } from "@/components/chat";

export default function PatientPage({ params }: { params: { id: string } }) {
  return (
    <PatientChatPage
      patientId={params.id}
      patientName="John Doe"
      patientAge={65}
      patientGender="M"
      latestDiagnosis={{
        condition: "Diabetic Macular Edema",
        confidence: 0.92,
        date: "2024-02-10"
      }}
    />
  );
}
```

#### Option B: Floating Chat Widget (Minimal)
```typescript
import { ChatWidget } from "@/components/chat";

export default function PatientDashboard() {
  return (
    <div>
      {/* Your existing patient dashboard content */}
      <ChatWidget 
        patientId="patient-id-here" 
        patientName="Patient Name"
      />
    </div>
  );
}
```

#### Option C: Embedded Chat Component
```typescript
import { Chatbot } from "@/components/chat";

export default function PatientDetails() {
  return (
    <div className="flex gap-4">
      <div className="flex-1">
        {/* Patient details */}
      </div>
      <div className="w-96">
        <Chatbot 
          patientId="patient-id" 
          patientName="Patient Name"
          isOpen={true}
        />
      </div>
    </div>
  );
}
```

### 2. API Client Configuration
The `api/chatbot.ts` file automatically uses `NEXT_PUBLIC_API_URL` environment variable:

```bash
# In your .env.local for frontend
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## How It Works

### 1. Creating a Chat Session
```
User clicks "Chat" button
↓
Backend creates Backboard assistant for patient
↓
Assistant is populated with patient's scan history
↓
New conversation thread is created
↓
Chat interface opens and ready for questions
```

### 2. Sending Messages
```
User types question (e.g., "Has their condition worsened?")
↓
Message sent to backend with thread ID
↓
Backend forwards to Backboard API
↓
Backboard assistant analyzes patient context + question
↓
Response returned with medical insights
↓
Both messages stored in database for history
↓
Memory automatically updated for future conversations
```

### 3. Patient Context Integration
The chatbot automatically receives:
- Patient demographics (age, gender, name)
- Last 10 scans with dates and diagnoses
- Doctor's corrections/notes
- Confidence levels for each diagnosis
- Prediction trends

## Example Conversations

### Question: "Has their condition worsened?"
**Assistant Response:**
"Based on the scan history, the patient showed Diabetic Macular Edema with 92% confidence in the latest scan (2024-02-10). Comparing with the previous scan (2024-01-15), there appears to be an increase in macular thickness. I recommend immediate review by the attending physician for potential treatment adjustment."

### Question: "What's the diagnosis trend?"
**Assistant Response:**
"The patient's diagnosis history over the past 3 months:
- Dec 2023: Normal (98% confidence)
- Jan 2024: Drusen detected (87% confidence)
- Feb 2024: Diabetic Macular Edema (92% confidence)

This shows a progression from normal to pathological findings. Close monitoring is recommended."

### Question: "Any concerning changes?"
**Assistant Response:**
"Yes, several notable changes:
1. Rapid progression from normal to DME in 2 months
2. Increased confidence levels suggest clearer disease manifestation
3. Location analysis shows central involvement, which typically requires treatment

Recommend urgent ophthalmology review and consider anti-VEGF or steroid interventions."

## Security Considerations

### API Key Protection
- Never expose `BACKBOARD_API_KEY` in client-side code
- Keep it in backend `.env` only
- Use environment variables for all sensitive data

### Authentication
- All chat endpoints require JWT token
- Users can only access threads they created
- Patient data is only accessible to authorized personnel

### Data Privacy
- Chat history is stored in your database
- Patient scan information is embedded in assistant memory
- Backboard follows medical data compliance standards

## Troubleshooting

### Issue: "Invalid or missing API key"
**Solution:** Verify `BACKBOARD_API_KEY` is set correctly in backend `.env`

### Issue: Chat not loading
**Solution:** 
1. Check backend is running: `http://localhost:8000/test`
2. Verify JWT token is valid
3. Check browser console for error details

### Issue: Messages not being saved
**Solution:**
1. Verify chat tables exist: `SELECT * FROM chat_threads`
2. Check database connection string in `DATABASE_URL`
3. Review backend logs for SQL errors

### Issue: Patient memory not populating
**Solution:**
1. Verify scans exist in database for the patient
2. Check Backboard API response: Enable debug logging in backend
3. Ensure Backboard assistant creation succeeded

## Performance Optimization

### Message Caching
Messages are stored locally and fetched on thread load, reducing API calls.

### Thread Reuse
When a patient has existing threads, the most recent one is loaded by default.

### Lazy Loading
Chat component only initializes when opened, reducing page load time.

## Future Enhancements

- [ ] Voice input/output for accessibility
- [ ] Multi-language support
- [ ] Advanced analytics on conversation topics
- [ ] Integration with EHR systems
- [ ] Batch patient condition analysis
- [ ] Document upload for additional context
- [ ] Real-time collaboration between doctor and technician

## Support

For Backboard API documentation: https://docs.backboard.io/

For issues or questions:
1. Check API response status codes
2. Review backend logs
3. Test endpoints with curl or Postman
4. Verify patient data exists in database

## Example curl Commands

### Start chat thread
```bash
curl -X POST http://localhost:8000/chat/threads/{patient_id} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Send message
```bash
curl -X POST http://localhost:8000/chat/threads/{thread_id}/messages \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"message_content": "Has their condition worsened?"}'
```

### Get thread messages
```bash
curl -X GET http://localhost:8000/chat/threads/{thread_id} \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```
