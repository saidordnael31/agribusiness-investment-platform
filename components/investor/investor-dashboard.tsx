"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TrendingUp, DollarSign, ArrowUpRight } from "lucide-react";
import { InvestmentSimulator } from "./investment-simulator";
import { InvestmentHistory } from "./investment-history";
import { PerformanceChart } from "./performance-chart";
import { createBrowserClient } from "@supabase/ssr";

interface UserData {
  name: string;
  email: string;
  type: string;
  id?: string;
  rescue_type?: string;
}

interface InvestmentData {
  totalInvested: number;
  currentValue: number;
  monthlyReturn: number;
  seniorQuota: number;
  subordinateQuota: number;
}

interface TransactionHistoryItem {
  id: string;
  type: "investment" | "withdrawal" | "return";
  amount: number;
  status: string;
  created_at: string;
  quota_type?: string;
  description?: string;
}

export function InvestorDashboard() {
  const [user, setUser] = useState<UserData | null>(null);
  const [investmentsData, setInvestmentsData] = useState<any[]>([]);
  const [transactionHistory, setTransactionHistory] = useState<
    TransactionHistoryItem[]
  >([]);
  const [investments, setInvestments] = useState<InvestmentData>({
    totalInvested: 0,
    currentValue: 0,
    monthlyReturn: 0,
    seniorQuota: 0,
    subordinateQuota: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchTransactionHistory = async (userId: string) => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Buscar investimentos
      const { data: investmentsRaw, error: investmentsError } = await supabase
        .from("investments")
        .select("*")
        .eq("user_id", userId);
      // .eq("status", "active");

      // Buscar transações (resgates)
      const { data: transactionsRaw, error: transactionsError } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .in("type", ["withdrawal", "return"])
        .order("created_at", { ascending: false });

      if (investmentsError) {
        console.error("[v0] Erro ao buscar investimentos:", investmentsError);
      }

      if (transactionsError) {
        console.error("[v0] Erro ao buscar transações:", transactionsError);
      }

      const historyItems: TransactionHistoryItem[] = [];

      // Adicionar investimentos
      if (investmentsRaw) {
        investmentsRaw.forEach((investment) => {
          historyItems.push({
            id: investment.id,
            type: "investment",
            amount: Number(investment.amount),
            status: investment.status,
            created_at: investment.created_at,
            quota_type: investment.quota_type,
            description: `Investimento`,
          });
        });
      }

      // Adicionar transações (resgates e retornos)
      if (transactionsRaw) {
        transactionsRaw.forEach((transaction) => {
          historyItems.push({
            id: transaction.id,
            type: transaction.type === "withdrawal" ? "withdrawal" : "return",
            amount: Number(transaction.amount),
            status: transaction.status,
            created_at: transaction.created_at,
            description:
              transaction.type === "withdrawal"
                ? "Resgate"
                : "Retorno de investimento",
          });
        });
      }

      // Ordenar por data (mais recente primeiro)
      historyItems.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTransactionHistory(historyItems);
      console.log("[v0] Histórico de transações carregado:", historyItems);
    } catch (error) {
      console.error("[v0] Erro ao carregar histórico de transações:", error);
    }
  };

  const fetchInvestmentData = async (userId: string) => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      // Buscar investimentos ativos
      const { data: investmentsRaw, error: investmentsError } = await supabase
        .from("investments")
        .select(
          "id, amount, quota_type, monthly_return_rate, payment_date, created_at, status"
        )
        .eq("user_id", userId)
        .eq("status", "active");

      // Buscar resgates
      const { data: withdrawalsRaw, error: withdrawalsError } = await supabase
        .from("transactions")
        .select("amount, created_at, investment_id")
        .eq("user_id", userId)
        .eq("type", "withdrawal")
        // .eq("status", "completed");

      if (investmentsError || withdrawalsError) {
        console.error(
          "Erro ao buscar dados:",
          investmentsError || withdrawalsError
        );
        return;
      }

      if (!investmentsRaw || investmentsRaw.length === 0) {
        setInvestments({
          totalInvested: 0,
          currentValue: 0,
          monthlyReturn: 0,
          seniorQuota: 0,
          subordinateQuota: 0,
        });
        return;
      }

      // --- CALCULANDO ---
      const today = new Date();

      // Total investido bruto (sem resgates)
      const totalInvested = investmentsRaw.reduce(
        (sum, inv) => sum + Number(inv.amount),
        0
      );

      // Total de resgates
      const totalWithdrawals =
        withdrawalsRaw?.reduce((sum, w) => sum + Number(w.amount), 0) || 0;

      // Calcular rendimento acumulado de cada investimento usando juros compostos
      let totalReturn = 0;
      investmentsRaw.forEach((inv) => {
        const monthsPassed = Math.floor(
          (today.getTime() - new Date(inv.created_at).getTime()) /
            (1000 * 60 * 60 * 24 * 30)
        );

        const monthlyRate = Number(inv.monthly_return_rate) || 0.02; // 2% padrão
        const amount = Number(inv.amount);

        // Calcular resgates específicos deste investimento
        const investmentWithdrawals =
          withdrawalsRaw?.filter((w) => w.investment_id === inv.id) || [];
        const totalWithdrawnFromInvestment = investmentWithdrawals.reduce(
          (sum, w) => sum + Number(w.amount),
          0
        );

        // Valor disponível = valor original - resgates específicos
        const availableAmount = Math.max(
          0,
          amount - totalWithdrawnFromInvestment
        );

        // JUROS COMPOSTOS: Valor = Principal × (1 + taxa)^tempo
        const compoundValue =
          availableAmount * Math.pow(1 + monthlyRate, monthsPassed);
        const investmentReturn = compoundValue - availableAmount;

        totalReturn += investmentReturn;
      });

      // Calcular valor atual considerando resgates por investimento
      let currentValue = 0;
      let totalInvestedAfterWithdrawals = 0;

      investmentsRaw.forEach((inv) => {
        const amount = Number(inv.amount);
        const monthlyRate = Number(inv.monthly_return_rate) || 0.02;
        const paymentDate = inv.payment_date
          ? new Date(inv.payment_date)
          : new Date(inv.created_at);
        const monthsPassed = Math.floor(
          (today.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );

        // Calcular resgates específicos deste investimento
        const investmentWithdrawals =
          withdrawalsRaw?.filter((w) => w.investment_id === inv.id) || [];
        const totalWithdrawnFromInvestment = investmentWithdrawals.reduce(
          (sum, w) => sum + Number(w.amount),
          0
        );

        // Valor disponível = valor original - resgates específicos
        const availableAmount = Math.max(
          0,
          amount - totalWithdrawnFromInvestment
        );

        // JUROS COMPOSTOS: Valor = Principal × (1 + taxa)^tempo
        const compoundValue =
          availableAmount * Math.pow(1 + monthlyRate, monthsPassed);

        currentValue += compoundValue;
        totalInvestedAfterWithdrawals += availableAmount;
      });

      // Separar por tipo de cota (considerando resgates)
      const seniorQuota = investmentsRaw
        .filter((inv) => inv.quota_type === "senior")
        .reduce((sum, inv) => {
          const amount = Number(inv.amount);
          const investmentWithdrawals =
            withdrawalsRaw?.filter((w) => w.investment_id === inv.id) || [];
          const totalWithdrawnFromInvestment = investmentWithdrawals.reduce(
            (sum, w) => sum + Number(w.amount),
            0
          );
          return sum + Math.max(0, amount - totalWithdrawnFromInvestment);
        }, 0);

      const subordinateQuota = investmentsRaw
        .filter((inv) => inv.quota_type === "subordinate")
        .reduce((sum, inv) => {
          const amount = Number(inv.amount);
          const investmentWithdrawals =
            withdrawalsRaw?.filter((w) => w.investment_id === inv.id) || [];
          const totalWithdrawnFromInvestment = investmentWithdrawals.reduce(
            (sum, w) => sum + Number(w.amount),
            0
          );
          return sum + Math.max(0, amount - totalWithdrawnFromInvestment);
        }, 0);

      // Retorno mensal baseado no valor atual
      const monthlyReturn = currentValue * 0.02; // 2% sobre valor atual

      setInvestments({
        totalInvested: totalInvestedAfterWithdrawals,
        currentValue,
        monthlyReturn,
        seniorQuota,
        subordinateQuota,
      });

      setInvestmentsData(investmentsRaw);
    } catch (error) {
      console.error("Erro ao carregar dados de investimento:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) {
      const userData = JSON.parse(userStr);
      setUser(userData);

      if (userData.id) {
        fetchInvestmentData(userData.id);
        fetchTransactionHistory(userData.id);
      }
    } else {
      setLoading(false);
    }
  }, []);

  if (!user) return null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white/80">
            Carregando seus investimentos...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-6 md:py-8">
        {/* Welcome Section */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                Bem-vindo, {user.name}
              </h2>
              <p className="text-white/80">
                Acompanhe seus investimentos no Clube AGRINVEST
              </p>
            </div>
          </div>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
          <Card className="bg-gradient-to-b from-[#00BC6E] to-[#003F28] border-0 p-6 relative overflow-hidden" style={{ borderRadius: '15px' }}>
            <div className="absolute right-0 top-0 bottom-0 opacity-20 flex items-center justify-center">
              <img 
                src="/icons/paid.svg" 
                alt="Paid Icon" 
                className="h-full w-auto max-w-none"
              />
            </div>
            <CardHeader className="space-y-0 pb-2">
              <CardTitle className="text-white font-urbanist font-medium text-lg sm:text-xl leading-7">
                Total Investido
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-white font-ibm-plex-sans font-bold text-2xl sm:text-4xl leading-7">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(investments.totalInvested)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-b from-[#00BC6E] to-[#003F28] border-0 p-6 relative overflow-hidden" style={{ borderRadius: '15px' }}>
            <div className="absolute right-0 top-0 bottom-0 opacity-20 flex items-center justify-center">
              <img 
                src="/icons/trending_up.svg" 
                alt="Trending Up Icon" 
                className="h-full w-auto max-w-none"
              />
            </div>
            <CardHeader className="space-y-0 pb-2">
              <CardTitle className="text-white font-urbanist font-medium text-lg sm:text-xl leading-7">
                Valor Atual
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-[#00BC6E] font-ibm-plex-sans font-bold text-2xl sm:text-4xl leading-7" style={{ textShadow: '0px 2px 4px rgba(0, 0, 0, 0.3)' }}>
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(investments.currentValue)}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-b from-[#00BC6E] to-[#003F28] border-0 p-6 relative overflow-hidden" style={{ borderRadius: '15px' }}>
            <div className="absolute right-0 top-0 bottom-0 opacity-20 flex items-center justify-center">
              <img 
                src="/icons/payment_arrow_down.svg" 
                alt="Payment Arrow Down Icon" 
                className="h-full w-auto max-w-none"
              />
            </div>
            <CardHeader className="space-y-0 pb-2">
              <CardTitle className="text-white font-urbanist font-medium text-lg sm:text-xl leading-7">
                Retorno Mensal
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              <div className="text-[#00BC6E] font-ibm-plex-sans font-bold text-2xl sm:text-4xl leading-7" style={{ textShadow: '0px 2px 4px rgba(0, 0, 0, 0.3)' }}>
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(investments.monthlyReturn)}
              </div>
              <p className="text-white text-xs sm:text-sm mt-1">
                Baseado na rentabilidade das cotas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Investment Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6 md:mb-8">
          <Card className="bg-gradient-to-b from-[#D9D9D9] to-[#003F28] border-0 p-6 relative overflow-hidden" style={{ borderRadius: '15px', background: 'linear-gradient(to bottom, #D9D9D9, rgba(0, 63, 40, 0.6))' }}>
            <CardHeader>
              <CardTitle className="text-[#003F28] font-urbanist font-extrabold text-2xl sm:text-3xl lg:text-[35px] leading-[28px]">
                Histórico de Transações
              </CardTitle>
              <CardDescription className="text-[#4A4D4C] font-ibm-plex-sans font-normal text-base sm:text-lg lg:text-xl leading-9">
                Seus investimentos e resgates no Clube AGRINVEST
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {transactionHistory.length > 0 &&
                transactionHistory.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col p-4 border border-white/20 rounded-lg space-y-2 bg-white/5"
                  >
                    <div className="flex flex-row justify-between items-center w-full">
                      <div className="flex flex-col gap-1">
                        <span className="font-semibold text-white">
                          {item.type === "investment"
                            ? "Investimento"
                            : item.type === "withdrawal"
                            ? "Resgate"
                            : "Retorno"}
                        </span>
                        <span className="text-sm text-white/70">
                          {item.description}
                        </span>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-bold ${
                            item.type === "investment"
                              ? "text-green-300"
                              : item.type === "withdrawal"
                              ? "text-red-300"
                              : "text-blue-300"
                          }`}
                        >
                          {item.type === "investment"
                            ? "+"
                            : item.type === "withdrawal"
                            ? "-"
                            : "+"}
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(item.amount)}
                        </p>
                        <Badge
                          variant={
                            item.status === "active" ||
                            item.status === "completed"
                              ? "default"
                              : item.status === "pending"
                              ? "secondary"
                              : "destructive"
                          }
                          className={`text-xs ${
                            item.status === "pending"
                              ? "bg-[#D9D9D9] text-[#003F28]"
                              : ""
                          }`}
                        >
                          {item.status === "active"
                            ? "Ativo"
                            : item.status === "completed"
                            ? "Concluído"
                            : item.status === "pending"
                            ? "Pendente"
                            : "Falhou"}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex flex-row justify-between w-full text-sm text-white/70">
                      <span>Data:</span>
                      <span>
                        {new Date(item.created_at).toLocaleDateString("pt-BR")}
                      </span>
                    </div>
                  </div>
                ))}

              {transactionHistory.length === 0 && (
                <div className="text-center">
                  <div className="pt-16">
                    <p className="text-[#4A4D4C] font-ibm-plex-sans font-semibold text-xl leading-[35px] mb-2">
                      Você ainda não possui transações
                    </p>
                    <p className="text-[#D9D9D9] font-ibm-plex-sans font-normal text-lg leading-[35px] text-center">
                      Entre em contato com seu assessor para realizar
                      investimentos
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-b from-[#D9D9D9] to-[#003F28] border-0 p-6 relative overflow-hidden" style={{ borderRadius: '15px', background: 'linear-gradient(to bottom, #D9D9D9, rgba(0, 63, 40, 0.6))' }}>
            <div className="absolute right-0 bottom-0 opacity-20">
              <img 
                src="/icons/trending_up.svg" 
                alt="Trending Up Icon" 
                className="h-48 w-auto"
              />
            </div>
            <CardHeader>
              <CardTitle className="text-[#003F28] font-urbanist font-extrabold text-2xl sm:text-3xl lg:text-[35px] leading-[28px]">
                Performance Mensal
              </CardTitle>
              <CardDescription className="text-[#4A4D4C] font-ibm-plex-sans font-normal text-base sm:text-lg lg:text-xl leading-9">
                Evolução dos seus investimentos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PerformanceChart />
            </CardContent>
          </Card>
        </div>

        {/* Investment Simulator */}
        <InvestmentSimulator />

        {/* Footer with Legal Disclaimers */}
        <div className="mt-12 p-6">
          <div className="text-center space-y-4">
            <p className="text-white font-ibm-plex-sans font-normal text-sm leading-6">
              Este produto NÃO é um FIDC regulado pela CVM. Trata-se de um Clube de Investimento Privado, baseado em contratos civis de sociedade em conta de participação. Rentabilidade apresentada é alvo/esperada, não garantida. Há riscos de mercado, crédito e liquidez.
            </p>
            
            <div className="w-full h-px bg-[#00A568]"></div>
            
            <p className="text-white font-ibm-plex-sans font-normal text-sm">
              Aviso Legal: Todo investimento envolve riscos. Rentabilidades passadas não garantem resultados futuros.
            </p>
            
            <div className="flex justify-between items-center mt-6">
              <p className="font-ibm-plex-sans font-normal text-sm">
                <span className="text-[#00BC6E]">© 2025</span> <span className="text-[#D9D9D9]">Agrinvest</span>
              </p>
              
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-white rounded-sm flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M2 12L6 8L10 10L14 4" stroke="#003F28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10 4L14 4L14 8" stroke="#003F28" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <span className="text-[#D9D9D9] font-ibm-plex-sans font-bold text-lg">Agrinvest</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
