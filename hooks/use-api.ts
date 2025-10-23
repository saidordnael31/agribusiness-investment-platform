"use client"

import { useState, useCallback } from "react"
import { apiClient } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"

interface UseApiState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

export function useApi<T>() {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: false,
    error: null,
  })
  const { toast } = useToast()

  const execute = useCallback(
    async (apiCall: () => Promise<any>) => {
      setState((prev) => ({ ...prev, loading: true, error: null }))

      try {
        const response = await apiCall()

        if (response.success) {
          setState({ data: response.data, loading: false, error: null })
          return response.data
        } else {
          setState({ data: null, loading: false, error: response.error || "Erro desconhecido" })
          toast({
            title: "Erro",
            description: response.error || "Ocorreu um erro inesperado",
            variant: "destructive",
          })
          return null
        }
      } catch (error: any) {
        const errorMessage = error.message || "Erro de conexão"
        setState({ data: null, loading: false, error: errorMessage })
        toast({
          title: "Erro de Conexão",
          description: errorMessage,
          variant: "destructive",
        })
        return null
      }
    },
    [toast],
  )

  const reset = useCallback(() => {
    setState({ data: null, loading: false, error: null })
  }, [])

  return {
    ...state,
    execute,
    reset,
  }
}

// Hook específico para autenticação
export function useAuth() {
  const api = useApi()
  const { toast } = useToast()

  const login = useCallback(
    async (email: string, password: string) => {
      const result = await api.execute(() => apiClient.login(email, password))

      if (result) {
        localStorage.setItem(
          "user",
          JSON.stringify({
            ...result.user,
            token: result.token,
          }),
        )

        toast({
          title: "Login realizado com sucesso!",
          description: `Bem-vindo à plataforma AGRINVEST!`,
        })

        return result.user
      }

      return null
    },
    [api, toast],
  )

  const register = useCallback(
    async (userData: any) => {
      const result = await api.execute(() => apiClient.register(userData))

      if (result) {
        localStorage.setItem(
          "user",
          JSON.stringify({
            ...result.user,
            token: result.token,
          }),
        )

        toast({
          title: "Cadastro realizado com sucesso!",
          description: `Bem-vindo à plataforma AGRINVEST!`,
        })

        return result.user
      }

      return null
    },
    [api, toast],
  )

  return {
    ...api,
    login,
    register,
  }
}
