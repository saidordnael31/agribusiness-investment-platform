"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Upload, FileText, CheckCircle } from "lucide-react"

interface ApproveInvestmentModalProps {
  isOpen: boolean
  onClose: () => void
  investmentId: string
  investmentAmount: number
  investorName: string
  onSuccess: () => void
}

export function ApproveInvestmentModal({
  isOpen,
  onClose,
  investmentId,
  investmentAmount,
  investorName,
  onSuccess
}: ApproveInvestmentModalProps) {
  const { toast } = useToast()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const handleFileSelect = (file: File) => {
    // Validar tipo de arquivo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Apenas arquivos JPG, PNG e PDF são permitidos.",
        variant: "destructive"
      })
      return
    }

    // Validar tamanho (máximo 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      toast({
        title: "Arquivo muito grande",
        description: "O arquivo deve ter no máximo 10MB.",
        variant: "destructive"
      })
      return
    }

    setSelectedFile(file)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true)
    } else if (e.type === "dragleave") {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    const file = e.dataTransfer.files?.[0]
    if (file) {
      handleFileSelect(file)
    }
  }

  const handleApprove = async () => {
    if (!selectedFile) {
      toast({
        title: "Comprovante obrigatório",
        description: "Selecione um comprovante antes de aprovar o investimento.",
        variant: "destructive"
      })
      return
    }

    setIsUploading(true)

    try {
      const formData = new FormData()
      formData.append('investmentId', investmentId)
      formData.append('receipt', selectedFile)

      const response = await fetch('/api/investments/approve-with-receipt', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Erro ao aprovar investimento')
      }

      toast({
        title: "Investimento aprovado!",
        description: "O investimento foi aprovado e o comprovante foi enviado com sucesso.",
      })

      onSuccess()
      onClose()
      setSelectedFile(null)

    } catch (error) {
      console.error('Erro ao aprovar investimento:', error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao aprovar investimento. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Aprovar Investimento
          </DialogTitle>
          <DialogDescription>
            Para aprovar este investimento, você deve enviar o comprovante de pagamento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do investimento */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm space-y-1">
              <div><span className="font-medium">Investidor:</span> {investorName}</div>
              <div><span className="font-medium">Valor:</span> {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(investmentAmount)}</div>
            </div>
          </div>

          {/* Upload de arquivo */}
          <div className="space-y-2">
            <Label htmlFor="receipt">Comprovante de Pagamento</Label>
            
            {!selectedFile ? (
              <div
                className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                  dragActive 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-600 mb-2">
                  Arraste o comprovante aqui ou clique para selecionar
                </p>
                <p className="text-xs text-gray-500">
                  JPG, PNG ou PDF (máximo 10MB)
                </p>
                <Input
                  id="receipt"
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => document.getElementById('receipt')?.click()}
                >
                  Selecionar Arquivo
                </Button>
              </div>
            ) : (
              <div className="border rounded-lg p-3 bg-green-50 border-green-200">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-green-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-800">{selectedFile.name}</p>
                    <p className="text-xs text-green-600">{formatFileSize(selectedFile.size)}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFile(null)}
                    className="text-red-600 hover:text-red-700"
                  >
                    Remover
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleApprove} 
            disabled={!selectedFile || isUploading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isUploading ? "Aprovando..." : "Aprovar Investimento"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
