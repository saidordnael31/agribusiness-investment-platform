"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Credenciais de demonstração para testes
      const demoCredentials = {
        "investidor@agroderi.com": { type: "investor", name: "João Silva" },
        "distributor@agroderi.com": { type: "distributor", name: "Maria Santos", office_id: null, role: "office" },
        "assessor@agroderi.com": { type: "distributor", name: "Pedro Costa", office_id: "office-1", role: "advisor" },
        "admin@agroderi.com": { type: "admin", name: "Administrador" },
      }

      // Verificar se é credencial de demonstração
      if (demoCredentials[email as keyof typeof demoCredentials] && password === "demo123") {
        const userInfo = demoCredentials[email as keyof typeof demoCredentials]

        // Salvar dados do usuário no localStorage para compatibilidade
        localStorage.setItem(
          "user",
          JSON.stringify({
            id: `demo-${Date.now()}`,
            email,
            name: userInfo.name,
            user_type: userInfo.type,
            office_id: userInfo.office_id || null,
            role: userInfo.role || null,
          }),
        )

        toast({
          title: "Login realizado com sucesso!",
          description: `Bem-vindo à plataforma Agroderi, ${userInfo.name}!`,
        })

        let redirectPath = "/investor"
        if (userInfo.type === "distributor") {
          redirectPath = "/distributor"
        } else if (userInfo.type === "admin") {
          redirectPath = "/admin"
        }

        router.push(redirectPath)
        return
      }

      // Tentar autenticação real do Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authData.user.id)
        .single()

      if (profileError) throw profileError

      toast({
        title: "Login realizado com sucesso!",
        description: `Bem-vindo à plataforma Agroderi, ${profile.name}!`,
      })

      let redirectPath = "/investor"

      if (profile.user_type === "distributor") {
        redirectPath = "/distributor"
      } else if (profile.user_type === "admin") {
        redirectPath = "/admin"
      }

      router.push(redirectPath)
    } catch (error: any) {
      console.error("Login error:", error)
      toast({
        title: "Erro no login",
        description: "Credenciais inválidas. Use as credenciais de demonstração ou cadastre-se.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  )
}
