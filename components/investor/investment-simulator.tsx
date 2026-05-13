"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  BarChart2,
  Calculator,
  TrendingUp,
  Wallet,
  Clock,
  Droplets,
  ArrowRight,
  ChevronRight,
} from "lucide-react";
import {
  getInvestorMonthlyRate,
  getInvestorMonthlyRateForExternalAdvisor,
  getInvestorMonthlyRateForIndividualAdvisor,
  getAvailableLiquidityOptions,
  getAvailableLiquidityOptionsForExternalAdvisor,
  getAvailableLiquidityOptionsForIndividualAdvisor,
  type LiquidityOption,
} from "@/lib/commission-calculator";

interface Bonification {
  id: string;
  type: "value" | "commitment" | "promotion";
  name: string;
  description: string;
  bonus: number;
  minValue?: number;
  minCommitment?: number;
  isActive: boolean;
}

const fmt = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

const fmtPct = (n: number) => `${(n * 100).toFixed(2)}%`;

// CDI e IPCA mensais de referência
const CDI_MONTHLY = 0.009;
const IPCA_MONTHLY = 0.004;

const CATEGORIES = [
  { value: "scp", label: "SCP Alternativos" },
  { value: "ccb", label: "CCB" },
  { value: "cra", label: "CRA" },
  { value: "cri", label: "CRI" },
  { value: "fidc", label: "FIDC" },
  { value: "infra", label: "Infraestrutura" },
];

const RISK_LABELS = ["Conservador", "Moderado", "Arrojado"];

