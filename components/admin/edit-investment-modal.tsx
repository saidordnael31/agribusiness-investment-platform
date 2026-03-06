"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Edit, Upload, Trash2, Eye, X } from "lucide-react"
import type { Investment } from "./investments-manager/useInvestmentsManager"
import { ReceiptViewer } from "./receipt-viewer"

interface EditInvestmentModalProps {
  isOpen: boolean
  onClose: () => void
  investment: Investment | null
  onSuccess: () => void
}

export function EditInvestmentModal({
  isOpen,
  onClose,
  investment,
  onSuccess
}: EditInvestmentModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [receipts, setReceipts] = useState<Array<{
    id: string
    file_name: string
    file_type: string
    file_size: number
    status: 'pending' | 'approved' | 'rejected'
    created_at: string
  }>>([])
  const [loadingReceipts, setLoadingReceipts] = useState(false)
  const [uploadingReceipt, setUploadingReceipt] = useState(false)
  const [deletingReceiptId, setDeletingReceiptId] = useState<string | null>(null)
  const [receiptViewerOpen, setReceiptViewerOpen] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<{
    id: string
    file_name: string
    file_type: string
    file_size: number
    status: 'pending' | 'approved' | 'rejected'
    created_at: string
  } | null>(null)
  const [formData, setFormData] = useState({
    amount: "",
    monthly_return_rate: "",
    commitment_period: "",
    profitability_liquidity: "",
    payment_date: "",
    status: ""
  })

  useEffect(() => {
    if (investment && isOpen) {
      setFormData({
        amount: investment.amount?.toString() || "",
        monthly_return_rate: investment.monthly_return_rate 
          ? (investment.monthly_return_rate * 100).toFixed(4) 
          : "",
        commitment_period: investment.commitment_period?.toString() || "",
        profitability_liquidity: (investment as any).profitability_liquidity || "Mensal",
        payment_date: investment.payment_date 
          ? new Date(investment.payment_date).toISOString().split('T')[0]
          : "",
        status: investment.status || "pending"
      })
      fetchReceipts()
    }
  }, [investment, isOpen])

  const fetchReceipts = async () => {
    if (!investment) return
    
    setLoadingReceipts(true)
    try {
      const response = await fetch(`/api/pix-receipts?transactionId=${investment.id}`)
      const result = await response.json()
      
      if (result.success) {
        setReceipts(result.data || [])
      } else {
        setReceipts([])
      }
    } catch (error) {
      console.error('Erro ao buscar comprovantes:', error)
      setReceipts([])
    } finally {
      setLoadingReceipts(false)
    }
  }

  const handleUploadReceipt = async (file: File) => {
    if (!investment) return

    setUploadingReceipt(true)
    try {
      const formData = new FormData()
      formData.append('investmentId', investment.id)
      formData.append('receipt', file)

      const response = await fetch('/api/investments/upload-receipt', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Erro ao enviar comprovante')
      }

      toast({
        title: "Comprovante enviado!",
        description: "O comprovante foi enviado com sucesso.",
      })

      await fetchReceipts()
    } catch (error) {
      console.error('Erro ao enviar comprovante:', error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao enviar comprovante. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setUploadingReceipt(false)
    }
  }

  const handleDeleteReceipt = async (receiptId: string) => {
    setDeletingReceiptId(receiptId)
    try {
      const response = await fetch(`/api/pix-receipts?receiptId=${receiptId}`, {
        method: 'DELETE'
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Erro ao deletar comprovante')
      }

      toast({
        title: "Comprovante deletado!",
        description: "O comprovante foi removido com sucesso.",
      })

      await fetchReceipts()
    } catch (error) {
      console.error('Erro ao deletar comprovante:', error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao deletar comprovante. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setDeletingReceiptId(null)
    }
  }

  const handleViewReceipt = (receipt: typeof receipts[0]) => {
    setSelectedReceipt(receipt)
    setReceiptViewerOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!investment) return

    setLoading(true)

    try {
      // Preparar dados para envio
      const updateData: Record<string, any> = {}

      if (formData.amount) {
        updateData.amount = parseFloat(formData.amount)
      }

      if (formData.monthly_return_rate) {
        updateData.monthly_return_rate = parseFloat(formData.monthly_return_rate) / 100
      }

      if (formData.commitment_period) {
        updateData.commitment_period = parseInt(formData.commitment_period)
      }

      if (formData.profitability_liquidity) {
        updateData.profitability_liquidity = formData.profitability_liquidity
      }

      if (formData.payment_date) {
        updateData.payment_date = formData.payment_date
      } else {
        updateData.payment_date = null
      }

      if (formData.status) {
        updateData.status = formData.status
      }

      const response = await fetch(`/api/investments/${investment.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Erro ao atualizar investimento')
      }

      toast({
        title: "Investimento atualizado!",
        description: "O investimento foi atualizado com sucesso.",
      })

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Erro ao atualizar investimento:', error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao atualizar investimento. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5" />
            Editar Investimento
          </DialogTitle>
          <DialogDescription>
            Edite as informações do investimento. Campos vazios não serão alterados.
          </DialogDescription>
        </DialogHeader>

        {investment && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Informações do Investidor */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Investidor</h4>
              <p className="text-sm text-gray-600">
                {investment.profiles?.full_name || 'N/A'}
              </p>
              <p className="text-sm text-gray-500">
                {investment.profiles?.email || 'N/A'}
              </p>
            </div>

            {/* Valor */}
            <div className="space-y-2">
              <Label htmlFor="amount">Valor do Investimento (R$)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder={investment.amount ? formatCurrency(investment.amount) : ""}
              />
            </div>

            {/* Período de Compromisso */}
            <div className="space-y-2">
              <Label htmlFor="commitment_period">Período de Compromisso (meses)</Label>
              <Input
                id="commitment_period"
                type="number"
                min="1"
                value={formData.commitment_period}
                onChange={(e) => setFormData({ ...formData, commitment_period: e.target.value })}
                placeholder={investment.commitment_period?.toString() || ""}
              />
            </div>

            {/* Liquidez */}
            <div className="space-y-2">
              <Label htmlFor="profitability_liquidity">Liquidez</Label>
              <Select
                value={formData.profitability_liquidity}
                onValueChange={(value) => setFormData({ ...formData, profitability_liquidity: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a liquidez" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mensal">Mensal</SelectItem>
                  <SelectItem value="Semestral">Semestral</SelectItem>
                  <SelectItem value="Anual">Anual</SelectItem>
                  <SelectItem value="No Vencimento">No Vencimento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Taxa de Retorno Mensal */}
            <div className="space-y-2">
              <Label htmlFor="monthly_return_rate">Taxa de Retorno Mensal (%)</Label>
              <Input
                id="monthly_return_rate"
                type="number"
                step="0.0001"
                min="0"
                max="100"
                value={formData.monthly_return_rate}
                onChange={(e) => setFormData({ ...formData, monthly_return_rate: e.target.value })}
                placeholder={investment.monthly_return_rate 
                  ? (investment.monthly_return_rate * 100).toFixed(4) 
                  : ""}
              />
              <p className="text-xs text-muted-foreground">
                Nota: Se você alterar o período de compromisso ou liquidez, a taxa será recalculada automaticamente.
              </p>
            </div>

            {/* Data de Pagamento */}
            <div className="space-y-2">
              <Label htmlFor="payment_date">Data de Pagamento</Label>
              <Input
                id="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Deixe em branco para remover a data de pagamento.
              </p>
            </div>

            {/* Status */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="withdrawn">Resgatado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Gerenciamento de Comprovantes */}
            <div className="space-y-2 border-t pt-4">
              <Label>Comprovantes PIX</Label>
              
              {loadingReceipts ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">Carregando comprovantes...</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Lista de comprovantes */}
                  {receipts.length > 0 && (
                    <div className="space-y-2">
                      {receipts.map((receipt) => (
                        <div
                          key={receipt.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{receipt.file_name}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(receipt.created_at).toLocaleDateString('pt-BR')} • 
                                {(receipt.file_size / 1024).toFixed(2)} KB
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-4">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewReceipt(receipt)}
                              className="h-8"
                            >
                              <Eye className="w-3 h-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteReceipt(receipt.id)}
                              disabled={deletingReceiptId === receipt.id}
                              className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              {deletingReceiptId === receipt.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload de novo comprovante */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <Input
                        type="file"
                        accept=".jpg,.jpeg,.png,.webp,.pdf"
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) {
                            handleUploadReceipt(file)
                            e.target.value = '' // Reset input
                          }
                        }}
                        disabled={uploadingReceipt}
                        className="flex-1"
                      />
                      {uploadingReceipt && (
                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      Formatos aceitos: JPG, PNG, WEBP, PDF (máximo 10MB)
                    </p>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <Edit className="w-4 h-4 mr-2" />
                    Salvar Alterações
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
        </DialogContent>
      </Dialog>

      {/* Modal de visualização de comprovante (fora do Dialog principal) */}
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
    </>
  )
}

