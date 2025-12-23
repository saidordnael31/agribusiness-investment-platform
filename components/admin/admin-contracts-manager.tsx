"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/hooks/use-toast"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  FileText,
  Search,
  RefreshCw,
  Download,
  Eye,
  Trash2,
  Loader2,
  User,
  Calendar,
  FilePlus2,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  investor_id: string
  investor_profile?: {
    full_name: string
    email: string
  } | null
  uploaded_by_profile?: {
    full_name: string
    email: string
  } | null
}

interface InvestorOption {
  id: string
  full_name: string
  email: string
}

const formatFileSize = (bytes: number) => {
  if (!bytes) return "0 Bytes"
  const k = 1024
  const sizes = ["Bytes", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`
}

const formatDateTime = (dateString: string) => {
  if (!dateString) return "N/A"
  return new Date(dateString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function AdminContractsManager() {
  const { toast } = useToast()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [viewingContract, setViewingContract] = useState<Contract | null>(null)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [investorOptions, setInvestorOptions] = useState<InvestorOption[]>([])
  const [loadingInvestors, setLoadingInvestors] = useState(false)
  const [selectedInvestorId, setSelectedInvestorId] = useState("")
  const [investorSearchTerm, setInvestorSearchTerm] = useState("")
  const investorSearchInputRef = useRef<HTMLInputElement | null>(null)
  const [contractName, setContractName] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const fetchContracts = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch("/api/contracts/admin-all")
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Erro ao carregar contratos")
      }

      setContracts(result.data || [])
    } catch (err: any) {
      console.error("Erro ao carregar contratos (admin):", err)
      setError(err.message || "Não foi possível carregar os contratos.")
      toast({
        title: "Erro ao carregar contratos",
        description: err.message || "Não foi possível carregar os contratos.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchContracts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchInvestorsWithoutContract = async () => {
    try {
      setLoadingInvestors(true)
      setUploadError(null)

      const response = await fetch("/api/contracts/admin-candidates")
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Erro ao buscar usuários sem contrato")
      }

      setInvestorOptions(result.data || [])
      if (result.data && result.data.length > 0) {
        setSelectedInvestorId(result.data[0].id)
      } else {
        setSelectedInvestorId("")
      }
      setInvestorSearchTerm("")
    } catch (err: any) {
      console.error("Erro ao carregar usuários sem contrato:", err)
      setUploadError(err.message || "Não foi possível carregar os usuários sem contrato.")
      toast({
        title: "Erro ao carregar usuários",
        description: err.message || "Não foi possível carregar os usuários sem contrato.",
        variant: "destructive",
      })
    } finally {
      setLoadingInvestors(false)
    }
  }

  const openUploadModal = () => {
    setUploadModalOpen(true)
    void fetchInvestorsWithoutContract()
  }

  const closeUploadModal = () => {
    setUploadModalOpen(false)
    setSelectedInvestorId("")
    setContractName("")
    setFile(null)
    setUploadError(null)
    setInvestorSearchTerm("")
  }

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!selectedInvestorId) {
      setUploadError("Selecione um usuário para vincular o contrato.")
      return
    }

    if (!file) {
      setUploadError("Selecione um arquivo de contrato.")
      return
    }

    try {
      setUploading(true)
      setUploadError(null)

      const formData = new FormData()
      formData.append("investorId", selectedInvestorId)
      formData.append("contractName", contractName || file.name)
      formData.append("file", file)

      const response = await fetch("/api/contracts/upload", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Erro ao enviar contrato")
      }

      toast({
        title: "Contrato enviado com sucesso!",
        description: "O contrato foi vinculado ao usuário selecionado.",
      })

      closeUploadModal()
      await fetchContracts()
    } catch (err: any) {
      console.error("Erro ao enviar contrato:", err)
      setUploadError(err.message || "Não foi possível enviar o contrato.")
      toast({
        title: "Erro ao enviar contrato",
        description: err.message || "Não foi possível enviar o contrato.",
        variant: "destructive",
      })
    } finally {
      setUploading(false)
    }
  }

  const handleDownload = async (contract: Contract) => {
    try {
      const response = await fetch(`/api/contracts/download?contractId=${contract.id}`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || "Erro ao baixar contrato")
      }

      const link = document.createElement("a")
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

  const handleDelete = async (contractId: string) => {
    try {
      setDeletingId(contractId)
      const response = await fetch(`/api/contracts?contractId=${contractId}`, {
        method: "DELETE",
      })
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Erro ao deletar contrato")
      }

      toast({
        title: "Contrato deletado",
        description: "O contrato foi removido com sucesso.",
      })

      await fetchContracts()
    } catch (error: any) {
      console.error("Delete contract error:", error)
      toast({
        title: "Erro ao deletar contrato",
        description: error.message || "Erro desconhecido",
        variant: "destructive",
      })
    } finally {
      setDeletingId(null)
    }
  }

  const filteredContracts = useMemo(() => {
    if (!searchTerm.trim()) return contracts
    const term = searchTerm.toLowerCase()

    return contracts.filter((contract) => {
      const investorName = contract.investor_profile?.full_name?.toLowerCase() || ""
      const investorEmail = contract.investor_profile?.email?.toLowerCase() || ""
      const uploadedBy = contract.uploaded_by_profile?.full_name?.toLowerCase() || ""
      const uploadedEmail = contract.uploaded_by_profile?.email?.toLowerCase() || ""

      return (
        investorName.includes(term) ||
        investorEmail.includes(term) ||
        uploadedBy.includes(term) ||
        uploadedEmail.includes(term) ||
        contract.contract_name.toLowerCase().includes(term) ||
        contract.file_name.toLowerCase().includes(term) ||
        (contract.status || "").toLowerCase().includes(term)
      )
    })
  }, [contracts, searchTerm])

  const filteredInvestorOptions = useMemo(() => {
    if (!investorSearchTerm.trim()) return investorOptions
    const term = investorSearchTerm.toLowerCase()

    return investorOptions.filter((inv) => {
      const name = (inv.full_name || "").toLowerCase()
      const email = (inv.email || "").toLowerCase()
      return name.includes(term) || email.includes(term)
    })
  }, [investorOptions, investorSearchTerm])

  // Garantir que sempre haja um usuário selecionado dentro do filtro atual
  useEffect(() => {
    if (!filteredInvestorOptions.length) {
      return
    }

    const stillSelected = filteredInvestorOptions.some(
      (inv) => inv.id === selectedInvestorId,
    )

    if (!stillSelected) {
      setSelectedInvestorId(filteredInvestorOptions[0].id)
    }
  }, [filteredInvestorOptions, selectedInvestorId])

  const totalContracts = contracts.length

  return (
    <>
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle>Contratos</CardTitle>
                <CardDescription>
                  Visualize todos os contratos cadastrados na plataforma.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {totalContracts} {totalContracts === 1 ? "contrato" : "contratos"}
                </Badge>
                <Button
                  size="sm"
                  className="flex items-center gap-2"
                  onClick={openUploadModal}
                >
                  <FilePlus2 className="h-4 w-4" />
                  Adicionar contrato
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void fetchContracts()}
                  disabled={loading}
                  className="flex items-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Carregando...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4" />
                      Atualizar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por investidor, email, contrato ou status..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {error && (
              <p className="mb-4 text-sm text-destructive">{error}</p>
            )}

            {loading ? (
              <div className="py-10 text-center">
                <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin" />
                <p className="text-muted-foreground">Carregando contratos...</p>
              </div>
            ) : totalContracts === 0 ? (
              <div className="py-12 text-center">
                <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Nenhum contrato cadastrado até o momento.
                </p>
              </div>
            ) : filteredContracts.length === 0 ? (
              <div className="py-12 text-center">
                <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Nenhum contrato corresponde à busca atual.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Investidor</TableHead>
                      <TableHead>Contrato</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Uploader</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredContracts.map((contract) => {
                      const statusLabel =
                        contract.status === "active"
                          ? "Ativo"
                          : contract.status === "pending"
                          ? "Pendente"
                          : contract.status ?? "Desconhecido"

                      let statusVariant: "default" | "secondary" | "outline" = "outline"
                      if (contract.status === "active") statusVariant = "default"
                      else if (contract.status === "pending") statusVariant = "secondary"

                      return (
                        <TableRow key={contract.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {contract.investor_profile?.full_name || "Investidor desconhecido"}
                              </span>
                              {contract.investor_profile?.email && (
                                <span className="text-xs text-muted-foreground">
                                  {contract.investor_profile.email}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <p className="font-medium">{contract.contract_name}</p>
                            <p className="text-xs text-muted-foreground">
                              {contract.file_name} • {formatFileSize(contract.file_size)}
                            </p>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {formatDateTime(contract.created_at)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                <User className="h-3 w-3" />
                                {contract.uploaded_by_profile?.full_name ||
                                  contract.uploaded_by_profile?.email ||
                                  "N/A"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setViewingContract(contract)}
                                title="Visualizar contrato"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void handleDownload(contract)}
                                title="Baixar contrato"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={deletingId === contract.id}
                                    title="Deletar contrato"
                                  >
                                    {deletingId === contract.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Tem certeza que deseja deletar o contrato "
                                      {contract.contract_name}"? Esta ação não pode ser desfeita.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => void handleDelete(contract.id)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Deletar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de upload de contrato */}
      <Dialog open={uploadModalOpen} onOpenChange={(open) => (open ? openUploadModal() : closeUploadModal())}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar contrato</DialogTitle>
            <DialogDescription>
              Selecione um usuário sem contrato e envie o arquivo para vinculá-lo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="investor">Usuários sem contrato</Label>
              {loadingInvestors ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando usuários...
                </div>
              ) : investorOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Não há usuários sem contrato ativo no momento.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedInvestorId && (
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Selecionado:</span>{" "}
                      {filteredInvestorOptions.find((inv) => inv.id === selectedInvestorId)
                        ?.full_name ||
                        investorOptions.find((inv) => inv.id === selectedInvestorId)
                          ?.full_name ||
                        "Sem nome"}
                      {" — "}
                      {filteredInvestorOptions.find((inv) => inv.id === selectedInvestorId)
                        ?.email ||
                        investorOptions.find((inv) => inv.id === selectedInvestorId)?.email}
                    </p>
                  )}

                  <Select
                    value={selectedInvestorId}
                    onValueChange={(value) => setSelectedInvestorId(value)}
                  >
                    <SelectTrigger id="investor" className="w-full text-sm">
                      <SelectValue placeholder="Selecione um usuário" />
                    </SelectTrigger>
                    <SelectContent>
                      <div className="sticky top-0 z-10 p-2 border-b bg-popover">
                        <Input
                          placeholder="Buscar por nome ou email..."
                          value={investorSearchTerm}
                          onChange={(event) => setInvestorSearchTerm(event.target.value)}
                          onKeyDown={(event) => {
                            // Impede que o Select capture as teclas e roube o foco
                            event.stopPropagation()
                          }}
                          ref={investorSearchInputRef}
                          autoComplete="off"
                          className="h-8 text-xs"
                        />
                      </div>
                      {filteredInvestorOptions.length === 0 ? (
                        <div className="px-3 py-2 text-xs text-muted-foreground">
                          Nenhum usuário encontrado para essa busca.
                        </div>
                      ) : (
                        filteredInvestorOptions.map((inv) => (
                          <SelectItem key={inv.id} value={inv.id}>
                            {inv.full_name || "Sem nome"} — {inv.email}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contractName">Nome do contrato</Label>
              <Input
                id="contractName"
                value={contractName}
                onChange={(event) => setContractName(event.target.value)}
                placeholder="Ex: Contrato de Sociedade em Conta de Participação"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="file">Arquivo do contrato</Label>
              <Input
                id="file"
                type="file"
                accept="application/pdf,image/jpeg,image/png"
                onChange={(event) => {
                  const selected = event.target.files?.[0] || null
                  setFile(selected)
                }}
              />
              <p className="text-xs text-muted-foreground">
                Formatos permitidos: PDF, JPEG, PNG. Tamanho máximo: 10MB.
              </p>
            </div>

            {uploadError && (
              <p className="text-sm text-destructive">{uploadError}</p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={closeUploadModal}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={uploading || loadingInvestors || investorOptions.length === 0}>
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar contrato"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de visualização de PDF usando Portal */}
      {viewingContract &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 9999,
              backgroundColor: "rgba(0, 0, 0, 0.5)",
              pointerEvents: "auto",
            }}
          >
            <div
              className="w-full max-w-7xl max-h-[90vh] flex items-center justify-center"
              style={{ pointerEvents: "auto" }}
            >
              <PDFViewer
                contractId={viewingContract.id}
                fileName={viewingContract.file_name}
                fileType={viewingContract.file_type}
                onClose={() => setViewingContract(null)}
              />
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}


