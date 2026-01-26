"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Eye, Download, X, FileImage, FileText, Loader2, ExternalLink } from "lucide-react"

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
  const [fileUrl, setFileUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pdfLoadError, setPdfLoadError] = useState(false)
  const [pdfLoadingTimeout, setPdfLoadingTimeout] = useState<NodeJS.Timeout | null>(null)
  const [useGoogleViewer, setUseGoogleViewer] = useState(false)

  // Detectar tipo de arquivo pelo nome ou file_type
  // IMPORTANTE: Verificar PDF primeiro para evitar conflitos
  const isPDF = () => {
    // Verificar file_type primeiro
    if (receipt.file_type === 'application/pdf') return true
    // Verificar extensão do arquivo
    const fileName = receipt.file_name.toLowerCase()
    if (fileName.endsWith('.pdf')) return true
    return false
  }

  const isImage = () => {
    // Se for PDF, não é imagem
    if (isPDF()) return false
    // Verificar file_type
    if (receipt.file_type?.startsWith('image/')) return true
    // Verificar extensão
    const ext = receipt.file_name.toLowerCase().split('.').pop()
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext || '')
  }

  // Carregar automaticamente quando o modal abrir
  useEffect(() => {
    if (isOpen && receipt.id) {
      const loadReceipt = async () => {
        setIsLoading(true)
        setError(null)
        try {
          const response = await fetch(`/api/pix-receipts/view?receiptId=${receipt.id}`)
          const result = await response.json()

          if (result.success && result.data.signed_url) {
            setFileUrl(result.data.signed_url)
            setPdfLoadError(false)
            // Se for PDF, dar um timeout para detectar se não carregou
            if (isPDF()) {
              const timeout = setTimeout(() => {
                // Verificar se o iframe do PDF carregou
                const pdfIframe = document.querySelector('iframe[title="' + receipt.file_name + '"]') as HTMLIFrameElement
                if (pdfIframe) {
                  try {
                    // Tentar acessar o conteúdo do iframe (pode falhar por CORS)
                    const iframeDoc = pdfIframe.contentDocument || pdfIframe.contentWindow?.document
                    if (!iframeDoc || iframeDoc.body?.innerText?.includes('error') || pdfIframe.offsetHeight === 0) {
                      setPdfLoadError(true)
                    }
                  } catch (e) {
                    // Se der erro de CORS, assumir que pode estar carregando ou bloqueado
                    // Não definir erro automaticamente
                  }
                }
              }, 5000) // 5 segundos
              setPdfLoadingTimeout(timeout)
            }
          } else {
            throw new Error(result.error || 'Erro ao carregar comprovante')
          }
        } catch (error) {
          console.error('Erro ao visualizar comprovante:', error)
          const errorMessage = error instanceof Error ? error.message : 'Não foi possível carregar o comprovante'
          setError(errorMessage)
          toast({
            title: "Erro",
            description: errorMessage,
            variant: "destructive"
          })
        } finally {
          setIsLoading(false)
        }
      }
      loadReceipt()
    } else {
      // Limpar quando fechar
      if (pdfLoadingTimeout) {
        clearTimeout(pdfLoadingTimeout)
        setPdfLoadingTimeout(null)
      }
      setFileUrl(null)
      setError(null)
      setPdfLoadError(false)
      setUseGoogleViewer(false)
    }
    
    return () => {
      if (pdfLoadingTimeout) {
        clearTimeout(pdfLoadingTimeout)
      }
    }
  }, [isOpen, receipt.id, toast])

  const handleViewReceipt = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/pix-receipts/view?receiptId=${receipt.id}`)
      const result = await response.json()

      if (result.success && result.data.signed_url) {
        setFileUrl(result.data.signed_url)
      } else {
        throw new Error(result.error || 'Erro ao carregar comprovante')
      }
    } catch (error) {
      console.error('Erro ao visualizar comprovante:', error)
      const errorMessage = error instanceof Error ? error.message : 'Não foi possível carregar o comprovante'
      setError(errorMessage)
      toast({
        title: "Erro",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenInNewTab = () => {
    if (fileUrl) {
      window.open(fileUrl, '_blank')
    }
  }

  const handleDownload = async () => {
    if (!fileUrl) {
      await handleViewReceipt()
      return
    }
    
    try {
      const link = document.createElement('a')
      link.href = fileUrl
      link.download = receipt.file_name
      link.target = '_blank'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error)
      toast({
        title: "Erro",
        description: "Não foi possível baixar o arquivo",
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-400 bg-green-500/20 border border-green-500/30'
      case 'pending':
        return 'text-yellow-400 bg-yellow-500/20 border border-yellow-500/30'
      case 'rejected':
        return 'text-red-400 bg-red-500/20 border border-red-500/30'
      default:
        return 'text-white/70 bg-white/5 border border-white/10'
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
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-gradient-to-br from-[#01223F] to-[#003562] border-[#01223F] text-white">
        <DialogHeader className="border-b border-white/10 pb-4">
          <DialogTitle className="flex items-center gap-2 text-white">
            {isImage() ? (
              <FileImage className="w-5 h-5" />
            ) : (
              <FileText className="w-5 h-5" />
            )}
            {receipt.file_name}
          </DialogTitle>
          <DialogDescription className="text-white/70">
            Comprovante PIX - {formatFileSize(receipt.file_size)} - {formatDate(receipt.created_at)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do arquivo */}
          <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
            <div className="flex items-center gap-3">
              {isImage() ? (
                <FileImage className="w-8 h-8 text-blue-400" />
              ) : (
                <FileText className="w-8 h-8 text-red-400" />
              )}
              <div>
                <p className="font-medium text-white">{receipt.file_name}</p>
                <p className="text-sm text-white/70">
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
              className="flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
              {isLoading ? 'Carregando...' : 'Recarregar'}
            </Button>
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={!fileUrl}
              className="flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              <Download className="w-4 h-4" />
              Baixar
            </Button>
            {fileUrl && (
              <Button
                variant="outline"
                onClick={handleOpenInNewTab}
                className="flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir em nova aba
              </Button>
            )}
          </div>

          {/* Mensagem de erro */}
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Visualização do arquivo */}
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-white" />
                <p className="text-white/70">Carregando comprovante...</p>
              </div>
            </div>
          )}

          {/* Verificar PDF primeiro para evitar conflitos */}
          {fileUrl && !isLoading && isPDF() && !pdfLoadError && (
            <div className="border border-white/10 rounded-lg overflow-hidden bg-white/5 relative">
              {useGoogleViewer ? (
                // Usar Google Docs Viewer como fallback
                <iframe
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(fileUrl)}&embedded=true`}
                  className="w-full h-[70vh] min-h-[500px]"
                  title={receipt.file_name}
                  allow="fullscreen"
                />
              ) : (
                // Tentar iframe direto primeiro
                <iframe
                  src={`${fileUrl}#toolbar=0`}
                  className="w-full h-[70vh] min-h-[500px]"
                  title={receipt.file_name}
                  allow="fullscreen"
                  onLoad={(e) => {
                    // Limpar timeout se carregou com sucesso
                    if (pdfLoadingTimeout) {
                      clearTimeout(pdfLoadingTimeout)
                      setPdfLoadingTimeout(null)
                    }
                    // Verificar se realmente carregou (alguns navegadores disparam onLoad mesmo com erro)
                    const iframe = e.currentTarget
                    setTimeout(() => {
                      try {
                        // Tentar verificar se o conteúdo carregou
                        const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
                        if (iframeDoc && iframeDoc.body) {
                          // Se chegou aqui, provavelmente carregou
                          setPdfLoadError(false)
                        }
                      } catch (err) {
                        // Erro de CORS é normal, não significa que não carregou
                      }
                    }, 1000)
                  }}
                  onError={() => {
                    setPdfLoadError(true)
                    // Tentar Google Viewer como fallback automático
                    // setUseGoogleViewer(true)
                  }}
                />
              )}
            </div>
          )}

          {fileUrl && !isLoading && isPDF() && pdfLoadError && (
            <div className="border border-white/10 rounded-lg overflow-hidden bg-white/5">
              <div className="flex flex-col items-center justify-center p-8 h-[70vh] min-h-[500px]">
                <FileText className="w-16 h-16 mb-4 text-white/30" />
                <p className="text-white/70 mb-2 text-center font-medium">
                  Não foi possível exibir o PDF diretamente no navegador.
                </p>
                <p className="text-sm text-white/50 mb-6 text-center">
                  Isso pode acontecer devido a configurações de segurança do navegador.
                </p>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleOpenInNewTab} 
                    className="flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Abrir em nova aba
                  </Button>
                  <Button 
                    onClick={handleDownload} 
                    variant="outline" 
                    className="flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <Download className="w-4 h-4" />
                    Baixar PDF
                  </Button>
                  {fileUrl && (
                    <Button 
                      onClick={() => setUseGoogleViewer(true)} 
                      variant="outline" 
                      className="flex items-center gap-2 bg-white/10 border-white/20 text-white hover:bg-white/20"
                    >
                      <Eye className="w-4 h-4" />
                      Tentar com Google Viewer
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {fileUrl && !isLoading && isImage() && (
            <div className="border border-white/10 rounded-lg overflow-hidden bg-white/5">
              <img
                src={fileUrl}
                alt={receipt.file_name}
                className="w-full h-auto max-h-[70vh] object-contain mx-auto"
                onError={() => {
                  setError("Não foi possível carregar a imagem")
                  setFileUrl(null)
                  toast({
                    title: "Erro",
                    description: "Não foi possível carregar a imagem",
                    variant: "destructive"
                  })
                }}
              />
            </div>
          )}

          {fileUrl && !isLoading && !isImage() && !isPDF() && (
            <div className="border border-white/10 rounded-lg overflow-hidden bg-white/5 p-8">
              <div className="text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-white/30" />
                <p className="text-white/70 mb-4">
                  Tipo de arquivo não suportado para visualização inline
                </p>
                <Button 
                  onClick={handleOpenInNewTab} 
                  variant="outline"
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir em nova aba
                </Button>
              </div>
            </div>
          )}

          {/* Mensagem quando não há arquivo carregado */}
          {!fileUrl && !isLoading && !error && (
            <div className="text-center py-8 text-white/70">
              <Eye className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Clique em "Recarregar" para carregar o comprovante</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
