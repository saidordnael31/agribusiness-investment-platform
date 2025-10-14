'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Upload, 
  FileImage, 
  FileText, 
  X, 
  CheckCircle, 
  AlertCircle,
  Eye,
  Download,
  Loader2
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface PixReceiptUploadProps {
  transactionId?: string
  onUploadSuccess?: (receipts: any[]) => void
  onUploadError?: (error: string) => void
  className?: string
}

interface UploadedFile {
  id: string
  file_name: string
  file_size: number
  file_type: string
  status: string
  created_at: string
  signed_url?: string
}

export function PixReceiptUpload({ 
  transactionId, 
  onUploadSuccess, 
  onUploadError,
  className 
}: PixReceiptUploadProps) {
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [isUploadingMultiple, setIsUploadingMultiple] = useState(false)

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return

    if (files.length === 1) {
      uploadFile(files[0])
    } else {
      uploadMultipleFiles(Array.from(files))
    }
  }

  const uploadFile = async (file: File) => {
    // Validar tipo de arquivo
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'application/pdf'
    ]

    if (!allowedTypes.includes(file.type)) {
      const error = "Tipo de arquivo não permitido. Use JPG, PNG, WEBP ou PDF"
      toast({
        title: "Erro no upload",
        description: error,
        variant: "destructive"
      })
      onUploadError?.(error)
      return
    }

    // Validar tamanho (máximo 10MB)
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      const error = "Arquivo muito grande. Máximo 10MB"
      toast({
        title: "Erro no upload",
        description: error,
        variant: "destructive"
      })
      onUploadError?.(error)
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (transactionId) {
        formData.append('transactionId', transactionId)
      }

      // Simular progresso de upload
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return prev
          }
          return prev + 10
        })
      }, 200)

      const response = await fetch('/api/pix-receipts', {
        method: 'POST',
        body: formData,
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const result = await response.json()

      if (result.success) {
        const newFile: UploadedFile = {
          id: result.data.id,
          file_name: result.data.file_name,
          file_size: result.data.file_size,
          file_type: result.data.file_type,
          status: result.data.status,
          created_at: result.data.created_at
        }

        setUploadedFiles(prev => [newFile, ...prev])
        
        toast({
          title: "Upload realizado",
          description: "Comprovante enviado com sucesso!",
        })

        onUploadSuccess?.([result.data])
      } else {
        throw new Error(result.error || 'Erro no upload')
      }
    } catch (error) {
      console.error('Upload error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro inesperado'
      
      toast({
        title: "Erro no upload",
        description: errorMessage,
        variant: "destructive"
      })
      
      onUploadError?.(errorMessage)
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const uploadMultipleFiles = async (files: File[]) => {
    setIsUploadingMultiple(true)
    setUploadProgress(0)

    try {
      const totalFiles = files.length
      let completedFiles = 0
      const successfulUploads: UploadedFile[] = []
      const errors: string[] = []

      for (const file of files) {
        try {
          // Validar tipo de arquivo
          const allowedTypes = [
            'image/jpeg',
            'image/jpg',
            'image/png',
            'image/webp',
            'application/pdf'
          ]

          if (!allowedTypes.includes(file.type)) {
            errors.push(`${file.name}: Tipo de arquivo não permitido`)
            completedFiles++
            setUploadProgress((completedFiles / totalFiles) * 100)
            continue
          }

          // Validar tamanho (máximo 10MB)
          const maxSize = 10 * 1024 * 1024
          if (file.size > maxSize) {
            errors.push(`${file.name}: Arquivo muito grande (máximo 10MB)`)
            completedFiles++
            setUploadProgress((completedFiles / totalFiles) * 100)
            continue
          }

          const formData = new FormData()
          formData.append('file', file)
          if (transactionId) {
            formData.append('transactionId', transactionId)
          }

          const response = await fetch('/api/pix-receipts', {
            method: 'POST',
            body: formData,
          })

          const result = await response.json()

          if (result.success) {
            const newFile: UploadedFile = {
              id: result.data.id,
              file_name: result.data.file_name,
              file_size: result.data.file_size,
              file_type: result.data.file_type,
              status: result.data.status,
              created_at: result.data.created_at
            }
            successfulUploads.push(newFile)
          } else {
            errors.push(`${file.name}: ${result.error || 'Erro no upload'}`)
          }
        } catch (error) {
          errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Erro inesperado'}`)
        }

        completedFiles++
        setUploadProgress((completedFiles / totalFiles) * 100)
      }

      // Atualizar lista de arquivos enviados
      setUploadedFiles(prev => [...successfulUploads, ...prev])

      // Mostrar resultados
      if (successfulUploads.length > 0) {
        toast({
          title: "Upload concluído!",
          description: `${successfulUploads.length} arquivo(s) enviado(s) com sucesso.`,
        })
        onUploadSuccess?.(successfulUploads)
      }

      if (errors.length > 0) {
        toast({
          title: "Alguns arquivos falharam",
          description: `${errors.length} arquivo(s) não puderam ser enviados.`,
          variant: "destructive"
        })
        onUploadError?.(errors.join(', '))
      }

    } catch (error) {
      console.error('Erro no upload múltiplo:', error)
      const errorMessage = error instanceof Error ? error.message : 'Erro inesperado'
      toast({
        title: "Erro no upload",
        description: errorMessage,
        variant: "destructive"
      })
      onUploadError?.(errorMessage)
    } finally {
      setIsUploadingMultiple(false)
      setUploadProgress(0)
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
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (fileType: string) => {
    if (fileType && fileType.startsWith('image/')) {
      return <FileImage className="w-4 h-4" />
    }
    return <FileText className="w-4 h-4" />
  }


  const viewFile = async (fileId: string) => {
    try {
      const response = await fetch(`/api/pix-receipts/view?receiptId=${fileId}`)
      const result = await response.json()

      if (result.success && result.data.signed_url) {
        window.open(result.data.signed_url, '_blank')
      } else {
        throw new Error(result.error || 'Erro ao abrir arquivo')
      }
    } catch (error) {
      console.error('View file error:', error)
      toast({
        title: "Erro",
        description: "Não foi possível abrir o arquivo",
        variant: "destructive"
      })
    }
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload de Comprovante PIX
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Área de Upload */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-primary bg-primary/5' 
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp,.pdf"
              multiple
              onChange={(e) => handleFileSelect(e.target.files)}
              className="hidden"
            />

            {(isUploading || isUploadingMultiple) ? (
              <div className="space-y-4">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                <div className="space-y-2">
                  <p className="text-sm font-medium">
                    {isUploadingMultiple ? 'Enviando arquivos...' : 'Enviando arquivo...'}
                  </p>
                  <Progress value={uploadProgress} className="w-full" />
                  <p className="text-xs text-muted-foreground">{Math.round(uploadProgress)}%</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Upload className="w-12 h-12 mx-auto text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium">
                    Arraste os comprovantes aqui ou clique para selecionar
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Formatos aceitos: JPG, PNG, WEBP, PDF (máximo 10MB cada)
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    💡 Você pode selecionar múltiplos arquivos de uma vez
                  </p>
                </div>
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading || isUploadingMultiple}
                >
                  Selecionar Arquivo(s)
                </Button>
              </div>
            )}
          </div>

          {/* Lista de Arquivos Enviados */}
          {uploadedFiles.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Arquivos Enviados</h4>
              {uploadedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {getFileIcon(file.file_type)}
                    <div>
                      <p className="font-medium text-sm">{file.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.file_size)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => viewFile(file.id)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Ver
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

        </CardContent>
      </Card>
    </div>
  )
}
