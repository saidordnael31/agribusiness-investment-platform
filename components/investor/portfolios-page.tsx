"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Shield,
  Clock,
  TrendingUp,
  ChevronRight,
  Layers,
  DollarSign,
  BarChart3,
} from "lucide-react";

// ─── Dados ────────────────────────────────────────────────────────────────────

interface PortfolioAllocation {
  name: string;
  percentage: number;
  amount?: number;
  color: string;
}

interface Portfolio {
  id: string;
  name: string;
  ticket: number;
  term: string;
  profile: string;
  liquidity: string;
  riskNumber: 1 | 2 | 3 | 4 | 5;
  targetReturn: string;
  allocation: PortfolioAllocation[];
  description: string;
}

const portfolios: Portfolio[] = [
  {
    id: "wealth-300k-defensiva",
    name: "Akin Wealth 300K Defensiva",
    ticket: 300000,
    term: "36 meses",
    profile: "Moderado",
    liquidity: "Escalonada",
    riskNumber: 3,
    targetReturn: "CDI + 4,5% a.a. ponderado",
    description: "Composição equilibrada com foco em crédito privado de alta qualidade e imobiliário, priorizando proteção do capital e previsibilidade de fluxo.",
    allocation: [
      { name: "FIDC Akin Sênior", percentage: 35, color: "#00BC6E" },
      { name: "CRI Akin Real Estate", percentage: 30, color: "#00a85f" },
      { name: "Nota Comercial Akin CR", percentage: 20, color: "#0891b2" },
      { name: "Debênture Akin Privada", percentage: 15, color: "#0369a1" },
    ],
  },
  {
    id: "wealth-300k-moderada",
    name: "Akin Wealth 300K Moderada",
    ticket: 300000,
    term: "36 meses",
    profile: "Moderado / Arrojado",
    liquidity: "Mista",
    riskNumber: 4,
    targetReturn: "CDI + 5,5% a.a. ponderado",
    description: "Portfólio diversificado entre crédito privado, imobiliário e alternativos, com foco em rentabilidade superior ao CDI com gestão ativa de risco.",
    allocation: [
      { name: "FIDC Akin Sênior", percentage: 25, amount: 75000, color: "#00BC6E" },
      { name: "CRI Akin Real Estate", percentage: 25, amount: 75000, color: "#00a85f" },
      { name: "Nota Comercial Akin CR", percentage: 17, amount: 50000, color: "#0891b2" },
      { name: "Debênture Akin Privada", percentage: 20, amount: 60000, color: "#0369a1" },
      { name: "SCP Akin Alternativos", percentage: 13, amount: 40000, color: "#7c3aed" },
    ],
  },
  {
    id: "wealth-alta-convicao",
    name: "Akin Wealth Alta Convicção",
    ticket: 300000,
    term: "36 a 60 meses",
    profile: "Arrojado / Qualificado",
    liquidity: "Baixa",
    riskNumber: 5,
    targetReturn: "CDI + 7%+ a.a. ponderado (estimado)",
    description: "Portfólio de alta convicção com exposição a crédito estruturado complexo, ativos reais, alternativos e equity, para investidores com ampla tolerância a risco e horizonte longo.",
    allocation: [
      { name: "Debênture Akin Privada", percentage: 25, color: "#0369a1" },
      { name: "FIDC Akin Fertilizantes", percentage: 25, color: "#00BC6E" },
      { name: "CRI Akin Real Estate", percentage: 20, color: "#00a85f" },
      { name: "Debênture Conversível Akin", percentage: 15, color: "#d97706" },
      { name: "Akin Equity / SCP Alternativos", percentage: 15, color: "#7c3aed" },
    ],
  },
];

