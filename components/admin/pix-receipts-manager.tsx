'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { 
  Upload, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  Search,
  Filter,
  RefreshCw,
  FileImage,
  FileText,
  User
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface PixReceipt {
  id: string
  user_id: string
  transaction_id: string | null
  file_name: string
  file_path: string
  file_size: number
  file_type: string
  status: string
  uploaded_by: string
  approved_by: string | null
  approved_at: string | null
  rejection_reason: string | null
  created_at: string
  updated_at: string
  profiles: {
    full_name: string
    email: string
  } | null
  uploaded_by_profile: {
    full_name: string
    email: string
  } | null
  approved_by_profile: {
    full_name: string
    email: string
  } | null
}

interface PixReceiptsManagerProps {
  userId?: string
}

const STATUS_LABELS: Record<string, string> = {
  'pending': 'Pendente',
  'approved': 'Aprovado',
  'rejected': 'Rejeitado'
}

const STATUS_COLORS: Record<string, string> = {
  'pending': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'approved': 'bg-green-100 text-green-800 border-green-200',
  'rejected': 'bg-red-100 text-red-800 border-red-200'
}

export function PixReceiptsManager({ userId }: PixReceiptsManagerProps) {
  const { toast } = useToast()
  const [receipts, setReceipts] = useState<PixReceipt[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedReceipt, setSelectedReceipt] = useState<PixReceipt | null>(null)
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false)
  const [action, setAction] = useState<'approve' | 'reject'>('approve')
  const [rejectionReason, setRejectionReason] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    fetchReceipts()
  }, [userId, statusFilter])

  const fetchReceipts = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (userId) params.append('userId', userId)
      if (statusFilter !== 'all') params.append('status', statusFilter)

      const response = await fetch(`/api/pix-receipts?${params.toString()}`)
      const result = await response.json()

      if (result.success) {
        setReceipts(result.data || [])
      } else {
        throw new Error(result.error || 'Erro ao carregar comprovantes')
      }
    } catch (error) {
      console.error('Erro ao carregar comprovantes:', error)
      setError(error instanceof Error ? error.message : 'Erro inesperado')
      toast({
        title: "Erro ao carregar comprovantes",
        description: error instanceof Error ? error.message : "Erro inesperado",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleAction = async () => {
    if (!selectedReceipt) return

    try {
      setIsProcessing(true)

      const response = await fetch('/api/pix-receipts/action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          receiptId: selectedReceipt.id,
          action: action === 'approve' ? 'approved' : 'rejected',
          rejectionReason: action === 'reject' ? rejectionReason : undefined
        })
      })

      const result = await response.json()

      if (result.success) {
        toast({
          title: action === 'approve' ? "Comprovante aprovado" : "Comprovante rejeitado",
          description: action === 'approve' 
            ? "O comprovante foi aprovado com sucesso"
            : "O comprovante foi rejeitado"
        })

        // Atualizar lista
        await fetchReceipts()
        setIsActionDialogOpen(false)
        setSelectedReceipt(null)
        setRejectionReason('')
      } else {
        throw new Error(result.error || 'Erro ao processar comprovante')
      }
    } catch (error) {
      console.error('Erro ao processar comprovante:', error)
      toast({
        title: "Erro ao processar",
        description: error instanceof Error ? error.message : "Erro inesperado",
        variant: "destructive"
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const viewReceipt = async (receipt: PixReceipt) => {
    try {
      const response = await fetch(`/api/pix-receipts/view?receiptId=${receipt.id}`)
      const result = await response.json()

      if (result.success && result.data.signed_url) {
        window.open(result.data.signed_url, '_blank')
      } else {
        throw new Error(result.error || 'Erro ao abrir comprovante')
      }
    } catch (error) {
      console.error('Erro ao abrir comprovante:', error)
      toast({
        title: "Erro",
        description: "Não foi possível abrir o comprovante",
        variant: "destructive"
      })
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <FileImage className="w-4 h-4" />
    }
    return <FileText className="w-4 h-4" />
  }

  const filteredReceipts = receipts.filter(receipt => {
    const matchesSearch = !searchTerm || 
      receipt.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receipt.profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase())
    
    return matchesSearch
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando comprovantes...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <XCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Erro ao carregar comprovantes</h3>
        <p className="text-muted-foreground mb-4">{error}</p>
        <Button onClick={fetchReceipts} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Tentar Novamente
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header com filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Gerenciar Comprovantes PIX
            </CardTitle>
            <Button onClick={fetchReceipts} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Buscar</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Buscar por arquivo, usuário ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="md:w-48">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendentes</SelectItem>
                  <SelectItem value="approved">Aprovados</SelectItem>
                  <SelectItem value="rejected">Rejeitados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de comprovantes */}
      <Card>
        <CardContent className="p-0">
          {filteredReceipts.length === 0 ? (
            <div className="text-center py-8">
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum comprovante encontrado</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' 
                  ? "Nenhum comprovante corresponde aos filtros aplicados."
                  : "Ainda não há comprovantes enviados."
                }
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredReceipts.map((receipt) => (
                <div key={receipt.id} className="p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-muted rounded-lg">
                        {getFileIcon(receipt.file_type)}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{receipt.file_name}</p>
                          <Badge className={STATUS_COLORS[receipt.status]}>
                            {STATUS_LABELS[receipt.status]}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span>{formatFileSize(receipt.file_size)}</span>
                          <span>•</span>
                          <span>{formatDate(receipt.created_at)}</span>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            <span>{receipt.profiles?.full_name || receipt.profiles?.email}</span>
                          </div>
                        </div>
                        {receipt.rejection_reason && (
                          <p className="text-sm text-red-600">
                            Motivo da rejeição: {receipt.rejection_reason}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewReceipt(receipt)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Ver
                      </Button>
                      {receipt.status === 'pending' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedReceipt(receipt)
                              setAction('approve')
                              setIsActionDialogOpen(true)
                            }}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedReceipt(receipt)
                              setAction('reject')
                              setIsActionDialogOpen(true)
                            }}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Rejeitar
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de ação */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === 'approve' ? 'Aprovar Comprovante' : 'Rejeitar Comprovante'}
            </DialogTitle>
            <DialogDescription>
              {action === 'approve' 
                ? 'Tem certeza que deseja aprovar este comprovante?'
                : 'Tem certeza que deseja rejeitar este comprovante?'
              }
            </DialogDescription>
          </DialogHeader>
          
          {selectedReceipt && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 border rounded-lg">
                {getFileIcon(selectedReceipt.file_type)}
                <div>
                  <p className="font-medium">{selectedReceipt.file_name}</p>
                  <p className="text-sm text-muted-foreground">
                    {selectedReceipt.profiles?.full_name || selectedReceipt.profiles?.email}
                  </p>
                </div>
              </div>

              {action === 'reject' && (
                <div className="space-y-2">
                  <Label htmlFor="rejection-reason">Motivo da rejeição *</Label>
                  <Textarea
                    id="rejection-reason"
                    placeholder="Digite o motivo da rejeição..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsActionDialogOpen(false)}
              disabled={isProcessing}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleAction}
              disabled={isProcessing || (action === 'reject' && !rejectionReason.trim())}
              className={action === 'approve' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Processando...
                </>
              ) : (
                <>
                  {action === 'approve' ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Aprovar
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 mr-2" />
                      Rejeitar
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
