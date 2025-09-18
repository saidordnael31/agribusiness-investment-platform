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
      console.log("[v0] Normalized password:", normalizedPassword)
      console.log("[v0] Available demo emails:", Object.keys(demoCredentials))

      const isDemoCredential = Object.keys(demoCredentials).some(
        (demoEmail) => demoEmail.toLowerCase() === normalizedEmail,
      )

      console.log("[v0] Is demo credential:", isDemoCredential)
      console.log("[v0] Password matches demo123:", normalizedPassword === "demo123")

      if (isDemoCredential && normalizedPassword === "demo123") {
        console.log("[v0] Demo credentials matched!")
        const userInfo = demoCredentials[normalizedEmail as keyof typeof demoCredentials]

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
        try {
          router.push(redirectPath)
          // Fallback caso router.push não funcione
          setTimeout(() => {
            console.log("[v0] Router fallback - using window.location")
            window.location.href = redirectPath
          }, 100)
        } catch (error) {
          console.log("[v0] Router error, using window.location:", error)
          window.location.href = redirectPath
        }
        return
      }

      console.log("[v0] Attempting Supabase authentication...")

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

      console.log("[v0] Supabase URL configured:", !!supabaseUrl)
      console.log("[v0] Supabase Key configured:", !!supabaseKey)

      if (!supabaseUrl || !supabaseKey) {
        console.log("[v0] Supabase not configured, falling back to demo only")
        toast({
          title: "Erro no login",
          description: "Credenciais inválidas. Para demonstração, use: admin@akintec.com / demo123",
          variant: "destructive",
        })
        return
      }

      console.log("[v0] Creating Supabase client...")
      const { createClient } = await import("@/lib/supabase/client")
      const supabase = createClient()

      console.log("[v0] Attempting Supabase signInWithPassword...")
      // Tentar autenticação real do Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword,
      })

      if (authError) {
        console.log("[v0] Supabase auth error:", authError.message)

        // Fornecer feedback mais específico baseado no tipo de erro
        let errorMessage = "Credenciais inválidas."

        if (authError.message.includes("Invalid login credentials")) {
          errorMessage =
            "Email ou senha incorretos. Verifique suas credenciais ou confirme seu email se ainda não o fez."
        } else if (authError.message.includes("Email not confirmed")) {
          errorMessage = "Email não confirmado. Verifique sua caixa de entrada e clique no link de confirmação."
        } else if (authError.message.includes("Too many requests")) {
          errorMessage = "Muitas tentativas de login. Aguarde alguns minutos antes de tentar novamente."
        }

        toast({
          title: "Erro no login",
          description: errorMessage + " Para demonstração, use: admin@akintec.com / demo123",
          variant: "destructive",
        })
        return
      }

      console.log("[v0] Supabase auth successful, fetching profile...")
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authData.user.id)
        .order("created_at", { ascending: false })

      if (profileError) {
        console.log("[v0] Profile fetch error:", profileError.message)
        toast({
          title: "Erro no login",
          description: "Erro ao carregar perfil do usuário. Tente novamente.",
          variant: "destructive",
        })
        return
      }

      if (!profiles || profiles.length === 0) {
        console.log("[v0] No profile found for user")
        toast({
          title: "Erro no login",
          description: "Perfil do usuário não encontrado. Entre em contato com o suporte.",
          variant: "destructive",
        })
        return
      }

      const profile = profiles[0]
      console.log("[v0] Profile fetched successfully:", profile)

      const userData = {
        id: authData.user.id,
        email: profile.email,
        name: profile.full_name, // Corrigido: usar full_name em vez de name
        user_type: profile.user_type,
        office_id: profile.office_id || null,
        role: profile.role || null,
      }

      console.log("[v0] Saving Supabase user data:", userData)
      localStorage.setItem("user", JSON.stringify(userData))

      toast({
        title: "Login realizado com sucesso!",
        description: `Bem-vindo à plataforma Akintec, ${profile.full_name}!`, // Corrigido: usar full_name
      })

      let redirectPath = "/investor"

      if (profile.user_type === "distributor") {
        redirectPath = "/distributor"
      } else if (profile.user_type === "admin") {
        redirectPath = "/admin"
      }

      console.log("[v0] Redirecting to:", redirectPath)
      try {
        router.push(redirectPath)
        // Fallback caso router.push não funcione
        setTimeout(() => {
          console.log("[v0] Router fallback - using window.location")
          window.location.href = redirectPath
        }, 100)
      } catch (error) {
        console.log("[v0] Router error, using window.location:", error)
        window.location.href = redirectPath
      }
    } catch (error: any) {
      console.error("[v0] Login error:", error)
      toast({
        title: "Erro no login",
        description: "Erro inesperado. Para demonstração, use: admin@akintec.com / demo123",
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
