"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Users, Search, AlertCircle, Calendar, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ClientWithoutInvestment {
  id: string
  full_name: string | null
  email: string
  phone: string | null
  created_at: string
  hasInvestments: boolean
  hasRecentInvestments: boolean
  lastInvestmentDate: string | null
  reason: 'no_investments' | 'no_recent_investments' | null
  advisor: {
    name: string
    email: string
  } | null
}

export function ClientsWithoutInvestments() {
  const { toast } = useToast()
  const [clients, setClients] = useState<ClientWithoutInvestment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filterType, setFilterType] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchClients = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
        filterType: filterType,
      })

      if (search) {
        params.append("search", search)
      }

      const response = await fetch(`/api/clients-without-investments?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        setClients(result.data)
        setTotalPages(result.pagination.totalPages)
        setTotal(result.pagination.total)
      } else {
        toast({
          title: "Erro ao carregar clientes",
          description: result.error || "Não foi possível carregar a lista de clientes.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Erro ao buscar clientes:", error)
      toast({
        title: "Erro ao carregar clientes",
        description: "Ocorreu um erro ao buscar os dados.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [page, filterType, search, toast])

  useEffect(() => {
    fetchClients()
  }, [page, filterType])

  // Debounce para busca
  useEffect(() => {
    const timer = setTimeout(() => {
      if (page === 1) {
        fetchClients()
      } else {
        setPage(1)
      }
    }, 500)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })
  }

  const formatDateWithTime = (dateString: string | null) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const getReasonBadge = (reason: string | null) => {
    if (reason === 'no_investments') {
      return (
        <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">
          <AlertCircle className="w-3 h-3 mr-1" />
          Sem investimentos
        </Badge>
      )
    } else if (reason === 'no_recent_investments') {
      return (
        <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-200">
          <Calendar className="w-3 h-3 mr-1" />
          Sem aportes recentes
        </Badge>
      )
    }
    return null
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Clientes sem Investimentos</h2>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchClients}
          disabled={loading}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>
            Filtre clientes sem investimentos ou sem novos aportes nos últimos 12 meses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-64">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="none">Sem investimentos</SelectItem>
                  <SelectItem value="no_recent">Sem aportes recentes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Lista de Clientes</CardTitle>
            <Badge variant="secondary">
              {total} {total === 1 ? 'cliente' : 'clientes'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Carregando clientes...</p>
            </div>
          ) : clients.length > 0 ? (
            <>
              <div className="space-y-4">
                {clients.map((client) => (
                  <div
                    key={client.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">
                            {client.full_name || client.email.split("@")[0]}
                          </h3>
                          {getReasonBadge(client.reason)}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Email:</span>
                            <p className="font-medium">{client.email}</p>
                          </div>
                          {client.phone && (
                            <div>
                              <span className="text-muted-foreground">Telefone:</span>
                              <p className="font-medium">{client.phone}</p>
                            </div>
                          )}
                          <div>
                            <span className="text-muted-foreground">Cadastrado em:</span>
                            <p className="font-medium">{formatDate(client.created_at)}</p>
                          </div>
                          {client.advisor && (
                            <div>
                              <span className="text-muted-foreground">Assessor:</span>
                              <p className="font-medium">{client.advisor.name}</p>
                            </div>
                          )}
                          {client.lastInvestmentDate && (
                            <div>
                              <span className="text-muted-foreground">Último investimento:</span>
                              <p className="font-medium">{formatDateWithTime(client.lastInvestmentDate)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t mt-4">
                  <div className="text-sm text-muted-foreground">
                    Página {page} de {totalPages}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page - 1)}
                      disabled={page === 1 || loading}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Anterior
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, Math.min(totalPages - 4, page - 2)) + i
                        if (pageNum > totalPages) return null

                        return (
                          <Button
                            key={pageNum}
                            variant={pageNum === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPage(pageNum)}
                            disabled={loading}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={page === totalPages || loading}
                    >
                      Próxima
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {search || filterType !== "all"
                  ? "Nenhum cliente encontrado com os filtros aplicados"
                  : "Nenhum cliente sem investimentos encontrado"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

