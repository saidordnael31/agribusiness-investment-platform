"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { Upload, FileText } from "lucide-react"

interface UploadReceiptModalProps {
  isOpen: boolean
  onClose: () => void
  investmentId: string
  investmentAmount: number
  investorName: string
  onSuccess: () => void
}

export function UploadReceiptModal({
  isOpen,
  onClose,
  investmentId,
  investmentAmount,
  investorName,
  onSuccess
}: UploadReceiptModalProps) {
  const { toast } = useToast()
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return

    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf', 'image/webp']
    const maxSize = 10 * 1024 * 1024 // 10MB
    const validFiles: File[] = []
    const errors: string[] = []

    Array.from(files).forEach((file) => {
      // Validar tipo de arquivo
      if (!allowedTypes.includes(file.type)) {
        errors.push(`${file.name}: Tipo de arquivo não permitido`)
        return
      }

      // Validar tamanho
      if (file.size > maxSize) {
        errors.push(`${file.name}: Arquivo muito grande (máximo 10MB)`)
        return
      }

      validFiles.push(file)
    })

    if (errors.length > 0) {
      toast({
        title: "Alguns arquivos foram rejeitados",
        description: errors.join(', '),
        variant: "destructive"
      })
    }

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files)
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
    
    handleFileSelect(e.dataTransfer.files)
  }

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast({
        title: "Comprovante obrigatório",
        description: "Selecione pelo menos um comprovante antes de enviar.",
        variant: "destructive"
      })
      return
    }

    setIsUploading(true)

    try {
      let successCount = 0
      let errorCount = 0

      // Upload de múltiplos arquivos
      for (const file of selectedFiles) {
        try {
          const formData = new FormData()
          formData.append('investmentId', investmentId)
          formData.append('receipt', file)

          const response = await fetch('/api/investments/upload-receipt', {
            method: 'POST',
            body: formData
          })

          const data = await response.json()

          if (data.success) {
            successCount++
          } else {
            errorCount++
            console.error(`Erro ao enviar ${file.name}:`, data.error)
          }
        } catch (error) {
          errorCount++
          console.error(`Erro ao enviar ${file.name}:`, error)
        }
      }

      if (successCount > 0) {
        toast({
          title: "Comprovante(s) enviado(s)!",
          description: `${successCount} comprovante(s) enviado(s) com sucesso${errorCount > 0 ? `. ${errorCount} falharam.` : '.'}`,
        })
        onSuccess()
        onClose()
        setSelectedFiles([])
      } else {
        throw new Error('Nenhum comprovante pôde ser enviado')
      }

    } catch (error) {
      console.error('Erro ao enviar comprovantes:', error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao enviar comprovantes. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
    }
  }

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
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
            <Upload className="w-5 h-5 text-blue-600" />
            Enviar Comprovante
          </DialogTitle>
          <DialogDescription>
            Envie um ou mais comprovantes para este investimento. Os comprovantes serão analisados antes da aprovação.
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
                Arraste os comprovantes aqui ou clique para selecionar
              </p>
              <p className="text-xs text-gray-500">
                JPG, PNG, WEBP ou PDF (máximo 10MB cada)
              </p>
              <p className="text-xs text-gray-400 mt-1">
                💡 Você pode selecionar múltiplos arquivos de uma vez
              </p>
              <Input
                id="receipt"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,.pdf"
                multiple
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
                Selecionar Arquivo(s)
              </Button>
            </div>

            {/* Lista de arquivos selecionados */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2 mt-4">
                <p className="text-sm font-medium">Arquivos selecionados ({selectedFiles.length}):</p>
                {selectedFiles.map((file, index) => (
                  <div key={index} className="border rounded-lg p-3 bg-green-50 border-green-200">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-green-600" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-green-800">{file.name}</p>
                        <p className="text-xs text-green-600">{formatFileSize(file.size)}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remover
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isUploading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleUpload} 
            disabled={selectedFiles.length === 0 || isUploading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isUploading ? "Enviando..." : `Enviar ${selectedFiles.length > 1 ? `${selectedFiles.length} Comprovantes` : 'Comprovante'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
