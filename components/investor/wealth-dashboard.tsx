"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Eye,
  EyeOff,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Calendar,
  AlertCircle,
  PlusCircle,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from "lucide-react";
import { PerformanceChart } from "./performance-chart";
import { InvestmentSimulator } from "./investment-simulator";
import { RenewalAlertDialog } from "@/components/investment/renewal-alert-dialog";
import { createBrowserClient } from "@supabase/ssr";
import {
  getInvestorMonthlyRate,
  getInvestorMonthlyRateForExternalAdvisor,
  getInvestorMonthlyRateForIndividualAdvisor,
  type LiquidityOption,
} from "@/lib/commission-calculator";
import Link from "next/link";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserData {
  name: string;
  email: string;
  type: string;
  id?: string;
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

// ─── Static data ──────────────────────────────────────────────────────────────

const allocationClasses = [
  { label: "SCP / Alternativos", pct: 100, color: "bg-[#00BC6E]" },
  { label: "Renda Fixa", pct: 0, color: "bg-sky-400" },
  { label: "Credito Privado", pct: 0, color: "bg-amber-400" },
  { label: "Agro", pct: 0, color: "bg-lime-400" },
  { label: "Imobiliario", pct: 0, color: "bg-violet-400" },
  { label: "Infraestrutura", pct: 0, color: "bg-orange-400" },
];

const recommendedProducts = [
  {
    id: "ccb-recebiveis",
    name: "CCB Akin Recebiveis 180D",
    category: "Credito Privado",
    returnRate: "CDI + 5,0%",
    risk: "baixo" as const,
    minInvestment: 5000,
  },
  {
    id: "fidc-senior",
    name: "FIDC Akin Senior",
    category: "Fundos",
    returnRate: "CDI + 4,5%",
    risk: "moderado" as const,
    minInvestment: 10000,
  },
  {
    id: "cra-agro",
    name: "CRA Akin Agro",
    category: "Agro",
    returnRate: "IPCA + 8,0%",
    risk: "medio" as const,
    minInvestment: 25000,
  },
];

const riskColors = {
  baixo: "bg-[#00BC6E]/15 text-[#00BC6E] border-[#00BC6E]/30",
  moderado: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  medio: "bg-orange-500/15 text-orange-300 border-orange-500/30",
};

const riskLabels = {
  baixo: "Baixo",
  moderado: "Moderado",
  medio: "Medio",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  }).format(v);

const fmtMin = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  }).format(v);

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

function normalizeStatus(s: string) {
  return String(s || "").toLowerCase();
}

function statusLabel(s: string) {
  switch (normalizeStatus(s)) {
    case "active": return "Ativo";
    case "completed": return "Concluido";
    case "pending": return "Pendente";
    case "withdrawn": return "Resgatado";
    case "cancelled": return "Cancelado";
    case "failed": return "Falhou";
    default: return s || "—";
  }
}

