"use client";

import React, { useState } from "react";
import { ChatWidget } from "@/components/chat";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface PatientChatPageProps {
  patientId: string;
  patientName: string;
  patientAge?: number;
  patientGender?: string;
  latestDiagnosis?: {
    condition: string;
    confidence: number;
    date: string;
  };
}

export const PatientChatPage: React.FC<PatientChatPageProps> = ({
  patientId,
  patientName,
  patientAge,
  patientGender,
  latestDiagnosis,
}) => {
  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Patient Info Card */}
      <Card className="p-6 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{patientName}</h1>
        <div className="flex gap-4 text-sm text-gray-600 mb-4">
          {patientAge && <span>Age: {patientAge}</span>}
          {patientGender && <span>Gender: {patientGender}</span>}
        </div>

        {latestDiagnosis && (
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Latest Diagnosis:</span>
            <Badge
              variant={
                latestDiagnosis.condition === "Normal" ? "outline" : "default"
              }
            >
              {latestDiagnosis.condition}
            </Badge>
            <span className="text-xs text-gray-500">
              {latestDiagnosis.confidence.toFixed(1)}% confidence •{" "}
              {latestDiagnosis.date}
            </span>
          </div>
        )}
      </Card>

      {/* Information Section */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Medical Assistant</h2>
        <div className="space-y-3 text-sm text-gray-700">
          <p>
            📋 <strong>What can I do?</strong>
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2">
            <li>Review this patient's OCT scan history and diagnoses</li>
            <li>
              Track disease progression and compare current vs. previous scans
            </li>
            <li>Answer clinical questions about their eye conditions</li>
            <li>Remember important details across conversations</li>
            <li>Help assess changes in the patient's condition</li>
          </ul>

          <p className="mt-4">
            💡 <strong>Try asking:</strong>
          </p>
          <ul className="list-disc list-inside space-y-2 ml-2 text-blue-600">
            <li>"Has their condition worsened?"</li>
            <li>"What's the diagnosis trend?"</li>
            <li>"Show me the scan history for the past 3 months"</li>
            <li>"What symptoms should we monitor?"</li>
            <li>"Is there any change in the disease status?"</li>
          </ul>
        </div>
      </Card>

      {/* Chat Widget */}
      <ChatWidget patientId={patientId} patientName={patientName} />
    </div>
  );
};

export default PatientChatPage;
