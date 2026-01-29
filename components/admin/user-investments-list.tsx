'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { 
  TrendingUp, 
  Calendar, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Upload,
  FileImage,
  FileText,
  Eye,
  Download,
  Trash2,
  Loader2
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { PixReceiptUpload } from '@/components/pix-receipt-upload'
import { ReceiptViewer } from './receipt-viewer'

interface Investment {
  id: string
  user_id: string
  quota_type: string
  amount: number
  monthly_return_rate: number
  commitment_period: number | null
  profitability_liquidity?: string | null
  status: string
  created_at: string
  updated_at: string
  payment_date?: string | null
}

interface PixReceipt {
  id: string
  file_name: string
  file_size: number
  file_type: string
  status: string
  created_at: string
  rejection_reason?: string
}

interface UserInvestmentsListProps {
  userId: string
  userName: string
}

const STATUS_LABELS: Record<string, string> = {
  'active': 'Ativo',
  'pending': 'Pendente',
  'withdrawn': 'Resgatado',
  'cancelled': 'Cancelado'
}

const STATUS_COLORS: Record<string, string> = {
  'active': 'bg-green-100 text-green-800 border-green-200',
  'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'withdrawn': 'bg-blue-100 text-blue-800 border-blue-200',
  'cancelled': 'bg-red-100 text-red-800 border-red-200'
}

const QUOTA_TYPE_LABELS: Record<string, string> = {
  'senior': 'Sênior',
  'subordinada': 'Subordinada'
}

