"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Users, Mail, Phone, TrendingUp } from "lucide-react"

// Mock clients data
const clients = [
  {
    id: 1,
    name: "João Silva",
    email: "joao.silva@email.com",
    phone: "(11) 99999-1111",
    totalInvested: 150000,
    quotaType: "senior",
    joinDate: "2024-01-15",
    status: "active",
  },
  {
    id: 2,
    name: "Maria Santos",
    email: "maria.santos@email.com",
    phone: "(11) 99999-2222",
    totalInvested: 75000,
    quotaType: "subordinate",
    joinDate: "2024-02-10",
    status: "active",
  },
  {
    id: 3,
    name: "Pedro Oliveira",
    email: "pedro.oliveira@email.com",
    phone: "(11) 99999-3333",
    totalInvested: 200000,
    quotaType: "senior",
    joinDate: "2024-01-20",
    status: "active",
  },
  {
    id: 4,
    name: "Ana Costa",
    email: "ana.costa@email.com",
    phone: "(11) 99999-4444",
    totalInvested: 50000,
    quotaType: "subordinate",
    joinDate: "2024-03-05",
    status: "active",
  },
  {
    id: 5,
    name: "Carlos Ferreira",
    email: "carlos.ferreira@email.com",
    phone: "(11) 99999-5555",
    totalInvested: 100000,
    quotaType: "senior",
    joinDate: "2024-02-28",
    status: "pending",
  },
]

export function ClientsList() {
  const totalClients = clients.length
  const activeClients = clients.filter((client) => client.status === "active").length
  const totalInvested = clients.reduce((sum, client) => sum + client.totalInvested, 0)

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClients}</div>
            <p className="text-xs text-muted-foreground">{activeClients} ativos</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Volume Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
                notation: "compact",
              }).format(totalInvested)}
            </div>
            <p className="text-xs text-muted-foreground">Captação total</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissão Mensal</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(totalInvested * 0.03)}
            </div>
            <p className="text-xs text-muted-foreground">3% sobre base</p>
          </CardContent>
        </Card>
      </div>

      {/* Clients List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Lista de Clientes
          </CardTitle>
          <CardDescription>Gerencie seus investidores e acompanhe suas carteiras</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {clients.map((client) => (
              <div
                key={client.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                    <span className="font-semibold text-primary">{client.name.charAt(0)}</span>
                  </div>
                  <div>
                    <h4 className="font-semibold">{client.name}</h4>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {client.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {client.phone}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Cliente desde {new Date(client.joinDate).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(client.totalInvested)}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={client.quotaType === "senior" ? "default" : "secondary"}>
                      {client.quotaType === "senior" ? "Sênior" : "Subordinada"}
                    </Badge>
                    <Badge variant={client.status === "active" ? "default" : "secondary"}>
                      {client.status === "active" ? "Ativo" : "Pendente"}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 text-center">
            <Button variant="outline">Carregar Mais Clientes</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
