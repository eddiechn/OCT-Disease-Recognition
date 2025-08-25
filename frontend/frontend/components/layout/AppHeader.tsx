"use client"

import { Button } from "../ui/button"
import { Badge } from "../ui/badge"
import { authAPI } from "../../api/api"

interface AppHeaderProps {
  onLogout: () => void
}

export function AppHeader({ onLogout }: AppHeaderProps) {
  const user = authAPI.getStoredUser()

  const handleLogout = () => {
    authAPI.logout()
    onLogout()
  }

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-gray-900">
              OCT Disease Recognition
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            {user && (
              <>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700">
                    Welcome, {user.username}
                  </span>
                  <Badge variant={user.role === "doctor" ? "default" : "secondary"}>
                    {user.role}
                  </Badge>
                </div>
                <Button onClick={handleLogout} variant="outline" size="sm">
                  Logout
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
