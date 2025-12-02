"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedTypes: string[]
}

export function ProtectedRoute({ children, allowedTypes }: ProtectedRouteProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const checkAuth = async () => {
      const userStr = localStorage.getItem("user")
      if (!userStr) {
        router.push("/login")
        return
      }

      try {
        const user = JSON.parse(userStr)
        console.log("[v0] ProtectedRoute checking user:", user)
        console.log("[v0] Allowed types:", allowedTypes)
        console.log("[v0] User type:", user.user_type)

        // Verificar se o usuário precisa trocar senha
        // Primeiro verificar se já estamos na página de troca de senha
        if (pathname !== "/newPassword") {
          try {
            const supabase = createClient()
            const { data: profile, error: profileError } = await supabase
              .from("profiles")
              .select("is_pass_temp")
              .eq("id", user.id)
              .single()

            if (!profileError && profile?.is_pass_temp === true) {
              console.log("[v0] Usuário precisa trocar senha. Redirecionando para /newPassword")
              router.push("/newPassword?force=true")
              return
            }
          } catch (error) {
            console.error("[v0] Erro ao verificar is_pass_temp:", error)
            // Continuar com verificação normal em caso de erro
          }
        }

        // Verificar tipos permitidos
        if (allowedTypes.includes(user.user_type)) {
          setIsAuthorized(true)
        } else {
          console.log("[v0] User not authorized, redirecting to login")
          router.push("/login")
        }
      } catch {
        router.push("/login")
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router, allowedTypes, pathname])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return <>{children}</>
}
