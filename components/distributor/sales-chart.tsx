"use client"

import { useState, useEffect } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { createClient } from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

interface SalesData {
  month: string
  captured: number
  commission: number
}

interface SalesChartProps {
  distributorId?: string
}

export function SalesChart({ distributorId }: SalesChartProps) {
  const [salesData, setSalesData] = useState<SalesData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSalesData()
  }, [distributorId])

  const fetchSalesData = async () => {
    try {
      setLoading(true)

      const supabase = createClient()

      // Buscar investimentos dos últimos 6 meses
      const sixMonthsAgo = new Date()
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

      let query = supabase
        .from("profiles")
        .select("created_at, notes")
        .eq("user_type", "investor")
        .gte("created_at", sixMonthsAgo.toISOString())
        .order("created_at", { ascending: true })

      // Se distributorId for fornecido, filtrar apenas investidores deste distribuidor
      if (distributorId) {
        query = query.eq("parent_id", distributorId)
      }

      const { data: investors, error } = await query

      if (error) {
        console.error("Erro ao buscar dados de vendas:", error)
        setSalesData([])
        return
      }

      // Processar dados para o gráfico
      const monthlyData: { [key: string]: { captured: number; commission: number } } = {}

      // Inicializar últimos 6 meses com valores zero
      const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
      const currentDate = new Date()

      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
        const monthKey = months[date.getMonth()]
        monthlyData[monthKey] = { captured: 0, commission: 0 }
      }

      // Processar investidores e extrair valores das notes
      investors?.forEach((investor) => {
        const createdDate = new Date(investor.created_at)
        const monthKey = months[createdDate.getMonth()]

        if (monthlyData[monthKey]) {
          // Tentar extrair valor do investimento das notes (formato: "CPF: xxx | External ID: xxx | Investment: xxx")
          let investmentValue = 0
          if (investor.notes?.includes("Investment:")) {
            const investmentMatch = investor.notes.match(/Investment:\s*(\d+(?:\.\d+)?)/)
            if (investmentMatch) {
              investmentValue = Number.parseFloat(investmentMatch[1])
            }
          }

          // Se não encontrar nas notes, usar valor padrão mínimo
          if (investmentValue === 0) {
            investmentValue = 1000 // Valor mínimo padrão
          }

          monthlyData[monthKey].captured += investmentValue
          monthlyData[monthKey].commission += investmentValue * 0.03 // 3% de comissão
        }
      })

      // Converter para array para o gráfico
      const chartData: SalesData[] = Object.entries(monthlyData).map(([month, data]) => ({
        month,
        captured: data.captured,
        commission: data.commission,
      }))

      setSalesData(chartData)
    } catch (error) {
      console.error("Erro ao processar dados de vendas:", error)
      setSalesData([])
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="h-[400px] w-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando dados de vendas...</p>
        </div>
      </div>
    )
  }

  if (salesData.length === 0 || salesData.every((data) => data.captured === 0)) {
    return (
      <div className="h-[400px] w-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Nenhum dado de vendas disponível</p>
          <p className="text-sm text-muted-foreground mt-2">
            Os dados aparecerão aqui conforme os investimentos forem realizados
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[400px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={salesData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="month" className="text-xs" />
          <YAxis
            className="text-xs"
            tickFormatter={(value) =>
              new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
                notation: "compact",
              }).format(value)
            }
          />
          <Tooltip
            formatter={(value: number, name: string) => [
              new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL",
              }).format(value),
              name === "captured" ? "Captado" : "Comissão",
            ]}
            labelStyle={{ color: "hsl(var(--foreground))" }}
            contentStyle={{
              backgroundColor: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
            }}
          />
          <Bar dataKey="captured" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          <Bar dataKey="commission" fill="hsl(var(--secondary))" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
