"use client"

import { DistributorDashboard } from "@/components/distributor/distributor-dashboard"
import { DistribuidorDashboard } from "@/components/distributor/distribuidor-dashboard"
import { ProtectedRoute } from "@/components/auth/protected-route"
import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function DistributorPage() {
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkRole = async () => {
      try {
        const userStr = localStorage.getItem("user")
        if (userStr) {
          const userData = JSON.parse(userStr)
          const supabase = createClient()
          
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", userData.id)
            .single()

          setRole(profile?.role || null)
        }
      } catch (error) {
        console.error("Erro ao verificar role:", error)
      } finally {
        setLoading(false)
      }
    }

    checkRole()
  }, [])

  if (loading) {
    return (
      <ProtectedRoute allowedTypes={["distributor"]}>
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Carregando...</div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  // Se o role for "distribuidor", usar o dashboard específico
  if (role === "distribuidor") {
    return (
      <ProtectedRoute allowedTypes={["distributor"]}>
        <DistribuidorDashboard />
      </ProtectedRoute>
    )
  }
  
  // Caso contrário, usar o dashboard padrão (para assessores/escritórios)
  return (
    <ProtectedRoute allowedTypes={["distributor"]}>
      <DistributorDashboard />
    </ProtectedRoute>
  )
}
