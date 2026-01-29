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
import { useUserType } from "@/hooks/useUserType";
import { getCommissionRate } from "@/lib/commission-utils";

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
  const { user_type_id } = useUserType();

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);
    }
  }, []);

useEffect(() => {
  if (!distributorId || !user || !user_type_id) {
    return;
  }
  fetchSalesData();
}, [distributorId, user, user_type_id]);

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

      // Tentar buscar usando user_type_id primeiro, com fallback para user_type legado
      let query = supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      // Buscar user_type_id do tipo "investor"
      const { data: investorUserType } = await supabase
        .from("user_types")
        .select("id")
        .eq("user_type", "investor")
        .single();

      if (investorUserType) {
        // Usar nova lógica com user_type_id
        query = query.eq("user_type_id", investorUserType.id);
      } else {
        // Fallback: usar user_type legado
        console.warn("[SalesChart] user_type_id não encontrado, usando user_type legado");
        query = query.eq("user_type", "investor");
      }

      // Verificar se o usuário logado é escritório ou assessor
      const { data: currentUserProfile } = await supabase
        .from("profiles")
        .select("user_type_id, distributor_id")
        .eq("id", distributorId)
        .single();

      if (currentUserProfile) {
        // Se tiver user_type_id, verificar o tipo
        if (currentUserProfile.user_type_id) {
          const { data: currentUserType } = await supabase
            .from("user_types")
            .select("user_type")
            .eq("id", currentUserProfile.user_type_id)
            .single();

          if (currentUserType?.user_type === "office") {
            query = query.eq("office_id", distributorId);
          } else {
            // Para assessor ou distribuidor, usar parent_id
            query = query.eq("parent_id", distributorId);
          }
        } else {
          // Fallback: usar lógica antiga baseada em role
          if (user?.role === "escritorio") {
            query = query.eq("office_id", distributorId);
          } else {
            query = query.eq("parent_id", distributorId);
          }
        }
      } else {
        // Se não encontrar perfil, usar parent_id como padrão
        query = query.eq("parent_id", distributorId);
      }

      const { data: investors, error: investorsError } = await query;
      
      console.log("[SalesChart] Investidores encontrados:", investors?.length || 0);
      console.log("[SalesChart] Erro na busca:", investorsError);

      if (investorsError) {
        console.error("Erro ao buscar dados de vendas:", investorsError);
        setSalesData([]);
        return;
      }

      const profileIds = (investors ?? []).map((p) => p.id);
      
      console.log("[SalesChart] IDs dos investidores:", profileIds);

      if (profileIds.length === 0) {
        console.warn("[SalesChart] Nenhum investidor encontrado");
        setSalesData([]);
        setLoading(false);
        return;
      }

      const { data: investments, error: investmentsError } = await supabase
        .from("investments")
        .select("*")
        .eq("status", "active")
        .in("user_id", profileIds);

      if (investmentsError) {
        console.error("Erro ao buscar investimentos para o gráfico:", investmentsError);
        setSalesData([]);
        setLoading(false);
        return;
      }
      
      console.log("[SalesChart] Investimentos encontrados:", investments?.length || 0);

      const currentDate = new Date();

      const activeInvestments =
        investments?.filter((investment) => {
          if (!investment.payment_date) {
            return false;
          }
          const paymentDate = new Date(investment.payment_date);
          return paymentDate >= sixMonthsAgo && paymentDate <= currentDate;
        }) ?? [];

      console.log("[SalesChart] Investimentos ativos nos últimos 6 meses:", activeInvestments.length);

      // Buscar taxa de comissão do banco (sempre usa período de 12 meses e liquidez mensal para comissões)
      let commissionRate = 0;
      if (user_type_id) {
        commissionRate = await getCommissionRate(user_type_id, 12, "Mensal");
        console.log("[SalesChart] Taxa de comissão obtida:", commissionRate, `(${(commissionRate * 100).toFixed(2)}%)`);
      } else {
        console.warn("[SalesChart] user_type_id não disponível, não será possível calcular comissão");
      }
      
      if (commissionRate === 0) {
        console.warn("[SalesChart] Taxa de comissão não encontrada, usando 0");
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
          // commissionRate já vem em decimal (ex: 0.03 para 3%)
          monthlyData[monthKey].commission += investmentValue * commissionRate;
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
            labelStyle={{ color: "#01223F", fontWeight: 600 }}
            contentStyle={{
              backgroundColor: "rgba(255,255,255,0.98)",
              border: "1px solid rgba(15,23,42,0.12)",
              borderRadius: "8px",
              boxShadow: "0 10px 25px rgba(15,23,42,0.25)",
              color: "#01223F",
            }}
            itemStyle={{ color: "#01223F", fontSize: 12 }}
            cursor={{ fill: "rgba(255,255,255,0.12)" }}
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