export function InvestmentSimulator({
  title,
  isExternalAdvisorInvestor = false,
  isIndividualAdvisorInvestor = false,
}: {
  title?: string;
  isExternalAdvisorInvestor?: boolean;
  isIndividualAdvisorInvestor?: boolean;
}) {
  const [user, setUser] = useState<null>(null);
  const [amount, setAmount] = useState("50000");
  const [rawAmount, setRawAmount] = useState("50000");
  const [commitmentPeriod, setCommitmentPeriod] = useState("");
  const [liquidity, setLiquidity] = useState("");
  const [category, setCategory] = useState("scp");
  const [riskIndex, setRiskIndex] = useState(1);
  const [activeTab, setActiveTab] = useState("Renda Fixa");
  const [results, setResults] = useState<{
    monthlyReturn: number;
    totalReturn: number;
    finalAmount: number;
    monthlyRate: number;
    baseBonifications: Bonification[];
    totalBonusRate: number;
    bonusReturn: number;
  } | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem("user");
    if (userStr) setUser(JSON.parse(userStr));
  }, []);

  const getRateByPeriodAndLiquidity = (period: number, liq: string): number => {
    const opt = liq as LiquidityOption;
    const effectiveIsIndividual =
      isIndividualAdvisorInvestor || (!!title && user?.role === "assessor_individual");
    const effectiveIsExternal =
      isExternalAdvisorInvestor || (!!title && user?.role === "assessor_externo");

    if (effectiveIsIndividual) return getInvestorMonthlyRateForIndividualAdvisor(period, opt);
    if (effectiveIsExternal) return getInvestorMonthlyRateForExternalAdvisor(period, opt);
    return getInvestorMonthlyRate(period, opt);
  };

  const getLiquidityOptionsForPeriod = (period: number): string[] => {
    const effectiveIsIndividual =
      isIndividualAdvisorInvestor || (!!title && user?.role === "assessor_individual");
    const effectiveIsExternal =
      isExternalAdvisorInvestor || (!!title && user?.role === "assessor_externo");

    const options = effectiveIsIndividual
      ? getAvailableLiquidityOptionsForIndividualAdvisor(period)
      : effectiveIsExternal
        ? getAvailableLiquidityOptionsForExternalAdvisor(period)
        : getAvailableLiquidityOptions(period);
    return options as string[];
  };

  const calculateReturns = () => {
    const investmentAmount = Number.parseFloat(amount);
    const period = Number.parseInt(commitmentPeriod);
    if (!investmentAmount || !period || !liquidity) return;

    setIsCalculating(true);
    const monthlyRate = getRateByPeriodAndLiquidity(period, liquidity);
    if (monthlyRate === 0) { setIsCalculating(false); return; }

    const finalAmount = investmentAmount * Math.pow(1 + monthlyRate, period);
    const totalReturn = finalAmount - investmentAmount;
    const monthlyReturn = investmentAmount * monthlyRate;

    setTimeout(() => {
      setResults({
        monthlyReturn,
        totalReturn,
        finalAmount,
        monthlyRate,
        baseBonifications: [],
        totalBonusRate: 0,
        bonusReturn: 0,
      });
      setIsCalculating(false);
    }, 400);
  };

  const effectiveIsIndividual =
    isIndividualAdvisorInvestor || (!!title && user?.role === "assessor_individual");
  const commitmentPeriodOptions = effectiveIsIndividual ? [6, 12, 24, 36] : [3, 6, 12, 24, 36];

  useEffect(() => {
    if (effectiveIsIndividual && commitmentPeriod === "3") {
      setCommitmentPeriod("");
      setLiquidity("");
    }
  }, [effectiveIsIndividual]);

  const formatMoneyInput = (val: string) => {
    const digits = val.replace(/\D/g, "");
    if (!digits) return "";
    const num = Number(digits) / 100;
    return new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    setRawAmount(digits);
    const num = Number(digits) / 100;
    setAmount(String(num));
  };

  // Comparativos (cálculo baseado no period e amount)
  const period = Number.parseInt(commitmentPeriod) || 12;
  const inv = Number.parseFloat(amount) || 50000;
  const cdiTotal = inv * Math.pow(1 + CDI_MONTHLY, period) - inv;
  const ipcaTotal = inv * Math.pow(1 + IPCA_MONTHLY, period) - inv;

  // Tabela de dados do gráfico de barras simples (progresso relativo ao finalAmount)
  const chartData = results
    ? [
        { label: "Investido", value: inv, color: "#334155" },
        { label: "CDI", value: inv + cdiTotal, color: "#475569" },
        { label: "IPCA", value: inv + ipcaTotal, color: "#64748b" },
        { label: "Akin", value: results.finalAmount, color: "#00BC6E" },
      ]
    : null;
  const chartMax = chartData ? Math.max(...chartData.map((d) => d.value)) : 1;

  // ─── Distributor version ───────────────────────────────────────────────────
  if (!!title) {
    return (
      <Card className="bg-gradient-to-b from-[#D9D9D9] via-[#596D7E] to-[#01223F] border-gray-200 rounded-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center justify-center overflow-hidden pointer-events-none z-0">
          <Calculator className="h-[90%] w-auto text-white" style={{ transform: "translateX(20%)" }} />
        </div>
        <CardHeader className="pb-4 relative z-10">
          <CardTitle className="text-[#003F28] text-xl font-bold mb-2">{title}</CardTitle>
          <CardDescription className="text-gray-600 text-sm mt-1">
            Simule os retornos do investimento no Clube de Investimento Privado do Agronegócio
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 relative z-10">
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="dist-amount" className="text-white">Valor do Investimento</Label>
              <input
                id="dist-amount"
                type="text"
                inputMode="numeric"
                placeholder="R$ 5.000,00"
                value={rawAmount ? formatMoneyInput(rawAmount) : ""}
                onChange={handleAmountChange}
                className="flex h-10 w-full rounded-md border border-gray-300 bg-[#D9D9D9]/45 px-3 py-2 text-sm text-[#003F28] placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#00BC6E]"
              />
              <p className="text-xs text-white/70">Mínimo: R$ 5.000,00</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-white">Prazo</Label>
                <Select value={commitmentPeriod} onValueChange={(v) => { setCommitmentPeriod(v); setLiquidity(""); }}>
                  <SelectTrigger className="bg-[#D9D9D9]/45 border-gray-300 text-[#003F28]">
                    <SelectValue placeholder="Selecione o prazo" />
                  </SelectTrigger>
                  <SelectContent>
                    {commitmentPeriodOptions.map((m) => (
                      <SelectItem key={m} value={String(m)}>{m} meses</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-white">Liquidez da Rentabilidade</Label>
                <Select value={liquidity} onValueChange={setLiquidity} disabled={!commitmentPeriod}>
                  <SelectTrigger className="bg-[#D9D9D9]/45 border-gray-300 text-[#003F28]">
                    <SelectValue placeholder="Selecione a liquidez" />
                  </SelectTrigger>
                  <SelectContent>
                    {getLiquidityOptionsForPeriod(Number.parseInt(commitmentPeriod)).map((o) => (
                      <SelectItem key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <Button onClick={calculateReturns} className="w-full bg-[#01223F] hover:bg-[#01223F]/80 text-white">
            <Calculator className="h-4 w-4 mr-2" />
            Calcular Retornos
          </Button>
          {results && (
            <div className="space-y-4">
              <div className="p-4 bg-[#D9D9D9]/45 rounded-lg border border-gray-300">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-[#003F28]" />
                  <h4 className="font-semibold text-[#003F28]">Taxa Aplicada</h4>
                </div>
                <p className="text-sm text-gray-600">Prazo: {commitmentPeriod} meses | Liquidez: {liquidity.charAt(0).toUpperCase() + liquidity.slice(1)}</p>
                <p className="text-lg font-bold text-[#00BC6E]">
                  {(getRateByPeriodAndLiquidity(Number.parseInt(commitmentPeriod), liquidity) * 100).toFixed(2)}% a.m.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-[#D9D9D9]/45 rounded-lg border border-gray-300">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Retorno Mensal</p>
                  <p className="text-2xl font-bold text-[#00BC6E]">{fmt(results.monthlyReturn)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Retorno Total</p>
                  <p className="text-2xl font-bold text-[#003F28]">{fmt(results.totalReturn)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Valor Final</p>
                  <p className="text-2xl font-bold text-[#003F28]">{fmt(results.finalAmount)}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // ─── Investor premium version ──────────────────────────────────────────────
  const TABS = ["Renda Fixa", "Crédito Privado", "Agro", "Alternativos"];

  return (
    <div className="w-full rounded-2xl bg-[#0a1628] border border-white/8 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-5 border-b border-white/8">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00BC6E]/10 border border-[#00BC6E]/20">
              <BarChart2 className="h-4 w-4 text-[#00BC6E]" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg leading-tight">Simulador Patrimonial</h2>
              <p className="text-white/40 text-xs mt-0.5">Projete cenários de patrimônio, rentabilidade e fluxo financeiro.</p>
            </div>
          </div>
          <Badge className="shrink-0 bg-[#00BC6E]/10 text-[#00BC6E] border border-[#00BC6E]/20 text-[10px] font-medium px-2 py-0.5 rounded-full">
            Investimentos Privados
          </Badge>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-5">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab
                  ? "bg-[#00BC6E]/15 text-[#00BC6E] border border-[#00BC6E]/25"
                  : "text-white/40 hover:text-white/70 hover:bg-white/5"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Body — 2 cols desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-white/8">
        {/* ── Coluna esquerda: inputs ── */}
        <div className="p-6 space-y-5">
          <p className="text-white/50 text-xs uppercase tracking-widest font-medium">Parâmetros</p>

          {/* Valor */}
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs font-medium flex items-center gap-1.5">
              <Wallet className="h-3 w-3" /> Valor do investimento
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm font-medium">R$</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="50.000,00"
                value={rawAmount ? formatMoneyInput(rawAmount) : ""}
                onChange={handleAmountChange}
                className="w-full h-11 rounded-xl bg-[#111827] border border-white/10 pl-9 pr-4 text-white text-sm font-medium placeholder:text-white/20 focus:outline-none focus:border-[#00BC6E]/50 focus:ring-1 focus:ring-[#00BC6E]/30 transition-all"
              />
            </div>
            <p className="text-white/30 text-[11px]">Mínimo: R$ 5.000,00</p>
          </div>

          {/* Prazo e Liquidez */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs font-medium flex items-center gap-1.5">
                <Clock className="h-3 w-3" /> Prazo
              </Label>
              <Select value={commitmentPeriod} onValueChange={(v) => { setCommitmentPeriod(v); setLiquidity(""); }}>
                <SelectTrigger className="h-11 rounded-xl bg-[#111827] border-white/10 text-white text-sm focus:border-[#00BC6E]/50 focus:ring-[#00BC6E]/30">
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent className="bg-[#111827] border-white/10">
                  {commitmentPeriodOptions.map((m) => (
                    <SelectItem key={m} value={String(m)} className="text-white focus:bg-[#00BC6E]/10 focus:text-[#00BC6E]">
                      {m} meses
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70 text-xs font-medium flex items-center gap-1.5">
                <Droplets className="h-3 w-3" /> Liquidez
              </Label>
              <Select value={liquidity} onValueChange={setLiquidity} disabled={!commitmentPeriod}>
                <SelectTrigger className="h-11 rounded-xl bg-[#111827] border-white/10 text-white text-sm focus:border-[#00BC6E]/50 focus:ring-[#00BC6E]/30 disabled:opacity-40">
                  <SelectValue placeholder="Selecionar" />
                </SelectTrigger>
                <SelectContent className="bg-[#111827] border-white/10">
                  {getLiquidityOptionsForPeriod(Number.parseInt(commitmentPeriod)).map((o) => (
                    <SelectItem key={o} value={o} className="text-white focus:bg-[#00BC6E]/10 focus:text-[#00BC6E]">
                      {o.charAt(0).toUpperCase() + o.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Categoria */}
          <div className="space-y-1.5">
            <Label className="text-white/70 text-xs font-medium">Categoria do produto</Label>
            <div className="grid grid-cols-3 gap-1.5">
              {CATEGORIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCategory(c.value)}
                  className={`h-8 rounded-lg text-xs font-medium transition-all ${
                    category === c.value
                      ? "bg-[#00BC6E]/15 text-[#00BC6E] border border-[#00BC6E]/30"
                      : "bg-[#111827] text-white/40 border border-white/8 hover:text-white/70 hover:bg-white/5"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Risco */}
          <div className="space-y-2">
            <Label className="text-white/70 text-xs font-medium flex justify-between">
              <span>Perfil de risco</span>
              <span className="text-[#00BC6E] font-semibold">{RISK_LABELS[riskIndex]}</span>
            </Label>
            <input
              type="range"
              min={0}
              max={2}
              step={1}
              value={riskIndex}
              onChange={(e) => setRiskIndex(Number(e.target.value))}
              className="w-full h-1 appearance-none bg-white/10 rounded-full accent-[#00BC6E] cursor-pointer"
            />
            <div className="flex justify-between">
              {RISK_LABELS.map((l, i) => (
                <span key={l} className={`text-[10px] ${i === riskIndex ? "text-[#00BC6E]" : "text-white/30"}`}>{l}</span>
              ))}
            </div>
          </div>

          {/* CTA */}
          <button
            onClick={calculateReturns}
            disabled={!commitmentPeriod || !liquidity || isCalculating}
            className="w-full h-11 rounded-xl bg-[#00BC6E] hover:bg-[#00a85f] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#00BC6E]/20"
          >
            {isCalculating ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Calculando...
              </span>
            ) : (
              <>
                Simular patrimônio
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>

        {/* ── Coluna direita: resultados ── */}
        <div className="p-6 space-y-5">
          <p className="text-white/50 text-xs uppercase tracking-widest font-medium">Projeção patrimonial</p>

          {results ? (
            <>
              {/* Cards principais */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[#111827] border border-white/8 p-4">
                  <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Patrimônio estimado</p>
                  <p className="text-[#00BC6E] text-xl font-bold leading-tight">{fmt(results.finalAmount)}</p>
                  <p className="text-white/30 text-[10px] mt-1">em {commitmentPeriod} meses</p>
                </div>
                <div className="rounded-xl bg-[#111827] border border-white/8 p-4">
                  <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Ganho projetado</p>
                  <p className="text-white text-xl font-bold leading-tight">{fmt(results.totalReturn)}</p>
                  <p className="text-[#00BC6E] text-[10px] mt-1 font-medium">
                    +{((results.totalReturn / inv) * 100).toFixed(1)}% no período
                  </p>
                </div>
                <div className="rounded-xl bg-[#111827] border border-white/8 p-4">
                  <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Rentabilidade</p>
                  <p className="text-white text-xl font-bold leading-tight">{fmtPct(results.monthlyRate)}</p>
                  <p className="text-white/30 text-[10px] mt-1">ao mês</p>
                </div>
                <div className="rounded-xl bg-[#111827] border border-white/8 p-4">
                  <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Fluxo estimado</p>
                  <p className="text-white text-xl font-bold leading-tight">{fmt(results.monthlyReturn)}</p>
                  <p className="text-white/30 text-[10px] mt-1">por mês</p>
                </div>
              </div>

              {/* Gráfico de barras comparativo */}
              <div className="rounded-xl bg-[#111827] border border-white/8 p-4 space-y-3">
                <p className="text-white/50 text-[10px] uppercase tracking-wider font-medium">Comparativo de retorno</p>
                {chartData!.map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-white/60 text-xs">{item.label}</span>
                      <span className={`text-xs font-semibold ${item.label === "Akin" ? "text-[#00BC6E]" : "text-white/50"}`}>
                        {fmt(item.value)}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${(item.value / chartMax) * 100}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Cenários */}
              <div className="rounded-xl bg-[#111827] border border-white/8 p-4 space-y-2">
                <p className="text-white/50 text-[10px] uppercase tracking-wider font-medium mb-3">Cenários</p>
                {[
                  { label: "Conservador", mult: 0.85 },
                  { label: "Moderado", mult: 1.0 },
                  { label: "Agressivo", mult: 1.15 },
                ].map(({ label, mult }) => {
                  const scenario = inv * Math.pow(1 + results.monthlyRate * mult, period);
                  return (
                    <div key={label} className="flex justify-between items-center py-1 border-b border-white/5 last:border-0">
                      <span className="text-white/50 text-xs">{label}</span>
                      <span className="text-white/80 text-xs font-semibold">{fmt(scenario)}</span>
                    </div>
                  );
                })}
              </div>

              {/* Detalhes */}
              <div className="flex gap-2 text-[10px] text-white/30">
                <span>Prazo: {commitmentPeriod}m</span>
                <span>•</span>
                <span>Liquidez: {liquidity.charAt(0).toUpperCase() + liquidity.slice(1)}</span>
                <span>•</span>
                <span>Taxa: {fmtPct(results.monthlyRate)} a.m.</span>
              </div>
            </>
          ) : (
            /* Estado vazio */
            <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-[#111827] border border-white/8 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-white/20" />
              </div>
              <div>
                <p className="text-white/40 text-sm font-medium">Preencha os parâmetros</p>
                <p className="text-white/20 text-xs mt-1">A projeção patrimonial aparecerá aqui</p>
              </div>
              <div className="flex gap-2 flex-wrap justify-center mt-2">
                {["CDI", "IPCA", "Cenários"].map((tag) => (
                  <span key={tag} className="px-2 py-0.5 rounded-full bg-white/5 text-white/20 text-[10px]">{tag}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-white/8 bg-[#080f1e]">
        <p className="text-white/20 text-[10px] leading-relaxed">
          Simulação com fins ilustrativos. Rentabilidade passada nao garante retorno futuro. Investimentos sujeitos a riscos. Consulte o material informativo completo antes de investir.
        </p>
      </div>
    </div>
  );
}
