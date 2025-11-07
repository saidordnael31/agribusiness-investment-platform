"use client"

import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"

export interface Investment {
  id: string
  user_id: string
  quota_type: string
  amount: number
  monthly_return_rate: number
  commitment_period: number
  status: 'pending' | 'active' | 'withdrawn'
  created_at: string
  updated_at: string
  payment_date?: string | null
  profiles?: {
    full_name: string
    email: string
  }
  receipts?: {
    id: string
    file_name: string
    status: 'pending' | 'approved' | 'rejected'
    created_at: string
  }[]
}

export interface InvestmentFilters {
  status: string
  quotaType: string
  search: string
  dateFrom: string
  dateTo: string
}

interface SelectedInvestmentForUpload {
  id: string
  amount: number
  investorName: string
}

interface SelectedReceipt {
  id: string
  file_name: string
  file_type: string
  file_size: number
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

interface ExportOptions {
  includeAll: boolean
  includeReceipts: boolean
  includePersonalData: boolean
  format: 'csv' | 'excel'
}

const ITEMS_PER_PAGE = 10

// Função auxiliar para formatar data corretamente, evitando problemas de timezone
const formatDateSafe = (dateString: string | null | undefined): string => {
  if (!dateString) return "N/A"
  
  // Se for string no formato YYYY-MM-DD, extrair diretamente sem conversão de timezone
  if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
    const [datePart] = dateString.split('T')
    const [year, month, day] = datePart.split('-').map(Number)
    // Formatar diretamente sem passar por Date para evitar problemas de timezone
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
  }
  
