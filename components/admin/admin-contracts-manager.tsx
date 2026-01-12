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
import { ReceiptViewer } from "@/components/admin/receipt-viewer"

interface Contract {
  id: string
  contract_name: string
  file_name: string
  file_url: string
  file_size: number
  file_type: string
  status: string
  created_at: string
   investment_id?: string | null
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

interface InvestorInvestmentOption {
  id: string
  amount: number
  status: string
  quota_type?: string | null
  payment_date?: string | null
  monthly_return_rate?: number | null
  commitment_period?: number | null
  liquidity?: string | null
  created_at?: string | null
}

interface InvestmentContractsGroup {
  investmentId: string | null
  contracts: Contract[]
}

interface InvestorContractsGroup {
  investorId: string
  investorName: string
  investorEmail: string
  totalContracts: number
  investments: InvestmentContractsGroup[]
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

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value ?? 0)
}

const getInvestmentStatusBadge = (status: string | undefined) => {
  const normalized = status || "unknown"
  switch (normalized) {
    case "active":
      return {
        label: "Ativo",
        className: "bg-emerald-100 text-emerald-800 border-emerald-200",
      }
    case "pending":
      return {
        label: "Pendente",
        className: "bg-amber-100 text-amber-800 border-amber-200",
      }
    case "withdrawn":
      return {
        label: "Resgatado",
        className: "bg-slate-100 text-slate-700 border-slate-200",
      }
    default:
      return {
        label: normalized,
        className: "bg-muted text-muted-foreground border-border",
      }
  }
}