const RISK_COLORS: Record<number, { bg: string; border: string; text: string; label: string }> = {
  3: { bg: "bg-yellow-500/10", border: "border-yellow-500/20", text: "text-yellow-400", label: "Nível 3 — Moderado" },
  4: { bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-400", label: "Nível 4 — Alto" },
  5: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", label: "Nível 5 — Muito alto" },
};

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

// ─── Mini gráfico de barras ───────────────────────────────────────────────────

function AllocationBar({ allocation }: { allocation: PortfolioAllocation[] }) {
  return (
    <div className="space-y-2">
      <div className="flex h-3 rounded-full overflow-hidden gap-px">
        {allocation.map((a) => (
          <div key={a.name} style={{ width: `${a.percentage}%`, backgroundColor: a.color }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        {allocation.map((a) => (
          <div key={a.name} className="flex items-center gap-1">
            <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
            <span className="text-white/40 text-[10px]">{a.name} — {a.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Card da carteira ─────────────────────────────────────────────────────────

function PortfolioCard({ portfolio }: { portfolio: Portfolio }) {
  const router = useRouter();
  const risk = RISK_COLORS[portfolio.riskNumber] ?? RISK_COLORS[3];

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5 flex flex-col gap-4">
      {/* Header */}
      <div>
        <h3 className="text-white font-bold text-base leading-snug">{portfolio.name}</h3>
        <p className="text-white/40 text-xs mt-1 leading-relaxed">{portfolio.description}</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { icon: <DollarSign className="h-3 w-3" />, label: "Ticket mínimo", value: fmt(portfolio.ticket) },
          { icon: <Clock className="h-3 w-3" />, label: "Prazo", value: portfolio.term },
          { icon: <TrendingUp className="h-3 w-3" />, label: "Retorno-alvo", value: portfolio.targetReturn },
          { icon: <BarChart3 className="h-3 w-3" />, label: "Liquidez", value: portfolio.liquidity },
        ].map((m) => (
          <div key={m.label} className="rounded-xl bg-white/5 border border-white/8 px-3 py-2.5">
            <div className="flex items-center gap-1 text-white/30 text-[9px] uppercase tracking-wider mb-1">
              {m.icon} {m.label}
            </div>
            <p className="text-white/80 text-xs font-semibold leading-snug">{m.value}</p>
          </div>
        ))}
      </div>

      {/* Risco + Perfil */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border", risk.bg, risk.border, risk.text)}>
          <Shield className="h-2.5 w-2.5" /> {risk.label}
        </span>
        <span className="px-2.5 py-1 rounded-full bg-white/8 text-white/50 text-[10px] border border-white/10">
          Perfil: {portfolio.profile}
        </span>
      </div>

      {/* Alocação */}
      <div className="space-y-2">
        <p className="text-white/40 text-[10px] uppercase tracking-wider">Composição</p>
        <AllocationBar allocation={portfolio.allocation} />
      </div>

      {/* CTA */}
      <button
        onClick={() => router.push(`/investor/portfolios/${portfolio.id}`)}
        className="flex items-center justify-between w-full py-3 px-4 rounded-xl bg-[#00BC6E]/10 border border-[#00BC6E]/20 hover:bg-[#00BC6E]/15 transition-colors group"
      >
        <span className="text-[#00BC6E] text-sm font-semibold">Ver detalhes e reservar</span>
        <ChevronRight className="h-4 w-4 text-[#00BC6E] group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function PortfoliosPage() {
  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-5">
        <div className="flex items-center gap-2 mb-2">
          <Layers className="h-5 w-5 text-[#00BC6E]" />
          <h1 className="text-white font-bold text-2xl leading-tight">Carteiras Recomendadas</h1>
        </div>
        <p className="text-white/50 text-sm leading-relaxed">
          Composições estruturadas para diferentes perfis, prazos e objetivos patrimoniais.
        </p>
      </div>

      {/* Cards */}
      <div className="px-4 space-y-4">
        {portfolios.map((p) => (
          <PortfolioCard key={p.id} portfolio={p} />
        ))}
      </div>

      {/* Compliance */}
      <div className="px-4 mt-8 mb-2">
        <div className="rounded-xl bg-white/3 border border-white/8 px-4 py-4">
          <p className="text-white/25 text-[10px] leading-relaxed">
            Rentabilidade passada, projetada ou estimada não representa garantia de retorno futuro. Produtos sujeitos a risco de crédito, mercado, liquidez, operacional e regulatório. A disponibilidade depende do perfil do investidor, documentação aplicável e regras específicas de cada oferta. Alguns produtos não contam com garantia do FGC.
          </p>
        </div>
      </div>
    </div>
  );
}
