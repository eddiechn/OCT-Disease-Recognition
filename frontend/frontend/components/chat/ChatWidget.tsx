"use client";

import React, { useState } from "react";
import { Chatbot } from "./Chatbot";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatWidgetProps {
  patientId: string;
  patientName?: string;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  patientId,
  patientName,
}) => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-40">
        {!isChatOpen ? (
          <Button
            onClick={() => setIsChatOpen(true)}
            className="rounded-full w-14 h-14 bg-blue-600 hover:bg-blue-700 shadow-lg"
            title="Open chat assistant"
          >
            <MessageCircle size={24} />
          </Button>
        ) : (
          <div className="fixed bottom-6 right-6 z-40">
            <Chatbot
              patientId={patientId}
              patientName={patientName}
              isOpen={isChatOpen}
              onClose={() => setIsChatOpen(false)}
            />
          </div>
        )}
      </div>
    </>
  );
};

export default ChatWidget;
