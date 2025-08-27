"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Users, Search, Filter, UserCheck, UserX, DollarSign } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface User {
  id: string
  name: string
  email: string
  type: "investor" | "distributor"
  status: "active" | "inactive" | "pending"
  totalInvested?: number
  totalCaptured?: number
  joinedAt: string
  lastActivity: string
}

export function UserManager() {
  const { toast } = useToast()
  const [users] = useState<User[]>([
    {
      id: "1",
      name: "João Silva",
      email: "joao@email.com",
      type: "investor",
      status: "active",
      totalInvested: 250000,
      joinedAt: "2024-01-15",
      lastActivity: "2025-01-20",
    },
    {
      id: "2",
      name: "Maria Santos",
      email: "maria@email.com",
      type: "investor",
      status: "active",
      totalInvested: 150000,
      joinedAt: "2024-02-10",
      lastActivity: "2025-01-19",
    },
    {
      id: "3",
      name: "Carlos Oliveira",
      email: "carlos@email.com",
      type: "distributor",
      status: "active",
      totalCaptured: 750000,
      joinedAt: "2024-01-20",
      lastActivity: "2025-01-20",
    },
    {
      id: "4",
      name: "Ana Costa",
      email: "ana@email.com",
      type: "distributor",
      status: "active",
      totalCaptured: 450000,
      joinedAt: "2024-03-05",
      lastActivity: "2025-01-18",
    },
    {
      id: "5",
      name: "Pedro Almeida",
      email: "pedro@email.com",
      type: "investor",
      status: "pending",
      joinedAt: "2025-01-18",
      lastActivity: "2025-01-18",
    },
  ])

  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState<"all" | "investor" | "distributor">("all")
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive" | "pending">("all")

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

  const handleApproveUser = (userId: string) => {
    toast({
      title: "Usuário aprovado!",
      description: "O usuário foi aprovado e pode acessar a plataforma.",
    })
  }

  const handleSuspendUser = (userId: string) => {
    toast({
      title: "Usuário suspenso!",
      description: "O acesso do usuário foi suspenso.",
    })
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
      </div>

      {/* Filtros */}
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

      {/* Estatísticas */}
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
                <p className="text-2xl font-bold">{users.filter((u) => u.type === "distributor").length}</p>
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

      {/* Tabela de Usuários */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Usuários</CardTitle>
          <CardDescription>Todos os usuários registrados na plataforma</CardDescription>
        </CardHeader>
        <CardContent>
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
                    <Badge variant="outline">{user.type === "investor" ? "Investidor" : "Distribuidor"}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusColor(user.status) as any}>{getStatusLabel(user.status)}</Badge>
                  </TableCell>
                  <TableCell>
                    {user.totalInvested && formatCurrency(user.totalInvested)}
                    {user.totalCaptured && formatCurrency(user.totalCaptured)}
                    {!user.totalInvested && !user.totalCaptured && "-"}
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
        </CardContent>
      </Card>
    </div>
  )
}
