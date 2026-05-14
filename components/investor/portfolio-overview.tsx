"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Briefcase,
  TrendingUp,
  TrendingDown,
  Calendar,
  ChevronRight,
  PieChart,
  ArrowRight,
  Clock,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";
import {
  getInvestorMonthlyRate,
  getInvestorMonthlyRateForExternalAdvisor,
  getInvestorMonthlyRateForIndividualAdvisor,
  type LiquidityOption,
} from "@/lib/commission-calculator";

interface Investment {
  id: string;
  amount: number;
  currentValue: number;
  returnAmount: number;
  returnPercentage: number;
  quotaType: string;
  profitabilityLiquidity: string;
  commitmentPeriod: number;
  createdAt: string;
  expiryDate?: string;
  status: string;
  monthlyRate: number;
}

interface PortfolioData {
  totalInvested: number;
  totalCurrentValue: number;
  totalReturn: number;
  returnPercentage: number;
  investments: Investment[];
  allocation: {
    creditoPrivado: number;
    fundosCredito: number;
    imobiliario: number;
    agro: number;
    alternativos: number;
    equity: number;
    caixa: number;
  };
}

const quotaTypeLabels: Record<string, string> = {
  senior: "Crédito Privado",
  subordinate: "Fundos de Crédito",
  imobiliario: "Imobiliário",
  agro: "Agro",
  alternativo: "Alternativos",
  equity: "Equity",
};

const liquidityLabels: Record<string, string> = {
  mensal: "Liquidez Mensal",
  semestral: "Liquidez Semestral",
  anual: "Liquidez Anual",
  bienal: "Liquidez Bienal",
  trienal: "Liquidez Trienal",
};

