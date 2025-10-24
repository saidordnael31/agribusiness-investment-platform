"use client"

import { useState, useEffect } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts"
import { createBrowserClient } from "@supabase/ssr"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

interface PerformanceDataPoint {
  month: string
  value: number
  monthNumber: number
  invested: number
  returns: number
  growth: number
}

interface Investment {
  id: string
  amount: number
  monthly_return_rate: number
  created_at: string
  status: string
}

export function PerformanceChart() {
  const [performanceData, setPerformanceData] = useState<PerformanceDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [totalInvested, setTotalInvested] = useState(0)
  const [totalReturns, setTotalReturns] = useState(0)
  const [growthRate, setGrowthRate] = useState(0)

  const generatePerformanceData = (investments: Investment[], withdrawals: any[] = []): PerformanceDataPoint[] => {
    const months = [
      "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
      "Jul", "Ago", "Set", "Out", "Nov", "Dez"
    ]
    
    const currentDate = new Date()
    const data: PerformanceDataPoint[] = []
    
    // Calcular total investido
    const totalInvestedAmount = investments.reduce((sum, inv) => sum + Number(inv.amount), 0)
    setTotalInvested(totalInvestedAmount)
    
    // Encontrar o mês mais antigo dos investimentos
    const oldestInvestment = investments.reduce((oldest, inv) => {
      const invDate = new Date(inv.created_at)
      return invDate < oldest ? invDate : oldest
    }, new Date())
    
    // Calcular quantos meses atrás começar (máximo 12 meses, mínimo 6)
    const monthsBack = Math.min(12, Math.max(6, 
      (currentDate.getFullYear() - oldestInvestment.getFullYear()) * 12 + 
      (currentDate.getMonth() - oldestInvestment.getMonth()) + 1
    ))
    
    // Debug: Log para verificar os dados
    console.log('Investments data:', investments.map(inv => ({
      id: inv.id,
      amount: inv.amount,
      created_at: inv.created_at,
      date: new Date(inv.created_at).toLocaleDateString('pt-BR')
    })))
    console.log('Withdrawals data:', withdrawals.map(w => ({
      investment_id: w.investment_id,
      amount: w.amount,
      created_at: w.created_at
    })))
    console.log('Oldest investment:', oldestInvestment.toLocaleDateString('pt-BR'))
    console.log('Months back:', monthsBack)
    
    // Gerar dados a partir do mês mais antigo ou últimos 6 meses (o que for maior)
    for (let i = monthsBack - 1; i >= 0; i--) {
      const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      // Ajustar para o final do mês para incluir investimentos feitos em qualquer dia do mês
      const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0)
      const monthKey = months[targetDate.getMonth()]
      const monthNumber = targetDate.getMonth()
      
      let totalValue = 0
      let totalInvestedInPeriod = 0
      let totalReturnsInPeriod = 0
      
      // Calcular valor acumulado até este mês para cada investimento
      investments.forEach((investment) => {
        const investmentDate = new Date(investment.created_at)
        
        // Se o investimento foi feito antes ou durante este mês
        if (investmentDate <= endOfMonth) {
          const monthsElapsed = Math.max(0, 
            (endOfMonth.getFullYear() - investmentDate.getFullYear()) * 12 + 
            (endOfMonth.getMonth() - investmentDate.getMonth())
          )
          
          const amount = Number(investment.amount)
          const rate = Number(investment.monthly_return_rate) || 0.02
          
          // Calcular resgates feitos até este mês para este investimento
          const investmentWithdrawals = withdrawals.filter(w => 
            w.investment_id === investment.id && 
            new Date(w.created_at) <= endOfMonth
          )
          const totalWithdrawn = investmentWithdrawals.reduce((sum, w) => sum + Number(w.amount), 0)
          
          // Valor disponível = valor original - resgates
          const availableAmount = Math.max(0, amount - totalWithdrawn)
          
          // JUROS COMPOSTOS: Valor = Principal × (1 + taxa)^tempo
          const compoundValue = availableAmount * Math.pow(1 + rate, monthsElapsed)
          const returns = compoundValue - availableAmount
          
          totalValue += compoundValue
          totalInvestedInPeriod += availableAmount
          totalReturnsInPeriod += returns
        }
      })
      
      // Calcular crescimento percentual
      const growth = totalInvestedInPeriod > 0 ? ((totalValue - totalInvestedInPeriod) / totalInvestedInPeriod) * 100 : 0
      
      data.push({
        month: monthKey,
        value: totalValue,
        monthNumber,
        invested: totalInvestedInPeriod,
        returns: totalReturnsInPeriod,
        growth: growth
      })
    }
    
    // Calcular métricas finais
    const finalData = data[data.length - 1]
    if (finalData) {
      setTotalReturns(finalData.returns)
      setGrowthRate(finalData.growth)
    }
    
    return data
  }

  const fetchInvestmentData = async () => {
    try {
      setLoading(true)
      
      // Obter usuário do localStorage
      const userStr = localStorage.getItem("user")
      if (!userStr) {
        setPerformanceData([])
        return
      }
      
      const user = JSON.parse(userStr)
      if (!user.id) {
        setPerformanceData([])
        return
      }

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      // Buscar investimentos ativos do usuário
      const { data: investments, error } = await supabase
        .from("investments")
        .select("id, amount, monthly_return_rate, created_at, status")
        .eq("user_id", user.id)
        .eq("status", "active")

      // Buscar resgates aprovados para calcular valor atual correto
      const { data: withdrawals, error: withdrawalsError } = await supabase
        .from("transactions")
        .select("investment_id, amount, created_at")
        .eq("user_id", user.id)
        .eq("type", "withdrawal")
        .eq("status", "completed")

      if (error || withdrawalsError) {
        console.error("Erro ao buscar dados:", error || withdrawalsError)
        setPerformanceData([])
        return
      }

      if (!investments || investments.length === 0) {
        // Se não há investimentos, mostrar dados zerados
        const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"]
        const emptyData = months.map((month, index) => ({
          month,
          value: 0,
          monthNumber: index,
          invested: 0,
          returns: 0,
          growth: 0
        }))
        setPerformanceData(emptyData)
        setTotalInvested(0)
        setTotalReturns(0)
        setGrowthRate(0)
        return
      }

      // Gerar dados de performance baseados nos investimentos reais e resgates
      const performanceData = generatePerformanceData(investments, withdrawals || [])
      setPerformanceData(performanceData)
      
    } catch (error) {
      console.error("Erro ao carregar dados de performance:", error)
      setPerformanceData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchInvestmentData()
  }, [])

  const getGrowthIcon = () => {
    if (growthRate > 0) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (growthRate < 0) return <TrendingDown className="h-4 w-4 text-red-500" />
    return <Minus className="h-4 w-4 text-muted-foreground" />
  }

  const getGrowthColor = () => {
    if (growthRate > 0) return "text-green-500"
    if (growthRate < 0) return "text-red-500"
    return "text-muted-foreground"
  }

  if (loading) {
    return (
      <div className="h-[300px] w-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
          <p className="text-sm text-white/80">Carregando performance...</p>
        </div>
      </div>
    )
  }

  // Estado vazio quando não há investimentos
  if (totalInvested === 0) {
    return (
      <div className="h-[300px] w-full text-center">
        <div className="pt-16">
          <h3 className="text-xl font-semibold text-[#4A4D4C] leading-[35px] mb-2">
            Nenhum investimento ativo
          </h3>
          <p className="text-[#D9D9D9] font-ibm-plex-sans font-normal text-lg leading-[35px] text-center">
            Faça seu primeiro investimento para acompanhar a performance aqui
          </p>
          <p className="text-[#D9D9D9] font-ibm-plex-sans font-normal text-lg leading-[35px] text-center">
            Performance será calculada com base em juros compostos
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Métricas de Performance */}
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="space-y-1">
          <p className="text-xs text-white/70">Total Investido</p>
          <p className="text-sm font-semibold text-white">
            {new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
              notation: "compact",
            }).format(totalInvested)}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-white/70">Retornos</p>
          <p className="text-sm font-semibold text-green-300">
            +{new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL",
              notation: "compact",
            }).format(totalReturns)}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-white/70">Crescimento</p>
          <div className="flex items-center justify-center gap-1">
            {getGrowthIcon()}
            <p className={`text-sm font-semibold ${getGrowthColor()}`}>
              {growthRate.toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Gráfico */}
      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={performanceData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#60a5fa" stopOpacity={0.05}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-white/20" />
            <XAxis 
              dataKey="month" 
              className="text-xs text-white/70"
              tick={{ fontSize: 12, fill: "rgba(255, 255, 255, 0.7)" }}
            />
            <YAxis
              className="text-xs text-white/70"
              tick={{ fontSize: 12, fill: "rgba(255, 255, 255, 0.7)" }}
              tickFormatter={(value) =>
                new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                  notation: "compact",
                }).format(value)
              }
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                const data = performanceData.find(d => d.value === value)
                if (!data) return [value, name]
                
                return [
                  <div key="tooltip" className="space-y-1">
                    <div className="font-semibold text-white">
                      {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(data.value)}
                    </div>
                    <div className="text-xs text-white/70">
                      Investido: {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(data.invested)}
                    </div>
                    <div className="text-xs text-green-300">
                      Retornos: +{new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      }).format(data.returns)}
                    </div>
                    <div className="text-xs text-white">
                      Crescimento: {data.growth.toFixed(1)}%
                    </div>
                  </div>,
                  "Valor Total"
                ]
              }}
              labelStyle={{ color: "white" }}
              contentStyle={{
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "8px",
                boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.3)",
              }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#60a5fa"
              strokeWidth={3}
              fill="url(#colorValue)"
              dot={{ fill: "#60a5fa", strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: "#60a5fa", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Informações adicionais */}
      <div className="text-xs text-white/70 text-center">
        <p>Performance baseada em juros compostos • Período: {performanceData.length} meses</p>
      </div>
    </div>
  )
}
