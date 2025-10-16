"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Eye, Download, X, FileImage, FileText, Loader2 } from "lucide-react"

interface PixReceipt {
  id: string
  file_name: string
  file_type: string
  file_size: number
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

interface ReceiptViewerProps {
  receipt: PixReceipt
  isOpen: boolean
  onClose: () => void
}

export function ReceiptViewer({ receipt, isOpen, onClose }: ReceiptViewerProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)

  const handleViewReceipt = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/pix-receipts/view?receiptId=${receipt.id}`)
      const result = await response.json()

      if (result.success && result.data.signed_url) {
        const url = result.data.signed_url
        
        if (receipt.file_type.startsWith('image/')) {
          setImageUrl(url)
        } else if (receipt.file_type === 'application/pdf') {
          setPdfUrl(url)
        } else {
          // Para outros tipos de arquivo, abrir em nova aba
          window.open(url, '_blank')
        }
      } else {
        throw new Error(result.error || 'Erro ao carregar comprovante')
      }
    } catch (error) {
      console.error('Erro ao visualizar comprovante:', error)
      toast({
        title: "Erro",
        description: "Não foi possível carregar o comprovante",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDownload = async () => {
    if (!imageUrl && !pdfUrl) {
      await handleViewReceipt()
    }
    
    const url = imageUrl || pdfUrl
    if (url) {
      const link = document.createElement('a')
      link.href = url
      link.download = receipt.file_name
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-600 bg-green-100'
      case 'pending':
        return 'text-yellow-600 bg-yellow-100'
      case 'rejected':
        return 'text-red-600 bg-red-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Aprovado'
      case 'pending':
        return 'Pendente'
      case 'rejected':
        return 'Rejeitado'
      default:
        return status
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {receipt.file_type.startsWith('image/') ? (
              <FileImage className="w-5 h-5" />
            ) : (
              <FileText className="w-5 h-5" />
            )}
            {receipt.file_name}
          </DialogTitle>
          <DialogDescription>
            Comprovante PIX - {formatFileSize(receipt.file_size)} - {formatDate(receipt.created_at)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do arquivo */}
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              {receipt.file_type.startsWith('image/') ? (
                <FileImage className="w-8 h-8 text-blue-500" />
              ) : (
                <FileText className="w-8 h-8 text-red-500" />
              )}
              <div>
                <p className="font-medium">{receipt.file_name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatFileSize(receipt.file_size)} • {formatDate(receipt.created_at)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(receipt.status)}`}>
                {getStatusLabel(receipt.status)}
              </span>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleViewReceipt}
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              {isLoading ? 'Carregando...' : 'Visualizar'}
            </Button>
            <Button
              variant="outline"
              onClick={handleDownload}
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Baixar
            </Button>
          </div>

          {/* Visualização do arquivo */}
          {imageUrl && (
            <div className="border rounded-lg overflow-hidden">
              <img
                src={imageUrl}
                alt={receipt.file_name}
                className="w-full h-auto max-h-96 object-contain"
                onError={() => {
                  setImageUrl(null)
                  toast({
                    title: "Erro",
                    description: "Não foi possível carregar a imagem",
                    variant: "destructive"
                  })
                }}
              />
            </div>
          )}

          {pdfUrl && (
            <div className="border rounded-lg overflow-hidden">
              <iframe
                src={pdfUrl}
                className="w-full h-96"
                title={receipt.file_name}
                onError={() => {
                  setPdfUrl(null)
                  toast({
                    title: "Erro",
                    description: "Não foi possível carregar o PDF",
                    variant: "destructive"
                  })
                }}
              />
            </div>
          )}

          {/* Mensagem quando não há arquivo carregado */}
          {!imageUrl && !pdfUrl && !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Clique em "Visualizar" para carregar o comprovante</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
