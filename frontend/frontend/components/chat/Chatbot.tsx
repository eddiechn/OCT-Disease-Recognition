"use client";

import React, { useState, useEffect, useRef } from "react";
import { chatbotAPI, ChatMessage, ChatThread } from "@/api/chatbot";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Loader, Send, X, MessageCircle } from "lucide-react";

interface ChatbotProps {
  patientId: string;
  patientName?: string;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Chatbot: React.FC<ChatbotProps> = ({
  patientId,
  patientName,
  isOpen = true,
  onClose,
}) => {
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    initializeChat();
  }, [patientId, isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const initializeChat = async () => {
    try {
      setIsInitializing(true);
      setError(null);

      // Quick health check to ensure backend is reachable before creating threads
      try {
        await chatbotAPI.ping();
      } catch (pingErr) {
        console.error("Chat backend health check failed:", pingErr);
        setError("Cannot reach backend chat service. Ensure backend is running (http://localhost:8000/test)");
        return;
      }

      // Try to get existing threads for this patient
      const threads = await chatbotAPI.getPatientThreads(patientId);

      if (threads.length > 0) {
        // Use the most recent thread
        const existingThread = threads[0];
        setThread(existingThread);

        // Load messages from existing thread
        const threadData = await chatbotAPI.getThread(existingThread.id);
        setMessages(threadData.messages);
      } else {
        // Create a new thread
        const newThread = await chatbotAPI.startChatThread(patientId);
        setThread(newThread);
        setMessages([]);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to initialize chat"
      );
      console.error("Chat initialization error:", err);
    } finally {
      setIsInitializing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !thread || loading) return;

    try {
      setLoading(true);
      setError(null);

      // Add user message to UI immediately
      const userMessage: ChatMessage = {
        content: inputValue,
        role: "user",
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);
      setInputValue("");

      // Send to API
      const response = await chatbotAPI.sendMessage(thread.id, inputValue);

      // Add assistant response
      const assistantMessage: ChatMessage = {
        content: response.message.content,
        role: "assistant",
        created_at: response.message.created_at || new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      console.error("Send message error:", err);
      // Remove the user message if there was an error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <Card className="flex flex-col h-full max-h-96 w-96 bg-white shadow-lg rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <MessageCircle size={20} />
          <div>
            <h3 className="font-semibold">Medical Assistant</h3>
            {patientName && <p className="text-xs opacity-90">{patientName}</p>}
          </div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="hover:bg-blue-700 p-1 rounded transition"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {isInitializing ? (
          <div className="flex justify-center items-center h-full">
            <Loader className="animate-spin text-blue-600" size={24} />
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-center">
            <div>
              <p className="text-sm">
                👋 Hi! I'm your medical assistant for this patient's OCT scans.
              </p>
              <p className="text-xs mt-2">
                Ask me questions about the patient's condition, diagnosis
                history, or disease progression.
              </p>
            </div>
          </div>
        ) : (
          messages.map((message, idx) => (
            <div
              key={idx}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                  message.role === "user"
                    ? "bg-blue-600 text-white rounded-br-none"
                    : "bg-gray-200 text-gray-900 rounded-bl-none"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))
        )}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">
            {error}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t p-3 bg-white">
        <div className="flex gap-2">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about the patient..."
            disabled={loading || isInitializing || !thread}
            className="flex-1 text-sm"
          />
          <Button
            onClick={handleSendMessage}
            disabled={loading || isInitializing || !thread || !inputValue.trim()}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <Loader size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default Chatbot;
