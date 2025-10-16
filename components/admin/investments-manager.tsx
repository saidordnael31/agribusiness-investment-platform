"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { UploadReceiptModal } from "./upload-receipt-modal"
import { ReceiptViewer } from "./receipt-viewer"
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  Upload,
  Eye
} from "lucide-react"

interface Investment {
  id: string
  user_id: string
  quota_type: string
  amount: number
  monthly_return_rate: number
  commitment_period: number
  status: 'pending' | 'active' | 'withdrawn'
  created_at: string
  updated_at: string
  profiles?: {
    full_name: string
    email: string
  }
  receipts?: {
    id: string
    file_name: string
    status: 'pending' | 'approved' | 'rejected'
    created_at: string
  }[]
}

interface InvestmentFilters {
  status: string
  quotaType: string
  search: string
  dateFrom: string
  dateTo: string
}

export function InvestmentsManager() {
  const { toast } = useToast()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalInvestments, setTotalInvestments] = useState(0)
  const itemsPerPage = 10

  // Estados para o modal de upload de comprovante
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [selectedInvestmentForUpload, setSelectedInvestmentForUpload] = useState<{
    id: string
    amount: number
    investorName: string
  } | null>(null)

  // Estados para modal de exportação
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportOptions, setExportOptions] = useState({
    includeAll: true,
    includeReceipts: true,
    includePersonalData: true,
    format: 'csv' as 'csv' | 'excel'
  })

  // Estados para visualização de comprovante
  const [receiptViewerOpen, setReceiptViewerOpen] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<{
    id: string
    file_name: string
    file_type: string
    file_size: number
    status: 'pending' | 'approved' | 'rejected'
    created_at: string
  } | null>(null)

  // Filtros
  const [filters, setFilters] = useState<InvestmentFilters>({
    status: "all",
    quotaType: "all",
    search: "",
    dateFrom: "",
    dateTo: ""
  })

  // Função para buscar comprovantes de um investimento
  const fetchInvestmentReceipts = async (investmentId: string) => {
    try {
      const response = await fetch(`/api/pix-receipts?transactionId=${investmentId}`)
      const data = await response.json()
      
      if (data.success && data.data) {
        return data.data.map((receipt: any) => ({
          id: receipt.id,
          file_name: receipt.file_name,
          status: receipt.status,
          created_at: receipt.created_at
        }))
      }
      return []
    } catch (error) {
      console.error("Erro ao buscar comprovantes:", error)
      return []
    }
  }

  const fetchInvestments = async (page: number = 1, currentFilters: InvestmentFilters = filters) => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: itemsPerPage.toString(),
        ...(currentFilters.status !== "all" && { status: currentFilters.status }),
        ...(currentFilters.quotaType !== "all" && { quota_type: currentFilters.quotaType }),
        ...(currentFilters.search && { search: currentFilters.search }),
        ...(currentFilters.dateFrom && { date_from: currentFilters.dateFrom }),
        ...(currentFilters.dateTo && { date_to: currentFilters.dateTo })
      })

      const response = await fetch(`/api/investments?${params}`)
      const data = await response.json()

      if (data.success) {
        // Buscar comprovantes para cada investimento
        const investmentsWithReceipts = await Promise.all(
          (data.data || []).map(async (investment: Investment) => {
            const receipts = await fetchInvestmentReceipts(investment.id)
            return {
              ...investment,
              receipts
            }
          })
        )

        setInvestments(investmentsWithReceipts)
        setTotalPages(data.pagination?.totalPages || 1)
        setTotalInvestments(data.pagination?.total || 0)
      } else {
        throw new Error(data.error || 'Erro ao buscar investimentos')
      }
    } catch (error) {
      console.error('Erro ao buscar investimentos:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar investimentos. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (newFilters: Partial<InvestmentFilters>) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)
    setCurrentPage(1)
    fetchInvestments(1, updatedFilters)
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    fetchInvestments(newPage, filters)
  }

  const clearFilters = () => {
    const clearedFilters = {
      status: "all",
      quotaType: "all",
      search: "",
      dateFrom: "",
      dateTo: ""
    }
    setFilters(clearedFilters)
    setCurrentPage(1)
    fetchInvestments(1, clearedFilters)
  }

  const handleUploadReceipt = (investment: Investment) => {
    setSelectedInvestmentForUpload({
      id: investment.id,
      amount: investment.amount,
      investorName: investment.profiles?.full_name || 'Investidor'
    })
    setUploadModalOpen(true)
  }

  const handleViewReceipt = (receipt: any) => {
    setSelectedReceipt({
      id: receipt.id,
      file_name: receipt.file_name,
      file_type: receipt.file_type || 'image/jpeg', // fallback
      file_size: receipt.file_size || 0,
      status: receipt.status,
      created_at: receipt.created_at
    })
    setReceiptViewerOpen(true)
  }

  const handleApprovalSuccess = () => {
    fetchInvestments(currentPage, filters)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">Pendente</Badge>
      case 'active':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">Ativo</Badge>
      case 'withdrawn':
        return <Badge variant="secondary" className="bg-gray-100 text-gray-800 border-gray-200">Resgatado</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getQuotaTypeBadge = (quotaType: string) => {
    switch (quotaType) {
      case 'senior':
        return <Badge variant="outline" className="text-blue-600 border-blue-200">Senior</Badge>
      case 'subordinate':
        return <Badge variant="outline" className="text-purple-600 border-purple-200">Subordinada</Badge>
      default:
        return <Badge variant="outline">{quotaType}</Badge>
    }
  }

  const exportInvestments = () => {
    setExportModalOpen(true)
  }

  const handleExport = async () => {
    try {
      setIsExporting(true)
      
      // Buscar TODOS os investimentos para exportação (sem paginação)
      const params = new URLSearchParams({
        limit: '999999', // Número alto para pegar todos
        ...(filters.status !== "all" && { status: filters.status }),
        ...(filters.quotaType !== "all" && { quota_type: filters.quotaType }),
        ...(filters.search && { search: filters.search }),
        ...(filters.dateFrom && { date_from: filters.dateFrom }),
        ...(filters.dateTo && { date_to: filters.dateTo })
      })

      const response = await fetch(`/api/investments?${params}`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Erro ao buscar investimentos para exportação')
      }

      // Buscar comprovantes para todos os investimentos
      const allInvestmentsWithReceipts = await Promise.all(
        (data.data || []).map(async (investment: Investment) => {
          const receipts = await fetchInvestmentReceipts(investment.id)
          return {
            ...investment,
            receipts
          }
        })
      )

      // Preparar dados base
      let csvData = allInvestmentsWithReceipts.map(investment => {
        const baseData: any = {
          'ID': investment.id,
          'Valor': investment.amount,
          'Tipo de Quota': investment.quota_type,
          'Status': investment.status,
          'Taxa Mensal (%)': (investment.monthly_return_rate * 100).toFixed(2),
          'Período (meses)': investment.commitment_period,
          'Data de Criação': new Date(investment.created_at).toLocaleDateString("pt-BR"),
          'Hora de Criação': new Date(investment.created_at).toLocaleTimeString("pt-BR"),
          'Última Atualização': new Date(investment.updated_at).toLocaleDateString("pt-BR")
        }

        // Adicionar dados pessoais se selecionado
        if (exportOptions.includePersonalData) {
          baseData['Investidor'] = investment.profiles?.full_name || 'N/A'
          baseData['Email'] = investment.profiles?.email || 'N/A'
        }

        // Adicionar dados de comprovantes se selecionado
        if (exportOptions.includeReceipts) {
          baseData['Comprovantes'] = investment.receipts?.length || 0
          baseData['Comprovantes Aprovados'] = investment.receipts?.filter(r => r.status === 'approved').length || 0
          baseData['Comprovantes Pendentes'] = investment.receipts?.filter(r => r.status === 'pending').length || 0
          baseData['Comprovantes Rejeitados'] = investment.receipts?.filter(r => r.status === 'rejected').length || 0
        }

        return baseData
      })

      // Converter para CSV
      const headers = Object.keys(csvData[0] || {})
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row]
            // Escapar vírgulas e aspas no CSV
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value
          }).join(',')
        )
      ].join('\n')

      // Criar e baixar arquivo
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      
      // Nome do arquivo com data e hora
      const now = new Date()
      const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-')
      const extension = exportOptions.format === 'excel' ? 'xlsx' : 'csv'
      link.setAttribute('download', `investimentos_${timestamp}.${extension}`)
      
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Exportação concluída!",
        description: `Arquivo ${exportOptions.format.toUpperCase()} com ${allInvestmentsWithReceipts.length} investimentos foi baixado.`,
      })

      setExportModalOpen(false)

    } catch (error) {
      console.error('Erro ao exportar investimentos:', error)
      toast({
        title: "Erro na exportação",
        description: "Erro ao gerar arquivo. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setIsExporting(false)
    }
  }

  useEffect(() => {
    fetchInvestments()
  }, [])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Investimentos</h2>
          <p className="text-muted-foreground">
            Gerencie todos os investimentos da plataforma
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportInvestments}>
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          <Button variant="outline" onClick={() => fetchInvestments(currentPage, filters)}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Atualizar
          </Button>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange({ status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="withdrawn">Resgatado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de Quota</label>
              <Select value={filters.quotaType} onValueChange={(value) => handleFilterChange({ quotaType: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="senior">Senior</SelectItem>
                  <SelectItem value="subordinate">Subordinada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Nome ou email..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange({ search: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Data Inicial</label>
              <Input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange({ dateFrom: e.target.value })}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Data Final</label>
              <Input
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange({ dateTo: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={clearFilters}>
              Limpar Filtros
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Investimentos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Lista de Investimentos</CardTitle>
              <CardDescription>
                {totalInvestments} investimento(s) encontrado(s)
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 animate-spin mr-2" />
              Carregando investimentos...
            </div>
          ) : investments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum investimento encontrado com os filtros aplicados.
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Investidor</TableHead>
                    <TableHead>Valor</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Comprovantes</TableHead>
                    <TableHead>Taxa Mensal</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {investments.map((investment) => (
                    <TableRow key={investment.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {investment.profiles?.full_name || 'N/A'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {investment.profiles?.email || 'N/A'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">
                          {new Intl.NumberFormat("pt-BR", { 
                            style: "currency", 
                            currency: "BRL" 
                          }).format(investment.amount)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {getQuotaTypeBadge(investment.quota_type)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(investment.status)}
                      </TableCell>
                      <TableCell>
                        {investment.receipts && investment.receipts.length > 0 ? (
                          <div className="space-y-1">
                            {investment.receipts.map((receipt) => (
                              <div key={receipt.id} className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleViewReceipt(receipt)}
                                  className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 hover:text-green-800"
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Visualizar
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleUploadReceipt(investment)}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            <Upload className="w-3 h-3 mr-1" />
                            Upload
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-green-600 font-medium">
                          {(investment.monthly_return_rate * 100).toFixed(2)}% a.m.
                        </div>
                      </TableCell>
                      <TableCell>
                        {investment.commitment_period} meses
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(investment.created_at).toLocaleDateString("pt-BR")}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(investment.created_at).toLocaleTimeString("pt-BR")}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4">
                  <div className="text-sm text-muted-foreground">
                    Página {currentPage} de {totalPages} ({totalInvestments} investimentos)
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>


      {/* Modal de Upload de Comprovante */}
      {selectedInvestmentForUpload && (
        <UploadReceiptModal
          isOpen={uploadModalOpen}
          onClose={() => {
            setUploadModalOpen(false)
            setSelectedInvestmentForUpload(null)
          }}
          investmentId={selectedInvestmentForUpload.id}
          investmentAmount={selectedInvestmentForUpload.amount}
          investorName={selectedInvestmentForUpload.investorName}
          onSuccess={handleApprovalSuccess}
        />
      )}

      {/* Modal de Exportação */}
      <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5 text-blue-600" />
              Exportar Investimentos
            </DialogTitle>
            <DialogDescription>
              Escolha quais dados incluir no arquivo de exportação
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="includePersonalData"
                  checked={exportOptions.includePersonalData}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includePersonalData: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="includePersonalData" className="text-sm font-medium">
                  Incluir dados pessoais (nome e email)
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="includeReceipts"
                  checked={exportOptions.includeReceipts}
                  onChange={(e) => setExportOptions(prev => ({ ...prev, includeReceipts: e.target.checked }))}
                  className="rounded"
                />
                <label htmlFor="includeReceipts" className="text-sm font-medium">
                  Incluir dados de comprovantes
                </label>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Formato do arquivo:</label>
                <div className="flex space-x-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="format-csv"
                      name="format"
                      value="csv"
                      checked={exportOptions.format === 'csv'}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as 'csv' | 'excel' }))}
                    />
                    <label htmlFor="format-csv" className="text-sm">CSV</label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="format-excel"
                      name="format"
                      value="excel"
                      checked={exportOptions.format === 'excel'}
                      onChange={(e) => setExportOptions(prev => ({ ...prev, format: e.target.value as 'csv' | 'excel' }))}
                    />
                    <label htmlFor="format-excel" className="text-sm">Excel</label>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Total de investimentos:</strong> {totalInvestments}
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Todos os investimentos (incluindo de outras páginas) serão exportados.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setExportModalOpen(false)}
              disabled={isExporting}
            >
              Cancelar
            </Button>
            <Button 
              onClick={handleExport} 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isExporting}
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Exportando...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Exportar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de visualização de comprovante */}
      {selectedReceipt && (
        <ReceiptViewer
          receipt={selectedReceipt}
          isOpen={receiptViewerOpen}
          onClose={() => {
            setReceiptViewerOpen(false)
            setSelectedReceipt(null)
          }}
        />
      )}
    </div>
  )
}
