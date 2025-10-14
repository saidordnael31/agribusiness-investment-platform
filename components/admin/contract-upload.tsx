"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { Upload, FileText, X, Loader2, Eye, Download, Trash2, Calendar, User } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface ContractUploadProps {
  investorId: string
  investorName: string
  onUploadSuccess?: () => void
  existingContract?: {
    id: string
    contract_name: string
    file_name: string
    file_type: string
    file_size: number
    created_at: string
  } | null
}

export function ContractUpload({ investorId, investorName, onUploadSuccess, existingContract }: ContractUploadProps) {
  const [contractName, setContractName] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isReplacing, setIsReplacing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleStartReplacement = () => {
    setIsReplacing(true)
    setContractName(existingContract?.contract_name || "")
  }

  const handleCancelReplacement = () => {
    setIsReplacing(false)
    setContractName("")
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleDownload = async (contractId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/contracts/download?contractId=${contractId}`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Erro ao baixar contrato")
      }

      // Criar link de download
      const link = document.createElement('a')
      link.href = data.data.downloadUrl
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Download iniciado",
        description: "O arquivo está sendo baixado.",
      })
    } catch (error: any) {
      console.error("Download error:", error)
      toast({
        title: "Erro ao baixar contrato",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (contractId: string) => {
    if (!confirm("Tem certeza que deseja excluir este contrato?")) {
      return
    }

    try {
      const response = await fetch(`/api/contracts?contractId=${contractId}`, {
        method: 'DELETE'
      })
      const result = await response.json()

      if (result.success) {
        toast({
          title: "Contrato excluído",
          description: "O contrato foi removido com sucesso."
        })
        onUploadSuccess?.()
      } else {
        throw new Error(result.error || "Erro ao excluir contrato")
      }
    } catch (error: any) {
      console.error("Delete error:", error)
      toast({
        title: "Erro ao excluir contrato",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      })
    }
  }

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      // Validar tipo de arquivo
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Tipo de arquivo inválido",
          description: "Apenas arquivos PDF, JPEG e PNG são permitidos.",
          variant: "destructive"
        })
        return
      }

      // Validar tamanho (10MB máximo)
      const maxSize = 10 * 1024 * 1024
      if (file.size > maxSize) {
        toast({
          title: "Arquivo muito grande",
          description: "O arquivo deve ter no máximo 10MB.",
          variant: "destructive"
        })
        return
      }

      setSelectedFile(file)
      if (!contractName) {
        setContractName(file.name.split('.')[0])
      }
    }
  }

  const handleUpload = async () => {
    if (!selectedFile || !contractName.trim()) {
      toast({
        title: "Dados incompletos",
        description: "Por favor, selecione um arquivo e informe o nome do contrato.",
        variant: "destructive"
      })
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('investorId', investorId)
      formData.append('contractName', contractName.trim())
      
      // Se estiver substituindo, incluir o ID do contrato existente
      if (isReplacing && existingContract) {
        formData.append('replaceContractId', existingContract.id)
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

      const response = await fetch('/api/contracts/upload', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      const result = await response.json()

      if (result.success) {
        toast({
          title: "Contrato enviado com sucesso!",
          description: `O contrato "${contractName}" foi enviado para ${investorName}.`
        })
        
        // Limpar formulário
        setContractName("")
        setSelectedFile(null)
        setIsReplacing(false)
        if (fileInputRef.current) {
          fileInputRef.current.value = ""
        }
        
        // Callback para atualizar a lista
        onUploadSuccess?.()
      } else {
        throw new Error(result.error || "Erro ao enviar contrato")
      }
    } catch (error) {
      console.error("Upload error:", error)
      toast({
        title: "Erro ao enviar contrato",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      })
    } finally {
      setIsUploading(false)
      setUploadProgress(0)
    }
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Se já existe contrato e não está no modo de substituição, mostrar contrato com ações
  if (existingContract && !isReplacing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Contrato Atual
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/50">
            <div className="flex items-center gap-3 flex-1">
              <FileText className="h-8 w-8 text-red-500" />
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{existingContract.contract_name}</p>
                <p className="text-sm text-muted-foreground">
                  {existingContract.file_name} • {formatFileSize(existingContract.file_size)}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Enviado em {new Date(existingContract.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {/* TODO: Implementar visualização */}}
                title="Visualizar"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownload(existingContract.id, existingContract.file_name)}
                title="Baixar"
              >
                <Download className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDelete(existingContract.id)}
                title="Excluir"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <Button 
            onClick={handleStartReplacement}
            variant="outline"
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            Substituir Contrato
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          {isReplacing ? 'Substituir Contrato' : 'Upload de Contrato'}
        </CardTitle>
        {isReplacing && (
          <p className="text-sm text-muted-foreground">
            Substituindo: {existingContract?.contract_name}
          </p>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="contract-name">Nome do Contrato</Label>
          <Input
            id="contract-name"
            value={contractName}
            onChange={(e) => setContractName(e.target.value)}
            placeholder="Ex: Contrato de Investimento - 2024"
            disabled={isUploading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="file-upload">Arquivo do Contrato</Label>
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
            {selectedFile ? (
              <div className="space-y-2">
                <FileText className="h-8 w-8 mx-auto text-primary" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(selectedFile.size)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveFile}
                  disabled={isUploading}
                >
                  <X className="h-4 w-4 mr-2" />
                  Remover
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Arraste o arquivo aqui ou clique para selecionar
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  disabled={isUploading}
                />
                <label htmlFor="file-upload">
                  <Button variant="outline" asChild disabled={isUploading}>
                    <span>Selecionar Arquivo</span>
                  </Button>
                </label>
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Formatos aceitos: PDF, JPEG, PNG (máx. 10MB)
          </p>
        </div>

        {isUploading && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Enviando arquivo...</span>
              <span>{uploadProgress}%</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
          </div>
        )}

        <div className="flex gap-2">
          {isReplacing && (
            <Button
              onClick={handleCancelReplacement}
              variant="outline"
              disabled={isUploading}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
          )}
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || !contractName.trim() || isUploading}
            className={isReplacing ? "flex-1" : "w-full"}
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isReplacing ? 'Substituindo...' : 'Enviando...'}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {isReplacing ? 'Substituir Contrato' : 'Enviar Contrato'}
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
