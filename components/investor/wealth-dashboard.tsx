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
} from "lucide-react";
import { PerformanceChart } from "./performance-chart";
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

// ─── Types ───────────────────────────────────────────────────────────────────

interface UserData {
  name: string;
  email: string;
  type: string;
  id?: string;
}

interface InvestmentTotals {
  grossBalance: number;
  totalInvested: number;
  monthlyReturn: number;
  monthlyReturnPct: number;
  yearlyReturn: number;
  yearlyReturnPct: number;
  nextPayment: number;
}

// ─── Portfolio allocation data ────────────────────────────────────────────────

const allocationClasses = [
  { label: "SCP / Alternativos", pct: 0, color: "bg-[#00BC6E]" },
  { label: "Renda Fixa", pct: 0, color: "bg-sky-400" },
  { label: "Credito Privado", pct: 0, color: "bg-amber-400" },
  { label: "Agro", pct: 0, color: "bg-lime-400" },
  { label: "Imobiliario", pct: 0, color: "bg-violet-400" },
  { label: "Infraestrutura", pct: 0, color: "bg-orange-400" },
  { label: "Caixa disponivel", pct: 0, color: "bg-white/40" },
];

// ─── Recommended products ─────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  category: string;
  returnRate: string;
  risk: "baixo" | "moderado" | "medio";
  minInvestment: number;
}

