import axios from "axios";

// Determine base URL safely in browser and server environments
const API_BASE_URL = (() => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") {
    // default to same host but port 8000 where backend usually runs during development
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return "http://localhost:8000";
})();

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Debug: reveal resolved base URL in browser console to help diagnose network issues
if (typeof window !== "undefined") {
  // eslint-disable-next-line no-console
  console.debug("CHATBOT_API_BASE_URL", API_BASE_URL);
}

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export interface ChatMessage {
  content: string;
  role: "user" | "assistant";
  created_at?: string;
}

export interface ChatThread {
  id: string;
  assistant_id: string;
  backboard_thread_id: string;
  patient_id: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface ChatResponse {
  message: ChatMessage;
  thread_id: string;
}

export const chatbotAPI = {
  // Start a new chat thread for a patient
  startChatThread: async (patientId: string): Promise<ChatThread> => {
    const response = await api.post(`/chat/threads/${patientId}`);
    return response.data;
  },

  // Get a specific chat thread with messages
  getThread: async (threadId: string): Promise<{ thread: ChatThread; messages: ChatMessage[] }> => {
    const response = await api.get(`/chat/threads/${threadId}`);
    return response.data;
  },

  // Send a message to the chatbot
  sendMessage: async (threadId: string, content: string): Promise<ChatResponse> => {
    const response = await api.post(`/chat/threads/${threadId}/messages`, { message_content: content });
    return response.data;
  },

  // Get all chat threads for a patient
  getPatientThreads: async (patientId: string): Promise<ChatThread[]> => {
    const url = `/chat/patient/${patientId}/threads`;
    try {
      const response = await api.get(url);
      return response.data;
    } catch (err: any) {
      // log detailed info for debugging network errors and provide actionable hints
      if (err?.response) {
        console.error("chatbotAPI.getPatientThreads error - response", {
          url: API_BASE_URL + url,
          status: err.response.status,
          data: err.response.data,
        });
      } else if (err?.request) {
        console.error("chatbotAPI.getPatientThreads error - no response received", {
          url: API_BASE_URL + url,
          request: err.request,
          message: err.message,
        });
      } else {
        console.error("chatbotAPI.getPatientThreads error - request setup failed", {
          url: API_BASE_URL + url,
          message: err?.message,
        });
      }
      throw err;
    }
  },

  // Simple health check to confirm backend reachability
  ping: async (): Promise<any> => {
    const response = await api.get(`/test`);
    return response.data;
  },

  // Delete a chat thread
  deleteThread: async (threadId: string): Promise<ChatThread> => {
    const response = await api.delete(`/chat/threads/${threadId}`);
    return response.data;
  },
};
