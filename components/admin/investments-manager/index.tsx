"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { UploadReceiptModal } from "../upload-receipt-modal"
import { ReceiptViewer } from "../receipt-viewer"
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  Upload,
  Eye
} from "lucide-react"
import { useInvestmentsManager } from "./useInvestmentsManager"

export function InvestmentsManager() {
  const {
    investments,
    loading,
    currentPage,
    totalPages,
    totalInvestments,
    uploadModalOpen,
    selectedInvestmentForUpload,
    exportModalOpen,
    isExporting,
    exportOptions,
    receiptViewerOpen,
    selectedReceipt,
    filters,
    setExportModalOpen,
    setExportOptions,
    handleFilterChange,
    handlePageChange,
    clearFilters,
    handleUploadReceipt,
    handleViewReceipt,
    handleApprovalSuccess,
    getStatusBadge,
    getQuotaTypeBadge,
    exportInvestments,
    handleExport,
    formatCurrency,
    closeUploadModal,
    closeReceiptViewer,
    fetchInvestments,
  } = useInvestmentsManager()

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
                  {investments.map((investment) => {
                    const statusBadge = getStatusBadge(investment.status)
                    const quotaBadge = getQuotaTypeBadge(investment.quota_type)
                    
                    return (
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
                            {formatCurrency(investment.amount)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={quotaBadge.variant} className={quotaBadge.className}>
                            {quotaBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadge.variant} className={statusBadge.className}>
                            {statusBadge.label}
                          </Badge>
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
                    )
                  })}
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
          onClose={closeUploadModal}
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
          onClose={closeReceiptViewer}
        />
      )}
    </div>
  )
}


