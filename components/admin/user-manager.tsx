"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, Search, Filter, UserCheck, UserX, DollarSign, Loader2, UserPlus, Eye, Edit, Trash2 } from "lucide-react"
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

interface User {
  id: string
  name: string
  email: string
  type: "investor" | "distributor" | "assessor" | "gestor" | "escritorio" | "admin"
  status: "active" | "inactive" | "pending"
  totalInvested?: number
  totalCaptured?: number
  joinedAt: string
  lastActivity: string
  phone?: string
  cpf?: string
  fullName?: string
  assessorId?: string
  userType?: string
  isActive?: boolean
  role?: string
  hierarchyLevel?: number
  officeId?: string
  parentId?: string
  notes?: string
}

interface QRCodeData {
  qrCode: string
  paymentString: string
  originalData: any
}

export function UserManager() {
  console.log("[v0] UserManager component rendered")

  const { toast } = useToast()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<
    "all" | "investor" | "distributor" | "assessor" | "gestor" | "escritorio" | "admin"
  >("all")
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive" | "pending">("all")

  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editForm, setEditForm] = useState<Partial<User>>({})
  const [submittingEdit, setSubmittingEdit] = useState(false)

  const [showInvestorModal, setShowInvestorModal] = useState(false)
  const [investorForm, setInvestorForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    cpf: "",
    assessorId: "",
    password: "",
    confirmPassword: "",
    investmentValue: "",
  })
  const [submittingInvestor, setSubmittingInvestor] = useState(false)
  const [assessors, setAssessors] = useState<User[]>([])

  const [showQRModal, setShowQRModal] = useState(false)
  const [qrCodeData, setQRCodeData] = useState<QRCodeData | null>(null)
  const [generatingQR, setGeneratingQR] = useState(false)

  useEffect(() => {
    console.log("[v0] UserManager useEffect triggered")
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
        .eq("is_active", true)

      if (error) throw error

      const transformedAssessors: User[] = (profiles || []).map((profile) => ({
        id: profile.id,
        name: profile.full_name || profile.email.split("@")[0],
        email: profile.email,
        type: profile.user_type || "assessor",
        status: profile.is_active ? "active" : "inactive",
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

      console.log("[v0] Iniciando busca de usuários...")

      // Primeiro busca todos os profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })

      console.log("[v0] Profiles encontrados:", profiles?.length || 0)
      console.log("[v0] Erro nos profiles:", profilesError)
      console.log("[v0] Dados dos profiles:", profiles)

      if (profilesError) {
        console.error("Erro ao buscar usuários:", profilesError)
        toast({
          title: "Erro ao carregar usuários",
          description: "Não foi possível carregar a lista de usuários.",
          variant: "destructive",
        })
        return
      }

      // Depois busca todos os investimentos
      const { data: investments, error: investmentsError } = await supabase
        .from("investments")
        .select("user_id, amount, status, created_at")

      console.log("[v0] Investimentos encontrados:", investments?.length || 0)
      console.log("[v0] Erro nos investimentos:", investmentsError)

      if (investmentsError) {
        console.error("Erro ao buscar investimentos:", investmentsError)
      }

      // Agrupa investimentos por user_id
      const investmentsByUser = (investments || []).reduce((acc: any, inv: any) => {
        if (!acc[inv.user_id]) {
          acc[inv.user_id] = []
        }
        acc[inv.user_id].push(inv)
        return acc
      }, {})

      const transformedUsers: User[] = (profiles || []).map((profile) => {
        const userInvestments = investmentsByUser[profile.id] || []
        const totalInvested = userInvestments.reduce((sum: number, inv: any) => sum + (inv.amount || 0), 0)

        return {
          id: profile.id,
          name: profile.full_name || profile.email.split("@")[0],
          email: profile.email,
          type: profile.user_type || "investor",
          status: profile.is_active ? "active" : "inactive",
          totalInvested,
          totalCaptured: 0, // Pode ser calculado posteriormente se necessário
          joinedAt: profile.created_at,
          lastActivity: profile.updated_at || profile.created_at,
          phone: profile.phone,
          cpf: profile.cnpj, // Usando cnpj como cpf por enquanto
          fullName: profile.full_name,
          userType: profile.user_type,
          isActive: profile.is_active,
          role: profile.role,
          hierarchyLevel: profile.hierarchy_level,
          officeId: profile.office_id,
          parentId: profile.parent_id,
          notes: profile.notes,
        }
      })

      console.log("[v0] Usuários transformados:", transformedUsers.length)
      console.log("[v0] Dados transformados:", transformedUsers)

      setUsers(transformedUsers)
    } catch (error) {
      console.error("Erro ao buscar usuários:", error)
      console.log("[v0] Erro completo:", error)
      toast({
        title: "Erro ao carregar usuários",
        description: "Não foi possível carregar a lista de usuários.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleViewUser = (user: User) => {
    setSelectedUser(user)
    setShowViewModal(true)
  }

  const handleEditUser = (user: User) => {
    setSelectedUser(user)
    setEditForm({
      name: user.fullName || user.name,
      email: user.email,
      phone: user.phone,
      cpf: user.cpf,
      type: user.type,
      status: user.status,
      assessorId: user.assessorId,
      userType: user.userType,
      isActive: user.isActive,
      role: user.role,
      hierarchyLevel: user.hierarchyLevel,
      officeId: user.officeId,
      parentId: user.parentId,
      notes: user.notes,
    })
    setShowEditModal(true)
  }

  const handleSaveEdit = async () => {
    if (!selectedUser) return

    try {
      setSubmittingEdit(true)
      const supabase = createClient()

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: editForm.name,
          email: editForm.email,
          phone: editForm.phone,
          cnpj: editForm.cpf,
          user_type: editForm.type,
          is_active: editForm.status === "active",
          updated_at: new Date().toISOString(),
          role: editForm.role,
          hierarchy_level: editForm.hierarchyLevel,
          office_id: editForm.officeId,
          parent_id: editForm.parentId,
          notes: editForm.notes,
        })
        .eq("id", selectedUser.id)

      if (error) throw error

      toast({
        title: "Usuário atualizado!",
        description: "As informações do usuário foram atualizadas com sucesso.",
      })

      setShowEditModal(false)
      fetchUsers()
    } catch (error) {
      console.error("Erro ao atualizar usuário:", error)
      toast({
        title: "Erro ao atualizar usuário",
        description: "Não foi possível atualizar as informações do usuário.",
        variant: "destructive",
      })
    } finally {
      setSubmittingEdit(false)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    try {
      const supabase = createClient()

      // Primeiro, deletar investimentos relacionados
      const { error: investmentsError } = await supabase.from("investments").delete().eq("user_id", userId)

      if (investmentsError) {
        console.warn("Erro ao deletar investimentos:", investmentsError)
      }

      // Depois, deletar o perfil
      const { error: profileError } = await supabase.from("profiles").delete().eq("id", userId)

      if (profileError) throw profileError

      toast({
        title: "Usuário deletado!",
        description: "O usuário foi removido permanentemente do sistema.",
      })

      fetchUsers()
    } catch (error) {
      console.error("Erro ao deletar usuário:", error)
      toast({
        title: "Erro ao deletar usuário",
        description: "Não foi possível deletar o usuário.",
        variant: "destructive",
      })
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
      case "admin":
        return "Admin"
      default:
        return type
    }
  }

  const handleApproveUser = async (userId: string) => {
    try {
      const supabase = createClient()
      const { error } = await supabase.from("profiles").update({ is_active: true }).eq("id", userId)

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
      const { error } = await supabase.from("profiles").update({ is_active: false }).eq("id", userId)

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

    if (!investorForm.fullName || !investorForm.email || !investorForm.password || !investorForm.investmentValue) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios incluindo o valor do investimento.",
        variant: "destructive",
      })
      return
    }

    const investmentValue = Number.parseFloat(investorForm.investmentValue.replace(/[^\d,]/g, "").replace(",", "."))
    if (investmentValue < 5000) {
      toast({
        title: "Valor mínimo não atingido",
        description: "O valor mínimo de investimento é R$ 5.000,00.",
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
      const supabase = createClient()

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: investorForm.email,
        password: "temp123456",
      })

      if (authError) throw authError

      const { error: profileError } = await supabase.from("profiles").insert([
        {
          id: authData.user?.id,
          email: investorForm.email,
          full_name: investorForm.fullName,
          user_type: "investor",
          phone: investorForm.phone,
          cnpj: investorForm.cpf,
          assessor_id: investorForm.assessorId || null,
          is_active: true,
        },
      ])

      if (profileError) throw profileError

      const { error: investmentError } = await supabase.from("investments").insert([
        {
          user_id: authData.user?.id,
          amount: investmentValue,
          status: "pending",
          quota_type: investmentValue >= 100000 ? "senior" : "subordinada",
          monthly_return_rate: investmentValue >= 100000 ? 0.03 : 0.025,
          commitment_period: 12,
        },
      ])

      if (investmentError) throw investmentError
    } catch (error: any) {
      console.error("Erro ao cadastrar investidor:", error)
      toast({
        title: "Erro ao cadastrar investidor",
        description: error.message || "Não foi possível cadastrar o investidor.",
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
    const fixedPixCode =
      "00020101021126430014br.gov.bcb.pix0121agrinvest@akintec.com5204000053039865802BR5907AKINTEC6009SAO PAULO622905251K5CDD6XWS83EN88991WEBV4G63047E03"

    navigator.clipboard.writeText(fixedPixCode)
    toast({
      title: "Código PIX copiado!",
      description: "O código PIX foi copiado para a área de transferência.",
    })
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
              <DialogDescription>Cadastre um novo investidor na plataforma.</DialogDescription>
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
                <Label htmlFor="investmentValue">Valor do Investimento * (mínimo R$ 5.000,00)</Label>
                <Input
                  id="investmentValue"
                  value={investorForm.investmentValue}
                  onChange={(e) => {
                    const formatted = formatCurrencyInput(e.target.value)
                    setInvestorForm((prev) => ({ ...prev, investmentValue: formatted }))
                  }}
                  placeholder="R$ 5.000,00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="assessorId">Assessor Responsável</Label>
                <select
                  id="assessorId"
                  value={investorForm.assessorId}
                  onChange={(e) => setInvestorForm((prev) => ({ ...prev, assessorId: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
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

      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes do Usuário</DialogTitle>
            <DialogDescription>Informações completas do usuário selecionado</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Nome</Label>
                  <p className="text-sm">{selectedUser.fullName || selectedUser.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <p className="text-sm">{selectedUser.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Tipo</Label>
                  <Badge variant="outline">{getTypeLabel(selectedUser.type)}</Badge>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                  <Badge variant={getStatusColor(selectedUser.status) as any}>
                    {getStatusLabel(selectedUser.status)}
                  </Badge>
                </div>
                {selectedUser.phone && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Telefone</Label>
                    <p className="text-sm">{selectedUser.phone}</p>
                  </div>
                )}
                {selectedUser.cpf && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">CPF</Label>
                    <p className="text-sm">{selectedUser.cpf}</p>
                  </div>
                )}
                {selectedUser.totalInvested && selectedUser.totalInvested > 0 && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Total Investido</Label>
                    <p className="text-sm font-semibold text-green-600">{formatCurrency(selectedUser.totalInvested)}</p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Data de Cadastro</Label>
                  <p className="text-sm">{new Date(selectedUser.joinedAt).toLocaleDateString("pt-BR")}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Última Atividade</Label>
                  <p className="text-sm">{new Date(selectedUser.lastActivity).toLocaleDateString("pt-BR")}</p>
                </div>
                {selectedUser.userType && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Tipo de Usuário</Label>
                    <p className="text-sm">{selectedUser.userType}</p>
                  </div>
                )}
                {selectedUser.isActive !== undefined && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Ativo</Label>
                    <p className="text-sm">{selectedUser.isActive ? "Sim" : "Não"}</p>
                  </div>
                )}
                {selectedUser.role && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Cargo</Label>
                    <p className="text-sm">{selectedUser.role}</p>
                  </div>
                )}
                {selectedUser.hierarchyLevel !== undefined && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Nível Hierárquico</Label>
                    <p className="text-sm">{selectedUser.hierarchyLevel}</p>
                  </div>
                )}
                {selectedUser.officeId && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">ID do Escritório</Label>
                    <p className="text-sm">{selectedUser.officeId}</p>
                  </div>
                )}
                {selectedUser.parentId && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">ID do Responsável</Label>
                    <p className="text-sm">{selectedUser.parentId}</p>
                  </div>
                )}
                {selectedUser.notes && (
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">Notas</Label>
                    <p className="text-sm">{selectedUser.notes}</p>
                  </div>
                )}
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setShowViewModal(false)}>Fechar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>Altere as informações do usuário</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="editName">Nome Completo</Label>
              <Input
                id="editName"
                value={editForm.name || ""}
                onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Nome completo"
              />
            </div>
            <div>
              <Label htmlFor="editEmail">Email</Label>
              <Input
                id="editEmail"
                type="email"
                value={editForm.email || ""}
                onChange={(e) => setEditForm((prev) => ({ ...prev, email: e.target.value }))}
                placeholder="email@exemplo.com"
              />
            </div>
            <div>
              <Label htmlFor="editPhone">Telefone</Label>
              <Input
                id="editPhone"
                value={editForm.phone || ""}
                onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                placeholder="(11) 99999-9999"
              />
            </div>
            <div>
              <Label htmlFor="editCpf">CPF</Label>
              <Input
                id="editCpf"
                value={editForm.cpf || ""}
                onChange={(e) => setEditForm((prev) => ({ ...prev, cpf: e.target.value }))}
                placeholder="000.000.000-00"
              />
            </div>
            <div>
              <Label htmlFor="editType">Tipo de Usuário</Label>
              <select
                id="editType"
                value={editForm.type || ""}
                onChange={(e) => setEditForm((prev) => ({ ...prev, type: e.target.value as any }))}
                className="w-full mt-1 px-3 py-2 border rounded-lg"
              >
                <option value="investor">Investidor</option>
                <option value="distributor">Distribuidor</option>
                <option value="assessor">Assessor</option>
                <option value="gestor">Gestor</option>
                <option value="escritorio">Escritório</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <Label htmlFor="editStatus">Status</Label>
              <select
                id="editStatus"
                value={editForm.status || ""}
                onChange={(e) => setEditForm((prev) => ({ ...prev, status: e.target.value as any }))}
                className="w-full mt-1 px-3 py-2 border rounded-lg"
              >
                <option value="active">Ativo</option>
                <option value="inactive">Inativo</option>
                <option value="pending">Pendente</option>
              </select>
            </div>
            <div>
              <Label htmlFor="editUserType">Tipo de Usuário</Label>
              <Input
                id="editUserType"
                value={editForm.userType || ""}
                onChange={(e) => setEditForm((prev) => ({ ...prev, userType: e.target.value }))}
                placeholder="Tipo de usuário"
              />
            </div>
            <div>
              <Label htmlFor="editIsActive">Ativo</Label>
              <Input
                id="editIsActive"
                type="checkbox"
                checked={editForm.isActive || false}
                onChange={(e) => setEditForm((prev) => ({ ...prev, isActive: e.target.checked }))}
              />
            </div>
            <div>
              <Label htmlFor="editRole">Cargo</Label>
              <Input
                id="editRole"
                value={editForm.role || ""}
                onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value }))}
                placeholder="Cargo"
              />
            </div>
            <div>
              <Label htmlFor="editHierarchyLevel">Nível Hierárquico</Label>
              <Input
                id="editHierarchyLevel"
                type="number"
                value={editForm.hierarchyLevel || ""}
                onChange={(e) => setEditForm((prev) => ({ ...prev, hierarchyLevel: Number(e.target.value) }))}
                placeholder="Nível hierárquico"
              />
            </div>
            <div>
              <Label htmlFor="editOfficeId">ID do Escritório</Label>
              <Input
                id="editOfficeId"
                value={editForm.officeId || ""}
                onChange={(e) => setEditForm((prev) => ({ ...prev, officeId: e.target.value }))}
                placeholder="ID do escritório"
              />
            </div>
            <div>
              <Label htmlFor="editParentId">ID do Responsável</Label>
              <Input
                id="editParentId"
                value={editForm.parentId || ""}
                onChange={(e) => setEditForm((prev) => ({ ...prev, parentId: e.target.value }))}
                placeholder="ID do responsável"
              />
            </div>
            <div>
              <Label htmlFor="editNotes">Notas</Label>
              <Input
                id="editNotes"
                value={editForm.notes || ""}
                onChange={(e) => setEditForm((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Notas"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setShowEditModal(false)} disabled={submittingEdit}>
                Cancelar
              </Button>
              <Button onClick={handleSaveEdit} disabled={submittingEdit}>
                {submittingEdit ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Salvar
                  </>
                )}
              </Button>
            </div>
          </div>
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
                <option value="admin">Admins</option>
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
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin" />
              <span className="ml-2">Carregando usuários...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
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
                      <div className="flex space-x-1">
                        <Button variant="ghost" size="sm" onClick={() => handleViewUser(user)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja deletar o usuário "{user.name}"? Esta ação não pode ser desfeita
                                e todos os dados relacionados serão removidos permanentemente.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteUser(user.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Deletar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
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