export function PortfolioOverview() {
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState<PortfolioData>({
    totalInvested: 0,
    totalCurrentValue: 0,
    totalReturn: 0,
    returnPercentage: 0,
    investments: [],
    allocation: { creditoPrivado: 0, fundosCredito: 0, imobiliario: 0, agro: 0, alternativos: 0, equity: 0, caixa: 0 },
  });
  const [isExternalAdvisorInvestor, setIsExternalAdvisorInvestor] = useState(false);
  const [isIndividualAdvisorInvestor, setIsIndividualAdvisorInvestor] = useState(false);

  const toLiquidityOption = (liquidity: string): LiquidityOption => {
    const raw = String(liquidity || "").toLowerCase();
    if (raw.includes("trienal")) return "trienal";
    if (raw.includes("bienal")) return "bienal";
    if (raw.includes("anual")) return "anual";
    if (raw.includes("semestral")) return "semestral";
    return "mensal";
  };

  const getRateByPeriodAndLiquidity = (
    period: number,
    liquidity: string,
    isExternalAdvisor: boolean = false,
    isIndividualAdvisor: boolean = false
  ): number => {
    const opt = toLiquidityOption(liquidity);
    if (isIndividualAdvisor) {
      return getInvestorMonthlyRateForIndividualAdvisor(period, opt);
    }
    return isExternalAdvisor
      ? getInvestorMonthlyRateForExternalAdvisor(period, opt)
      : getInvestorMonthlyRate(period, opt);
  };

  useEffect(() => {
    const fetchPortfolio = async () => {
      setLoading(true);
      try {
        const userStr = localStorage.getItem("user");
        if (!userStr) {
          setLoading(false);
          return;
        }

        const userData = JSON.parse(userStr);
        if (!userData.id) {
          setLoading(false);
          return;
        }

        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Check if external advisor investor
        const { data: profileData } = await supabase
          .from("profiles")
          .select("advisor_id")
          .eq("id", userData.id)
          .single();

        let extAdvisor = false;
        let indAdvisor = false;

        if (profileData?.advisor_id) {
          const { data: advisorProfile } = await supabase
            .from("profiles")
            .select("role, office_id")
            .eq("id", profileData.advisor_id)
            .single();

          if (advisorProfile?.role === "assessor_externo") {
            extAdvisor = true;
            setIsExternalAdvisorInvestor(true);
          }
          if (
            advisorProfile?.role === "assessor_individual" ||
            !advisorProfile?.office_id
          ) {
            indAdvisor = true;
            setIsIndividualAdvisorInvestor(true);
          }
        }

        // Fetch investments
        const { data: investmentsRaw, error } = await supabase
          .from("investments")
          .select("*")
          .eq("user_id", userData.id)
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("[v0] Erro ao buscar investimentos:", error);
          setLoading(false);
          return;
        }

        const investments: Investment[] = [];
        let totalInvested = 0;
        let totalCurrentValue = 0;
        const allocationBuckets: Record<string, number> = {
          creditoPrivado: 0,
          fundosCredito: 0,
          imobiliario: 0,
          agro: 0,
          alternativos: 0,
          equity: 0,
          caixa: 0,
        };

        (investmentsRaw || []).forEach((inv: any) => {
          const amount = Number(inv.amount) || 0;
          totalInvested += amount;

          const period = Number(inv.commitment_period) || 12;
          const liquidity = inv.profitability_liquidity || "anual";
          const storedRate = inv.monthly_return_rate;
          const monthlyRate =
            storedRate != null
              ? Number(storedRate)
              : getRateByPeriodAndLiquidity(period, liquidity, extAdvisor, indAdvisor);

          const createdAt = new Date(inv.created_at);
          const now = new Date();
          const monthsElapsed =
            (now.getFullYear() - createdAt.getFullYear()) * 12 +
            (now.getMonth() - createdAt.getMonth());

          const currentValue =
            amount * Math.pow(1 + monthlyRate / 100, Math.max(monthsElapsed, 0));
          const returnAmount = currentValue - amount;
          const returnPercentage = amount > 0 ? (returnAmount / amount) * 100 : 0;

          totalCurrentValue += currentValue;

          // Mapear quota_type para nova classificação de alocação
          const qt = (inv.quota_type || "senior").toLowerCase();
          if (qt === "imobiliario") allocationBuckets.imobiliario += currentValue;
          else if (qt === "agro") allocationBuckets.agro += currentValue;
          else if (qt === "alternativo") allocationBuckets.alternativos += currentValue;
          else if (qt === "equity") allocationBuckets.equity += currentValue;
          else if (qt === "subordinate") allocationBuckets.fundosCredito += currentValue;
          else allocationBuckets.creditoPrivado += currentValue;

          investments.push({
            id: inv.id,
            amount,
            currentValue,
            returnAmount,
            returnPercentage,
            quotaType: inv.quota_type || "senior",
            profitabilityLiquidity: inv.profitability_liquidity || "anual",
            commitmentPeriod: period,
            createdAt: inv.created_at,
            expiryDate: inv.expiry_date,
            status: inv.status,
            monthlyRate,
          });
        });

        const totalReturn = totalCurrentValue - totalInvested;
        const returnPercentage =
          totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0;

        const pct = (v: number) => totalCurrentValue > 0 ? (v / totalCurrentValue) * 100 : 0;

        setPortfolio({
          totalInvested,
          totalCurrentValue,
          totalReturn,
          returnPercentage,
          investments,
          allocation: {
            creditoPrivado: pct(allocationBuckets.creditoPrivado),
            fundosCredito: pct(allocationBuckets.fundosCredito),
            imobiliario: pct(allocationBuckets.imobiliario),
            agro: pct(allocationBuckets.agro),
            alternativos: pct(allocationBuckets.alternativos),
            equity: pct(allocationBuckets.equity),
            caixa: pct(allocationBuckets.caixa),
          },
        });
      } catch (error) {
        console.error("[v0] Erro ao carregar portfolio:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getDaysUntilExpiry = (expiryDate?: string) => {
    if (!expiryDate) return null;
    const now = new Date();
    const expiry = new Date(expiryDate);
    const diff = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  if (loading) {
    return (
      <div className="px-4 py-6 md:px-8 md:py-8 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-white/10 rounded w-1/3" />
          <div className="h-40 bg-white/10 rounded-2xl" />
          <div className="h-32 bg-white/10 rounded-2xl" />
          <div className="h-32 bg-white/10 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Briefcase className="h-6 w-6 text-[#00BC6E]" />
          <h1 className="text-2xl font-bold text-white">Minha Carteira</h1>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-white/60 hover:text-white hover:bg-white/10"
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary Card */}
      <div className="rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 p-6 mb-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-[#00BC6E]/10 rounded-full blur-3xl" />
        
        <div className="relative">
          <span className="text-sm text-white/60 block mb-1">Valor Total da Carteira</span>
          <h2 className="text-3xl font-bold text-white mb-2">
            {formatCurrency(portfolio.totalCurrentValue)}
          </h2>
          <div className="flex items-center gap-2">
            {portfolio.returnPercentage >= 0 ? (
              <TrendingUp className="h-4 w-4 text-[#00BC6E]" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-400" />
            )}
            <span
              className={cn(
                "text-sm font-medium",
                portfolio.returnPercentage >= 0 ? "text-[#00BC6E]" : "text-red-400"
              )}
            >
              {portfolio.returnPercentage >= 0 ? "+" : ""}
              {formatCurrency(portfolio.totalReturn)} ({portfolio.returnPercentage.toFixed(2)}%)
            </span>
          </div>
        </div>

        {/* Allocation */}
        <div className="mt-6 pt-6 border-t border-white/10">
          <div className="flex items-center gap-2 mb-3">
            <PieChart className="h-4 w-4 text-white/50" />
            <span className="text-xs text-white/50">Alocação por classe</span>
          </div>
          <div className="space-y-2.5">
            {[
              { label: "Crédito Privado", value: portfolio.allocation.creditoPrivado, color: "[&>div]:bg-[#00BC6E]", textColor: "text-[#00BC6E]" },
              { label: "Fundos de Crédito", value: portfolio.allocation.fundosCredito, color: "[&>div]:bg-blue-400", textColor: "text-blue-400" },
              { label: "Imobiliário", value: portfolio.allocation.imobiliario, color: "[&>div]:bg-cyan-400", textColor: "text-cyan-400" },
              { label: "Agro", value: portfolio.allocation.agro, color: "[&>div]:bg-emerald-400", textColor: "text-emerald-400" },
              { label: "Alternativos", value: portfolio.allocation.alternativos, color: "[&>div]:bg-purple-400", textColor: "text-purple-400" },
              { label: "Equity", value: portfolio.allocation.equity, color: "[&>div]:bg-amber-400", textColor: "text-amber-400" },
              { label: "Caixa disponível", value: portfolio.allocation.caixa, color: "[&>div]:bg-white/40", textColor: "text-white/40" },
            ].filter((item) => item.value > 0).map((item) => (
              <div key={item.label}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/70">{item.label}</span>
                  <span className={cn("font-medium", item.textColor)}>
                    {item.value.toFixed(1)}%
                  </span>
                </div>
                <Progress value={item.value} className={cn("h-1.5 bg-white/10", item.color)} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Investments List */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Seus Investimentos ({portfolio.investments.length})
        </h2>

        {portfolio.investments.length === 0 ? (
          <div className="text-center py-12 rounded-2xl bg-white/5 border border-white/10">
            <Briefcase className="h-12 w-12 text-white/20 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">
              Nenhum investimento ativo
            </h3>
            <p className="text-sm text-white/50 mb-6">
              Comece a investir e veja sua carteira crescer
            </p>
            <Button asChild className="bg-[#00BC6E] hover:bg-[#00BC6E]/90 text-[#003F28]">
              <Link href="/investor/products">
                Explorar Produtos
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {portfolio.investments.map((investment) => {
              const daysUntilExpiry = getDaysUntilExpiry(investment.expiryDate);
              const isNearExpiry = daysUntilExpiry !== null && daysUntilExpiry <= 30;

              return (
                <div
                  key={investment.id}
                  className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/8 transition-colors"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-white">
                          {quotaTypeLabels[investment.quotaType] || "Investimento"}
                        </span>
                        {isNearExpiry && (
                          <Badge className="bg-amber-500/20 text-amber-400 text-[10px]">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            Vence em {daysUntilExpiry}d
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-white/50">
                        {liquidityLabels[investment.profitabilityLiquidity] || investment.profitabilityLiquidity}
                        {" · "}
                        {investment.commitmentPeriod} meses
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-white block">
                        {formatCurrency(investment.currentValue)}
                      </span>
                      <span
                        className={cn(
                          "text-xs font-medium",
                          investment.returnPercentage >= 0
                            ? "text-[#00BC6E]"
                            : "text-red-400"
                        )}
                      >
                        {investment.returnPercentage >= 0 ? "+" : ""}
                        {investment.returnPercentage.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  {/* Details */}
                  <div className="flex items-center gap-4 text-xs text-white/40">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {(investment.monthlyRate * 12).toFixed(2)}% a.a.
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Inicio: {formatDate(investment.createdAt)}
                    </span>
                    {investment.expiryDate && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Venc: {formatDate(investment.expiryDate)}
                      </span>
                    )}
                  </div>

                  {/* Progress to goal */}
                  <div className="mt-3 pt-3 border-t border-white/5">
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-white/40">Investido: {formatCurrency(investment.amount)}</span>
                      <span className="text-[#00BC6E]">
                        Rendimento: {formatCurrency(investment.returnAmount)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      {portfolio.investments.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <Button
            asChild
            className="bg-[#00BC6E] hover:bg-[#00BC6E]/90 text-[#003F28] font-semibold"
          >
            <Link href="/investor/products">
              Investir Mais
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10"
          >
            <Link href="/withdraw">
              Solicitar Resgate
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
