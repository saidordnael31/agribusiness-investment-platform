"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"

export function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      console.log("[v0] Login attempt with email:", email)
      console.log("[v0] Password length:", password.length)

      const demoCredentials = {
        "investidor@akintec.com": { type: "investor", name: "João Silva" },
        "distributor@akintec.com": { type: "distributor", name: "Maria Santos", office_id: null, role: "office" },
        "assessor@akintec.com": { type: "distributor", name: "Pedro Costa", office_id: "office-1", role: "advisor" },
        "admin@akintec.com": { type: "admin", name: "Administrador" },
      }

      // Normalizar email para comparação
      const normalizedEmail = email.trim().toLowerCase()
      const normalizedPassword = password.trim()

      console.log("[v0] Normalized email:", normalizedEmail)
      console.log("[v0] Checking demo credentials...")

      // Verificar se é uma credencial de demonstração
      const demoUser = Object.entries(demoCredentials).find(
        ([demoEmail]) => demoEmail.toLowerCase() === normalizedEmail,
      )

      if (demoUser && normalizedPassword === "demo123") {
        console.log("[v0] Demo credentials matched!")
        const [, userInfo] = demoUser

        // Salvar dados do usuário no localStorage para compatibilidade
        const userData = {
          id: `demo-${Date.now()}`,
          email: normalizedEmail,
          name: userInfo.name,
          user_type: userInfo.type,
          office_id: userInfo.office_id || null,
          role: userInfo.role || null,
        }

        console.log("[v0] Saving user data:", userData)
        localStorage.setItem("user", JSON.stringify(userData))

        toast({
          title: "Login realizado com sucesso!",
          description: `Bem-vindo à plataforma Akintec, ${userInfo.name}!`,
        })

        let redirectPath = "/investor"
        if (userInfo.type === "distributor") {
          redirectPath = "/distributor"
        } else if (userInfo.type === "admin") {
          redirectPath = "/admin"
        }

        console.log("[v0] Redirecting to:", redirectPath)
        router.push(redirectPath)
        return
      }

      console.log("[v0] Not demo credentials, trying Supabase...")

      // Só tentar Supabase se não for credencial de demonstração
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()

      // Tentar autenticação real do Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
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
        description: `Bem-vindo à plataforma Akintec, ${profile.name}!`,
      })

      let redirectPath = "/investor"

      if (profile.user_type === "distributor") {
        redirectPath = "/distributor"
      } else if (profile.user_type === "admin") {
        redirectPath = "/admin"
      }

      router.push(redirectPath)
    } catch (error: any) {
      console.error("[v0] Login error:", error)
      toast({
        title: "Erro no login",
        description:
          "Credenciais inválidas. Use: investidor@akintec.com / demo123 ou distributor@akintec.com / demo123",
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
          placeholder="investidor@akintec.com"
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
          placeholder="demo123"
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
