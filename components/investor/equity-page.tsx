"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  Clock,
  AlertTriangle,
  ChevronRight,
  Zap,
  Shield,
  Info,
} from "lucide-react";

// ─── Dados ────────────────────────────────────────────────────────────────────

interface EquityProduct {
  id: string;
  name: string;
  type: string;
  thesis: string;
  term: string;
  liquidity: string;
  valuationEntry?: string;
  conversionPotential?: string;
  scenarios: { label: string; description: string }[];
  risks: string[];
}

const equityProducts: EquityProduct[] = [
  {
    id: "akin-equity-growth-i",
    name: "Akin Equity Growth I",
    type: "Equity / Participação",
    thesis: "Participação direta em empresa ou projeto selecionado pela Akin S.A., com potencial de valorização de longo prazo via crescimento operacional e eventos de liquidez.",
    term: "Longo prazo (indefinido)",
    liquidity: "Evento de liquidez (M&A, IPO ou distribuição)",
    valuationEntry: "Definido conforme rodada de captação",
    conversionPotential: "N/A — participação direta",
    scenarios: [
      { label: "Conservador", description: "Empresa estabiliza operações sem evento de liquidez relevante no horizonte de 5 anos. Retorno próximo ao capital investido." },
      { label: "Base", description: "Crescimento moderado com evento de venda parcial ou dividendos dentro de 3 a 5 anos. Múltiplo de 1,5x a 2,5x." },
      { label: "Otimista", description: "Crescimento acelerado com IPO ou M&A estratégico. Múltiplo de 3x ou superior." },
    ],
    risks: [
      "Perda total do capital investido em caso de falência ou insolvência",
      "Diluição por novas rodadas de captação",
      "Ausência de mercado secundário antes de evento de liquidez",
      "Dependência da gestão e do mercado da empresa portfólio",
    ],
  },
  {
    id: "akin-convertible-note-i",
    name: "Akin Convertible Note I",
    type: "Mútuo conversível / Nota conversível",
    thesis: "Crédito de curto a médio prazo com possibilidade de conversão em participação societária em rodada qualificada futura, combinando proteção de crédito com upside de equity.",
    term: "36 a 60 meses",
    liquidity: "Vencimento ou conversão em rodada qualificada",
    valuationEntry: "Cap de valuation definido no instrumento de emissão",
    conversionPotential: "Conversão automática em rodada qualificada acima do cap",
    scenarios: [
      { label: "Conservador", description: "Sem rodada qualificada. Retorno do principal mais juros contratuais mínimos no vencimento." },
      { label: "Base", description: "Rodada qualificada dentro do prazo. Conversão com desconto. Múltiplo de 1,5x a 3x sobre o capital convertido." },
      { label: "Otimista", description: "Conversão em rodada de alto valuation seguida de evento de liquidez. Múltiplo de 5x ou superior." },
    ],
    risks: [
      "Risco de crédito do emissor antes da conversão",
      "Possibilidade de não ocorrência de rodada qualificada no prazo",
      "Diluição pós-conversão em novas rodadas",
      "Complexidade contratual e risco de interpretação dos termos",
    ],
  },
  {
    id: "debenture-conversivel-akin",
    name: "Debênture Conversível Akin",
    type: "Dívida + potencial de conversão",
    thesis: "Remuneração mínima contratual de 10% a.a. com opção de conversão em participação societária em evento qualificado, proporcionando proteção de renda com exposição ao upside.",
    term: "36 a 60 meses",
    liquidity: "Conforme escritura / evento de liquidez",
    valuationEntry: "Conforme escritura de emissão",
    conversionPotential: "Opção de conversão em IPO, M&A ou rodada série B+",
    scenarios: [
      { label: "Conservador", description: "Sem evento de conversão. Recebimento da rentabilidade contratual de 10% a.a. até o vencimento." },
      { label: "Base", description: "Conversão em rodada qualificada com upside de 1,5x a 3x sobre o capital convertido além da remuneração acumulada." },
      { label: "Otimista", description: "Evento de liquidez pleno (IPO ou M&A estratégico) com múltiplo de 4x ou superior sobre o convertido." },
    ],
    risks: [
      "Risco de inadimplência na parcela de dívida",
      "Evento de conversão pode não ocorrer",
      "Diluição em rodadas pós-conversão",
      "Iliquidez antes de evento ou vencimento",
      "Perda parcial ou total da parcela equity",
    ],
  },
];

// ─── Componente de card ───────────────────────────────────────────────────────

