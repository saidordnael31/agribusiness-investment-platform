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

    // Simulate authentication
    setTimeout(() => {
      if (email && password) {
        let userType = "investor"
        let userName = email.split("@")[0]

        if (email.includes("distributor") || email.includes("assessor")) {
          userType = "distributor"
          userName = "Distribuidor Demo"
        } else if (email.includes("investidor")) {
          userName = "Investidor Demo"
        }

        // Store user info in localStorage (in a real app, use proper auth)
        localStorage.setItem(
          "user",
          JSON.stringify({
            email,
            type: userType,
            name: userName,
          }),
        )

        toast({
          title: "Login realizado com sucesso!",
          description: `Bem-vindo à plataforma Agroderi, ${userName}!`,
        })

        // Redirect based on user type
        router.push(userType === "distributor" ? "/distributor" : "/investor")
      } else {
        toast({
          title: "Erro no login",
          description: "Por favor, preencha todos os campos.",
          variant: "destructive",
        })
      }
      setIsLoading(false)
    }, 1000)
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