const recommendedProducts: Product[] = [
  {
    id: "ccb-recebiveis",
    name: "CCB Akin Recebiveis 180D",
    category: "Credito Privado",
    returnRate: "CDI + 5,0%",
    risk: "baixo",
    minInvestment: 5000,
  },
  {
    id: "fidc-senior",
    name: "FIDC Akin Senior",
    category: "Fundos",
    returnRate: "CDI + 4,5%",
    risk: "moderado",
    minInvestment: 10000,
  },
  {
    id: "cra-agro",
    name: "CRA Akin Agro",
    category: "Agro",
    returnRate: "IPCA + 8,0%",
    risk: "medio",
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

const fmtPct = (v: number) =>
  `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

const fmtMin = (v: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 0,
  }).format(v);

// ─── Component ───────────────────────────────────────────────────────────────

export function WealthDashboard() {
  const [user, setUser] = useState<UserData | null>(null);
  const [totals, setTotals] = useState<InvestmentTotals>({
    grossBalance: 0,
    totalInvested: 0,
    monthlyReturn: 0,
    monthlyReturnPct: 0,
    yearlyReturn: 0,
    yearlyReturnPct: 0,
    nextPayment: 0,
  });
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

  const toLiquidityOption = (liquidity: string): LiquidityOption => {
    const raw = String(liquidity || "").toLowerCase();
    if (raw.includes("trienal")) return "trienal";
    if (raw.includes("bienal")) return "bienal";
    if (raw.includes("anual")) return "anual";
    if (raw.includes("semestral")) return "semestral";
    return "mensal";
  };

  const getRate = (period: number, liquidity: string): number => {
    const opt = toLiquidityOption(liquidity);
    if (isIndividualAdvisor)
      return getInvestorMonthlyRateForIndividualAdvisor(period, opt);
    return isExternalAdvisor
      ? getInvestorMonthlyRateForExternalAdvisor(period, opt)
      : getInvestorMonthlyRate(period, opt);
  };

  useEffect(() => {
    const fetchData = async () => {
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

        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        // Advisor type check
        const { data: profileData } = await supabase
          .from("profiles")
          .select("advisor_id")
          .eq("id", parsed.id)
          .single();

        if (profileData?.advisor_id) {
          const { data: advisorProfile } = await supabase
            .from("profiles")
            .select("role, office_id")
            .eq("id", profileData.advisor_id)
            .single();

          if (advisorProfile?.role === "assessor_externo")
            setIsExternalAdvisor(true);
          if (
            advisorProfile?.role === "assessor_individual" ||
            !advisorProfile?.office_id
          )
            setIsIndividualAdvisor(true);
        }

        // Fetch active investments
        const { data: invRaw, error } = await supabase
          .from("investments")
          .select("*")
          .eq("user_id", parsed.id)
          .eq("status", "active");

        if (error || !invRaw) return;

        setInvestmentsData(invRaw);
        setHasInvestments(invRaw.length > 0);

        const now = new Date();
        let grossBalance = 0;
        let totalInvested = 0;
        let monthlyReturnSum = 0;

        invRaw.forEach((inv: any) => {
          const amount = Number(inv.amount) || 0;
          totalInvested += amount;

          const period = Number(inv.commitment_period) || 12;
          const liquidity = inv.profitability_liquidity || "mensal";
          const storedRate = inv.monthly_return_rate;
          const rate =
            storedRate != null
              ? Number(storedRate)
              : getRate(period, liquidity);

          const createdAt = new Date(inv.created_at);
          const monthsElapsed = Math.max(
            0,
            (now.getFullYear() - createdAt.getFullYear()) * 12 +
              (now.getMonth() - createdAt.getMonth())
          );

          const currentValue =
            amount * Math.pow(1 + rate / 100, monthsElapsed);
          grossBalance += currentValue;
          monthlyReturnSum += amount * (rate / 100);
        });

        const totalReturn = grossBalance - totalInvested;
        const monthlyReturnPct =
          totalInvested > 0 ? (monthlyReturnSum / totalInvested) * 100 : 0;
        const yearlyReturn = totalReturn;
        const yearlyReturnPct =
          totalInvested > 0 ? (yearlyReturn / totalInvested) * 100 : 0;

        setTotals({
          grossBalance,
          totalInvested,
          monthlyReturn: monthlyReturnSum,
          monthlyReturnPct,
          yearlyReturn,
          yearlyReturnPct,
          nextPayment: 0,
        });

        // Renewal alert
        const thirtyDaysFromNow = new Date(
          now.getTime() + 30 * 24 * 60 * 60 * 1000
        );
        const nearExpiry = invRaw.filter((inv: any) => {
          if (!inv.expiry_date) return false;
          const d = new Date(inv.expiry_date);
          return d <= thirtyDaysFromNow && d >= now;
        });

        if (nearExpiry.length > 0) {
          const nearest = nearExpiry.sort(
            (a: any, b: any) =>
              new Date(a.expiry_date).getTime() -
              new Date(b.expiry_date).getTime()
          )[0];
          const expiryDate = new Date(nearest.expiry_date);
          const days = Math.ceil(
            (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          setRenewalInvestment({
            id: nearest.id,
            amount: Number(nearest.amount),
            expiry_date: nearest.expiry_date,
            days_until_expiry: days,
            commitment_period: nearest.commitment_period,
            profitability_liquidity: nearest.profitability_liquidity,
          });
          setShowRenewalDialog(true);
        }
      } catch (err) {
        console.error("[v0] Erro ao carregar dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // ── Masked value helper
  const masked = (v: string) => (showValues ? v : "R$ ••••••");
  const maskedPct = (v: string) => (showValues ? v : "••••%");

  // ── Skeleton
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

      {/* ── Title block ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-white text-balance">
          Bem-vindo, {firstName}
        </h1>
        <p className="text-sm text-white/50 mt-1 text-pretty">
          Acompanhe sua carteira, rentabilidade e oportunidades privadas da Akin S.A.
        </p>
      </div>

      {/* ── Gross balance card ──────────────────────────────────────────────── */}
      <div className="relative rounded-3xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 p-6 overflow-hidden">
        {/* subtle glow */}
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
            {showValues ? (
              <Eye className="h-4 w-4" />
            ) : (
              <EyeOff className="h-4 w-4" />
            )}
          </button>
        </div>

        <p className="relative text-4xl font-bold text-white tracking-tight mt-1 mb-5">
          {masked(fmt(totals.grossBalance))}
        </p>

        <Button
          asChild
          className="relative bg-[#00BC6E] hover:bg-[#00a85f] text-[#003F28] font-semibold rounded-xl h-10 px-6"
        >
          <Link href="/investor/invest">
            <PlusCircle className="h-4 w-4 mr-2" />
            Investir
          </Link>
        </Button>
      </div>

      {/* ── Secondary cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Rentabilidade no mes */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-1">
          <span className="text-[10px] uppercase tracking-widest text-white/40 font-medium block">
            Rentabilidade no mes
          </span>
          <p className="text-lg font-bold text-white">
            {masked(fmt(totals.monthlyReturn))}
          </p>
          <p
            className={cn(
              "text-xs font-medium flex items-center gap-1",
              totals.monthlyReturnPct >= 0 ? "text-[#00BC6E]" : "text-red-400"
            )}
          >
            {totals.monthlyReturnPct >= 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {maskedPct(fmtPct(totals.monthlyReturnPct))}
          </p>
        </div>

        {/* Rentabilidade no ano */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-1">
          <span className="text-[10px] uppercase tracking-widest text-white/40 font-medium block">
            Rentabilidade no ano
          </span>
          <p className="text-lg font-bold text-white">
            {masked(fmt(totals.yearlyReturn))}
          </p>
          <p
            className={cn(
              "text-xs font-medium flex items-center gap-1",
              totals.yearlyReturnPct >= 0 ? "text-[#00BC6E]" : "text-red-400"
            )}
          >
            {totals.yearlyReturnPct >= 0 ? (
              <TrendingUp className="h-3 w-3" />
            ) : (
              <TrendingDown className="h-3 w-3" />
            )}
            {maskedPct(fmtPct(totals.yearlyReturnPct))}
          </p>
        </div>

        {/* Proximos pagamentos */}
        <div className="rounded-2xl bg-white/5 border border-white/10 p-4 space-y-1">
          <span className="text-[10px] uppercase tracking-widest text-white/40 font-medium block">
            Proximos pagamentos
          </span>
          <p className="text-lg font-bold text-white">
            {masked(fmt(totals.nextPayment))}
          </p>
          <p className="text-xs text-white/40 flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            Nenhum pagamento programado
          </p>
        </div>
      </div>

      {/* ── Performance chart ────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white/5 border border-white/10 overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-base font-semibold text-white">Rentabilidade</h2>
          <p className="text-xs text-white/40 mt-0.5">
            Evolucao dos seus investimentos
          </p>
        </div>

        {/* Period tabs */}
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

            {/* All tabs share the same chart; period filtering could be wired later */}
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

      {/* ── Minha carteira ───────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4">
        <h2 className="text-base font-semibold text-white">Minha carteira</h2>

        {hasInvestments ? (
          <div className="space-y-3">
            {allocationClasses.map((cls) => (
              <div key={cls.label} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn("h-2.5 w-2.5 rounded-full flex-shrink-0", cls.color)} />
                  <span className="text-sm text-white/70 truncate">{cls.label}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="h-1.5 w-20 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", cls.color)}
                      style={{ width: `${cls.pct}%` }}
                    />
                  </div>
                  <span className="text-xs text-white/40 w-8 text-right">
                    {cls.pct}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/40 text-center py-2">
            Carteira ainda nao iniciada.
          </p>
        )}
      </div>

      {/* ── Produtos recomendados ────────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">
            Produtos recomendados
          </h2>
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
              {/* Icon */}
              <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-[#00BC6E]/15 border border-[#00BC6E]/20 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-[#00BC6E]" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {product.name}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[10px] text-white/40">{product.category}</span>
                  <span className="text-[10px] text-white/20">•</span>
                  <span className="text-[10px] text-white/40 flex items-center gap-0.5">
                    <Clock className="h-2.5 w-2.5" />
                    Min: {fmtMin(product.minInvestment)}
                  </span>
                </div>
              </div>

              {/* Right side */}
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <span className="text-sm font-bold text-[#00BC6E]">
                  {product.returnRate}
                </span>
                <div className="flex items-center gap-2">
                  <Badge
                    className={cn(
                      "text-[9px] px-1.5 py-0 h-4 border font-medium",
                      riskColors[product.risk]
                    )}
                  >
                    {riskLabels[product.risk]}
                  </Badge>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[10px] font-medium border-white/20 text-white/70 bg-transparent hover:bg-white/10 hover:text-white rounded-lg"
                  >
                    <Link href={`/investor/products/${product.id}`}>
                      Simular
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Legal disclaimer ─────────────────────────────────────────────────── */}
      <p className="text-[10px] text-white/25 text-center text-pretty pb-2 leading-relaxed">
        Rentabilidade estimada nao representa garantia de retorno. Produtos
        sujeitos a risco de credito, mercado e liquidez.
      </p>

      {/* ── Renewal dialog ───────────────────────────────────────────────────── */}
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
          Explore a prateleira da Akin S.A. e encontre oportunidades adequadas
          ao seu perfil.
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
