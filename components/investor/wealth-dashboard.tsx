"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bell,
  ChevronRight,
  Calendar,
  TrendingUp,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { PatrimonySummary } from "./patrimony-summary";
import { QuickActions } from "./quick-actions";
import { RecommendedProducts } from "./recommended-products";
import { PerformanceChart } from "./performance-chart";
import { InvestmentHistory } from "./investment-history";
import { RenewalAlertDialog } from "@/components/investment/renewal-alert-dialog";
import { createBrowserClient } from "@supabase/ssr";
import {
  getInvestorMonthlyRate,
  getInvestorMonthlyRateForExternalAdvisor,
  getInvestorMonthlyRateForIndividualAdvisor,
  type LiquidityOption,
} from "@/lib/commission-calculator";
import Link from "next/link";

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
  payment_date?: string | null;
  quota_type?: string;
  description?: string;
  profitability_liquidity?: string | null;
  commitment_period?: number | null;
  monthly_return_rate?: number | null;
}

export function WealthDashboard() {
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
  const [isExternalAdvisorInvestor, setIsExternalAdvisorInvestor] =
    useState(false);
  const [isIndividualAdvisorInvestor, setIsIndividualAdvisorInvestor] =
    useState(false);
  const [renewalInvestment, setRenewalInvestment] = useState<{
    id: string;
    amount: number;
    expiry_date: string;
    days_until_expiry: number;
    commitment_period?: number | null;
    profitability_liquidity?: string | null;
  } | null>(null);
  const [showRenewalDialog, setShowRenewalDialog] = useState(false);
  const [notifications, setNotifications] = useState<number>(2);

  // Helper functions
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

  const fetchTransactionHistory = async (userId: string) => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: investmentsRaw, error: investmentsError } = await supabase
        .from("investments")
        .select("*")
        .eq("user_id", userId);

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
        console.error("[v0] Erro ao buscar transacoes:", transactionsError);
      }

      const historyItems: TransactionHistoryItem[] = [];

      if (investmentsRaw) {
        investmentsRaw.forEach((investment) => {
          historyItems.push({
            id: investment.id,
            type: "investment",
            amount: Number(investment.amount),
            status: investment.status,
            created_at: investment.created_at,
            payment_date: investment.payment_date,
            quota_type: investment.quota_type,
            profitability_liquidity: investment.profitability_liquidity,
            commitment_period: investment.commitment_period,
            monthly_return_rate: investment.monthly_return_rate,
            description: `Investimento`,
          });
        });
      }

      if (transactionsRaw) {
        transactionsRaw.forEach((transaction) => {
          historyItems.push({
            id: transaction.id,
            type: transaction.type as "withdrawal" | "return",
            amount: Number(transaction.amount),
            status: transaction.status,
            created_at: transaction.created_at,
            description:
              transaction.type === "withdrawal" ? "Resgate" : "Rendimento",
          });
        });
      }

      historyItems.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTransactionHistory(historyItems);
    } catch (error) {
      console.error("[v0] Erro ao buscar historico:", error);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const userStr = localStorage.getItem("user");
        if (!userStr) {
          setLoading(false);
          return;
        }

        const userData = JSON.parse(userStr);
        setUser({
          name: userData.name || userData.email?.split("@")[0] || "Investidor",
          email: userData.email,
          type: userData.user_type,
          id: userData.id,
          rescue_type: userData.rescue_type,
        });

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

        if (profileData?.advisor_id) {
          const { data: advisorProfile } = await supabase
            .from("profiles")
            .select("role, office_id")
            .eq("id", profileData.advisor_id)
            .single();

          if (advisorProfile?.role === "assessor_externo") {
            setIsExternalAdvisorInvestor(true);
          }
          if (
            advisorProfile?.role === "assessor_individual" ||
            !advisorProfile?.office_id
          ) {
            setIsIndividualAdvisorInvestor(true);
          }
        }

        // Fetch investments
        const { data: investmentsRaw, error } = await supabase
          .from("investments")
          .select("*")
          .eq("user_id", userData.id)
          .eq("status", "active");

        if (error) {
          console.error("[v0] Erro ao buscar investimentos:", error);
          setLoading(false);
          return;
        }

        setInvestmentsData(investmentsRaw || []);

        // Calculate totals
        let totalInvested = 0;
        let currentValue = 0;
        let seniorQuota = 0;
        let subordinateQuota = 0;

        (investmentsRaw || []).forEach((inv: any) => {
          const amount = Number(inv.amount) || 0;
          totalInvested += amount;

          const period = Number(inv.commitment_period) || 12;
          const liquidity = inv.profitability_liquidity || "mensal";
          const storedRate = inv.monthly_return_rate;
          const monthlyRate =
            storedRate != null
              ? Number(storedRate)
              : getRateByPeriodAndLiquidity(
                  period,
                  liquidity,
                  isExternalAdvisorInvestor,
                  isIndividualAdvisorInvestor
                );

          const createdAt = new Date(inv.created_at);
          const now = new Date();
          const monthsElapsed =
            (now.getFullYear() - createdAt.getFullYear()) * 12 +
            (now.getMonth() - createdAt.getMonth());

          const compoundValue =
            amount * Math.pow(1 + monthlyRate / 100, Math.max(monthsElapsed, 0));
          currentValue += compoundValue;

          if (inv.quota_type === "senior") {
            seniorQuota += compoundValue;
          } else if (inv.quota_type === "subordinate") {
            subordinateQuota += compoundValue;
          }
        });

        setInvestments({
          totalInvested,
          currentValue,
          monthlyReturn: currentValue - totalInvested,
          seniorQuota,
          subordinateQuota,
        });

        await fetchTransactionHistory(userData.id);

        // Check for renewal alerts
        const now = new Date();
        const thirtyDaysFromNow = new Date(
          now.getTime() + 30 * 24 * 60 * 60 * 1000
        );

        const investmentsNearExpiry = (investmentsRaw || []).filter(
          (inv: any) => {
            if (!inv.expiry_date) return false;
            const expiryDate = new Date(inv.expiry_date);
            return expiryDate <= thirtyDaysFromNow && expiryDate >= now;
          }
        );

        if (investmentsNearExpiry.length > 0) {
          const nearest = investmentsNearExpiry.sort(
            (a: any, b: any) =>
              new Date(a.expiry_date).getTime() -
              new Date(b.expiry_date).getTime()
          )[0];
          const expiryDate = new Date(nearest.expiry_date);
          const daysUntilExpiry = Math.ceil(
            (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );

          setRenewalInvestment({
            id: nearest.id,
            amount: Number(nearest.amount),
            expiry_date: nearest.expiry_date,
            days_until_expiry: daysUntilExpiry,
            commitment_period: nearest.commitment_period,
            profitability_liquidity: nearest.profitability_liquidity,
          });
          setShowRenewalDialog(true);
        }
      } catch (error) {
        console.error("[v0] Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isExternalAdvisorInvestor, isIndividualAdvisorInvestor]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const formatDate = () => {
    return new Date().toLocaleDateString("pt-BR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  // Calculate returns
  const totalReturn = investments.currentValue - investments.totalInvested;
  const returnPercentage =
    investments.totalInvested > 0
      ? (totalReturn / investments.totalInvested) * 100
      : 0;
  const monthlyReturnPercentage = returnPercentage / 12; // Simplified

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-white/60 text-sm mb-1">{formatDate()}</p>
          <h1 className="text-2xl font-bold text-white">
            {getGreeting()}, {user?.name?.split(" ")[0] || "Investidor"}
          </h1>
        </div>
        <Link href="/investor/notifications">
          <Button
            variant="ghost"
            size="icon"
            className="relative text-white/60 hover:text-white hover:bg-white/10"
          >
            <Bell className="h-5 w-5" />
            {notifications > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#00BC6E] text-[10px] font-bold text-[#003F28] flex items-center justify-center">
                {notifications}
              </span>
            )}
          </Button>
        </Link>
      </div>

      {/* Patrimony Summary */}
      <div className="mb-6">
        <PatrimonySummary
          totalPatrimony={investments.currentValue}
          totalInvested={investments.totalInvested}
          totalReturn={totalReturn}
          monthlyReturn={investments.monthlyReturn}
          returnPercentage={returnPercentage}
          monthlyReturnPercentage={monthlyReturnPercentage}
          loading={loading}
        />
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <QuickActions />
      </div>

      {/* Tabs for Chart/History */}
      <div className="mb-6">
        <Tabs defaultValue="performance" className="w-full">
          <TabsList className="w-full bg-white/5 border border-white/10 rounded-xl p-1">
            <TabsTrigger
              value="performance"
              className="flex-1 data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60 rounded-lg"
            >
              Rentabilidade
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="flex-1 data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/60 rounded-lg"
            >
              Historico
            </TabsTrigger>
          </TabsList>
          <TabsContent value="performance" className="mt-4">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <PerformanceChart
                investmentsData={investmentsData}
                totalInvested={investments.totalInvested}
                currentValue={investments.currentValue}
                loading={loading}
              />
            </div>
          </TabsContent>
          <TabsContent value="history" className="mt-4">
            <div className="rounded-2xl bg-white/5 border border-white/10 p-4">
              <InvestmentHistory
                history={transactionHistory}
                loading={loading}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Recommended Products */}
      <div className="mb-6">
        <RecommendedProducts />
      </div>

      {/* Renewal Dialog */}
      {renewalInvestment && (
        <RenewalAlertDialog
          open={showRenewalDialog}
          onOpenChange={setShowRenewalDialog}
          investmentId={renewalInvestment.id}
          amount={renewalInvestment.amount}
          expiryDate={renewalInvestment.expiry_date}
          daysUntilExpiry={renewalInvestment.days_until_expiry}
          commitmentPeriod={renewalInvestment.commitment_period}
          profitabilityLiquidity={renewalInvestment.profitability_liquidity}
        />
      )}
    </div>
  );
}