  // Fallback: tentar parsear como Date e usar UTC
  const date = new Date(dateString)
  if (!isNaN(date.getTime())) {
    const year = date.getUTCFullYear()
    const month = date.getUTCMonth() + 1
    const day = date.getUTCDate()
    return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`
  }
  
  return "N/A"
}

// Função auxiliar para formatar hora corretamente, evitando problemas de timezone
const formatTimeSafe = (dateString: string | null | undefined): string => {
  if (!dateString) return "N/A"
  
  const date = new Date(dateString)
  if (!isNaN(date.getTime())) {
    const hours = date.getUTCHours()
    const minutes = date.getUTCMinutes()
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
  }
  
  return "N/A"
}

export function useInvestmentsManager() {
  const { toast } = useToast()
  const [investments, setInvestments] = useState<Investment[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalInvestments, setTotalInvestments] = useState(0)
  const [uploadModalOpen, setUploadModalOpen] = useState(false)
  const [selectedInvestmentForUpload, setSelectedInvestmentForUpload] = useState<SelectedInvestmentForUpload | null>(null)
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeAll: true,
    includeReceipts: true,
    includePersonalData: true,
    format: 'csv'
  })
  const [receiptViewerOpen, setReceiptViewerOpen] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<SelectedReceipt | null>(null)
  const [filters, setFilters] = useState<InvestmentFilters>({
    status: "all",
    quotaType: "all",
    search: "",
    dateFrom: "",
    dateTo: ""
  })

  const fetchInvestmentReceipts = async (investmentId: string) => {
    try {
      const response = await fetch(`/api/pix-receipts?transactionId=${investmentId}`)
      const data = await response.json()
      
      if (data.success && data.data) {
        return data.data.map((receipt: any) => ({
          id: receipt.id,
          file_name: receipt.file_name,
          status: receipt.status,
          created_at: receipt.created_at
        }))
      }
      return []
    } catch (error) {
      console.error("Erro ao buscar comprovantes:", error)
      return []
    }
  }

  const fetchInvestments = async (page: number = 1, currentFilters: InvestmentFilters = filters) => {
    try {
      setLoading(true)
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: ITEMS_PER_PAGE.toString(),
        ...(currentFilters.status !== "all" && { status: currentFilters.status }),
        ...(currentFilters.quotaType !== "all" && { quota_type: currentFilters.quotaType }),
        ...(currentFilters.search && { search: currentFilters.search }),
        ...(currentFilters.dateFrom && { date_from: currentFilters.dateFrom }),
        ...(currentFilters.dateTo && { date_to: currentFilters.dateTo })
      })

      const response = await fetch(`/api/investments?${params}`)
      const data = await response.json()

      if (data.success) {
        const investmentsWithReceipts = await Promise.all(
          (data.data || []).map(async (investment: Investment) => {
            const receipts = await fetchInvestmentReceipts(investment.id)
            return {
              ...investment,
              receipts
            }
          })
        )

        setInvestments(investmentsWithReceipts)
        setTotalPages(data.pagination?.totalPages || 1)
        setTotalInvestments(data.pagination?.total || 0)
      } else {
        throw new Error(data.error || 'Erro ao buscar investimentos')
      }
    } catch (error) {
      console.error('Erro ao buscar investimentos:', error)
      toast({
        title: "Erro",
        description: "Erro ao carregar investimentos. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (newFilters: Partial<InvestmentFilters>) => {
    const updatedFilters = { ...filters, ...newFilters }
    setFilters(updatedFilters)
    setCurrentPage(1)
    fetchInvestments(1, updatedFilters)
  }

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage)
    fetchInvestments(newPage, filters)
  }

  const clearFilters = () => {
    const clearedFilters: InvestmentFilters = {
      status: "all",
      quotaType: "all",
      search: "",
      dateFrom: "",
      dateTo: ""
    }
    setFilters(clearedFilters)
    setCurrentPage(1)
    fetchInvestments(1, clearedFilters)
  }

  const handleUploadReceipt = (investment: Investment) => {
    setSelectedInvestmentForUpload({
      id: investment.id,
      amount: investment.amount,
      investorName: investment.profiles?.full_name || 'Investidor'
    })
    setUploadModalOpen(true)
  }

  const handleViewReceipt = (receipt: any) => {
    setSelectedReceipt({
      id: receipt.id,
      file_name: receipt.file_name,
      file_type: receipt.file_type || 'image/jpeg',
      file_size: receipt.file_size || 0,
      status: receipt.status,
      created_at: receipt.created_at
    })
    setReceiptViewerOpen(true)
  }

  const handleApprovalSuccess = () => {
    fetchInvestments(currentPage, filters)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { variant: "secondary" as const, className: "bg-orange-100 text-orange-800 border-orange-200", label: "Pendente" }
      case 'active':
        return { variant: "secondary" as const, className: "bg-green-100 text-green-800 border-green-200", label: "Ativo" }
      case 'withdrawn':
        return { variant: "secondary" as const, className: "bg-gray-100 text-gray-800 border-gray-200", label: "Resgatado" }
      default:
        return { variant: "secondary" as const, className: "", label: status }
    }
  }

  const getQuotaTypeBadge = (quotaType: string) => {
    switch (quotaType) {
      case 'senior':
        return { variant: "outline" as const, className: "text-blue-600 border-blue-200", label: "Senior" }
      case 'subordinate':
        return { variant: "outline" as const, className: "text-purple-600 border-purple-200", label: "Subordinada" }
      default:
        return { variant: "outline" as const, className: "", label: quotaType }
    }
  }

  const exportInvestments = () => {
    setExportModalOpen(true)
  }

  const handleExport = async () => {
    try {
      setIsExporting(true)
      
      const params = new URLSearchParams({
        limit: '999999',
        ...(filters.status !== "all" && { status: filters.status }),
        ...(filters.quotaType !== "all" && { quota_type: filters.quotaType }),
        ...(filters.search && { search: filters.search }),
        ...(filters.dateFrom && { date_from: filters.dateFrom }),
        ...(filters.dateTo && { date_to: filters.dateTo })
      })

      const response = await fetch(`/api/investments?${params}`)
      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Erro ao buscar investimentos para exportação')
      }

      const allInvestmentsWithReceipts = await Promise.all(
        (data.data || []).map(async (investment: Investment) => {
          const receipts = await fetchInvestmentReceipts(investment.id)
          return {
            ...investment,
            receipts
          }
        })
      )

      let csvData = allInvestmentsWithReceipts.map(investment => {
        const baseData: any = {
          'ID': investment.id,
          'Valor': investment.amount,
          'Tipo de Quota': investment.quota_type,
          'Status': investment.status,
          'Taxa Mensal (%)': (investment.monthly_return_rate * 100).toFixed(2),
          'Período (meses)': investment.commitment_period,
          'Data': investment.payment_date ? formatDateSafe(investment.payment_date) : 'Não depositado',
          'Hora': investment.payment_date ? formatTimeSafe(investment.payment_date) : 'N/A',
          'Data de Criação': formatDateSafe(investment.created_at),
          'Hora de Criação': formatTimeSafe(investment.created_at),
          'Última Atualização': formatDateSafe(investment.updated_at)
        }

        if (exportOptions.includePersonalData) {
          baseData['Investidor'] = investment.profiles?.full_name || 'N/A'
          baseData['Email'] = investment.profiles?.email || 'N/A'
        }

        if (exportOptions.includeReceipts) {
          baseData['Comprovantes'] = investment.receipts?.length || 0
          baseData['Comprovantes Aprovados'] = investment.receipts?.filter(r => r.status === 'approved').length || 0
          baseData['Comprovantes Pendentes'] = investment.receipts?.filter(r => r.status === 'pending').length || 0
          baseData['Comprovantes Rejeitados'] = investment.receipts?.filter(r => r.status === 'rejected').length || 0
        }

        return baseData
      })

      const headers = Object.keys(csvData[0] || {})
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row]
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`
            }
            return value
          }).join(',')
        )
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      
      const now = new Date()
      const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-')
      const extension = exportOptions.format === 'excel' ? 'xlsx' : 'csv'
      link.setAttribute('download', `investimentos_${timestamp}.${extension}`)
      
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)

      toast({
        title: "Exportação concluída!",
        description: `Arquivo ${exportOptions.format.toUpperCase()} com ${allInvestmentsWithReceipts.length} investimentos foi baixado.`,
      })

      setExportModalOpen(false)
    } catch (error) {
      console.error('Erro ao exportar investimentos:', error)
      toast({
        title: "Erro na exportação",
        description: "Erro ao gerar arquivo. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setIsExporting(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const closeUploadModal = () => {
    setUploadModalOpen(false)
    setSelectedInvestmentForUpload(null)
  }

  const closeReceiptViewer = () => {
    setReceiptViewerOpen(false)
    setSelectedReceipt(null)
  }

  useEffect(() => {
    fetchInvestments()
  }, [])

  return {
    investments,
    loading,
    currentPage,
    totalPages,
    totalInvestments,
    uploadModalOpen,
    selectedInvestmentForUpload,
    exportModalOpen,
    isExporting,
    exportOptions,
    receiptViewerOpen,
    selectedReceipt,
    filters,
    setExportModalOpen,
    setExportOptions,
    handleFilterChange,
    handlePageChange,
    clearFilters,
    handleUploadReceipt,
    handleViewReceipt,
    handleApprovalSuccess,
    getStatusBadge,
    getQuotaTypeBadge,
    exportInvestments,
    handleExport,
    formatCurrency,
    closeUploadModal,
    closeReceiptViewer,
    fetchInvestments,
  }
}


