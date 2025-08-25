"use client"

import { ReactNode } from "react"
import { authAPI } from "../../api/api"
import type { User } from "../../types"

interface RoleGuardProps {
  allowedRoles: ("doctor" | "technician")[]
  children: ReactNode
  fallback?: ReactNode
}

export function RoleGuard({ allowedRoles, children, fallback }: RoleGuardProps) {
  const user: User | null = authAPI.getStoredUser()
  
  if (!user || !allowedRoles.includes(user.role)) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-md">
        {fallback || (
          <p className="text-red-800">
            Access denied. This feature is only available to {allowedRoles.join(" and ")}s.
          </p>
        )}
      </div>
    )
  }

  return <>{children}</>
}
