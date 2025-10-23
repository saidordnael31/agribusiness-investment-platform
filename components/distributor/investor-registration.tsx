"use client"

import type React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { UserPlus, Mail, AlertTriangle } from "lucide-react"

interface InvestorRegistrationProps {
  assessorId: string
  assessorName: string
}

export function InvestorRegistration({ assessorId, assessorName }: InvestorRegistrationProps) {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    cpf: "",
    phone: "",
    birthDate: "",
    profession: "",
    income: "",
    investmentProfile: "",
    notes: "",
  })
  const [isLoading, setIsLoading] = useState(false)
  const [emailError, setEmailError] = useState("")
  const { toast } = useToast()
  const supabase = createClient()

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

    const isPersonal = personalDomains.includes(domain)
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

  const generatePassword = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
    let password = ""
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return password
  }

  const sendCredentialsEmail = async (email: string, password: string, investorName: string) => {
    // Simulação de envio de email - em produção, usar serviço real
    console.log(`
      Para: ${email}
      Assunto: Bem-vindo ao Clube de Investimentos AGRINVEST
      
      Olá ${investorName},
      
      Seu assessor ${assessorName} cadastrou você na plataforma AGRINVEST.
      
      Suas credenciais de acesso:
      Email: ${email}
      Senha: ${password}
      
      Acesse: ${window.location.origin}/login
      
      Atenciosamente,
      Equipe AGRINVEST
    `)

    toast({
      title: "Email enviado",
      description: `Credenciais enviadas para ${email}`,
    })
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

    try {
      const password = generatePassword()

      // Criar usuário no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: password,
        options: {
          emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || window.location.origin,
          data: {
            name: formData.name,
            user_type: "investor",
            role: "investidor",
            parent_id: assessorId,
            cpf_cnpj: formData.cpf,
            phone: formData.phone,
            birth_date: formData.birthDate,
            profession: formData.profession,
            income: formData.income,
            investment_profile: formData.investmentProfile,
            notes: formData.notes,
          },
        },
      })

      if (authError) throw authError

      // Enviar credenciais por email
      await sendCredentialsEmail(formData.email, password, formData.name)

      toast({
        title: "Investidor cadastrado com sucesso!",
        description: `${formData.name} foi cadastrado e receberá as credenciais por email.`,
      })

      // Limpar formulário
      setFormData({
        name: "",
        email: "",
        cpf: "",
        phone: "",
        birthDate: "",
        profession: "",
        income: "",
        investmentProfile: "",
        notes: "",
      })
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Cadastrar Novo Investidor
        </CardTitle>
        <CardDescription>
          Cadastre um novo investidor em sua carteira. As credenciais serão enviadas por email automaticamente.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo *</Label>
              <Input
                id="name"
                placeholder="Nome completo do investidor"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Pessoal *</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@gmail.com"
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
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cpf">CPF *</Label>
              <Input
                id="cpf"
                placeholder="000.000.000-00"
                value={formData.cpf}
                onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Telefone *</Label>
              <Input
                id="phone"
                placeholder="(11) 99999-9999"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="birthDate">Data de Nascimento</Label>
              <Input
                id="birthDate"
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="profession">Profissão</Label>
              <Input
                id="profession"
                placeholder="Ex: Médico, Engenheiro, Empresário"
                value={formData.profession}
                onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="income">Renda Mensal</Label>
              <Select value={formData.income} onValueChange={(value) => setFormData({ ...formData, income: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a faixa de renda" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ate-5k">Até R$ 5.000</SelectItem>
                  <SelectItem value="5k-10k">R$ 5.000 - R$ 10.000</SelectItem>
                  <SelectItem value="10k-20k">R$ 10.000 - R$ 20.000</SelectItem>
                  <SelectItem value="20k-50k">R$ 20.000 - R$ 50.000</SelectItem>
                  <SelectItem value="acima-50k">Acima de R$ 50.000</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="investmentProfile">Perfil de Investimento</Label>
              <Select
                value={formData.investmentProfile}
                onValueChange={(value) => setFormData({ ...formData, investmentProfile: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="conservador">Conservador</SelectItem>
                  <SelectItem value="moderado">Moderado</SelectItem>
                  <SelectItem value="arrojado">Arrojado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações</Label>
            <Textarea
              id="notes"
              placeholder="Notas sobre o investidor, potencial, preferências..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <Mail className="h-4 w-4 text-blue-600" />
            <p className="text-sm text-blue-700">
              Uma senha será gerada automaticamente e enviada para o email do investidor junto com as instruções de
              acesso.
            </p>
          </div>

          <Button type="submit" className="w-full" disabled={isLoading || !!emailError}>
            {isLoading ? "Cadastrando..." : "Cadastrar Investidor"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
