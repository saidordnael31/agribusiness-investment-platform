"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, Search, Filter, UserCheck, UserX, DollarSign, Loader2, UserPlus, QrCode, Copy } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface User {
  id: string
  name: string
  email: string
  type: "investor" | "distributor" | "assessor" | "gestor" | "escritorio"
  status: "active" | "inactive" | "pending"
  totalInvested?: number
  totalCaptured?: number
  joinedAt: string
  lastActivity: string
}

interface QRCodeData {
  qrCode: string
  paymentString: string
  originalData: any
}

export function UserManager() {
  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<
    "all" | "investor" | "distributor" | "assessor" | "gestor" | "escritorio"
  >("all")
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive" | "pending">("all")

  const [showInvestorModal, setShowInvestorModal] = useState(false)
  const [investorForm, setInvestorForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    cpf: "",
    assessorId: "",
    password: "",
    confirmPassword: "",
    investmentValue: "", // Adicionado campo para valor do investimento
  })
  const [submittingInvestor, setSubmittingInvestor] = useState(false)
  const [assessors, setAssessors] = useState<User[]>([])

  const [showQRModal, setShowQRModal] = useState(false)
  const [qrCodeData, setQRCodeData] = useState<QRCodeData | null>(null)
  const [generatingQR, setGeneratingQR] = useState(false)

  useEffect(() => {
    fetchUsers()
    fetchAssessors()
  }, [])

  const fetchAssessors = async () => {
    try {
      const supabase = createClient()
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_type", "assessor")
        .eq("status", "active")

      if (error) throw error

      const transformedAssessors: User[] = (profiles || []).map((profile) => ({
        id: profile.id,
        name: profile.full_name || profile.email.split("@")[0],
        email: profile.email,
        type: profile.user_type || "assessor",
        status: profile.status || "active",
        joinedAt: profile.created_at,
        lastActivity: profile.updated_at || profile.created_at,
      }))

      setAssessors(transformedAssessors)
    } catch (error) {
      console.error("Erro ao buscar assessores:", error)
    }
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const supabase = createClient()

      // Buscar todos os perfis de usuários
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })

      if (error) {
        console.error("Erro ao buscar usuários:", error)
        toast({
          title: "Erro ao carregar usuários",
          description: "Não foi possível carregar a lista de usuários.",
          variant: "destructive",
        })
        return
      }

      // Transformar dados do Supabase para o formato esperado
      const transformedUsers: User[] = (profiles || []).map((profile) => ({
        id: profile.id,
        name: profile.full_name || profile.email.split("@")[0],
        email: profile.email,
        type: profile.user_type || "investor",
        status: profile.status || "active",
        totalInvested: profile.total_invested || 0,
        totalCaptured: profile.total_captured || 0,
        joinedAt: profile.created_at,
        lastActivity: profile.updated_at || profile.created_at,
      }))

      setUsers(transformedUsers)
    } catch (error) {
      console.error("Erro ao buscar usuários:", error)
      toast({
        title: "Erro ao carregar usuários",
        description: "Não foi possível carregar a lista de usuários.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === "all" || user.type === filterType
    const matchesStatus = filterStatus === "all" || user.status === filterStatus
    return matchesSearch && matchesType && matchesStatus
  })

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "default"
      case "inactive":
        return "secondary"
      case "pending":
        return "outline"
      default:
        return "secondary"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Ativo"
      case "inactive":
        return "Inativo"
      case "pending":
        return "Pendente"
      default:
        return status
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "investor":
        return "Investidor"
      case "distributor":
        return "Distribuidor"
      case "assessor":
        return "Assessor"
      case "gestor":
        return "Gestor"
      case "escritorio":
        return "Escritório"
      default:
        return type
    }
  }

  const handleApproveUser = async (userId: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from("profiles").update({ status: "active" }).eq("id", userId)

      if (error) throw error

      toast({
        title: "Usuário aprovado!",
        description: "O usuário foi aprovado e pode acessar a plataforma.",
      })

      // Recarregar lista
      fetchUsers()
    } catch (error) {
      toast({
        title: "Erro ao aprovar usuário",
        description: "Não foi possível aprovar o usuário.",
        variant: "destructive",
      })
    }
  }

  const handleSuspendUser = async (userId: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from("profiles").update({ status: "inactive" }).eq("id", userId)

      if (error) throw error

      toast({
        title: "Usuário suspenso!",
        description: "O acesso do usuário foi suspenso.",
      })

      // Recarregar lista
      fetchUsers()
    } catch (error) {
      toast({
        title: "Erro ao suspender usuário",
        description: "Não foi possível suspender o usuário.",
        variant: "destructive",
      })
    }
  }

  const handleCreateInvestor = async (e: React.FormEvent) => {
    e.preventDefault()

    if (
      !investorForm.fullName ||
      !investorForm.email ||
      !investorForm.assessorId ||
      !investorForm.password ||
      !investorForm.investmentValue
    ) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios incluindo o valor do investimento.",
        variant: "destructive",
      })
      return
    }

    const investmentValue = Number.parseFloat(investorForm.investmentValue.replace(/[^\d,]/g, "").replace(",", "."))
    if (investmentValue < 1000) {
      toast({
        title: "Valor mínimo não atingido",
        description: "O valor mínimo de investimento é R$ 1.000,00.",
        variant: "destructive",
      })
      return
    }

    if (investorForm.password !== investorForm.confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "A senha e confirmação de senha devem ser iguais.",
        variant: "destructive",
      })
      return
    }

    if (investorForm.password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      })
      return
    }

    try {
      setSubmittingInvestor(true)

      const [firstName, ...lastNameParts] = investorForm.fullName.trim().split(" ")
      const lastName = lastNameParts.join(" ") || firstName

      const registrationData = {
        firstName,
        lastName,
        email: investorForm.email,
        password: investorForm.password,
        phone: investorForm.phone,
        cpf: investorForm.cpf,
        rg: "",
        assessorId: investorForm.assessorId,
      }

      console.log("[v0] Enviando dados para endpoint externo:", registrationData)

      const response = await fetch("/api/external/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registrationData),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Erro ao cadastrar investidor na API externa")
      }

      console.log("[v0] Investidor cadastrado com sucesso na API externa:", result.data)

      const supabase = createClient()
      const { error: localError } = await supabase.from("profiles").insert([
        {
          email: investorForm.email,
          full_name: investorForm.fullName,
          user_type: "investor",
          phone: investorForm.phone,
          cpf: investorForm.cpf,
          assessor_id: investorForm.assessorId,
          status: "active",
          external_id: result.data?.id || null,
        },
      ])

      if (localError) {
        console.warn("[v0] Erro ao salvar no Supabase local (mas cadastro externo foi bem-sucedido):", localError)
      }

      toast({
        title: "Investidor cadastrado!",
        description: `${investorForm.fullName} foi cadastrado com sucesso. Gerando QR Code PIX...`,
      })

      await generateQRCode(investmentValue, investorForm.cpf)

      setInvestorForm({
        fullName: "",
        email: "",
        phone: "",
        cpf: "",
        assessorId: "",
        password: "",
        confirmPassword: "",
        investmentValue: "",
      })
      setShowInvestorModal(false)

      setTimeout(() => fetchUsers(), 2000)
    } catch (error: any) {
      console.error("Erro ao cadastrar investidor:", error)
      toast({
        title: "Erro ao cadastrar investidor",
        description: error.message || "Não foi possível cadastrar o investidor na API externa.",
        variant: "destructive",
      })
    } finally {
      setSubmittingInvestor(false)
    }
  }

  const generateQRCode = async (value: number, cpf: string) => {
    try {
      setGeneratingQR(true)

      console.log("[v0] Gerando QR Code PIX para:", { value, cpf })

      const response = await fetch("/api/external/generate-qrcode", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ value, cpf }),
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || "Erro ao gerar QR Code PIX")
      }

      console.log("[v0] QR Code gerado com sucesso:", result)

      setQRCodeData({
        qrCode: result.qrCode,
        paymentString: result.paymentString,
        originalData: result.originalData,
      })
      setShowQRModal(true)

      toast({
        title: "QR Code PIX gerado!",
        description: "O QR Code para pagamento foi gerado com sucesso.",
      })
    } catch (error: any) {
      console.error("Erro ao gerar QR Code:", error)
      toast({
        title: "Erro ao gerar QR Code",
        description: error.message || "Não foi possível gerar o QR Code PIX.",
        variant: "destructive",
      })
    } finally {
      setGeneratingQR(false)
    }
  }

  const copyPixCode = () => {
    if (qrCodeData?.paymentString) {
      navigator.clipboard.writeText(qrCodeData.paymentString)
      toast({
        title: "Código PIX copiado!",
        description: "O código PIX foi copiado para a área de transferência.",
      })
    }
  }

  const formatCurrencyInput = (value: string) => {
    const numericValue = value.replace(/[^\d]/g, "")
    const formattedValue = (Number.parseInt(numericValue) / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    })
    return formattedValue
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="w-6 h-6" />
            Gerenciamento de Usuários
          </h2>
          <p className="text-muted-foreground">Gerencie investidores e distribuidores da plataforma</p>
        </div>
        <Dialog open={showInvestorModal} onOpenChange={setShowInvestorModal}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-2">
              <UserPlus className="w-4 h-4" />
              Cadastrar Investidor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Investidor</DialogTitle>
              <DialogDescription>
                Cadastre um novo investidor na plataforma. Um QR Code PIX será gerado para pagamento.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateInvestor} className="space-y-4">
              <div>
                <Label htmlFor="fullName">Nome Completo *</Label>
                <Input
                  id="fullName"
                  value={investorForm.fullName}
                  onChange={(e) => setInvestorForm((prev) => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Nome completo do investidor"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={investorForm.email}
                  onChange={(e) => setInvestorForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="email@exemplo.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  value={investorForm.phone}
                  onChange={(e) => setInvestorForm((prev) => ({ ...prev, phone: e.target.value }))}
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div>
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  value={investorForm.cpf}
                  onChange={(e) => setInvestorForm((prev) => ({ ...prev, cpf: e.target.value }))}
                  placeholder="000.000.000-00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="investmentValue">Valor do Investimento * (mínimo R$ 1.000,00)</Label>
                <Input
                  id="investmentValue"
                  value={investorForm.investmentValue}
                  onChange={(e) => {
                    const formatted = formatCurrencyInput(e.target.value)
                    setInvestorForm((prev) => ({ ...prev, investmentValue: formatted }))
                  }}
                  placeholder="R$ 1.000,00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="assessorId">Assessor Responsável *</Label>
                <select
                  id="assessorId"
                  value={investorForm.assessorId}
                  onChange={(e) => setInvestorForm((prev) => ({ ...prev, assessorId: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                  required
                >
                  <option value="">Selecione um assessor</option>
                  {assessors.map((assessor) => (
                    <option key={assessor.id} value={assessor.id}>
                      {assessor.name} ({assessor.email})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="password">Senha *</Label>
                <Input
                  id="password"
                  type="password"
                  value={investorForm.password}
                  onChange={(e) => setInvestorForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder="Senha do investidor"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={investorForm.confirmPassword}
                  onChange={(e) => setInvestorForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                  placeholder="Confirme a senha"
                  required
                  minLength={6}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowInvestorModal(false)}
                  disabled={submittingInvestor}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={submittingInvestor}>
                  {submittingInvestor ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Cadastrando...
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Cadastrar
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              QR Code PIX Gerado
            </DialogTitle>
            <DialogDescription>Use o QR Code abaixo ou copie o código PIX para realizar o pagamento.</DialogDescription>
          </DialogHeader>

          {qrCodeData && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <img
                  src={qrCodeData.qrCode || "/placeholder.svg"}
                  alt="QR Code PIX"
                  className="w-64 h-64 border rounded-lg"
                />
              </div>

              {qrCodeData.paymentString && (
                <div className="space-y-2">
                  <Label>Código PIX (Copia e Cola)</Label>
                  <div className="flex gap-2">
                    <Input value={qrCodeData.paymentString} readOnly className="font-mono text-xs" />
                    <Button variant="outline" size="sm" onClick={copyPixCode} className="shrink-0 bg-transparent">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex justify-end">
                <Button onClick={() => setShowQRModal(false)}>Fechar</Button>
              </div>
            </div>
          )}

          {generatingQR && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="ml-2">Gerando QR Code...</span>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Tipo de Usuário</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="w-full mt-1 px-3 py-2 border rounded-lg"
              >
                <option value="all">Todos</option>
                <option value="investor">Investidores</option>
                <option value="distributor">Distribuidores</option>
                <option value="assessor">Assessores</option>
                <option value="gestor">Gestores</option>
                <option value="escritorio">Escritórios</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full mt-1 px-3 py-2 border rounded-lg"
              >
                <option value="all">Todos</option>
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="pending">Pendente</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total de Usuários</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
              <Users className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Investidores</p>
                <p className="text-2xl font-bold">{users.filter((u) => u.type === "investor").length}</p>
              </div>
              <DollarSign className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Distribuidores</p>
                <p className="text-2xl font-bold">
                  {users.filter((u) => ["distributor", "assessor", "gestor", "escritorio"].includes(u.type)).length}
                </p>
              </div>
              <UserCheck className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">{users.filter((u) => u.status === "pending").length}</p>
              </div>
              <UserX className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
          <CardDescription>Todos os usuários registrados na plataforma</CardDescription>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum usuário encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Cadastro</TableHead>
                  <TableHead>Última Atividade</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{getTypeLabel(user.type)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(user.status) as any}>{getStatusLabel(user.status)}</Badge>
                    </TableCell>
                    <TableCell>
                      {user.totalInvested && user.totalInvested > 0 && formatCurrency(user.totalInvested)}
                      {user.totalCaptured && user.totalCaptured > 0 && formatCurrency(user.totalCaptured)}
                      {(!user.totalInvested || user.totalInvested === 0) &&
                        (!user.totalCaptured || user.totalCaptured === 0) &&
                        "-"}
                    </TableCell>
                    <TableCell>{new Date(user.joinedAt).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>{new Date(user.lastActivity).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {user.status === "pending" && (
                          <Button variant="ghost" size="sm" onClick={() => handleApproveUser(user.id)}>
                            <UserCheck className="w-4 h-4" />
                          </Button>
                        )}
                        {user.status === "active" && (
                          <Button variant="ghost" size="sm" onClick={() => handleSuspendUser(user.id)}>
                            <UserX className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
