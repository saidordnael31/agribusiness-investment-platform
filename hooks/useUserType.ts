"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { getUserTypeFromId, type UserType } from "@/lib/user-type-utils"

export interface UseUserTypeReturn {
  user_type_id: number | null
  user_type: UserType | null
  display_name: string | null
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

/**
 * Hook para obter informações do tipo de usuário atual
 * Busca o user_type_id do profile e retorna os dados completos do user_type
 */
export function useUserType(userId?: string | null): UseUserTypeReturn {
  const [user_type_id, setUserTypeId] = useState<number | null>(null)
  const [user_type, setUserType] = useState<UserType | null>(null)
  const [display_name, setDisplayName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchUserType = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Obter userId do localStorage se não fornecido
      let currentUserId = userId
      if (!currentUserId && typeof window !== "undefined") {
        const userStr = localStorage.getItem("user")
        if (userStr) {
          const user = JSON.parse(userStr)
          currentUserId = user.id
        }
      }

      if (!currentUserId) {
        setUserTypeId(null)
        setUserType(null)
        setDisplayName(null)
        setIsLoading(false)
        return
      }

      const supabase = createClient()

      // Buscar profile para obter user_type_id
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("user_type_id")
        .eq("id", currentUserId)
        .single()

      if (profileError) {
        console.error("[useUserType] Erro ao buscar profile:", profileError)
        setError(new Error(profileError.message))
        setUserTypeId(null)
        setUserType(null)
        setDisplayName(null)
        setIsLoading(false)
        return
      }

      const profileUserTypeId = profile?.user_type_id || null
      setUserTypeId(profileUserTypeId)

      // Se não houver user_type_id, tentar usar fallback do user_type/role antigo
      if (!profileUserTypeId) {
        // Buscar user_type e role do profile para mapeamento legado
        const { data: legacyProfile } = await supabase
          .from("profiles")
          .select("user_type, role")
          .eq("id", currentUserId)
          .single()

        if (legacyProfile) {
          // Durante migração, podemos usar o mapeamento legado
          // Por enquanto, apenas definir como null e deixar o sistema usar fallback
          setUserType(null)
          setDisplayName(null)
          setIsLoading(false)
          return
        }
      }

      // Buscar dados completos do user_type
      if (profileUserTypeId) {
        const userTypeData = await getUserTypeFromId(profileUserTypeId)
        setUserType(userTypeData)
        setDisplayName(userTypeData?.display_name || null)
      } else {
        setUserType(null)
        setDisplayName(null)
      }
    } catch (err) {
      console.error("[useUserType] Erro inesperado:", err)
      setError(err instanceof Error ? err : new Error("Erro desconhecido"))
      setUserTypeId(null)
      setUserType(null)
      setDisplayName(null)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchUserType()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  return {
    user_type_id,
    user_type,
    display_name,
    isLoading,
    error,
    refresh: fetchUserType,
  }
}


