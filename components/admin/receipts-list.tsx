'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Eye, CheckCircle, XCircle, Clock, FileImage } from 'lucide-react'
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
}

interface ReceiptsListProps {
  userId: string
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

export function ReceiptsList({ userId }: ReceiptsListProps) {
  const { toast } = useToast()
  const [receipts, setReceipts] = useState<PixReceipt[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchReceipts()
  }, [userId])

  const fetchReceipts = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/pix-receipts?userId=${userId}`)
      const result = await response.json()

      if (result.success) {
        setReceipts(result.data || [])
      } else {
        throw new Error(result.error || 'Erro ao carregar comprovantes')
      }
    } catch (error) {
      console.error('Erro ao buscar comprovantes:', error)
      toast({
        title: "Erro ao carregar comprovantes",
        description: error instanceof Error ? error.message : "Erro inesperado",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewReceipt = (receipt: PixReceipt) => {
    window.open(`/api/pix-receipts/view?receiptId=${receipt.id}`, '_blank')
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

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/70">Carregando comprovantes...</p>
        </div>
      </div>
    )
  }

  if (receipts.length === 0) {
    return (
      <div className="text-center py-8">
        <FileImage className="w-12 h-12 text-white/30 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2 text-white">Nenhum comprovante encontrado</h3>
        <p className="text-white/70">
          Ainda não há comprovantes enviados para este usuário.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {receipts.map((receipt) => (
        <div key={receipt.id} className="border border-white/10 rounded-lg p-4 hover:bg-white/5 transition-colors bg-[#01223F]/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              <div className="flex-shrink-0">
                {receipt.status === 'approved' && <CheckCircle className="w-5 h-5 text-[#00BC6E]" />}
                {receipt.status === 'rejected' && <XCircle className="w-5 h-5 text-red-500" />}
                {receipt.status === 'pending' && <Clock className="w-5 h-5 text-yellow-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-medium truncate text-white">{receipt.file_name}</p>
                  <Badge className={STATUS_COLORS[receipt.status]}>
                    {STATUS_LABELS[receipt.status]}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-white/70">
                  <span>{formatFileSize(receipt.file_size)}</span>
                  <span>•</span>
                  <span>Enviado em {formatDate(receipt.created_at)}</span>
                  {receipt.approved_at && (
                    <>
                      <span>•</span>
                      <span>Aprovado em {formatDate(receipt.approved_at)}</span>
                    </>
                  )}
                  {receipt.rejection_reason && (
                    <>
                      <span>•</span>
                      <span className="text-red-400">Rejeitado: {receipt.rejection_reason}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleViewReceipt(receipt)}
              className="ml-4 bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Eye className="w-4 h-4 mr-2" />
              Visualizar
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

