"use client"

import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { FileText, Download, Trash2, Calendar, User, Loader2, Eye } from "lucide-react"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { PDFViewer } from "@/components/contracts/pdf-viewer"

interface Contract {
  id: string
  contract_name: string
  file_name: string
  file_url: string
  file_size: number
  file_type: string
  status: string
  created_at: string
  uploaded_by_profile: {
    full_name: string
    email: string
  }
}

interface ContractListProps {
  investorId: string
  investorName: string
  onContractDeleted?: () => void
}

export function ContractList({ investorId, investorName, onContractDeleted }: ContractListProps) {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [viewingContract, setViewingContract] = useState<Contract | null>(null)
  const { toast } = useToast()

  const fetchContracts = async () => {
    try {
      setLoading(true)
      console.log('🔍 [ContractList] Buscando contratos para investorId:', investorId)
      const response = await fetch(`/api/contracts?investorId=${investorId}`)
      const result = await response.json()

      console.log('🔍 [ContractList] Resposta da API:', { success: result.success, dataLength: result.data?.length, error: result.error })

      if (result.success) {
        console.log('✅ [ContractList] Contratos encontrados:', result.data?.length || 0)
        setContracts(result.data || [])
      } else {
        console.error('❌ [ContractList] Erro na resposta:', result.error)
        throw new Error(result.error || "Erro ao buscar contratos")
      }
    } catch (error) {
      console.error("❌ [ContractList] Fetch contracts error:", error)
      toast({
        title: "Erro ao carregar contratos",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContracts()
  }, [investorId])

  const handleDelete = async (contractId: string) => {
    try {
      setDeletingId(contractId)
      const response = await fetch(`/api/contracts?contractId=${contractId}`, {
        method: 'DELETE'
      })
      const result = await response.json()

      if (result.success) {
        toast({
          title: "Contrato deletado",
          description: "O contrato foi removido com sucesso."
        })
        fetchContracts() // Recarregar lista
        onContractDeleted?.()
      } else {
        throw new Error(result.error || "Erro ao deletar contrato")
      }
    } catch (error) {
      console.error("Delete contract error:", error)
      toast({
        title: "Erro ao deletar contrato",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive"
      })
    } finally {
      setDeletingId(null)
    }
  }

  const handleDownload = async (contract: Contract) => {
    try {
      const response = await fetch(`/api/contracts/download?contractId=${contract.id}`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Erro ao baixar contrato")
      }

      // Criar link de download
      const link = document.createElement('a')
      link.href = data.data.downloadUrl
      link.download = contract.file_name
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

  const handleView = (contract: Contract) => {
    setViewingContract(contract)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getFileTypeIcon = (fileType: string) => {
    if (fileType === 'application/pdf') {
      return <FileText className="h-5 w-5 text-red-400" />
    }
    return <FileText className="h-5 w-5 text-blue-400" />
  }

  if (loading) {
    return (
      <Card className="bg-gradient-to-br from-[#01223F]/80 to-[#003562]/80 border-[#01223F] text-white">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin mr-2 text-white" />
          <span className="text-white">Carregando contratos...</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
    <Card className="bg-gradient-to-br from-[#01223F]/80 to-[#003562]/80 border-[#01223F] text-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <FileText className="h-5 w-5" />
          Contratos de {investorName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {contracts.length === 0 ? (
          <div className="text-center py-8 text-white/70">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50 text-white/50" />
            <p className="text-white/70">Nenhum contrato encontrado</p>
            <p className="text-sm text-white/50">Faça upload do primeiro contrato usando o formulário acima</p>
          </div>
        ) : (
          <div className="space-y-4">
            {contracts.map((contract) => (
              <div
                key={contract.id}
                className="flex items-center justify-between p-4 border border-white/10 rounded-lg hover:bg-white/5 transition-colors bg-white/5"
              >
                <div className="flex items-center gap-3 flex-1">
                  {getFileTypeIcon(contract.file_type)}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-white">{contract.contract_name}</p>
                    <div className="flex items-center gap-4 text-sm text-white/70">
                      <span>{contract.file_name}</span>
                      <span>•</span>
                      <span>{formatFileSize(contract.file_size)}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(contract.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-white/50 mt-1">
                      <User className="h-3 w-3" />
                      Enviado por {contract.uploaded_by_profile.full_name || contract.uploaded_by_profile.email}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={contract.status === 'active' ? 'default' : 'secondary'}
                    className={contract.status === 'active' 
                      ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                      : 'bg-white/10 text-white/70 border-white/20'
                    }
                  >
                    {contract.status === 'active' ? 'Ativo' : contract.status}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleView(contract)}
                    title="Visualizar"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDownload(contract)}
                    title="Baixar"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={deletingId === contract.id}
                        className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                      >
                        {deletingId === contract.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-gradient-to-br from-[#01223F] to-[#003562] border-[#01223F] text-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Confirmar exclusão</AlertDialogTitle>
                        <AlertDialogDescription className="text-white/70">
                          Tem certeza que deseja deletar o contrato "{contract.contract_name}"? 
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="bg-white/10 border-white/20 text-white hover:bg-white/20">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(contract.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Deletar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
    
    {/* Modal de visualização de PDF usando Portal */}
    {viewingContract && createPortal(
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
        style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0,
          zIndex: 9999,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          pointerEvents: 'auto'
        }}
      >
        <div 
          className="w-full max-w-7xl max-h-[90vh] flex items-center justify-center"
          style={{ pointerEvents: 'auto' }}
        >
          <PDFViewer
            contractId={viewingContract.id}
            fileName={viewingContract.file_name}
            fileType={viewingContract.file_type}
            onClose={() => setViewingContract(null)}
          />
        </div>
      </div>,
      document.body
    )}
  </>
  )
}
