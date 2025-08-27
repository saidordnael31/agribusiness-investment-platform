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
import { AlertTriangle } from "lucide-react"

function RegisterFormContent() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    type: "",
    role: "", // Mudando de hierarchyLevel para role para seguir estrutura Akintec
    parentId: "",
    cpfCnpj: "",
    phone: "",
    notes: "",
  })
  const [parentOptions, setParentOptions] = useState<Array<{ id: string; name: string; role: string }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [emailError, setEmailError] = useState("")
  const router = useRouter()
  const { toast } = useToast()
  const searchParams = useSearchParams()
  const defaultType = searchParams.get("type") || ""
  const supabase = createClient()

  useEffect(() => {
    if (formData.role && formData.role !== "escritorio") {
      loadParentOptions()
    }
  }, [formData.role])

  const validatePersonalEmail = (email: string) => {
    const personalDomains = [
      "gmail.com",
      "yahoo.com",
      "outlook.com",
      "hotmail.com",
      "icloud.com",
      "uol.com.br",
      "terra.com.br",
      "bol.com.br",
    ]
    const domain = email.split("@")[1]?.toLowerCase()

    if (!domain) return false

    // Verificar se é domínio pessoal
    const isPersonal = personalDomains.includes(domain)

    // Verificar se não é domínio corporativo (contém empresa, escritório, etc.)
    const corporateKeywords = ["empresa", "escritorio", "consultoria", "investimentos", "financeira", "capital"]
    const isCorporate = corporateKeywords.some((keyword) => domain.includes(keyword))

    return isPersonal && !isCorporate
  }

  const handleEmailChange = (email: string) => {
    setFormData({ ...formData, email })

    if (email && !validatePersonalEmail(email)) {
      setEmailError("Use apenas email pessoal (Gmail, Yahoo, Outlook, etc.). Emails corporativos não são aceitos.")
    } else {
      setEmailError("")
    }
  }

  const loadParentOptions = async () => {
    let parentRole = ""

    switch (formData.role) {
      case "gestor":
        parentRole = "escritorio"
        break
      case "lider":
        parentRole = "gestor"
        break
      case "assessor":
        parentRole = "lider"
        break
      case "investidor":
        parentRole = "assessor"
        break
    }

    if (parentRole) {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, role")
        .eq("role", parentRole)
        .eq("is_active", true)

      if (data) {
        setParentOptions(data)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    if (emailError) {
      toast({
        title: "Erro no cadastro",
        description: "Corrija o email antes de continuar.",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Erro no cadastro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    if (formData.role !== "escritorio" && !formData.parentId) {
      toast({
        title: "Erro no cadastro",
        description: "Selecione o responsável hierárquico.",
        variant: "destructive",
      })
      setIsLoading(false)
      return
    }

    if (formData.role === "investidor" && formData.type !== "investor") {
      toast({
        title: "Erro no cadastro",
        description: "Investidores devem ser cadastrados por assessores ou escritórios.",
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
            role: formData.role,
            parent_id: formData.parentId || null,
            cpf_cnpj: formData.cpfCnpj,
            phone: formData.phone,
            notes: formData.notes,
          },
        },
      })

      if (authError) throw authError

      toast({
        title: "Cadastro realizado com sucesso!",
        description: `Bem-vindo à plataforma Agroderi, ${formData.name}!`,
      })

      let redirectPath = "/investor"
      if (formData.role === "escritorio") redirectPath = "/distributor"
      else if (formData.role === "gestor") redirectPath = "/distributor"
      else if (formData.role === "lider") redirectPath = "/distributor"
      else if (formData.role === "assessor") redirectPath = "/distributor"

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

  const getRoleLabel = (role: string) => {
    const labels = {
      escritorio: "Escritório (CNPJ)",
      gestor: "Gestor",
      lider: "Líder",
      assessor: "Assessor",
      investidor: "Investidor",
    }
    return labels[role as keyof typeof labels] || role
  }

  const getParentLabel = (role: string) => {
    const labels = {
      gestor: "Escritório Responsável",
      lider: "Gestor Responsável",
      assessor: "Líder Responsável",
      investidor: "Assessor Responsável",
    }
    return labels[role as keyof typeof labels] || "Responsável"
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
        <Label htmlFor="email">Email Pessoal</Label>
        <Input
          id="email"
          type="email"
          placeholder="seu@gmail.com"
          value={formData.email}
          onChange={(e) => handleEmailChange(e.target.value)}
          required
          className={emailError ? "border-destructive" : ""}
        />
        {emailError && (
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4" />
            {emailError}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Apenas emails pessoais são aceitos (Gmail, Yahoo, Outlook, etc.)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">Tipo de Usuário</Label>
        <Select
          value={formData.type || defaultType}
          onValueChange={(value) => setFormData({ ...formData, type: value, role: "", parentId: "" })}
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
          <Label htmlFor="role">Nível Hierárquico</Label>
          <Select
            value={formData.role}
            onValueChange={(value) => setFormData({ ...formData, role: value, parentId: "" })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o nível hierárquico" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="escritorio">Escritório (CNPJ)</SelectItem>
              <SelectItem value="gestor">Gestor</SelectItem>
              <SelectItem value="lider">Líder</SelectItem>
              <SelectItem value="assessor">Assessor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {formData.type === "investor" && (
        <div className="space-y-2">
          <Label htmlFor="role">Perfil</Label>
          <Select
            value={formData.role}
            onValueChange={(value) => setFormData({ ...formData, role: value, parentId: "" })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione o perfil" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="investidor">Investidor</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {formData.role && formData.role !== "escritorio" && (
        <div className="space-y-2">
          <Label htmlFor="parentId">{getParentLabel(formData.role)}</Label>
          <Select value={formData.parentId} onValueChange={(value) => setFormData({ ...formData, parentId: value })}>
            <SelectTrigger>
              <SelectValue placeholder={`Selecione ${getParentLabel(formData.role).toLowerCase()}`} />
            </SelectTrigger>
            <SelectContent>
              {parentOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.name} ({getRoleLabel(option.role)})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="cpfCnpj">{formData.role === "escritorio" ? "CNPJ" : "CPF"}</Label>
        <Input
          id="cpfCnpj"
          placeholder={formData.role === "escritorio" ? "00.000.000/0001-00" : "000.000.000-00"}
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

      {(formData.role === "assessor" || formData.role === "escritorio") && (
        <div className="space-y-2">
          <Label htmlFor="notes">Observações</Label>
          <Input
            id="notes"
            placeholder="Notas sobre perfil, potencial, observações..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
          <p className="text-xs text-muted-foreground">Visível para follow-up e gestão de relacionamento</p>
        </div>
      )}

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

      <Button type="submit" className="w-full" disabled={isLoading || !!emailError}>
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
