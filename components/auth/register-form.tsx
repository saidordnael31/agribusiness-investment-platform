"use client"

import type React from "react"
import { Suspense, useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter, useSearchParams } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

function RegisterFormContent() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    type: "",
    hierarchyLevel: "",
    officeId: "",
    cpfCnpj: "",
    phone: "",
  })
  const [offices, setOffices] = useState<Array<{ id: string; name: string }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const defaultType = searchParams.get("type") || ""
  const supabase = createClient()

  useEffect(() => {
    if (formData.type === "distributor" && formData.hierarchyLevel === "advisor") {
      loadOffices()
    }
  }, [formData.type, formData.hierarchyLevel])

  const loadOffices = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name")
      .eq("user_type", "distributor")
      .eq("hierarchy_level", "office")

    if (data) {
      setOffices(data)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Erro no cadastro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    if (formData.type === "distributor" && formData.hierarchyLevel === "advisor" && !formData.officeId) {
      toast({
        title: "Erro no cadastro",
        description: "Assessores devem selecionar um escritório responsável.",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || window.location.origin,
          data: {
            name: formData.name,
            user_type: formData.type,
            hierarchy_level: formData.hierarchyLevel,
            office_id: formData.officeId || null,
            cpf_cnpj: formData.cpfCnpj,
            phone: formData.phone,
          },
        },
      })

      if (authError) throw authError

      toast({
        title: "Cadastro realizado com sucesso!",
        description: `Bem-vindo à plataforma Agroderi, ${formData.name}!`,
      })

      const redirectPath = formData.type === "distributor" ? "/distributor" : "/investor"
      router.push(redirectPath)
    } catch (error: any) {
      toast({
        title: "Erro no cadastro",
        description: error.message || "Ocorreu um erro durante o cadastro.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome Completo</Label>
        <Input
          id="name"
          placeholder="Seu nome completo"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@email.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Tipo de Usuário</Label>
        <Select
          value={formData.type || defaultType}
          onValueChange={(value) => setFormData({ ...formData, type: value, hierarchyLevel: "", officeId: "" })}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione o tipo de usuário" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="investor">Investidor</SelectItem>
            <SelectItem value="distributor">Distribuidor/Assessor</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {formData.type === "distributor" && (
        <div className="space-y-2">
          <Label htmlFor="hierarchyLevel">Nível Hierárquico</Label>
          <Select
            value={formData.hierarchyLevel}
            onValueChange={(value) => setFormData({ ...formData, hierarchyLevel: value, officeId: "" })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o nível hierárquico" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="office">Escritório (Responsável)</SelectItem>
              <SelectItem value="advisor">Assessor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {formData.type === "distributor" && formData.hierarchyLevel === "advisor" && (
        <div className="space-y-2">
          <Label htmlFor="officeId">Escritório Responsável</Label>
          <Select value={formData.officeId} onValueChange={(value) => setFormData({ ...formData, officeId: value })}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o escritório responsável" />
            </SelectTrigger>
            <SelectContent>
              {offices.map((office) => (
                <SelectItem key={office.id} value={office.id}>
                  {office.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="cpfCnpj">CPF/CNPJ</Label>
        <Input
          id="cpfCnpj"
          placeholder="000.000.000-00"
          value={formData.cpfCnpj}
          onChange={(e) => setFormData({ ...formData, cpfCnpj: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Telefone</Label>
        <Input
          id="phone"
          placeholder="(11) 99999-9999"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input
          id="password"
          type="password"
          placeholder="••••••••"
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar Senha</Label>
        <Input
          id="confirmPassword"
          type="password"
          placeholder="••••••••"
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={isLoading}>
        {isLoading ? "Cadastrando..." : "Criar Conta"}
      </Button>
    </form>
  )
}

export function RegisterForm() {
  return (
    <Suspense
      fallback={
        <div className="space-y-4 animate-pulse">
          <div className="h-4 bg-muted rounded w-3/4"></div>
          <div className="h-10 bg-muted rounded"></div>
          <div className="h-4 bg-muted rounded w-1/2"></div>
          <div className="h-10 bg-muted rounded"></div>
        </div>
      }
    >
      <RegisterFormContent />
    </Suspense>
  )
}
