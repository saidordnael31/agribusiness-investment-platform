"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"
import { CheckCircle, Eye, Calendar, FileText, Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

interface AdminApproveInvestmentModalProps {
  isOpen: boolean
  onClose: () => void
  investmentId: string
  investmentAmount: number
  investorName: string
  onSuccess: () => void
}

export function AdminApproveInvestmentModal({
  isOpen,
  onClose,
  investmentId,
  investmentAmount,
  investorName,
  onSuccess
}: AdminApproveInvestmentModalProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [fetchingData, setFetchingData] = useState(false)
  const [paymentDate, setPaymentDate] = useState<string>("")
  const [investorEmail, setInvestorEmail] = useState<string>("")
  const [advisorInfo, setAdvisorInfo] = useState<{
    name: string
    email: string
  } | null>(null)
  const [receipts, setReceipts] = useState<Array<{
    id: string
    file_name: string
    file_path: string
    file_type: string
    status: string
    created_at: string
    signed_url?: string
  }>>([])
  const [currentReceiptIndex, setCurrentReceiptIndex] = useState(0)

  useEffect(() => {
    if (isOpen && investmentId) {
      fetchInvestmentData()
    } else {
      // Resetar dados quando fechar
      setPaymentDate("")
      setInvestorEmail("")
      setAdvisorInfo(null)
      setReceipts([])
      setCurrentReceiptIndex(0)
    }
  }, [isOpen, investmentId])

  const fetchInvestmentData = async () => {
    setFetchingData(true)
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Buscar dados do investimento
      const { data: investment, error: investmentError } = await supabase
        .from("investments")
        .select("payment_date, created_at, user_id")
        .eq("id", investmentId)
        .single()

      if (investmentError) {
        console.error("Erro ao buscar investimento:", investmentError)
        toast({
          title: "Erro",
          description: "Erro ao buscar dados do investimento.",
          variant: "destructive"
        })
        return
      }

      // Buscar perfil do investidor
      if (investment.user_id) {
        const { data: investorProfile, error: investorError } = await supabase
          .from("profiles")
          .select("id, full_name, email, parent_id")
          .eq("id", investment.user_id)
          .single()

        if (!investorError && investorProfile) {
          setInvestorEmail(investorProfile.email || "Não informado")

          // Buscar informações do assessor (parent_id do investidor)
          if (investorProfile.parent_id) {
            const { data: advisorProfile, error: advisorError } = await supabase
              .from("profiles")
              .select("id, full_name, email")
              .eq("id", investorProfile.parent_id)
              .single()

            if (!advisorError && advisorProfile) {
              setAdvisorInfo({
                name: advisorProfile.full_name || "Não informado",
                email: advisorProfile.email || "Não informado"
              })
            }
          }
        }
      }

      // Formatar data de pagamento preservando o valor exato do banco (usando UTC)
      const formatDatePreservingTimezone = (dateString: string | null): string => {
        if (!dateString) return "Não informada"
        
        try {
          // Se for string no formato ISO, extrair diretamente para evitar problemas de timezone
          if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}/)) {
            // Extrair data e hora da string ISO
            const dateTimeMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}):(\d{2})?)?/)
            if (dateTimeMatch) {
              const [, year, month, day, hour = '00', minute = '00'] = dateTimeMatch
              // Formatar diretamente sem conversão de timezone
              return `${day}/${month}/${year}, ${hour}:${minute}`
            }
          }
          
          // Fallback: usar UTC para evitar problemas de timezone
          const date = new Date(dateString)
          if (!isNaN(date.getTime())) {
            const day = String(date.getUTCDate()).padStart(2, '0')
            const month = String(date.getUTCMonth() + 1).padStart(2, '0')
            const year = date.getUTCFullYear()
            const hour = String(date.getUTCHours()).padStart(2, '0')
            const minute = String(date.getUTCMinutes()).padStart(2, '0')
            return `${day}/${month}/${year}, ${hour}:${minute}`
          }
        } catch (error) {
          console.error("Erro ao formatar data:", error)
        }
        
        return "Data inválida"
      }

      if (investment.payment_date) {
        setPaymentDate(formatDatePreservingTimezone(investment.payment_date))
      } else if (investment.created_at) {
        setPaymentDate(formatDatePreservingTimezone(investment.created_at))
      } else {
        setPaymentDate("Não informada")
      }

      // Buscar TODOS os comprovantes
      const { data: receiptsData, error: receiptsError } = await supabase
        .from("pix_receipts")
        .select("id, file_name, file_path, file_type, status, created_at")
        .eq("transaction_id", investmentId)
        .order("created_at", { ascending: false })

      if (receiptsError) {
        console.error("Erro ao buscar comprovantes:", receiptsError)
        toast({
          title: "Aviso",
          description: "Erro ao buscar comprovantes. Tente novamente.",
          variant: "destructive"
        })
      } else if (receiptsData && receiptsData.length > 0) {
        // Buscar URLs assinadas para todos os comprovantes
        const receiptsWithUrls = await Promise.all(
          receiptsData.map(async (receipt) => {
            try {
              const receiptResponse = await fetch(`/api/pix-receipts/view?receiptId=${receipt.id}`)
              const receiptData = await receiptResponse.json()

              if (receiptData.success && receiptData.data?.signed_url) {
                return { ...receipt, signed_url: receiptData.data.signed_url }
              } else {
                // Fallback: tentar gerar URL diretamente
                const { data: urlData } = await supabase.storage
                  .from("pix_receipts")
                  .createSignedUrl(receipt.file_path, 3600)

                if (urlData?.signedUrl) {
                  return { ...receipt, signed_url: urlData.signedUrl }
                }
              }
            } catch (apiError) {
              console.error(`Erro ao buscar URL do comprovante ${receipt.id}:`, apiError)
            }
            return receipt
          })
        )

        setReceipts(receiptsWithUrls.filter(r => r.signed_url))
        setCurrentReceiptIndex(0)

        if (receiptsWithUrls.length > 1) {
          toast({
            title: `${receiptsWithUrls.length} comprovantes encontrados`,
            description: "Use as setas para navegar entre os comprovantes.",
          })
        }
      }
    } catch (error) {
      console.error("Erro ao buscar dados:", error)
      toast({
        title: "Erro",
        description: "Erro ao buscar dados do investimento.",
        variant: "destructive"
      })
    } finally {
      setFetchingData(false)
    }
  }

  const handleApprove = async () => {
    setLoading(true)

    try {
      const response = await fetch('/api/investments/approve-by-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          investmentId,
        }),
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Erro ao aprovar investimento')
      }

      toast({
        title: "Investimento aprovado!",
        description: "O investimento foi aprovado pelo administrador com sucesso.",
      })

      onSuccess()
      onClose()

    } catch (error) {
      console.error('Erro ao aprovar investimento:', error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao aprovar investimento. Tente novamente.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleViewReceipt = async (index?: number) => {
    const receiptIndex = index !== undefined ? index : currentReceiptIndex
    const receipt = receipts[receiptIndex]

    if (!receipt) {
      toast({
        title: "Aviso",
        description: "Nenhum comprovante disponível.",
        variant: "destructive"
      })
      return
    }

    try {
      let urlToOpen = receipt.signed_url

      // Se não temos URL, tentar buscar via API
      if (!urlToOpen) {
        const response = await fetch(`/api/pix-receipts/view?receiptId=${receipt.id}`)
        const result = await response.json()

        if (result.success && result.data?.signed_url) {
          urlToOpen = result.data.signed_url
          // Atualizar o comprovante com a URL
          const updatedReceipts = [...receipts]
          updatedReceipts[receiptIndex] = { ...receipt, signed_url: urlToOpen }
          setReceipts(updatedReceipts)
        } else {
          throw new Error(result.error || "Não foi possível obter a URL do comprovante")
        }
      }

      if (urlToOpen) {
        // Abrir em nova aba
        window.open(urlToOpen, '_blank', 'noopener,noreferrer')
      } else {
        throw new Error("URL do comprovante não disponível")
      }
    } catch (error) {
      console.error("Erro ao abrir comprovante:", error)
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao abrir comprovante. Tente novamente.",
        variant: "destructive"
      })
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <DialogTitle>Aprovar Investimento (Admin)</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground">
            Analise os dados do investimento antes de aprovar.
          </p>

          {/* Layout em duas colunas: Informações à esquerda, Comprovante à direita */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Coluna esquerda: Informações */}
            <div className="space-y-3">
            <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium">Investidor:</span>
                  <span className="ml-2 text-sm">{investorName}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">E-mail do Investidor:</span>
                  <span className="ml-2 text-sm">{investorEmail || "Carregando..."}</span>
                </div>
                <div>
                  <span className="text-sm font-medium">Valor:</span>
                  <span className="ml-2 text-sm font-semibold">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(investmentAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Informações do Assessor */}
            {advisorInfo && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Assessor Responsável
                </Label>
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="space-y-1">
                    <div>
                      <span className="text-sm font-medium">Nome:</span>
                      <span className="ml-2 text-sm">{advisorInfo.name}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium">E-mail:</span>
                      <span className="ml-2 text-sm">{advisorInfo.email}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

              {/* Data de pagamento */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data de Depósito Cadastrada
                </Label>
                {fetchingData ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Carregando...
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <span className="text-sm font-medium">{paymentDate || "Não informada"}</span>
                  </div>
                )}
              </div>

              {/* Informações do comprovante */}
              {receipt && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Comprovante de Pagamento
                  </Label>
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium truncate">{receipt.file_name}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {receipt.status === "approved" ? "Aprovado" : receipt.status === "pending" ? "Pendente" : "Rejeitado"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Coluna direita: Visualização do comprovante */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Visualização do Comprovante
                  {receipts.length > 1 && (
                    <span className="text-xs text-muted-foreground ml-2">
                      ({currentReceiptIndex + 1} de {receipts.length})
                    </span>
                  )}
                </Label>
                <div className="flex items-center gap-2">
                  {receipts.length > 1 && (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentReceiptIndex((prev) => 
                          prev > 0 ? prev - 1 : receipts.length - 1
                        )}
                        className="h-8 w-8"
                        disabled={fetchingData}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => setCurrentReceiptIndex((prev) => 
                          prev < receipts.length - 1 ? prev + 1 : 0
                        )}
                        className="h-8 w-8"
                        disabled={fetchingData}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  {receipts.length > 0 && receipts[currentReceiptIndex] && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewReceipt()}
                      className="flex items-center gap-2"
                    >
                      <Eye className="w-4 h-4" />
                      Abrir em Nova Aba
                    </Button>
                  )}
                </div>
              </div>
              {fetchingData ? (
                <div className="flex items-center justify-center h-[400px] bg-gray-50 rounded-lg border">
                  <div className="flex flex-col items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Carregando comprovante(s)...</span>
                  </div>
                </div>
              ) : receipts.length > 0 && receipts[currentReceiptIndex] ? (
                <div className="bg-gray-50 rounded-lg border overflow-hidden">
                  {receipts[currentReceiptIndex].file_type?.startsWith('image/') ? (
                    <div className="relative w-full h-[400px] flex items-center justify-center bg-gray-100">
                      <img
                        src={receipts[currentReceiptIndex].signed_url}
                        alt={receipts[currentReceiptIndex].file_name}
                        className="max-w-full max-h-full object-contain"
                        key={receipts[currentReceiptIndex].id}
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.style.display = 'none'
                          const parent = target.parentElement
                          if (parent && receipts[currentReceiptIndex].signed_url) {
                            parent.innerHTML = `
                              <div class="flex flex-col items-center justify-center h-full p-4 text-center">
                                <FileText class="w-12 h-12 text-muted-foreground mb-2" />
                                <p class="text-sm text-muted-foreground">Erro ao carregar imagem</p>
                                <a href="${receipts[currentReceiptIndex].signed_url}" target="_blank" class="mt-2 text-sm text-blue-600 hover:underline">
                                  Abrir em nova aba
                                </a>
                              </div>
                            `
                          }
                        }}
                      />
                    </div>
                  ) : receipts[currentReceiptIndex].file_type === 'application/pdf' ? (
                    <div className="w-full h-[400px] flex flex-col">
                      <iframe
                        src={receipts[currentReceiptIndex].signed_url}
                        className="w-full h-full border-0"
                        title={receipts[currentReceiptIndex].file_name}
                        key={receipts[currentReceiptIndex].id}
                      />
                      <div className="p-2 bg-gray-100 border-t flex items-center justify-between">
                        <span className="text-xs text-muted-foreground truncate">{receipts[currentReceiptIndex].file_name}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewReceipt()}
                          className="flex items-center gap-1 h-7 text-xs"
                        >
                          <Eye className="w-3 h-3" />
                          Abrir em nova aba
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[400px] p-4 text-center">
                      <FileText className="w-12 h-12 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-2">
                        Tipo de arquivo não suportado para visualização
                      </p>
                      <p className="text-xs text-muted-foreground mb-3 truncate w-full">{receipts[currentReceiptIndex].file_name}</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewReceipt()}
                        className="flex items-center gap-2"
                      >
                        <Eye className="w-4 h-4" />
                        Abrir arquivo
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-[400px] bg-gray-50 rounded-lg border p-4 text-center">
                  <FileText className="w-12 h-12 text-muted-foreground mb-2" />
                  <span className="text-sm text-muted-foreground">
                    Nenhum comprovante encontrado para este investimento.
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleApprove}
            disabled={loading || fetchingData}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Aprovando...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Aprovar Investimento
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