const getContractStatusBadge = (status: string | undefined) => {
  const normalized = status || "unknown"
  switch (normalized) {
    case "active":
      return {
        label: "Ativo",
        className: "bg-emerald-100 text-emerald-800 border-emerald-200",
      }
    case "pending":
      return {
        label: "Pendente",
        className: "bg-amber-100 text-amber-800 border-amber-200",
      }
    case "archived":
      return {
        label: "Arquivado",
        className: "bg-slate-100 text-slate-800 border-slate-200",
      }
    default:
      return {
        label: normalized,
        className: "bg-muted text-muted-foreground border-border",
      }
  }
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
  const [investments, setInvestments] = useState<InvestorInvestmentOption[]>([])
  const [selectedInvestmentIdForUpload, setSelectedInvestmentIdForUpload] = useState("")
  const [loadingInvestments, setLoadingInvestments] = useState(false)
  const [investorSearchTerm, setInvestorSearchTerm] = useState("")
  const investorSearchInputRef = useRef<HTMLInputElement | null>(null)
  const [contractName, setContractName] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [contractsModalOpen, setContractsModalOpen] = useState(false)
  const [selectedInvestmentContracts, setSelectedInvestmentContracts] = useState<Contract[] | null>(null)
  const [contractsModalTitle, setContractsModalTitle] = useState("")
  const [contractsFilterLabel, setContractsFilterLabel] = useState("")
  const [contractsInvestorId, setContractsInvestorId] = useState<string | null>(null)
  const [contractsInvestorInvestments, setContractsInvestorInvestments] = useState<InvestorInvestmentOption[]>([])
  const [contractsInvestorInvestmentsLoading, setContractsInvestorInvestmentsLoading] = useState(false)
  const [investmentDetailsOpen, setInvestmentDetailsOpen] = useState(false)
  const [selectedInvestmentDetails, setSelectedInvestmentDetails] =
    useState<InvestorInvestmentOption | null>(null)
  const [receiptViewerOpen, setReceiptViewerOpen] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<{
    id: string
    file_name: string
    file_type: string
    file_size: number
    status: "pending" | "approved" | "rejected"
    created_at: string
  } | null>(null)
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [linkingContract, setLinkingContract] = useState<Contract | null>(null)
  const [linkInvestments, setLinkInvestments] = useState<InvestorInvestmentOption[]>([])
  const [linkSelectedInvestmentId, setLinkSelectedInvestmentId] = useState("")
  const [linkLoadingInvestments, setLinkLoadingInvestments] = useState(false)
  const [linkSubmitting, setLinkSubmitting] = useState(false)
  const [linkError, setLinkError] = useState<string | null>(null)

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
      setInvestments([])

      const response = await fetch("/api/contracts/admin-candidates")
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Erro ao buscar usuários sem contrato")
      }

      setInvestorOptions(result.data || [])
      if (result.data && result.data.length > 0) {
        const firstId = result.data[0].id as string
        setSelectedInvestorId(firstId)
        void fetchInvestmentsForInvestor(firstId)
      } else {
        setSelectedInvestorId("")
        setInvestments([])
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

  const fetchInvestmentsForInvestor = async (investorId: string) => {
    if (!investorId) {
      setInvestments([])
      setSelectedInvestmentIdForUpload("")
      return
    }

    try {
      setLoadingInvestments(true)

      // Buscar apenas investimentos ativos do investidor
      const response = await fetch(`/api/investments?userId=${investorId}&status=active`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Erro ao buscar investimentos do investidor")
      }

      const rawList: any[] = result.data || []
      const mappedList: InvestorInvestmentOption[] = rawList.map((inv) => ({
        ...inv,
        liquidity: inv.profitability_liquidity ?? inv.liquidity ?? null,
      }))

      setInvestments(mappedList)

      // Definir seleção padrão de investimento no upload:
      // - Se houver apenas 1 investimento, seleciona automaticamente
      // - Se houver mais de 1, exige escolha explícita do admin
      if (mappedList.length === 1) {
        setSelectedInvestmentIdForUpload(mappedList[0].id)
      } else {
        setSelectedInvestmentIdForUpload("")
      }
    } catch (err: any) {
      console.error("Erro ao carregar investimentos do investidor:", err)
      setInvestments([])
      toast({
        title: "Erro ao carregar investimentos",
        description: err.message || "Não foi possível carregar os investimentos do investidor selecionado.",
        variant: "destructive",
      })
    } finally {
      setLoadingInvestments(false)
    }
  }

  const openUploadModal = () => {
    setUploadModalOpen(true)
    setSelectedInvestmentIdForUpload("")
    void fetchInvestorsWithoutContract()
  }

  const openUploadModalForInvestor = (investorId: string, fullName: string, email: string) => {
    setUploadModalOpen(true)
    setUploadError(null)
    setInvestorOptions([{ id: investorId, full_name: fullName, email }])
    setSelectedInvestorId(investorId)
    setSelectedInvestmentIdForUpload("")
    setInvestorSearchTerm("")
    void fetchInvestmentsForInvestor(investorId)
  }

  const closeUploadModal = () => {
    setUploadModalOpen(false)
    setSelectedInvestorId("")
    setInvestments([])
    setSelectedInvestmentIdForUpload("")
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

    if (!investments.length) {
      setUploadError("O investidor selecionado não possui investimentos ativos para vincular o contrato.")
      return
    }

    if (!selectedInvestmentIdForUpload) {
      setUploadError("Selecione um investimento para vincular o contrato.")
      return
    }

    const investmentId = selectedInvestmentIdForUpload
    if (!investmentId) {
      setUploadError("Selecione um investimento válido para vincular o contrato.")
      return
    }

    try {
      setUploading(true)
      setUploadError(null)

      const formData = new FormData()
      formData.append("investorId", selectedInvestorId)
      formData.append("contractName", contractName || file.name)
      formData.append("investmentId", investmentId)
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

  const groupedByInvestor: InvestorContractsGroup[] = useMemo(() => {
    const map = new Map<string, { group: InvestorContractsGroup; investmentMap: Map<string | null, Contract[]> }>()

    for (const contract of filteredContracts) {
      const investorId = contract.investor_id
      if (!investorId) continue

      let entry = map.get(investorId)
      if (!entry) {
        const investorName = contract.investor_profile?.full_name || "Investidor desconhecido"
        const investorEmail = contract.investor_profile?.email || ""
        entry = {
          group: {
            investorId,
            investorName,
            investorEmail,
            totalContracts: 0,
            investments: [],
          },
          investmentMap: new Map<string | null, Contract[]>(),
        }
        map.set(investorId, entry)
      }

      entry.group.totalContracts += 1

      const investmentKey = (contract.investment_id as string | null) ?? null
      const { investmentMap } = entry
      const currentList = investmentMap.get(investmentKey) ?? []
      currentList.push(contract)
      investmentMap.set(investmentKey, currentList)
    }

    return Array.from(map.values()).map(({ group, investmentMap }) => ({
      ...group,
      investments: Array.from(investmentMap.entries()).map(([investmentId, contracts]) => ({
        investmentId,
        contracts,
      })),
    }))
  }, [filteredContracts])

  const openContractsForInvestment = (group: InvestorContractsGroup, investmentGroup: InvestmentContractsGroup, index: number) => {
    setSelectedInvestmentContracts(investmentGroup.contracts)
    const contractsCount = investmentGroup.contracts.length
    const labelCount = `${contractsCount} ${contractsCount === 1 ? "contrato" : "contratos"}`
    const filterLabel =
      investmentGroup.investmentId && investmentGroup.investmentId !== "null"
        ? `Investimento ${index + 1}`
        : "Contratos sem investimento vinculado"

    setContractsModalTitle(`Contratos de ${group.investorName}`)
    setContractsFilterLabel(`${filterLabel} • ${labelCount}`)
    setContractsInvestorId(group.investorId)
    setContractsInvestorInvestments([])
    setContractsModalOpen(true)

    // Carregar todos os investimentos ativos do investidor para exibir detalhes na coluna Vínculo
    void (async () => {
      try {
        setContractsInvestorInvestmentsLoading(true)
        const response = await fetch(`/api/investments?userId=${group.investorId}&status=active`)
        const result = await response.json()

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Erro ao buscar investimentos do investidor")
        }

        const rawList: any[] = result.data || []
        const mappedList: InvestorInvestmentOption[] = rawList.map((inv) => ({
          ...inv,
          liquidity: inv.profitability_liquidity ?? inv.liquidity ?? null,
        }))

        setContractsInvestorInvestments(mappedList)
      } catch (err: any) {
        console.error("Erro ao carregar investimentos para modal de contratos:", err)
        setContractsInvestorInvestments([])
      } finally {
        setContractsInvestorInvestmentsLoading(false)
      }
    })()
  }

  const openInvestmentDetails = (investment: InvestorInvestmentOption) => {
    setSelectedInvestmentDetails(investment)
    setInvestmentDetailsOpen(true)
  }

  const fetchInvestmentsForLink = async (investorId: string) => {
    if (!investorId) {
      setLinkInvestments([])
      setLinkSelectedInvestmentId("")
      return
    }

    try {
      setLinkLoadingInvestments(true)
      setLinkError(null)

      const response = await fetch(`/api/investments?userId=${investorId}&status=active`)
      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Erro ao buscar investimentos do investidor")
      }

      const rawList: any[] = result.data || []
      const list: InvestorInvestmentOption[] = rawList.map((inv) => ({
        ...inv,
        liquidity: inv.profitability_liquidity ?? inv.liquidity ?? null,
      }))
      setLinkInvestments(list)

      if (list.length > 0) {
        setLinkSelectedInvestmentId(list[0].id)
      } else {
        setLinkSelectedInvestmentId("")
      }
    } catch (err: any) {
      console.error("Erro ao carregar investimentos para vínculo:", err)
      setLinkInvestments([])
      setLinkSelectedInvestmentId("")
      setLinkError(err.message || "Não foi possível carregar os investimentos para vínculo.")
    } finally {
      setLinkLoadingInvestments(false)
    }
  }

  const openLinkModal = (contract: Contract) => {
    setLinkingContract(contract)
    setLinkModalOpen(true)
    setLinkError(null)
    setLinkInvestments([])
    setLinkSelectedInvestmentId(contract.investment_id || "")
    void fetchInvestmentsForLink(contract.investor_id)
  }

  const handleLinkSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!linkingContract) return

    if (!linkSelectedInvestmentId) {
      setLinkError("Selecione um investimento para vincular o contrato.")
      return
    }

    try {
      setLinkSubmitting(true)
      setLinkError(null)

      const response = await fetch("/api/contracts", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contractId: linkingContract.id,
          investmentId: linkSelectedInvestmentId,
        }),
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || "Erro ao atualizar vínculo do contrato")
      }

      const updatedContract = result.data as Contract

      // Atualizar lista global de contratos em memória
      setContracts((prev) =>
        prev.map((c) =>
          c.id === updatedContract.id
            ? {
                ...c,
                ...updatedContract,
              }
            : c,
        ),
      )

      // Atualizar contratos exibidos no modal atual (sem fechar)
      setSelectedInvestmentContracts((prev) =>
        prev
          ? prev.map((c) =>
              c.id === updatedContract.id
                ? {
                    ...c,
                    ...updatedContract,
                  }
                : c,
            )
          : prev,
      )

      toast({
        title: "Vínculo atualizado",
        description: "O contrato foi vinculado ao novo investimento.",
      })

      setLinkModalOpen(false)
      setLinkingContract(null)
    } catch (err: any) {
      console.error("Erro ao atualizar vínculo do contrato:", err)
      setLinkError(err.message || "Não foi possível atualizar o vínculo do contrato.")
      toast({
        title: "Erro ao atualizar vínculo",
        description: err.message || "Não foi possível atualizar o vínculo do contrato.",
        variant: "destructive",
      })
    } finally {
      setLinkSubmitting(false)
    }
  }

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
                      <TableHead>Contrato(s)</TableHead>
                      <TableHead>Último contrato</TableHead>
                      <TableHead>Último uploader</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedByInvestor.map((group) => {
                      const allContracts = group.investments.flatMap((inv) => inv.contracts)
                      const sortedContracts = [...allContracts].sort(
                        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
                      )
                      const latest = sortedContracts[0]

                      return (
                        <TableRow key={group.investorId}>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium">{group.investorName}</span>
                              {group.investorEmail && (
                                <span className="text-xs text-muted-foreground">{group.investorEmail}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="flex flex-wrap gap-2">
                               {group.investments.map((invGroup, index) => {
                                const count = invGroup.contracts.length
                                const label =
                                  count === 1 ? "1 contrato" : `${count} contratos`

                                return (
                                  <Button
                                    key={invGroup.investmentId ?? `no-investment-${index}`}
                                     variant="outline"
                                    size="sm"
                                    className="text-xs px-2 py-1"
                                     onClick={() => openContractsForInvestment(group, invGroup, index)}
                                  >
                                    {label}
                                  </Button>
                                )
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            {latest ? (
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                {formatDateTime(latest.created_at)}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {latest ? (
                              <div className="flex flex-col">
                                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <User className="h-3 w-3" />
                                  {latest.uploaded_by_profile?.full_name ||
                                    latest.uploaded_by_profile?.email ||
                                    "N/A"}
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">N/A</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex items-center gap-1"
                                onClick={() =>
                                  openUploadModalForInvestor(
                                    group.investorId,
                                    group.investorName,
                                    group.investorEmail,
                                  )
                                }
                              >
                                <FilePlus2 className="h-4 w-4" />
                                Adicionar
                              </Button>
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
      <Dialog
        open={uploadModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeUploadModal()
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Adicionar contrato</DialogTitle>
            <DialogDescription>
              Selecione um usuário e um investimento para enviar o arquivo e vinculá-lo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpload} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="investor">Usuário</Label>
              {loadingInvestors ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando usuários...
                </div>
              ) : investorOptions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Não há usuários disponíveis para seleção no momento.
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
                    onValueChange={(value) => {
                      setSelectedInvestorId(value)
                      void fetchInvestmentsForInvestor(value)
                    }}
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

            {/* Seleção de investimento do usuário */}
            <div className="space-y-2">
              <Label>Investimento para vincular o contrato</Label>
              {loadingInvestments ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Carregando investimentos do usuário...
                </div>
              ) : !selectedInvestorId ? (
                <p className="text-sm text-muted-foreground">
                  Selecione um usuário para visualizar os investimentos disponíveis.
                </p>
              ) : investments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Este usuário não possui investimentos ativos para vincular um contrato.
                </p>
              ) : (
                <div className="space-y-2">
                  <Select
                    value={selectedInvestmentIdForUpload}
                    onValueChange={(value) => {
                      setSelectedInvestmentIdForUpload(value)
                      setUploadError(null)
                    }}
                  >
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue placeholder="Selecione um investimento" />
                    </SelectTrigger>
                    <SelectContent>
                      {investments.map((inv, index) => {
                        const valor = new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(inv.amount || 0)
                        const data = inv.payment_date
                          ? new Date(inv.payment_date).toLocaleDateString("pt-BR")
                          : "sem data"
                        const tipo =
                          inv.quota_type === "senior"
                            ? "Sênior"
                            : inv.quota_type === "subordinada"
                            ? "Subordinada"
                            : inv.quota_type || ""

                        return (
                          <SelectItem key={inv.id} value={inv.id}>
                            {index + 1}. {valor} — {data}
                            {tipo ? ` — ${tipo}` : ""}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Apenas investimentos ativos do usuário selecionado são exibidos. Escolha o
                    investimento correto para este contrato.
                  </p>
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

      {/* Modal de contratos por investimento */}
      <Dialog open={contractsModalOpen} onOpenChange={setContractsModalOpen}>
        <DialogContent className="w-[96vw] max-w-6xl sm:max-w-6xl lg:max-w-6xl rounded-2xl border border-emerald-100 bg-gradient-to-b from-emerald-50/80 via-background to-background shadow-2xl overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex flex-col gap-1 text-emerald-950">
              <span className="text-lg font-semibold">
                {contractsModalTitle || "Contratos do investimento"}
              </span>
              <span className="text-xs font-normal text-emerald-900/80">
                Gerencie os vínculos entre contratos e investimentos deste investidor.
              </span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {contractsFilterLabel
                ? `Filtro atual: ${contractsFilterLabel}`
                : "Selecione um agrupamento na lista principal para ver os contratos relacionados."}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 rounded-lg border bg-muted/40">
            {selectedInvestmentContracts && selectedInvestmentContracts.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60">
                    <TableHead>Contrato</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Vínculo</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Uploader</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedInvestmentContracts.map((contract, index) => {
                    const statusBadge = getContractStatusBadge(contract.status)
                    return (
                      <TableRow
                        key={contract.id}
                        className={index % 2 === 0 ? "bg-background" : "bg-muted/30"}
                      >
                        <TableCell className="max-w-xs">
                          <p className="font-medium text-foreground">{contract.contract_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {contract.file_name} • {formatFileSize(contract.file_size)}
                          </p>
                        </TableCell>
                        <TableCell className="align-middle">
                          <Badge
                            variant="outline"
                            className={`text-xs px-2 py-0.5 border ${statusBadge.className}`}
                          >
                            {statusBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="align-middle">
                          {(() => {
                            if (!contract.investment_id) {
                              return (
                                <Badge
                                  variant="outline"
                                  className="text-xs px-2 py-0.5 border bg-slate-100 text-slate-700 border-slate-200"
                                >
                                  Sem vínculo
                                </Badge>
                              )
                            }

                            const investment = contractsInvestorInvestments.find(
                              (inv) => inv.id === contract.investment_id,
                            )

                            if (contractsInvestorInvestmentsLoading && !investment) {
                              return (
                                <span className="text-xs text-muted-foreground">
                                  Carregando investimento...
                                </span>
                              )
                            }

                            if (!investment) {
                              return (
                                <Badge
                                  variant="outline"
                                  className="text-xs px-2 py-0.5 border bg-amber-50 text-amber-800 border-amber-200"
                                >
                                  Investimento não encontrado
                                </Badge>
                              )
                            }

                            const valor = formatCurrency(investment.amount || 0)
                            const data = investment.payment_date
                              ? new Date(investment.payment_date).toLocaleDateString("pt-BR")
                              : "sem data"

                            return (
                              <button
                                type="button"
                                onClick={() => openInvestmentDetails(investment)}
                                className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-2 py-1 text-xs text-sky-900 hover:bg-sky-100 transition-colors"
                              >
                                <span className="font-medium">{valor}</span>
                                <span className="text-[11px] text-sky-900/80">{data}</span>
                              </button>
                            )
                          })()}
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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openLinkModal(contract)}
                              title={
                                contract.investment_id
                                  ? "Mudar vínculo do contrato com investimento"
                                  : "Vincular contrato a um investimento"
                              }
                            >
                              {contract.investment_id ? "Mudar vínculo" : "Vincular"}
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
                                    Tem certeza que deseja deletar o contrato "{contract.contract_name}
                                    "? Esta ação não pode ser desfeita.
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
            ) : (
              <div className="p-4">
                <p className="text-sm text-muted-foreground">
                  Nenhum contrato vinculado a este investimento.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de detalhes do investimento vinculado */}
      <Dialog open={investmentDetailsOpen} onOpenChange={setInvestmentDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do investimento</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Informações básicas do investimento vinculado a este contrato.
            </DialogDescription>
          </DialogHeader>

          {selectedInvestmentDetails && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-sky-50 px-4 py-3 flex items-center justify-between">
                <div>
                  <p className="text-xs text-sky-900/80">Valor investido</p>
                  <p className="text-lg font-semibold text-sky-900">
                    {formatCurrency(selectedInvestmentDetails.amount || 0)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-sky-900/80">Data de pagamento/depósito</p>
                  <p className="text-sm font-medium text-sky-900">
                    {selectedInvestmentDetails.payment_date
                      ? new Date(selectedInvestmentDetails.payment_date).toLocaleDateString("pt-BR")
                      : selectedInvestmentDetails.created_at
                      ? new Date(selectedInvestmentDetails.created_at).toLocaleDateString("pt-BR")
                      : "sem data"}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <p className="text-muted-foreground">Status</p>
                  {(() => {
                    const badge = getInvestmentStatusBadge(selectedInvestmentDetails.status)
                    return (
                      <Badge
                        variant="outline"
                        className={`px-2 py-0.5 border ${badge.className}`}
                      >
                        {badge.label}
                      </Badge>
                    )
                  })()}
                </div>

                {selectedInvestmentDetails.status === "active" ? (
                  <>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Rentabilidade</p>
                      <p className="text-sm font-medium text-foreground">
                        {typeof selectedInvestmentDetails.monthly_return_rate === "number"
                          ? `${(selectedInvestmentDetails.monthly_return_rate * 100).toFixed(2)}% ao mês`
                          : "Não informado"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Duração</p>
                      <p className="text-sm font-medium text-foreground">
                        {selectedInvestmentDetails.commitment_period
                          ? `${selectedInvestmentDetails.commitment_period} meses`
                          : "Não informado"}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-muted-foreground">Liquidez</p>
                      <p className="text-sm font-medium text-foreground">
                        {(() => {
                          const raw = (selectedInvestmentDetails.liquidity || "").toLowerCase()
                          if (!raw) return "Não informado"
                          if (raw.includes("mensal")) return "Mensal"
                          if (raw.includes("semestral")) return "Semestral"
                          if (raw.includes("anual")) return "Anual"
                          if (raw.includes("bienal")) return "Bienal"
                          if (raw.includes("trienal")) return "Trienal"
                          return selectedInvestmentDetails.liquidity
                        })()}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="col-span-1 sm:col-span-2 space-y-1">
                    <p className="text-muted-foreground">
                      Detalhes de rentabilidade, duração, liquidez e comprovante são exibidos apenas
                      para investimentos ativos.
                    </p>
                  </div>
                )}
              </div>

              {selectedInvestmentDetails.status === "active" && (
                <div className="pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={async () => {
                      try {
                        const response = await fetch(
                          `/api/pix-receipts?transactionId=${selectedInvestmentDetails.id}&status=all`,
                        )
                        const result = await response.json()

                        if (!response.ok || !result.success) {
                          throw new Error(result.error || "Erro ao buscar comprovante")
                        }

                        const receipts = (result.data || []) as any[]
                        if (!receipts.length) {
                          toast({
                            title: "Nenhum comprovante encontrado",
                            description:
                              "Não há comprovantes PIX cadastrados para este investimento.",
                          })
                          return
                        }

                        // Priorizar aprovados, depois pendentes, depois rejeitados, todos por data desc
                        const sorted = receipts.sort(
                          (a, b) =>
                            new Date(b.created_at).getTime() -
                            new Date(a.created_at).getTime(),
                        ) as any[]
                        const approved = sorted.find((r) => r.status === "approved")
                        const target = approved || sorted[0]

                        setSelectedReceipt({
                          id: target.id,
                          file_name: target.file_name,
                          file_type: target.file_type,
                          file_size: target.file_size,
                          status: target.status,
                          created_at: target.created_at,
                        })
                        setReceiptViewerOpen(true)
                      } catch (error: any) {
                        console.error("Erro ao carregar comprovante:", error)
                        toast({
                          title: "Erro ao carregar comprovante",
                          description:
                            error?.message ||
                            "Não foi possível carregar o comprovante deste investimento.",
                          variant: "destructive",
                        })
                      }
                    }}
                  >
                    Ver comprovante
                  </Button>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setInvestmentDetailsOpen(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Visualização do comprovante PIX do investimento */}
      {selectedReceipt && (
        <ReceiptViewer
          receipt={selectedReceipt}
          isOpen={receiptViewerOpen}
          onClose={() => setReceiptViewerOpen(false)}
        />
      )}

      {/* Modal para vincular / alterar investimento de um contrato existente */}
      <Dialog open={linkModalOpen} onOpenChange={(open) => {
        setLinkModalOpen(open)
        if (!open) {
          setLinkingContract(null)
          setLinkInvestments([])
          setLinkSelectedInvestmentId("")
          setLinkError(null)
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Vincular contrato a investimento</DialogTitle>
            <DialogDescription>
              Selecione o investimento correto para este contrato. Você pode alterar o vínculo a qualquer momento.
            </DialogDescription>
          </DialogHeader>

          {linkingContract && (
            <form onSubmit={handleLinkSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Contrato</Label>
                <div className="border rounded-md p-3 bg-muted/40">
                  <p className="text-sm font-medium">{linkingContract.contract_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {linkingContract.file_name} • {formatFileSize(linkingContract.file_size)}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Investimento</Label>
                {linkLoadingInvestments ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando investimentos do investidor...
                  </div>
                ) : linkInvestments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Não há investimentos ativos para este investidor no momento.
                  </p>
                ) : (
                  <Select
                    value={linkSelectedInvestmentId}
                    onValueChange={(value) => setLinkSelectedInvestmentId(value)}
                  >
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue placeholder="Selecione um investimento" />
                    </SelectTrigger>
                    <SelectContent>
                      {linkInvestments.map((inv, index) => {
                        const valor = new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(inv.amount || 0)
                        const data = inv.payment_date
                          ? new Date(inv.payment_date).toLocaleDateString("pt-BR")
                          : "sem data"
                        const tipo =
                          inv.quota_type === "senior"
                            ? "Sênior"
                            : inv.quota_type === "subordinada"
                            ? "Subordinada"
                            : inv.quota_type || ""

                        return (
                          <SelectItem key={inv.id} value={inv.id}>
                            {index + 1}. {valor} — {data}
                            {tipo ? ` — ${tipo}` : ""}
                          </SelectItem>
                        )
                      })}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-muted-foreground">
                  Apenas investimentos ativos do mesmo investidor são exibidos.
                </p>
              </div>

              {linkError && (
                <p className="text-sm text-destructive">{linkError}</p>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setLinkModalOpen(false)}
                  disabled={linkSubmitting}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={linkSubmitting || !linkSelectedInvestmentId || linkInvestments.length === 0}
                >
                  {linkSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    "Salvar vínculo"
                  )}
                </Button>
              </DialogFooter>
            </form>
          )}
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


