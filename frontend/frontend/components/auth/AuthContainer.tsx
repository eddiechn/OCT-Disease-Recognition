"use client"

import { useState } from "react"
import { LoginForm } from "./LoginForm"
import { RegisterForm } from "./RegisterForm"

interface AuthContainerProps {
  onAuthSuccess: () => void
}

export function AuthContainer({ onAuthSuccess }: AuthContainerProps) {
  const [mode, setMode] = useState<"login" | "register">("login")

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        {mode === "login" ? (
          <LoginForm
            onSuccess={onAuthSuccess}
            onSwitchToRegister={() => setMode("register")}
          />
        ) : (
          <RegisterForm
            onSuccess={onAuthSuccess}
            onSwitchToLogin={() => setMode("login")}
          />
        )}
      </div>
    </div>
  )
}
