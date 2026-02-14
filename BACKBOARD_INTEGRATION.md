# Backboard API Integration Summary

## What is Backboard?
Backboard is a conversational AI platform that provides:
- Persistent conversation threads with memory
- Intelligent document processing and RAG (Retrieval Augmented Generation)
- Custom AI assistants with specific instructions
- Cross-thread memory for consistent context

## Integration Points

### 1. Backend (Python/FastAPI)
**Location:** `backend/backend.py`

**Configuration:**
```python
BACKBOARD_API_KEY = os.environ.get('BACKBOARD_API_KEY')
BACKBOARD_BASE_URL = "https://app.backboard.io/api"
```

**Key Functions:**
- `create_backboard_assistant(patient_data)` - Creates a specialized assistant for each patient
- `create_backboard_thread(assistant_id)` - Starts a new conversation thread
- `add_patient_memory(assistant_id, patient_id)` - Injects patient scan history into memory
- `send_backboard_message(thread_id, content)` - Sends messages and gets responses

### 2. Database
**Location:** `backend/create_chatbot_tables.sql`

**Tables Created:**
- `chat_threads` - Stores conversation session metadata
- `chat_messages` - Stores individual messages (local cache)
- `chat_assistants` - Maps patients to Backboard assistant IDs

### 3. Frontend (TypeScript/React)
**Location:** `frontend/frontend/components/chat/`

**Components:**
- `Chatbot.tsx` - Full-featured chat interface
- `ChatWidget.tsx` - Floating chat button
- `PatientChatPage.tsx` - Dashboard page template

**API Client:**
- `api/chatbot.ts` - Handles all chat API calls

## API Endpoints Used

### Backboard Endpoints
```
POST /assistants                    - Create AI assistant
POST /assistants/{id}/threads       - Create conversation thread
POST /threads/{id}/messages         - Send/receive messages
POST /assistants/{id}/memories      - Add facts to memory
GET  /assistants/{id}/memories      - List stored memories
DELETE /assistants/{id}/memories/{mid} - Remove memories
```

### Our Backend Endpoints
```
POST   /chat/threads/{patient_id}              - Create thread
GET    /chat/threads/{thread_id}               - Get thread + messages
POST   /chat/threads/{thread_id}/messages      - Send message
GET    /chat/patient/{patient_id}/threads      - List patient threads
DELETE /chat/threads/{thread_id}               - Delete thread
```

## Data Flow

```
Patient Dashboard
        ↓
[Chat Button Click]
        ↓
Frontend: POST /chat/threads/{patient_id}
        ↓
Backend: Checks if assistant exists
        ├→ If new: Create Backboard assistant with patient prompt
        ├→ If exists: Reuse existing assistant
        ↓
Backend: Load last 10 scans from database
        ↓
Backend: Add scan history to Backboard assistant memory
        ↓
Backend: Create new conversation thread with Backboard
        ↓
Frontend: Chat interface loads
        ↓
User: Types question "Has their condition worsened?"
        ↓
Frontend: POST /chat/threads/{thread_id}/messages
        ↓
Backend: Send to Backboard API with patient context
        ↓
Backboard: 
  1. Retrieves patient memories (scan history)
  2. Processes user question
  3. Generates medical insights
  4. Returns response
        ↓
Backend: Store both messages in database
        ↓
Frontend: Display response to user
```

## Memory Management

### Automatic Memory
- Backboard automatically extracts key facts from conversations
- Across-thread memory means it remembers across different chat sessions
- Set to "Auto" mode - intelligent decision making

### Manual Memory Addition
When starting a chat, we manually add:
```python
Patient scan history:
- 2024-02-10: Diabetic Macular Edema (92% confidence)
- 2024-01-15: Drusen detected (87% confidence)
- 2023-12-20: Normal (98% confidence)
```

### Cross-Thread Context
User can have multiple threads with same assistant. The assistant remembers:
- All previous conversations about this patient
- Key diagnoses and trends
- Important clinical notes
- Previous questions and answers

## System Prompt Design

The assistant is initialized with this prompt:
```
You are a medical consultation chatbot for OCT disease diagnosis.
You have access to [patient info and scan history].

Responsibilities:
- Provide info about OCT scans and diagnoses
- Answer clinical questions
- Track disease progression
- Remember patient details across conversations
- Flag concerning symptoms

Conditions you know about:
1. Choroidal Neovascularization (CNV)
2. Diabetic Macular Edema (DME)
3. Drusen
4. Normal
```

## Authentication
- All requests require `X-API-Key` header with Backboard API key
- Our backend handles this - frontend doesn't need API key
- Frontend uses JWT tokens for authentication with our backend

## Scalability Considerations

### Single Assistant Per Patient
- One Backboard assistant per patient (stored in `chat_assistants` table)
- Reused across multiple threads
- Reduces API quota usage

### Memory Limits
- Default: 10 most recent scans per patient
- Can be increased in `add_patient_memory()` function
- Backboard handles memory pruning

### Thread Lifecycle
- Threads persist indefinitely unless deleted
- Memory works across all threads of same assistant
- Users can maintain separate conversation threads

## Cost Optimization

1. **Reuse Assistants**: One assistant per patient, not per thread
2. **Batch Memory Updates**: Add scan history once on assistant creation
3. **Cache Locally**: Store messages in database, reduce API calls
4. **Lazy Initialization**: Create assistant only when needed

## Security Features

1. **API Key Protection**: Stored in backend `.env` only
2. **User Authentication**: JWT tokens on all endpoints
3. **Data Isolation**: Users only access their own threads
4. **HIPAA Compliance**: Backboard designed for medical data

## Error Handling

Backend includes error handling for:
- Invalid API key → 401 error
- Failed assistant creation → 500 error  
- Message sending failures → Graceful error with user notification
- Database errors → Rollback and user feedback

## Monitoring

To monitor chat usage:
```sql
-- Chat activity
SELECT DATE(created_at), COUNT(*) 
FROM chat_messages 
GROUP BY DATE(created_at);

-- Active threads
SELECT COUNT(*) FROM chat_threads 
WHERE updated_at > NOW() - INTERVAL '24 hours';

-- Assistant usage
SELECT COUNT(*) FROM chat_assistants;
```

## Environment Setup Checklist

- [ ] Get Backboard API key from dashboard
- [ ] Add `BACKBOARD_API_KEY` to backend `.env`
- [ ] Run `create_chatbot_tables.sql` on database
- [ ] Install `requests` package (if not already installed)
- [ ] Set `NEXT_PUBLIC_API_URL` in frontend `.env.local`
- [ ] Restart backend server
- [ ] Test with curl or Postman
- [ ] Verify in browser developer tools