export function UserInvestmentsList({ userId, userName }: UserInvestmentsListProps) {
  const { toast } = useToast()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null)
  const [selectedReceipt, setSelectedReceipt] = useState<PixReceipt | null>(null)
  const [receiptToDelete, setReceiptToDelete] = useState<PixReceipt | null>(null)
  const [investmentReceipts, setInvestmentReceipts] = useState<Record<string, PixReceipt[]>>({})
  const [isLoadingReceipts, setIsLoadingReceipts] = useState<Record<string, boolean>>({})
  const [receiptViewerOpen, setReceiptViewerOpen] = useState(false)
  const [receiptToView, setReceiptToView] = useState<PixReceipt | null>(null)

  useEffect(() => {
    fetchInvestments()
  }, [userId])

  useEffect(() => {
    if (investments.length > 0) {
      fetchReceiptsForInvestments()
    }
  }, [investments])

  const fetchInvestments = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/investments?userId=${userId}`)
      const result = await response.json()

      if (result.success) {
        setInvestments(result.data || [])
      } else {
        throw new Error(result.error || 'Erro ao carregar investimentos')
      }
    } catch (error) {
      console.error('Erro ao carregar investimentos:', error)
      setError(error instanceof Error ? error.message : 'Erro inesperado')
      toast({
        title: "Erro ao carregar investimentos",
        description: error instanceof Error ? error.message : "Erro inesperado",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  // Função auxiliar para formatar data corretamente, evitando problemas de timezone
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A"
    
    // Se for string no formato YYYY-MM-DD, extrair diretamente sem conversão de timezone
    if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
      const [datePart] = dateString.split('T')
      const [year, month, day] = datePart.split('-').map(Number)
      
      // Formatar diretamente sem passar por Date para evitar problemas de timezone
      return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
    }
    
    // Fallback: tentar parsear como Date e usar UTC
    const date = new Date(dateString)
    if (!isNaN(date.getTime())) {
      const year = date.getUTCFullYear()
      const month = date.getUTCMonth() + 1
      const day = date.getUTCDate()
      return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
    }
    
    return "N/A"
  }

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(2)}%`
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4" />
      case 'pending':
        return <Clock className="w-4 h-4" />
      case 'withdrawn':
        return <TrendingUp className="w-4 h-4" />
      case 'cancelled':
        return <XCircle className="w-4 h-4" />
      default:
        return <AlertCircle className="w-4 h-4" />
    }
  }

  const fetchReceiptsForInvestments = async () => {
    try {
      const receiptsMap: Record<string, PixReceipt[]> = {}
      const loadingMap: Record<string, boolean> = {}
      
      // Inicializar estado de loading para todos os investimentos
      investments.forEach(investment => {
        loadingMap[investment.id] = true
      })
      setIsLoadingReceipts(loadingMap)
      
      // Buscar comprovantes para cada investimento
      for (const investment of investments) {
        try {
          const response = await fetch(`/api/pix-receipts?transactionId=${investment.id}`)
          const result = await response.json()
          
          if (result.success) {
            receiptsMap[investment.id] = result.data || []
          } else {
            receiptsMap[investment.id] = []
          }
        } catch (error) {
          console.error(`Erro ao buscar comprovantes para investimento ${investment.id}:`, error)
          receiptsMap[investment.id] = []
        } finally {
          // Marcar como carregado para este investimento
          loadingMap[investment.id] = false
          setIsLoadingReceipts({ ...loadingMap })
        }
      }
      
      setInvestmentReceipts(receiptsMap)
      // Garantir que todos os loadings sejam false ao final
      setIsLoadingReceipts({})
    } catch (error) {
      console.error('Erro ao buscar comprovantes dos investimentos:', error)
      setIsLoadingReceipts({})
    }
  }

  const calculateTotalInvested = () => {
    return investments.reduce((total, investment) => total + Number(investment.amount), 0)
  }

  const calculateMonthlyReturnForInvestment = (investment: Investment) => {
    const amount = Number(investment.amount)
    const rate = Number(investment.monthly_return_rate)
    const liquidity = investment.profitability_liquidity || 'Mensal'
    
    // Para liquidez "Mensal": juros simples (retorno mensal fixo sobre o valor original)
    // Para outras liquidezes: juros compostos (retorno mensal sobre o valor atual)
    // No contexto de exibição, sempre mostramos baseado no valor original do investimento
    // pois não temos informações sobre resgates neste componente
    if (liquidity === 'Mensal') {
      // JUROS SIMPLES: Retorno mensal = Valor ORIGINAL × taxa mensal
      return amount * rate
    } else {
      // JUROS COMPOSTOS: Retorno mensal = Valor ORIGINAL × taxa mensal
      // (mesmo cálculo para exibição, pois não temos o valor atual com resgates)
      return amount * rate
    }
  }

  const calculateMonthlyReturn = () => {
    return investments.reduce((total, investment) => {
      if (investment.status === 'active') {
        return total + calculateMonthlyReturnForInvestment(investment)
      }
      return total
    }, 0)
  }

  const handleUploadClick = (investment: Investment) => {
    setSelectedInvestment(investment)
    setShowUploadModal(true)
  }

  const handleUploadSuccess = (receipts: any[]) => {
    toast({
      title: "Comprovante enviado!",
      description: "O comprovante foi enviado com sucesso e será analisado.",
    })
    
    // Recarregar todos os comprovantes para garantir dados atualizados
    fetchReceiptsForInvestments()
    
    setShowUploadModal(false)
    setSelectedInvestment(null)
  }

  const handleUploadError = (error: string) => {
    toast({
      title: "Erro no upload",
      description: error,
      variant: "destructive",
    })
  }

  const viewReceipt = (receipt: PixReceipt) => {
    setReceiptToView(receipt)
    setReceiptViewerOpen(true)
  }

  const confirmDeleteReceipt = (receipt: PixReceipt) => {
    setReceiptToDelete(receipt)
    setShowDeleteModal(true)
  }

  const deleteReceipt = async () => {
    if (!receiptToDelete) {
      console.log('❌ Nenhum comprovante selecionado para deletar')
      return
    }

    setIsDeleting(true)
    console.log('🗑️ Iniciando exclusão do comprovante:', receiptToDelete.id)

    try {
      const response = await fetch(`/api/pix-receipts?receiptId=${receiptToDelete.id}`, {
        method: 'DELETE'
      })
      
      console.log('📡 Resposta da API:', response.status, response.statusText)
      
      const result = await response.json()
      console.log('📄 Resultado da API:', result)

      if (result.success) {
        console.log('✅ Comprovante deletado com sucesso')
        toast({
          title: "Sucesso",
          description: "Comprovante deletado com sucesso",
        })
        
        // Atualizar a lista de comprovantes
        await fetchReceiptsForInvestments()
        
        // Fechar modal
        setShowDeleteModal(false)
        setReceiptToDelete(null)
      } else {
        console.log('❌ Erro na API:', result.error)
        throw new Error(result.error || 'Erro ao deletar comprovante')
      }
    } catch (error) {
      console.error('❌ Erro ao deletar comprovante:', error)
      toast({
        title: "Erro",
        description: `Não foi possível deletar o comprovante: ${error.message}`,
        variant: "destructive"
      })
    } finally {
      setIsDeleting(false)
    }
  }


  const getFileIcon = (fileType: string) => {
    if (fileType && fileType.startsWith('image/')) {
      return <FileImage className="w-4 h-4" />
    }
    return <FileText className="w-4 h-4" />
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando investimentos...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Erro ao carregar investimentos</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchInvestments} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Tentar Novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header com estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-[#01223F]/80 to-[#003562]/80 border-[#01223F] text-white shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/70 mb-2">Total Investido</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(calculateTotalInvested())}
                </p>
              </div>
              <div className="p-2 bg-green-500/20 rounded-lg">
                <DollarSign className="w-8 h-8 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#01223F]/80 to-[#003562]/80 border-[#01223F] text-white shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/70 mb-2">Rendimento Mensal</p>
                <p className="text-2xl font-bold text-white">
                  {formatCurrency(calculateMonthlyReturn())}
                </p>
              </div>
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <TrendingUp className="w-8 h-8 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-[#01223F]/80 to-[#003562]/80 border-[#01223F] text-white shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-white/70 mb-2">Total de Investimentos</p>
                <p className="text-2xl font-bold text-white">
                  {investments.length}
                </p>
              </div>
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Calendar className="w-8 h-8 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de investimentos */}
      <Card className="bg-gradient-to-br from-[#01223F]/80 to-[#003562]/80 border-[#01223F] text-white shadow-lg">
        <CardHeader className="border-b border-white/10 pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-white">
              <TrendingUp className="w-5 h-5" />
              Investimentos de {userName}
            </CardTitle>
            <Button 
              onClick={fetchInvestments} 
              variant="outline" 
              size="sm"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {investments.length === 0 ? (
            <div className="text-center py-8">
              <TrendingUp className="w-12 h-12 text-white/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-white">Nenhum investimento encontrado</h3>
              <p className="text-white/70">
                Este usuário ainda não possui investimentos registrados.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {investments.map((investment) => (
                <div
                  key={investment.id}
                  className="bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Badge className={STATUS_COLORS[investment.status]}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(investment.status)}
                          {STATUS_LABELS[investment.status] || investment.status}
                        </div>
                      </Badge>
                      <Badge variant="outline" className="border-white/20 text-white/90 bg-white/5">
                        {QUOTA_TYPE_LABELS[investment.quota_type] || investment.quota_type}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-green-400">
                        {formatCurrency(Number(investment.amount))}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-white/70 mb-1">Taxa de Retorno Mensal</p>
                      <p className="font-medium text-blue-400">
                        {formatPercentage(Number(investment.monthly_return_rate))}
                      </p>
                    </div>

                    {investment.commitment_period && (
                      <div>
                        <p className="text-white/70 mb-1">Período de Compromisso</p>
                        <p className="font-medium text-white">
                          {investment.commitment_period} meses
                        </p>
                      </div>
                    )}

                    {investment.profitability_liquidity && (
                      <div>
                        <p className="text-white/70 mb-1">Liquidez</p>
                        <p className="font-medium text-white capitalize">
                          {investment.profitability_liquidity}
                        </p>
                      </div>
                    )}

                    <div>
                      <p className="text-white/70 mb-1">Data</p>
                      <p className="font-medium text-white">
                        {investment.payment_date 
                          ? formatDate(investment.payment_date)
                          : <span className="text-white/50">Não depositado</span>
                        }
                      </p>
                    </div>
                  </div>

                  {investment.status === 'active' && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-white/70">Rendimento Mensal Estimado</p>
                        <p className="font-medium text-green-400">
                          {formatCurrency(calculateMonthlyReturnForInvestment(investment))}
                        </p>
                      </div>
                    </div>
                  )}



                  {/* Comprovantes Enviados */}
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <p className="text-sm font-medium text-white/70 mb-2">Comprovantes PIX:</p>
                    
                    {/* Estado de loading */}
                    {isLoadingReceipts[investment.id] && (
                      <div className="flex items-center gap-2 p-2 bg-white/5 rounded-lg border border-white/10">
                        <Loader2 className="w-4 h-4 animate-spin text-white/70" />
                        <span className="text-sm text-white/70">Carregando comprovantes...</span>
                      </div>
                    )}
                    
                    {/* Comprovantes carregados */}
                    {!isLoadingReceipts[investment.id] && investmentReceipts[investment.id] && investmentReceipts[investment.id].length > 0 && (
                      <div className="space-y-2">
                        {investmentReceipts[investment.id].map((receipt) => (
                          <div
                            key={receipt.id}
                            className="flex items-center justify-between p-2 bg-white/5 rounded-lg border border-white/10"
                          >
                            <div className="flex items-center gap-2">
                              {getFileIcon(receipt.file_type)}
                              <div>
                                <p className="text-sm font-medium text-white">Comprovante PIX</p>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-white/50">
                                    {formatFileSize(receipt.file_size)}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => viewReceipt(receipt)}
                                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                              >
                                <Eye className="w-3 h-3 mr-1" />
                                Visualizar
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => confirmDeleteReceipt(receipt)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Mensagem quando não há comprovantes (após carregar) */}
                    {!isLoadingReceipts[investment.id] && (!investmentReceipts[investment.id] || investmentReceipts[investment.id].length === 0) && (
                      <p className="text-sm text-white/50">Nenhum comprovante PIX enviado para este investimento.</p>
                    )}
                  </div>

                  {/* Botões de Ação */}
                  <div className="mt-3 pt-3 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-white/70">Ações:</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUploadClick(investment)}
                          className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                        >
                          <Upload className="w-4 h-4 mr-1" />
                          Upload PIX
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Upload de Comprovante */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-[#01223F] to-[#003562] border-[#01223F] text-white">
          <DialogHeader className="border-b border-white/10 pb-4">
            <DialogTitle className="text-white">Upload de Comprovante PIX</DialogTitle>
          </DialogHeader>
          
          {selectedInvestment && (
            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 p-4 rounded-lg">
                <h4 className="font-medium text-white mb-2">Investimento Selecionado</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-white/70 mb-1">Valor:</p>
                    <p className="font-medium text-white">{formatCurrency(Number(selectedInvestment.amount))}</p>
                  </div>
                  <div>
                    <p className="text-white/70 mb-1">Tipo:</p>
                    <p className="font-medium text-white">{QUOTA_TYPE_LABELS[selectedInvestment.quota_type]}</p>
                  </div>
                  <div>
                    <p className="text-white/70 mb-1">Status:</p>
                    <Badge className={STATUS_COLORS[selectedInvestment.status]}>
                      {STATUS_LABELS[selectedInvestment.status]}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-white/70 mb-1">Data:</p>
                    <p className="font-medium text-white">
                      {selectedInvestment.payment_date 
                        ? formatDate(selectedInvestment.payment_date)
                        : <span className="text-white/50">Não depositado</span>
                      }
                    </p>
                  </div>
                </div>
              </div>

              <PixReceiptUpload
                transactionId={selectedInvestment.id}
                onUploadSuccess={handleUploadSuccess}
                onUploadError={handleUploadError}
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Visualização de Comprovante */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-[#01223F] to-[#003562] border-[#01223F] text-white">
          <DialogHeader className="border-b border-white/10 pb-4">
            <DialogTitle className="text-white">Visualizar Comprovante PIX</DialogTitle>
          </DialogHeader>
          
          {selectedReceipt && (
            <div className="space-y-4">
              {/* Informações do Comprovante */}
              <div className="bg-white/5 border border-white/10 p-4 rounded-lg">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-white/70 mb-1">Arquivo:</p>
                    <p className="font-medium text-white">{selectedReceipt.file_name}</p>
                  </div>
                  <div>
                    <p className="text-white/70 mb-1">Tamanho:</p>
                    <p className="font-medium text-white">{formatFileSize(selectedReceipt.file_size)}</p>
                  </div>
                  <div>
                    <p className="text-white/70 mb-1">Data de Upload:</p>
                    <p className="font-medium text-white">{formatDate(selectedReceipt.created_at)}</p>
                  </div>
                </div>
              </div>

              {/* Visualizador de Arquivo */}
              <div className="border border-white/10 rounded-lg overflow-hidden bg-white/5">
                {selectedReceipt.file_type?.startsWith('image/') ? (
                  <div className="flex justify-center bg-white/5 p-4">
                    <img
                      src={selectedReceipt.signed_url}
                      alt={selectedReceipt.file_name}
                      className="max-w-full max-h-[500px] object-contain rounded"
                      onError={() => {
                        toast({
                          title: "Erro",
                          description: "Não foi possível carregar a imagem",
                          variant: "destructive"
                        })
                      }}
                    />
                  </div>
                ) : selectedReceipt.file_type === 'application/pdf' ? (
                  <div className="h-[600px]">
                    <iframe
                      src={selectedReceipt.signed_url}
                      className="w-full h-full border-0"
                      title={selectedReceipt.file_name}
                      onError={() => {
                        toast({
                          title: "Erro",
                          description: "Não foi possível carregar o PDF",
                          variant: "destructive"
                        })
                      }}
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 bg-white/5">
                    <FileText className="w-16 h-16 text-white/30 mb-4" />
                    <p className="text-white/70 mb-4">Visualização não disponível para este tipo de arquivo</p>
                    <Button
                      onClick={() => window.open(selectedReceipt.signed_url, '_blank')}
                      variant="outline"
                      className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      Baixar Arquivo
                    </Button>
                  </div>
                )}
              </div>

              {/* Botões de Ação */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(selectedReceipt.signed_url, '_blank')}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Baixar
                </Button>
                <Button 
                  onClick={() => setShowViewModal(false)}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Exclusão */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="max-w-md bg-gradient-to-br from-[#01223F] to-[#003562] border-[#01223F] text-white">
          <DialogHeader className="border-b border-white/10 pb-4">
            <DialogTitle className="text-white">Confirmar Exclusão</DialogTitle>
          </DialogHeader>
          
          {receiptToDelete && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-500/20 rounded-full">
                  <Trash2 className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <p className="font-medium text-white">Deletar Comprovante</p>
                  <p className="text-sm text-white/70">{receiptToDelete.file_name}</p>
                </div>
              </div>
              
              <p className="text-sm text-white/70">
                Esta ação não pode ser desfeita. O comprovante será permanentemente removido.
              </p>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDeleteModal(false)
                    setReceiptToDelete(null)
                  }}
                  disabled={isDeleting}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={deleteReceipt}
                  disabled={isDeleting}
                  className="bg-red-500/20 border-red-500/50 text-red-400 hover:bg-red-500/30"
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  {isDeleting ? 'Deletando...' : 'Deletar'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de visualização de comprovante */}
      {receiptToView && (
        <ReceiptViewer
          receipt={receiptToView}
          isOpen={receiptViewerOpen}
          onClose={() => {
            setReceiptViewerOpen(false)
            setReceiptToView(null)
          }}
        />
      )}
    </div>
  )
}
