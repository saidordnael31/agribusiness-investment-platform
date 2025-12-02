"use client"

import { CommissionCalculator } from "@/components/calculator/commission-calculator"
import { DistributorLayout } from "@/components/layout/distributor-layout"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useEffect, useState } from "react"

export default function CalculatorPage() {
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

  return (
    <ProtectedRoute allowedTypes={["distributor", "admin"]}>
      {isDistributor ? (
        <DistributorLayout>
          <CommissionCalculator />
        </DistributorLayout>
      ) : (
        <CommissionCalculator />
      )}
    </ProtectedRoute>
  )
}
