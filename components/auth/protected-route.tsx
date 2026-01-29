"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { getUserTypeFromId } from "@/lib/user-type-utils"

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

        // Verificar tipos permitidos usando APENAS user_type_id da tabela user_types
        const supabase = createClient()
        
        // Buscar user_type_id do profile
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("user_type_id")
          .eq("id", user.id)
          .single()

        if (profileError || !profile || !profile.user_type_id) {
          console.error("[v0] Profile não encontrado ou sem user_type_id:", profileError)
          console.error("[v0] Profile data:", profile)
          console.error("[v0] User ID:", user.id)
          router.push("/login")
          return
        }
        
        console.log("[v0] Profile encontrado com user_type_id:", profile.user_type_id)

        // Buscar user_type da tabela user_types
        const userTypeData = await getUserTypeFromId(profile.user_type_id)
        if (!userTypeData) {
          console.error("[v0] User type não encontrado para user_type_id:", profile.user_type_id)
          router.push("/login")
          return
        }

        // Usar apenas o campo user_type, não o name (slug)
        const userTypeToCheck = userTypeData.user_type

        console.log("[v0] User type to check:", userTypeToCheck)
        console.log("[v0] Allowed types:", allowedTypes)

        // Verificar se o tipo do usuário está nos tipos permitidos
        // Também verificar tipos relacionados (advisor e office podem acessar páginas de distributor)
        let isAuthorized = allowedTypes.includes(userTypeToCheck)
        console.log("[v0] Direct authorization check:", isAuthorized)
        
        // Se não autorizado diretamente, verificar tipos relacionados
        if (!isAuthorized) {
          // Se a página permite "distributor", também permitir "advisor" e "office"
          if (allowedTypes.includes("distributor")) {
            isAuthorized = userTypeToCheck === "advisor" || userTypeToCheck === "office"
            console.log("[v0] Related type check (distributor):", isAuthorized)
          }
        }

        console.log("[v0] Final authorization:", isAuthorized)

        if (isAuthorized) {
          setIsAuthorized(true)
        } else {
          console.log("[v0] User not authorized, redirecting to login")
          console.log("[v0] User type:", userTypeToCheck, "not in allowed types:", allowedTypes)
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
