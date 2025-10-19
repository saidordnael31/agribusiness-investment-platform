"use client";

import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { createClient } from "@/lib/supabase/client";
import { Loader2 } from "lucide-react";

interface SalesData {
  month: string;
  captured: number;
  commission: number;
}

interface SalesChartProps {
  distributorId?: string;
}

export function SalesChart({ distributorId }: SalesChartProps) {
  const [user, setUser] = useState<any>(null);
  const [salesData, setSalesData] = useState<SalesData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
    }
  }, []);

  useEffect(() => {
    fetchSalesData();
  }, [distributorId]);

  const fetchSalesData = async () => {
    let investorsWithInvestments: any[] = [];
    try {
      setLoading(true);

      const supabase = createClient();

      // Buscar investimentos dos últimos 6 meses
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      let query = supabase
        .from("profiles")
        .select("*")
        .eq("user_type", "investor")
        .eq("parent_id", distributorId)
        .order("created_at", { ascending: false });

      const { data: investors, error: investorsError } = await query;

      if (investorsError) {
        console.error("Erro ao buscar dados de vendas:", investorsError);
        setSalesData([]);
        return;
      }

      if (!investorsError && investors.length > 0) {
        const profileIds = investors.map((p) => p.id);

        const { data: investments, error: investmentsError } = await supabase
          .from("investments")
          .select("*")
          .eq("status", "active")
          .in("user_id", profileIds); // <-- aqui, não .eq()

        // Junta os dados manualmente
        const investorsWithInvestmentsMapped = investors.map((profile) => ({
          ...profile,
          investments: investments?.filter((inv) => inv.user_id === profile.id),
        }));
        investorsWithInvestments = investorsWithInvestmentsMapped;
      }

      // Processar dados para o gráfico
      const monthlyData: {
        [key: string]: { captured: number; commission: number };
      } = {};

      // Inicializar últimos 6 meses com valores zero
      const months = [
        "Jan",
        "Fev",
        "Mar",
        "Abr",
        "Mai",
        "Jun",
        "Jul",
        "Ago",
        "Set",
        "Out",
        "Nov",
        "Dez",
      ];
      const currentDate = new Date();

      for (let i = 5; i >= 0; i--) {
        const date = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() - i,
          1
        );
        const monthKey = months[date.getMonth()];
        monthlyData[monthKey] = { captured: 0, commission: 0 };
      }

      // Processar investidores e extrair valores das notes
      investorsWithInvestments?.forEach((investor) => {
        const paymentDate = investor.payment_date ? new Date(investor.payment_date) : new Date(investor.created_at);
        const monthKey = months[paymentDate.getMonth()];

        if (monthlyData[monthKey]) {
          // Tentar extrair valor do investimento das notes (formato: "CPF: xxx | External ID: xxx | Investment: xxx")
          let investmentValue = 0;
          if (investor.investments?.length > 0) {
            const investmentMatch = investor.investments.reduce(
              (acc: number, curr: any) => acc + curr.amount,
              0
            );
            if (investmentMatch) {
              investmentValue = Number.parseFloat(investmentMatch);
            }
          }

          // Se não encontrar nas notes, usar valor padrão mínimo
          if (investmentValue === 0) {
            investmentValue = 1000; // Valor mínimo padrão
          }

          monthlyData[monthKey].captured += investmentValue;
          monthlyData[monthKey].commission +=
            investmentValue * (user?.role === "escritorio" ? 0.01 : user?.role === "investor" ? 0.02 : 0.03);
        }
      });

      // Converter para array para o gráfico
      const chartData: SalesData[] = Object.entries(monthlyData).map(
        ([month, data]) => ({
          month,
          captured: data.captured,
          commission: data.commission,
        })
      );

      setSalesData(chartData);
    } catch (error) {
      console.error("Erro ao processar dados de vendas:", error);
      setSalesData([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-[400px] w-full flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando dados de vendas...</p>
        </div>
      </div>
    );
  }

  if (
    salesData.length === 0 ||
    salesData.every((data) => data.captured === 0)
  ) {
    return (
      <div className="h-[400px] w-full flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">
            Nenhum dado de vendas disponível
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Os dados aparecerão aqui conforme os investimentos forem realizados
          </p>
        </div>
      </div>
    );
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
          <Bar
            dataKey="captured"
            fill="hsl(var(--primary))"
            radius={[4, 4, 0, 0]}
          />
          <Bar
            dataKey="commission"
            fill="hsl(var(--secondary))"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