function EquityCard({ product }: { product: EquityProduct }) {
  const router = useRouter();

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5 flex flex-col gap-4">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 text-[10px] border border-purple-500/20">
            {product.type}
          </span>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-semibold">
            <Shield className="h-2.5 w-2.5" /> Nível 5 — Muito alto
          </span>
        </div>
        <h3 className="text-white font-bold text-base leading-snug mt-2">{product.name}</h3>
      </div>

      {/* Tese */}
      <div className="rounded-xl bg-white/5 border border-white/8 px-4 py-3">
        <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1.5">Tese de investimento</p>
        <p className="text-white/70 text-sm leading-relaxed">{product.thesis}</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-white/5 border border-white/8 px-3 py-2.5">
          <div className="flex items-center gap-1 text-white/30 text-[9px] uppercase tracking-wider mb-1">
            <Clock className="h-3 w-3" /> Prazo estimado
          </div>
          <p className="text-white/80 text-xs font-semibold">{product.term}</p>
        </div>
        <div className="rounded-xl bg-white/5 border border-white/8 px-3 py-2.5">
          <div className="flex items-center gap-1 text-white/30 text-[9px] uppercase tracking-wider mb-1">
            <TrendingUp className="h-3 w-3" /> Liquidez
          </div>
          <p className="text-white/80 text-xs font-semibold">{product.liquidity}</p>
        </div>
        {product.valuationEntry && (
          <div className="rounded-xl bg-white/5 border border-white/8 px-3 py-2.5">
            <div className="flex items-center gap-1 text-white/30 text-[9px] uppercase tracking-wider mb-1">
              <Info className="h-3 w-3" /> Valuation de entrada
            </div>
            <p className="text-white/80 text-xs font-semibold">{product.valuationEntry}</p>
          </div>
        )}
        {product.conversionPotential && (
          <div className="rounded-xl bg-white/5 border border-white/8 px-3 py-2.5">
            <div className="flex items-center gap-1 text-white/30 text-[9px] uppercase tracking-wider mb-1">
              <Zap className="h-3 w-3" /> Conversão
            </div>
            <p className="text-white/80 text-xs font-semibold">{product.conversionPotential}</p>
          </div>
        )}
      </div>

      {/* Cenários */}
      <div className="space-y-2">
        <p className="text-white/40 text-[10px] uppercase tracking-wider">Cenários</p>
        {product.scenarios.map((s) => (
          <div key={s.label} className={cn("rounded-xl px-4 py-3 border",
            s.label === "Conservador" ? "bg-slate-500/10 border-slate-500/20" :
            s.label === "Base" ? "bg-blue-500/10 border-blue-500/20" :
            "bg-emerald-500/10 border-emerald-500/20"
          )}>
            <p className={cn("text-xs font-semibold mb-1",
              s.label === "Conservador" ? "text-slate-400" :
              s.label === "Base" ? "text-blue-400" :
              "text-emerald-400"
            )}>{s.label}</p>
            <p className="text-white/50 text-xs leading-relaxed">{s.description}</p>
          </div>
        ))}
      </div>

      {/* Riscos */}
      <div className="rounded-xl bg-red-500/8 border border-red-500/20 px-4 py-3 space-y-1.5">
        <div className="flex items-center gap-1.5 text-red-400 text-xs font-semibold mb-2">
          <AlertTriangle className="h-3.5 w-3.5" /> Riscos principais
        </div>
        {product.risks.map((r, i) => (
          <p key={i} className="text-white/40 text-xs leading-relaxed">• {r}</p>
        ))}
      </div>

      {/* Aviso de perda total */}
      <div className="rounded-xl bg-red-500/15 border border-red-500/30 px-4 py-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-red-300 text-xs font-semibold leading-relaxed">
            Este produto não possui rentabilidade fixa garantida. O capital investido pode ser perdido total ou parcialmente.
          </p>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={() => router.push(`/investor/products/${product.id}`)}
        className="flex items-center justify-between w-full py-3 px-4 rounded-xl bg-[#00BC6E]/10 border border-[#00BC6E]/20 hover:bg-[#00BC6E]/15 transition-colors group"
      >
        <span className="text-[#00BC6E] text-sm font-semibold">Ver detalhes</span>
        <ChevronRight className="h-4 w-4 text-[#00BC6E] group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function EquityPage() {
  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-2">
        <div className="flex items-center gap-2 mb-2">
          <Zap className="h-5 w-5 text-[#00BC6E]" />
          <h1 className="text-white font-bold text-2xl leading-tight">Akin Equity</h1>
        </div>
        <p className="text-white/50 text-sm leading-relaxed">
          Ofertas participativas e oportunidades de crescimento estruturadas conforme documentação aplicável.
        </p>
      </div>

      {/* Explicação */}
      <div className="px-4 mt-4 mb-6">
        <div className="rounded-2xl bg-white/5 border border-white/10 px-5 py-4">
          <p className="text-white/60 text-sm leading-relaxed">
            Akin Equity reúne oportunidades de participação, contratos conversíveis e ofertas participativas. Esses produtos <strong className="text-white/80">não possuem rentabilidade fixa</strong> e dependem de valorização, eventos de liquidez ou performance econômica futura.
          </p>
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 text-[10px] border border-red-500/20 font-semibold">
              Sem retorno garantido
            </span>
            <span className="px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 text-[10px] border border-amber-500/20 font-semibold">
              Investidor qualificado
            </span>
            <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-400 text-[10px] border border-purple-500/20 font-semibold">
              Longo prazo
            </span>
          </div>
        </div>
      </div>

      {/* Cards */}
      <div className="px-4 space-y-4">
        {equityProducts.map((p) => (
          <EquityCard key={p.id} product={p} />
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