function statusClass(s: string) {
  const n = normalizeStatus(s);
  if (n === "active") return "bg-[#00BC6E]/15 text-[#00BC6E] border-[#00BC6E]/30";
  if (n === "pending") return "bg-amber-500/15 text-amber-300 border-amber-500/30";
  if (n === "withdrawn") return "bg-sky-500/15 text-sky-300 border-sky-500/30";
  if (n === "completed") return "bg-white/10 text-white/60 border-white/20";
  return "bg-white/5 text-white/40 border-white/10";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WealthDashboard() {
  const [user, setUser] = useState<UserData | null>(null);
  const [investments, setInvestments] = useState<InvestmentData>({
    totalInvested: 0,
    currentValue: 0,
    monthlyReturn: 0,
    seniorQuota: 0,
    subordinateQuota: 0,
  });
  const [transactionHistory, setTransactionHistory] = useState<TransactionHistoryItem[]>([]);
  const [investmentsData, setInvestmentsData] = useState<any[]>([]);
  const [hasInvestments, setHasInvestments] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showValues, setShowValues] = useState(true);
  const [isExternalAdvisor, setIsExternalAdvisor] = useState(false);
  const [isIndividualAdvisor, setIsIndividualAdvisor] = useState(false);
  const [renewalInvestment, setRenewalInvestment] = useState<{
    id: string;
    amount: number;
    expiry_date: string;
    days_until_expiry: number;
    commitment_period?: number | null;
    profitability_liquidity?: string | null;
  } | null>(null);
  const [showRenewalDialog, setShowRenewalDialog] = useState(false);

  // ── Rate helpers (same logic as investor-dashboard) ─────────────────────────

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
    isExternal = false,
    isIndividual = false
  ): number => {
    const opt = toLiquidityOption(liquidity);
    if (isIndividual) return getInvestorMonthlyRateForIndividualAdvisor(period, opt);
    return isExternal
      ? getInvestorMonthlyRateForExternalAdvisor(period, opt)
      : getInvestorMonthlyRate(period, opt);
  };

  // ── Fetch transaction history ────────────────────────────────────────────────

  const fetchTransactionHistory = async (userId: string) => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: investmentsRaw } = await supabase
        .from("investments")
        .select("*")
        .eq("user_id", userId);

      const { data: transactionsRaw } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", userId)
        .in("type", ["withdrawal", "return"])
        .order("created_at", { ascending: false });

      const historyItems: TransactionHistoryItem[] = [];

      (investmentsRaw || []).forEach((inv) => {
        historyItems.push({
          id: inv.id,
          type: "investment",
          amount: Number(inv.amount),
          status: inv.status,
          created_at: inv.created_at,
          payment_date: inv.payment_date,
          quota_type: inv.quota_type,
          profitability_liquidity: inv.profitability_liquidity,
          commitment_period: inv.commitment_period,
          monthly_return_rate: inv.monthly_return_rate,
          description: "Investimento",
        });
      });

      (transactionsRaw || []).forEach((tx) => {
        historyItems.push({
          id: tx.id,
          type: tx.type === "withdrawal" ? "withdrawal" : "return",
          amount: Number(tx.amount),
          status: tx.status,
          created_at: tx.created_at,
          description: tx.type === "withdrawal" ? "Resgate" : "Retorno",
        });
      });

      historyItems.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );

      setTransactionHistory(historyItems);
    } catch (err) {
      console.error("[v0] Erro ao carregar historico:", err);
    }
  };

  // ── Fetch investment data (precise calc from investor-dashboard) ─────────────

  const fetchInvestmentData = async (
    userId: string,
    isExternal: boolean,
    isIndividual: boolean
  ) => {
    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );

      const { data: investmentsRaw, error } = await supabase
        .from("investments")
        .select("id, amount, quota_type, monthly_return_rate, payment_date, created_at, profitability_liquidity, commitment_period, status")
        .eq("user_id", userId)
        .eq("status", "active");

      const { data: withdrawalsRaw } = await supabase
        .from("transactions")
        .select("amount, created_at, investment_id")
        .eq("user_id", userId)
        .eq("type", "withdrawal");

      if (error || !investmentsRaw || investmentsRaw.length === 0) {
        setInvestments({ totalInvested: 0, currentValue: 0, monthlyReturn: 0, seniorQuota: 0, subordinateQuota: 0 });
        setHasInvestments(false);
        return;
      }

      setHasInvestments(true);
      setInvestmentsData(investmentsRaw);

      const today = new Date();

      // Helper: withdrawals for a specific investment
      const getInvWithdrawals = (invId: string) =>
        (withdrawalsRaw || [])
          .filter((w) => w.investment_id === invId)
          .reduce((s, w) => s + Number(w.amount), 0);

      let totalInvestedAfterWithdrawals = 0;
      let currentValue = 0;
      let monthlyReturn = 0;
      let seniorQuota = 0;
      let subordinateQuota = 0;

      investmentsRaw.forEach((inv) => {
        const amount = Number(inv.amount);
        const period = inv.commitment_period || 12;
        const liquidity = inv.profitability_liquidity || "Mensal";
        const monthlyRate =
          getRateByPeriodAndLiquidity(period, liquidity, isExternal, isIndividual) ||
          Number(inv.monthly_return_rate) ||
          0.02;

        const paymentDate = inv.payment_date
          ? new Date(inv.payment_date)
          : new Date(inv.created_at);
        const monthsPassed = Math.floor(
          (today.getTime() - paymentDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
        );

        const withdrawn = getInvWithdrawals(inv.id);
        const available = Math.max(0, amount - withdrawn);

        let invCurrentValue: number;
        let invMonthlyReturn: number;

        if (liquidity === "Mensal") {
          invCurrentValue = available;
          invMonthlyReturn = amount * monthlyRate;
        } else {
          const compound = available * Math.pow(1 + monthlyRate, monthsPassed);
          invCurrentValue = compound;
          invMonthlyReturn = compound * monthlyRate;
        }

        currentValue += invCurrentValue;
        totalInvestedAfterWithdrawals += available;
        monthlyReturn += invMonthlyReturn;

        if (inv.quota_type === "senior") seniorQuota += available;
        else subordinateQuota += available;
      });

      setInvestments({
        totalInvested: totalInvestedAfterWithdrawals,
        currentValue,
        monthlyReturn,
        seniorQuota,
        subordinateQuota,
      });
    } catch (err) {
      console.error("[v0] Erro ao calcular investimentos:", err);
    }
  };

  // ── Main effect ──────────────────────────────────────────────────────────────

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const userStr = localStorage.getItem("user");
        if (!userStr) return;

        const parsed = JSON.parse(userStr);
        setUser({
          name: parsed.name || parsed.email?.split("@")[0] || "Investidor",
          email: parsed.email,
          type: parsed.user_type,
          id: parsed.id,
        });

        if (!parsed.id) return;

        // Check advisor type via API (bypasses RLS)
        let isExternal = false;
        let isIndividual = false;
        try {
          const res = await fetch("/api/profile/advisor", { credentials: "include" });
          const json = await res.json();
          if (json.success && json.advisor?.assessor_role === "assessor_externo") isExternal = true;
          if (json.success && json.advisor?.assessor_role === "assessor_individual") isIndividual = true;
        } catch (_) {}

        setIsExternalAdvisor(isExternal);
        setIsIndividualAdvisor(isIndividual);

        await Promise.all([
          fetchInvestmentData(parsed.id, isExternal, isIndividual),
          fetchTransactionHistory(parsed.id),
        ]);

        // Renewal check
        try {
          const res = await fetch(`/api/investments/renewal-check?userId=${parsed.id}`);
          const data = await res.json();
          if (data.success && data.data?.length > 0) {
            const nearest = data.data[0];
            setRenewalInvestment(nearest);
            setShowRenewalDialog(true);

            const lastEmailKey = `renewal_email_${nearest.id}`;
            const today = new Date().toDateString();
            if (localStorage.getItem(lastEmailKey) !== today) {
              await fetch("/api/investments/renewal-email", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  investmentId: nearest.id,
                  userId: parsed.id,
                  amount: nearest.amount,
                  expiryDate: nearest.expiry_date,
                }),
              });
              localStorage.setItem(lastEmailKey, today);
            }
          }
        } catch (_) {}
      } catch (err) {
        console.error("[v0] Erro ao carregar dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const masked = (v: string) => (showValues ? v : "R$ ••••••");
  const maskedPct = (v: string) => (showValues ? v : "••••");

  const totalReturn = investments.currentValue - investments.totalInvested;
  const monthlyReturnPct =
    investments.totalInvested > 0
      ? (investments.monthlyReturn / investments.totalInvested) * 100
      : 0;
  const totalReturnPct =
    investments.totalInvested > 0
      ? (totalReturn / investments.totalInvested) * 100
      : 0;

  // ── Skeleton ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto space-y-5 animate-pulse">
        <div className="h-6 bg-white/10 rounded w-56" />
        <div className="h-4 bg-white/10 rounded w-80" />
        <div className="h-36 bg-white/10 rounded-3xl" />
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 bg-white/10 rounded-2xl" />
          ))}
        </div>
        <div className="h-56 bg-white/10 rounded-2xl" />
        <div className="h-40 bg-white/10 rounded-2xl" />
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 bg-white/10 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const firstName = user?.name?.split(" ")[0] ?? "Investidor";

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto space-y-6">

      {/* ── Title ─────────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-white text-balance">
          Bem-vindo, {firstName}
        </h1>
        <p className="text-sm text-white/50 mt-1 text-pretty">
          Acompanhe sua carteira, rentabilidade e oportunidades privadas da Akin S.A.
        </p>
      </div>

      {/* ── Gross balance card ────────────────────────────────────────────────── */}
      <div className="relative rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 p-6 overflow-hidden">
        <div className="pointer-events-none absolute -top-16 -right-16 w-48 h-48 bg-[#00BC6E]/10 rounded-full blur-3xl" />

        <div className="relative flex items-center justify-between mb-1">
          <span className="text-xs uppercase tracking-widest text-white/40 font-medium">
            Saldo bruto
          </span>
          <button
            onClick={() => setShowValues((v) => !v)}
            className="text-white/40 hover:text-white/70 transition-colors"
            aria-label={showValues ? "Ocultar valores" : "Exibir valores"}
          >
            {showValues ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
          </button>
        </div>

        <p className="relative text-4xl font-bold text-white tracking-tight mt-1 mb-5">
          {masked(fmt(investments.currentValue))}
        </p>

        <div className="flex items-center gap-3">
          <Button
            asChild
            className="bg-[#00BC6E] hover:bg-[#00a85f] text-[#003F28] font-semibold rounded-xl h-10 px-6"
          >
            <Link href="/investor/invest">
              <PlusCircle className="h-4 w-4 mr-2" />
              Investir
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="border-white/20 text-white/70 hover:text-white hover:bg-white/10 bg-transparent font-semibold rounded-xl h-10 px-6"
          >
            <Link href="/withdraw">
              Resgatar
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Secondary cards ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total investido */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-1">
          <span className="text-[10px] uppercase tracking-widest text-white/40 font-medium block">
            Total investido
          </span>
          <p className="text-lg font-bold text-white">
            {masked(fmt(investments.totalInvested))}
          </p>
          <p className="text-xs text-white/40 flex items-center gap-1">
            <RefreshCw className="h-3 w-3" />
            Capital aplicado
          </p>
        </div>

        {/* Rentabilidade no mes */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-1">
          <span className="text-[10px] uppercase tracking-widest text-white/40 font-medium block">
            Rentab. no mes
          </span>
          <p className="text-lg font-bold text-white">
            {masked(fmt(investments.monthlyReturn))}
          </p>
          <p className={cn(
            "text-xs font-medium flex items-center gap-1",
            monthlyReturnPct >= 0 ? "text-[#00BC6E]" : "text-red-400"
          )}>
            {monthlyReturnPct >= 0
              ? <TrendingUp className="h-3 w-3" />
              : <TrendingDown className="h-3 w-3" />}
            {maskedPct(`${monthlyReturnPct >= 0 ? "+" : ""}${monthlyReturnPct.toFixed(2)}%`)}
          </p>
        </div>

        {/* Retorno total */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-1">
          <span className="text-[10px] uppercase tracking-widest text-white/40 font-medium block">
            Retorno total
          </span>
          <p className="text-lg font-bold text-white">
            {masked(fmt(totalReturn))}
          </p>
          <p className={cn(
            "text-xs font-medium flex items-center gap-1",
            totalReturnPct >= 0 ? "text-[#00BC6E]" : "text-red-400"
          )}>
            {totalReturnPct >= 0
              ? <TrendingUp className="h-3 w-3" />
              : <TrendingDown className="h-3 w-3" />}
            {maskedPct(`${totalReturnPct >= 0 ? "+" : ""}${totalReturnPct.toFixed(2)}%`)}
          </p>
        </div>
      </div>

      {/* ── Performance chart ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-base font-semibold text-white">Rentabilidade</h2>
          <p className="text-xs text-white/40 mt-0.5">
            Evolucao dos seus investimentos
          </p>
        </div>

        <div className="px-5 pb-4">
          <Tabs defaultValue="month" className="w-full">
            <TabsList className="bg-white/5 border border-white/10 rounded-xl p-0.5 h-9 w-full sm:w-auto">
              {["1 dia", "No mes", "No ano", "Desde o inicio"].map((label, i) => {
                const val = ["day", "month", "year", "all"][i];
                return (
                  <TabsTrigger
                    key={val}
                    value={val}
                    className="text-[11px] px-3 h-7 rounded-lg data-[state=active]:bg-white/10 data-[state=active]:text-white text-white/50"
                  >
                    {label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {["day", "month", "year", "all"].map((val) => (
              <TabsContent key={val} value={val} className="mt-4">
                {hasInvestments ? (
                  <PerformanceChart />
                ) : (
                  <EmptyPerformance />
                )}
              </TabsContent>
            ))}
          </Tabs>
        </div>
      </div>

      {/* ── Minha carteira ────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Minha carteira</h2>
          <Link
            href="/investor/portfolio"
            className="flex items-center gap-1 text-xs text-[#00BC6E] hover:text-[#00a85f] transition-colors"
          >
            Ver detalhes
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {hasInvestments ? (
          <div className="space-y-3">
            {/* SCP / Alternativos shown with real value */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-2.5 w-2.5 rounded-full flex-shrink-0 bg-[#00BC6E]" />
                <span className="text-sm text-white/70">SCP / Alternativos</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <div className="h-1.5 w-20 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full rounded-full bg-[#00BC6E]" style={{ width: "100%" }} />
                </div>
                <span className="text-xs text-white/40 w-8 text-right">100%</span>
              </div>
            </div>

            <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-wider">Cota Senior</p>
                <p className="text-sm font-semibold text-white mt-0.5">{masked(fmt(investments.seniorQuota))}</p>
              </div>
              <div>
                <p className="text-[10px] text-white/40 uppercase tracking-wider">Cota Subordinada</p>
                <p className="text-sm font-semibold text-white mt-0.5">{masked(fmt(investments.subordinateQuota))}</p>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-white/40 text-center py-2">
            Carteira ainda nao iniciada.
          </p>
        )}
      </div>

      {/* ── Historico de transacoes ───────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Historico de transacoes</h2>
          <Link
            href="/investor/portfolio"
            className="flex items-center gap-1 text-xs text-[#00BC6E] hover:text-[#00a85f] transition-colors"
          >
            Ver tudo
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {transactionHistory.length === 0 ? (
          <p className="text-sm text-white/40 text-center py-4">
            Nenhuma transacao encontrada.
          </p>
        ) : (
          <div className="space-y-3">
            {transactionHistory.slice(0, 5).map((tx) => {
              const isInvestment = tx.type === "investment";
              const isWithdrawal = tx.type === "withdrawal";
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0"
                >
                  {/* Icon */}
                  <div className={cn(
                    "flex-shrink-0 h-9 w-9 rounded-xl flex items-center justify-center",
                    isInvestment
                      ? "bg-[#00BC6E]/15"
                      : isWithdrawal
                        ? "bg-red-500/15"
                        : "bg-sky-500/15"
                  )}>
                    {isInvestment ? (
                      <ArrowUpRight className="h-4 w-4 text-[#00BC6E]" />
                    ) : isWithdrawal ? (
                      <ArrowDownRight className="h-4 w-4 text-red-400" />
                    ) : (
                      <TrendingUp className="h-4 w-4 text-sky-400" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {tx.description || tx.type}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-[11px] text-white/40">
                        {fmtDate(tx.created_at)}
                      </p>
                      {tx.quota_type && (
                        <span className="text-[10px] text-white/30">
                          • {tx.quota_type === "senior" ? "Senior" : "Subordinada"}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Amount + status */}
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <span className={cn(
                      "text-sm font-semibold",
                      isInvestment ? "text-[#00BC6E]" : "text-white"
                    )}>
                      {isWithdrawal ? "- " : isInvestment ? "+ " : ""}
                      {fmt(tx.amount)}
                    </span>
                    <Badge className={cn("text-[9px] px-1.5 py-0 h-4 border font-medium", statusClass(tx.status))}>
                      {statusLabel(tx.status)}
                    </Badge>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Simulador patrimonial ─────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-base font-semibold text-white">Simulador patrimonial</h2>
          <p className="text-xs text-white/40 mt-0.5">
            Calcule a rentabilidade estimada do seu investimento
          </p>
        </div>
        <div className="px-4 pb-5">
          <InvestmentSimulator
            isExternalAdvisorInvestor={isExternalAdvisor}
            isIndividualAdvisorInvestor={isIndividualAdvisor}
          />
        </div>
      </div>

      {/* ── Produtos recomendados ─────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Produtos recomendados</h2>
          <Link
            href="/investor/invest"
            className="flex items-center gap-1 text-xs text-[#00BC6E] hover:text-[#00a85f] transition-colors"
          >
            Ver todos
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="space-y-3">
          {recommendedProducts.map((product) => (
            <div
              key={product.id}
              className="rounded-2xl bg-white/5 border border-white/10 p-4 flex items-center gap-4"
            >
              <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-[#00BC6E]/15 border border-[#00BC6E]/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-[#00BC6E]" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">{product.name}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[10px] text-white/40">{product.category}</span>
                  <span className="text-[10px] text-white/20">•</span>
                  <span className="text-[10px] text-white/40 flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    Min: {fmtMin(product.minInvestment)}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <span className="text-sm font-bold text-[#00BC6E]">{product.returnRate}</span>
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-[9px] px-1.5 py-0 h-4 border font-medium", riskColors[product.risk])}>
                    {riskLabels[product.risk]}
                  </Badge>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[10px] font-medium border-white/20 text-white/70 bg-transparent hover:bg-white/10 hover:text-white rounded-lg"
                  >
                    <Link href={`/investor/products/${product.id}`}>Simular</Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Legal disclaimer ──────────────────────────────────────────────────── */}
      <p className="text-[10px] text-white/25 text-center text-pretty pb-2 leading-relaxed">
        Rentabilidade estimada nao representa garantia de retorno. Produtos
        sujeitos a risco de credito, mercado e liquidez. Investimentos nao sao
        cobertos pelo FGC.
      </p>

      {/* ── Renewal dialog ────────────────────────────────────────────────────── */}
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

// ─── Empty performance state ──────────────────────────────────────────────────

function EmptyPerformance() {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center space-y-3">
      <div className="h-12 w-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
        <AlertCircle className="h-6 w-6 text-white/30" />
      </div>
      <div>
        <p className="text-sm font-medium text-white/60">
          Voce ainda nao possui investimentos ativos.
        </p>
        <p className="text-xs text-white/35 mt-1 text-pretty">
          Explore a prateleira da Akin S.A. e encontre oportunidades adequadas ao seu perfil.
        </p>
      </div>
      <Button
        asChild
        size="sm"
        className="mt-1 bg-[#00BC6E] hover:bg-[#00a85f] text-[#003F28] font-semibold rounded-xl"
      >
        <Link href="/investor/invest">Ver oportunidades</Link>
      </Button>
    </div>
  );
}
