"use client"

import { useState, useEffect } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts"
import { createBrowserClient } from "@supabase/ssr"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { getRateByPeriodAndLiquidity as getRateFromDB } from "@/lib/rentability-utils"
import { useUserType } from "@/hooks/useUserType"

interface PerformanceDataPoint {
  month: string
  year: number
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
  payment_date?: string | null
  profitability_liquidity?: string | null
  commitment_period?: number | null
  status: string
}

export function PerformanceChart() {
  const [performanceData, setPerformanceData] = useState<PerformanceDataPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [totalInvested, setTotalInvested] = useState(0)
  const [totalReturns, setTotalReturns] = useState(0)
  const [growthRate, setGrowthRate] = useState(0)
  const [hasOnlySimpleInterest, setHasOnlySimpleInterest] = useState(false)
  const [isExternalAdvisorInvestor, setIsExternalAdvisorInvestor] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [rateCache, setRateCache] = useState<Record<string, number>>({})
  
  // Usar hook para obter user_type_id
  const { user_type_id } = useUserType(user?.id)

  useEffect(() => {
    const userStr = localStorage.getItem("user")
    if (userStr) {
      setUser(JSON.parse(userStr))
    }
  }, [])

  // Função para obter taxa usando APENAS user_type_id -> rentability_id -> função get
  // Usa cache para permitir uso síncrono dentro de loops
  const getRateByPeriodAndLiquidity = (period: number, liquidity: string, isExternalAdvisor: boolean = false): number => {
    const cacheKey = `${period}-${liquidity}`
    
    // Se já está no cache, retornar
    if (rateCache[cacheKey] !== undefined) {
      return rateCache[cacheKey]
    }
    
    // Se não tem user_type_id, retornar taxa do investimento ou 0
    // Isso será atualizado quando o cache for carregado
    return 0
  };
  
  // Pré-carregar todas as taxas necessárias antes de gerar os dados
  const preloadRates = async (investments: Investment[]) => {
    if (!user_type_id) return
    
    const uniqueRates = new Set<string>()
    investments.forEach(inv => {
      const period = inv.commitment_period || 12
      const liquidity = inv.profitability_liquidity || "Mensal"
      uniqueRates.add(`${period}-${liquidity}`)
    })
    
    // Carregar todas as taxas em paralelo
    const ratePromises = Array.from(uniqueRates).map(async (key) => {
      const [period, liquidity] = key.split('-')
      try {
        const rate = await getRateFromDB(user_type_id, Number(period), liquidity)
        return { key, rate: rate > 0 ? rate : 0 }
      } catch (error) {
        console.error(`[PerformanceChart] Erro ao carregar taxa ${key}:`, error)
        return { key, rate: 0 }
      }
    })
    
    const rates = await Promise.all(ratePromises)
    const newCache: Record<string, number> = {}
    rates.forEach(({ key, rate }) => {
      newCache[key] = rate
    })
    
    setRateCache(newCache)
  }

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
    
    // Verificar se todos os investimentos são de liquidez mensal (juros simples)
    const allMensal = investments.length > 0 && investments.every(inv => 
      (inv.profitability_liquidity || "Mensal") === "Mensal"
    )
    setHasOnlySimpleInterest(allMensal)
    
    // Encontrar o mês mais antigo dos investimentos (usando payment_date quando disponível)
    // Sempre começar do mês de depósito mais antigo, sem limite mínimo
    const firstInvestmentDate = new Date(investments[0]?.payment_date || investments[0]?.created_at || new Date())
    const oldestInvestment = investments.reduce((oldest, inv) => {
      const invDate = new Date(inv.payment_date || inv.created_at)
      // Normalizar para o primeiro dia do mês para comparação correta
      const invMonthStart = new Date(invDate.getFullYear(), invDate.getMonth(), 1)
      const oldestMonthStart = new Date(oldest.getFullYear(), oldest.getMonth(), 1)
      return invMonthStart < oldestMonthStart ? invMonthStart : oldestMonthStart
    }, new Date(firstInvestmentDate.getFullYear(), firstInvestmentDate.getMonth(), 1))
    
    // Calcular quantos meses atrás começar (sempre do mês de depósito mais antigo até o mês atual)
    const monthsBack = Math.max(1,
      (currentDate.getFullYear() - oldestInvestment.getFullYear()) * 12 + 
      (currentDate.getMonth() - oldestInvestment.getMonth()) + 1
    )
    
    // Debug: Log para verificar os dados
    console.log('Investments data:', investments.map(inv => ({
      id: inv.id,
      amount: inv.amount,
      created_at: inv.created_at,
      payment_date: inv.payment_date,
      date: new Date(inv.payment_date || inv.created_at).toLocaleDateString('pt-BR')
    })))
    console.log('Withdrawals data:', withdrawals.map(w => ({
      investment_id: w.investment_id,
      amount: w.amount,
      created_at: w.created_at
    })))
    console.log('Oldest investment:', oldestInvestment.toLocaleDateString('pt-BR'))
    console.log('Months back:', monthsBack)
    
    // Gerar dados a partir do mês de depósito mais antigo até o mês atual
    // Começar do mês mais antigo encontrado
    const startMonth = oldestInvestment.getMonth()
    const startYear = oldestInvestment.getFullYear()
    
    for (let i = 0; i < monthsBack; i++) {
      // Calcular o mês atual do loop
      const targetDate = new Date(startYear, startMonth + i, 1)
      // Ajustar para o final do mês para incluir investimentos feitos em qualquer dia do mês
      const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0)
      const monthKey = `${months[targetDate.getMonth()]}/${targetDate.getFullYear()}`
      const monthNumber = targetDate.getMonth()
      const year = targetDate.getFullYear()
      
      let totalValue = 0
      let totalInvestedInPeriod = 0
      let totalReturnsInPeriod = 0
      
      // Calcular valor acumulado até este mês para cada investimento
      investments.forEach((investment) => {
        // Usar payment_date quando disponível, caso contrário usar created_at
        const investmentDate = new Date(investment.payment_date || investment.created_at)
        // Normalizar para o primeiro dia do mês de investimento
        const investmentMonthStart = new Date(investmentDate.getFullYear(), investmentDate.getMonth(), 1)
        
        // Se o investimento foi feito antes ou durante este mês
        if (investmentMonthStart <= endOfMonth) {
          const amount = Number(investment.amount)
          const liquidity = investment.profitability_liquidity || "Mensal"
          const commitmentPeriod = investment.commitment_period || 12
          
          // Buscar taxa do cache (pré-carregado) ou usar monthly_return_rate do investimento como fallback
          const cachedRate = getRateByPeriodAndLiquidity(commitmentPeriod, liquidity, isExternalAdvisorInvestor)
          const rate = cachedRate > 0 
            ? cachedRate 
            : (Number(investment.monthly_return_rate) || 0.02)
          
          // Calcular meses completos decorridos desde o mês de investimento até o mês atual
          // Para juros simples mensal, conta desde o mês de depósito (inclusive)
          let monthsElapsed = (endOfMonth.getFullYear() - investmentMonthStart.getFullYear()) * 12 + 
                              (endOfMonth.getMonth() - investmentMonthStart.getMonth())
          
          // Garantir que não seja negativo
          if (monthsElapsed < 0) monthsElapsed = 0
          
          // Para juros simples mensal, sempre considerar pelo menos 1 mês se estamos no mesmo mês ou depois
          // O retorno mensal é pago no final de cada mês, então conta desde o mês de depósito (inclusive)
          if (liquidity === "Mensal") {
            // Sempre adicionar 1 para incluir o mês atual no cálculo acumulativo
            // Exemplo: depósito em Jan, estamos em Abr = 3 meses de diferença + 1 = 4 meses de retorno acumulado
            monthsElapsed = monthsElapsed + 1
          }
          
          // Para juros simples mensal, o retorno é calculado sobre o valor ORIGINAL (antes de resgates)
          // pois os retornos são pagos separadamente e não são afetados por resgates posteriores
          let currentValue: number
          let returns: number
          
          // Para liquidez "Mensal": juros simples (retorno mensal fixo sobre o valor inicial)
          // Para outras liquidezes: juros compostos
          if (liquidity === "Mensal") {
            // JUROS SIMPLES: 
            // - Valor Atual = Principal disponível (valor original - resgates)
            // - Retornos = Valor ORIGINAL × taxa × meses completos (acumulados desde o depósito, independente de resgates)
            const monthlyReturn = amount * rate // Retorno mensal baseado no valor ORIGINAL
            const totalWithdrawn = withdrawals
              .filter(w => w.investment_id === investment.id && new Date(w.created_at) <= endOfMonth)
              .reduce((sum, w) => sum + Number(w.amount), 0)
            
            currentValue = Math.max(0, amount - totalWithdrawn) // Valor atual = principal - resgates
            returns = monthlyReturn * monthsElapsed // Retornos acumulados desde o depósito
          } else {
            // JUROS COMPOSTOS: 
            // - Valor Atual = Principal × (1 + taxa)^tempo (acumula com juros)
            // - Retornos = Valor Atual - Principal
            const totalWithdrawn = withdrawals
              .filter(w => w.investment_id === investment.id && new Date(w.created_at) <= endOfMonth)
              .reduce((sum, w) => sum + Number(w.amount), 0)
            
            const availableAmount = Math.max(0, amount - totalWithdrawn)
            currentValue = availableAmount * Math.pow(1 + rate, monthsElapsed)
            returns = currentValue - availableAmount
          }
          
          totalValue += currentValue
          totalInvestedInPeriod += amount // Sempre usar o valor original investido
          totalReturnsInPeriod += returns
        }
      })
      
      // Calcular crescimento percentual
      const growth = totalInvestedInPeriod > 0 ? ((totalValue - totalInvestedInPeriod) / totalInvestedInPeriod) * 100 : 0
      
      data.push({
        month: monthKey,
        year,
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

      // Verificar se é investidor de assessor externo
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, parent_id, assessor_id")
        .eq("id", user.id)
        .single()

      if (profile) {
        const advisorId = (profile as any).parent_id || (profile as any).assessor_id
        if (advisorId) {
          const { data: advisorProfile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", advisorId)
            .single()

          if (advisorProfile && advisorProfile.role === "assessor_externo") {
            setIsExternalAdvisorInvestor(true)
          } else {
            setIsExternalAdvisorInvestor(false)
          }
        }
      }

      // Buscar investimentos ativos do usuário
      const { data: investments, error } = await supabase
        .from("investments")
        .select("id, amount, monthly_return_rate, created_at, payment_date, profitability_liquidity, commitment_period, status")
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
        const currentYear = new Date().getFullYear()
        const emptyData = months.map((month, index) => ({
          month: `${month}/${currentYear}`,
          year: currentYear,
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

      // Pré-carregar todas as taxas necessárias antes de gerar os dados
      await preloadRates(investments || [])

      // Gerar dados de performance baseados nos investimentos reais e resgates (agora com taxas no cache)
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
              tick={{ fontSize: 11, fill: "rgba(255, 255, 255, 0.7)" }}
              angle={-45}
              textAnchor="end"
              height={60}
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
              formatter={(value: number, name: string, props: any) => {
                // Usar o payload diretamente do tooltip ao invés de buscar no array
                const payload = props?.payload
                const data = payload || performanceData.find(d => d.value === value)
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
                  "Valor Atual"
                ]
              }}
              labelFormatter={(label) => {
                return label || ""
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
        <p>
          Performance baseada em {hasOnlySimpleInterest ? "juros simples" : "juros simples e compostos"} • Período: {performanceData.length} meses
        </p>
      </div>
    </div>
  )
}
