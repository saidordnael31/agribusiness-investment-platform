"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { calculateNewCommissionLogic } from "@/lib/commission-calculator"
import { Loader2, Calculator, DollarSign } from "lucide-react"

interface DynamicCommissionCalculatorProps {
  isOpen: boolean
  onClose: () => void
  officeId?: string
  advisorId?: string
}

export function DynamicCommissionCalculator({
  isOpen,
  onClose,
  officeId,
  advisorId,
}: DynamicCommissionCalculatorProps) {
  const { toast } = useToast()
  const [selectedMonth, setSelectedMonth] = useState<string>("")
  const [selectedYear, setSelectedYear] = useState<string>(new Date().getFullYear().toString())
  const [receiptDate, setReceiptDate] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{
    totalAdvisor: number
    totalOffice: number
    totalInvestor: number
    totalAmount: number
    investmentCount: number
    receiptDate: string
  } | null>(null)

  const months = [
    { value: "0", label: "Janeiro" },
    { value: "1", label: "Fevereiro" },
    { value: "2", label: "Março" },
    { value: "3", label: "Abril" },
    { value: "4", label: "Maio" },
    { value: "5", label: "Junho" },
    { value: "6", label: "Julho" },
    { value: "7", label: "Agosto" },
    { value: "8", label: "Setembro" },
    { value: "9", label: "Outubro" },
    { value: "10", label: "Novembro" },
    { value: "11", label: "Dezembro" },
  ]

  // Gerar lista de anos (últimos 5 anos até próximo ano)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 7 }, (_, i) => (currentYear - 2 + i).toString())

  const calculateCommissions = async () => {
    if (!selectedMonth || !receiptDate) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos",
        variant: "destructive",
      })
      return
    }

    try {
      setLoading(true)
      setResult(null)

      const supabase = createClient()
      
      // Buscar usuário logado
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        toast({
          title: "Erro",
          description: "Usuário não autenticado",
          variant: "destructive",
        })
        return
      }

      // Buscar perfil do usuário
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, user_type, full_name")
        .eq("id", user.id)
        .single()

      if (!profile) {
        toast({
          title: "Erro",
          description: "Perfil não encontrado",
          variant: "destructive",
        })
        return
      }

      // Calcular período baseado no dia 20 do mês selecionado
      // Se selecionar "Outubro", o período é de 20/09 até 20/10 (considerando o dia 20 como corte)
      const month = parseInt(selectedMonth)
      const year = parseInt(selectedYear)
      
      // Data inicial: dia 20 do mês anterior ao selecionado
      let startMonth = month - 1
      let startYear = year
      if (startMonth < 0) {
        startMonth = 11
        startYear = year - 1
      }

      // Data inicial: dia 20 do mês anterior (inclusive)
      const periodStart = new Date(startYear, startMonth, 20, 0, 0, 0)
      // Data final: dia 20 do mês selecionado (inclusive)
      const periodEnd = new Date(year, month, 20, 23, 59, 59, 999)

      console.log('[CALCULADOR] Período:', {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString(),
      })

      // Buscar investimentos do período
      // Nota: payment_date pode ser null, então vamos buscar todos e filtrar depois
      let investmentsQuery = supabase
        .from("investments")
        .select("id, user_id, amount, payment_date, created_at, status")
        .eq("status", "active")

      // Se for escritório, buscar investimentos dos assessores vinculados
      if (profile.user_type === "admin") {
        const targetOfficeId = officeId || user.id
        
        // Buscar assessores do escritório
        const { data: advisors } = await supabase
          .from("profiles")
          .select("id")
          .eq("office_id", targetOfficeId)
          .eq("user_type", "distributor")

        if (advisors && advisors.length > 0) {
          const advisorIds = advisors.map((a) => a.id)

          // Buscar investidores dos assessores
          const { data: investorProfiles } = await supabase
            .from("profiles")
            .select("id")
            .in("parent_id", advisorIds)
            .eq("user_type", "investor")

          if (investorProfiles && investorProfiles.length > 0) {
            const investorIds = investorProfiles.map((p) => p.id)
            investmentsQuery = investmentsQuery.in("user_id", investorIds)
          } else {
            // Sem investidores, retornar zero
            setResult({
              totalAdvisor: 0,
              totalOffice: 0,
              totalInvestor: 0,
              totalAmount: 0,
              investmentCount: 0,
              receiptDate,
            })
            setLoading(false)
            return
          }
        } else {
          // Sem assessores, retornar zero
          setResult({
            totalAdvisor: 0,
            totalOffice: 0,
            totalInvestor: 0,
            totalAmount: 0,
            investmentCount: 0,
            receiptDate,
          })
          setLoading(false)
          return
        }
      } else if (profile.user_type === "distributor" && advisorId) {
        // Se for assessor, buscar investimentos dos seus clientes
        const { data: investorProfiles } = await supabase
          .from("profiles")
          .select("id")
          .eq("parent_id", advisorId || user.id)
          .eq("user_type", "investor")

        if (investorProfiles && investorProfiles.length > 0) {
          const investorIds = investorProfiles.map((p) => p.id)
          investmentsQuery = investmentsQuery.in("user_id", investorIds)
        } else {
          // Sem investidores, retornar zero
          setResult({
            totalAdvisor: 0,
            totalOffice: 0,
            totalInvestor: 0,
            totalAmount: 0,
            investmentCount: 0,
            receiptDate,
          })
          setLoading(false)
          return
        }
      }

      let { data: investments, error } = await investmentsQuery

      if (error) {
        console.error("Erro ao buscar investimentos:", error)
        toast({
          title: "Erro",
          description: "Erro ao buscar investimentos",
          variant: "destructive",
        })
        return
      }

      // Filtrar investimentos por período (payment_date entre periodStart e periodEnd)
      if (investments && investments.length > 0) {
        investments = investments.filter(inv => {
          const paymentDate = inv.payment_date || inv.created_at
          if (!paymentDate) return false
          
          const date = new Date(paymentDate)
          date.setHours(0, 0, 0, 0)
          
          return date >= periodStart && date <= periodEnd
        })
      }

      if (!investments || investments.length === 0) {
        setResult({
          totalAdvisor: 0,
          totalOffice: 0,
          totalInvestor: 0,
          totalAmount: 0,
          investmentCount: 0,
          receiptDate,
        })
        setLoading(false)
        toast({
          title: "Info",
          description: "Nenhum investimento encontrado no período selecionado",
        })
        return
      }

      console.log('[CALCULADOR] Investimentos encontrados:', investments.length)

      // Calcular comissões para cada investimento, mas com data de recebimento customizada
      let totalAdvisor = 0
      let totalOffice = 0
      let totalInvestor = 0
      let totalAmount = 0

      for (const investment of investments) {
        // Calcular comissão normal
        const commissionCalc = calculateNewCommissionLogic({
          id: investment.id,
          user_id: investment.user_id,
          amount: Number(investment.amount),
          payment_date: investment.payment_date || investment.created_at,
        })

        // Somar as comissões (ignorar a data de pagamento, usar a data de recebimento selecionada)
        totalAdvisor += commissionCalc.advisorCommission
        totalOffice += commissionCalc.officeCommission
        totalInvestor += commissionCalc.investorCommission
        totalAmount += Number(investment.amount)
      }

      setResult({
        totalAdvisor,
        totalOffice,
        totalInvestor,
        totalAmount,
        investmentCount: investments.length,
        receiptDate,
      })

      toast({
        title: "Sucesso",
        description: `Comissões calculadas para ${investments.length} investimento(s)`,
      })
    } catch (error) {
      console.error("Erro ao calcular comissões:", error)
      toast({
        title: "Erro",
        description: "Erro ao calcular comissões",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value)
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A"
    const date = new Date(dateString)
    return date.toLocaleDateString("pt-BR")
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            Calculadora de Comissões Dinâmicas
          </DialogTitle>
          <DialogDescription>
            Calcule comissões para um período específico considerando o dia 20 de cada mês
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Seleção de Período */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="month">Mês (Corte no dia 20)</Label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger id="month">
                  <SelectValue placeholder="Selecione o mês" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year">Ano</Label>
              <Select value={selectedYear} onValueChange={setSelectedYear}>
                <SelectTrigger id="year">
                  <SelectValue placeholder="Selecione o ano" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Informação do Período */}
          {selectedMonth && (
            <Card>
              <CardContent className="pt-4">
                <div className="text-sm space-y-1">
                  <p className="text-muted-foreground">
                    <strong>Período considerado:</strong>
                  </p>
                  <p>
                    Do dia 20 de {months[parseInt(selectedMonth) - 1 < 0 ? 11 : parseInt(selectedMonth) - 1]?.label} até o dia 20 de {months[parseInt(selectedMonth)]?.label} de {selectedYear}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Investimentos com payment_date entre estas datas serão incluídos no cálculo
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Data de Recebimento */}
          <div className="space-y-2">
            <Label htmlFor="receiptDate">Data de Recebimento</Label>
            <Input
              id="receiptDate"
              type="date"
              value={receiptDate}
              onChange={(e) => setReceiptDate(e.target.value)}
              placeholder="Selecione a data de recebimento"
            />
            <p className="text-xs text-muted-foreground">
              Data em que as comissões serão pagas
            </p>
          </div>

          {/* Botão Calcular */}
          <Button
            onClick={calculateCommissions}
            disabled={loading || !selectedMonth || !receiptDate}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Calculando...
              </>
            ) : (
              <>
                <Calculator className="w-4 h-4 mr-2" />
                Calcular
              </>
            )}
          </Button>

          {/* Resultados */}
          {result && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-700">
                  <DollarSign className="w-5 h-5" />
                  Resultado do Cálculo
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Data de Recebimento:</span>
                    <span className="font-semibold">{formatDate(result.receiptDate)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Investimentos no período:</span>
                    <span className="font-semibold">{result.investmentCount}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Total investido:</span>
                    <span className="font-semibold">{formatCurrency(result.totalAmount)}</span>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Comissão do Assessor (3%):</span>
                    <span className="font-bold text-lg">{formatCurrency(result.totalAdvisor)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Comissão do Escritório (1%):</span>
                    <span className="font-bold text-lg">{formatCurrency(result.totalOffice)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Comissão do Investidor (2%):</span>
                    <span className="font-bold text-lg">{formatCurrency(result.totalInvestor)}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between items-center">
                    <span className="text-base font-semibold">Total a Receber:</span>
                    <span className="font-bold text-2xl text-green-700">
                      {formatCurrency(result.totalAdvisor + result.totalOffice + result.totalInvestor)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

