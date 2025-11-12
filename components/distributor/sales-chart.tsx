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
  if (!distributorId || !user) {
    return;
  }
  fetchSalesData();
}, [distributorId, user]);

  const fetchSalesData = async () => {
    if (!distributorId) {
      setSalesData([]);
      setLoading(false);
      return;
    }

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
        .order("created_at", { ascending: false });

      if (user?.role === "escritorio") {
        query = query.eq("office_id", distributorId);
      } else {
        query = query.eq("parent_id", distributorId);
      }

      const { data: investors, error: investorsError } = await query;

      if (investorsError) {
        console.error("Erro ao buscar dados de vendas:", investorsError);
        setSalesData([]);
        return;
      }

      const profileIds = (investors ?? []).map((p) => p.id);

      const { data: investments, error: investmentsError } = await supabase
        .from("investments")
        .select("*")
        .eq("status", "active")
        .in("user_id", profileIds);

      if (investmentsError) {
        console.error("Erro ao buscar investimentos para o gráfico:", investmentsError);
        setSalesData([]);
        return;
      }

      const currentDate = new Date();

      const activeInvestments =
        investments?.filter((investment) => {
          if (!investment.payment_date) {
            return false;
          }
          const paymentDate = new Date(investment.payment_date);
          return paymentDate >= sixMonthsAgo && paymentDate <= currentDate;
        }) ?? [];

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
      for (let i = 5; i >= 0; i--) {
        const date = new Date(
          currentDate.getFullYear(),
          currentDate.getMonth() - i,
          1
        );
        const monthKey = months[date.getMonth()];
        monthlyData[monthKey] = { captured: 0, commission: 0 };
      }

      // Processar investimentos ativos e agrupar por mês da payment_date
      activeInvestments.forEach((investment) => {
        const paymentDate = new Date(investment.payment_date);
        const monthKey = months[paymentDate.getMonth()];

        if (monthlyData[monthKey]) {
          const investmentValue = Number(investment.amount) || 0;
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
