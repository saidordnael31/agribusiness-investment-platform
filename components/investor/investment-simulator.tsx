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
import { Calculator, TrendingUp } from "lucide-react";
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

  const inv = Number.parseFloat(amount) || 50000;

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

  // ─── Investor version ─────────────────────────────────────────────────────
  return (
    <div className="w-full rounded-2xl bg-[#0a1628] border border-white/10 shadow-xl overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-5 border-b border-white/8">
        <h2 className="text-white font-semibold text-base leading-tight">Simulador Patrimonial</h2>
        <p className="text-white/40 text-xs mt-1">Calcule a rentabilidade estimada do seu investimento.</p>
      </div>

      {/* Campos */}
      <div className="p-6 space-y-5">
        {/* Valor */}
        <div className="space-y-1.5">
          <Label className="text-white/60 text-xs font-medium">Valor do investimento</Label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">R$</span>
            <input
              type="text"
              inputMode="numeric"
              placeholder="50.000,00"
              value={rawAmount ? formatMoneyInput(rawAmount) : ""}
              onChange={handleAmountChange}
              className="w-full h-11 rounded-xl bg-white/5 border border-white/10 pl-9 pr-4 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#00BC6E]/50 focus:ring-1 focus:ring-[#00BC6E]/20 transition-all"
            />
          </div>
          <p className="text-white/25 text-[11px]">Mínimo: R$ 5.000,00</p>
        </div>

        {/* Prazo e Liquidez */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs font-medium">Prazo</Label>
            <Select value={commitmentPeriod} onValueChange={(v) => { setCommitmentPeriod(v); setLiquidity(""); }}>
              <SelectTrigger className="h-11 rounded-xl bg-white/5 border-white/10 text-white text-sm focus:border-[#00BC6E]/50">
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent className="bg-[#0f1e35] border-white/10">
                {commitmentPeriodOptions.map((m) => (
                  <SelectItem key={m} value={String(m)} className="text-white focus:bg-[#00BC6E]/10 focus:text-[#00BC6E]">
                    {m} meses
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-white/60 text-xs font-medium">Liquidez da rentabilidade</Label>
            <Select value={liquidity} onValueChange={setLiquidity} disabled={!commitmentPeriod}>
              <SelectTrigger className="h-11 rounded-xl bg-white/5 border-white/10 text-white text-sm focus:border-[#00BC6E]/50 disabled:opacity-40">
                <SelectValue placeholder="Selecionar" />
              </SelectTrigger>
              <SelectContent className="bg-[#0f1e35] border-white/10">
                {getLiquidityOptionsForPeriod(Number.parseInt(commitmentPeriod)).map((o) => (
                  <SelectItem key={o} value={o} className="text-white focus:bg-[#00BC6E]/10 focus:text-[#00BC6E]">
                    {o.charAt(0).toUpperCase() + o.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Botão */}
        <button
          onClick={calculateReturns}
          disabled={!commitmentPeriod || !liquidity || isCalculating}
          className="w-full h-11 rounded-xl bg-[#00BC6E] hover:bg-[#00a85f] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors"
        >
          {isCalculating ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Calculando...
            </>
          ) : (
            "Calcular retornos"
          )}
        </button>

        {/* Resultado */}
        {results && (
          <div className="rounded-xl bg-white/5 border border-white/8 divide-y divide-white/8">
            <div className="px-5 py-4">
              <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Valor estimado</p>
              <p className="text-[#00BC6E] text-2xl font-bold">{fmt(results.finalAmount)}</p>
              <p className="text-white/30 text-xs mt-0.5">em {commitmentPeriod} meses</p>
            </div>
            <div className="grid grid-cols-2 divide-x divide-white/8">
              <div className="px-5 py-4">
                <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Rentabilidade</p>
                <p className="text-white text-base font-semibold">{fmtPct(results.monthlyRate)}</p>
                <p className="text-white/30 text-[10px] mt-0.5">ao mês</p>
              </div>
              <div className="px-5 py-4">
                <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Ganho total</p>
                <p className="text-white text-base font-semibold">{fmt(results.totalReturn)}</p>
                <p className="text-white/30 text-[10px] mt-0.5">no período</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 pb-5">
        <p className="text-white/20 text-[10px] leading-relaxed">
          Simulacao com fins ilustrativos. Rentabilidade passada nao garante retorno futuro. Investimentos sujeitos a riscos.
        </p>
      </div>
    </div>
  );
}
