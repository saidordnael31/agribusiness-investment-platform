"use client"

import { ProtectedRoute } from "@/components/auth/protected-route"
import { DistributorLayout } from "@/components/layout/distributor-layout"
import { BonificationSystem } from "@/components/bonification/bonification-system"
import { useEffect, useState } from "react"

export default function BonificationsPage() {
  const [userType, setUserType] = useState<string | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const userStr = localStorage.getItem("user")
      if (userStr) {
        const userData = JSON.parse(userStr)
        setUserType(userData.user_type)
      }
    }
  }, [])

  const isDistributor = userType === "distributor"
  const content = (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50">
      <div className="container mx-auto px-4 py-8">
        <BonificationSystem />
      </div>
    </div>
  )

  return (
    <ProtectedRoute allowedTypes={["distributor", "admin"]}>
      {isDistributor ? (
        <DistributorLayout>
          {content}
        </DistributorLayout>
      ) : (
        content
      )}
    </ProtectedRoute>
  )
}
