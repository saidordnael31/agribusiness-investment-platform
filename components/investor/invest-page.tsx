"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  TrendingUp,
  Clock,
  Shield,
  AlertTriangle,
  Briefcase,
  Layers,
  BarChart3,
  Sprout,
  Building2,
  Zap,
  SlidersHorizontal,
  X,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  category: string;
  categoryKey: string;
  returnRate: string;
  indexador: string;
  liquidity: string;
  term: string;
  minInvestment: number;
  risk: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  qualifiedOnly?: boolean;
  cvm88?: boolean;
  noFGC?: boolean;
  equity?: boolean;
}

// ─── Dados ────────────────────────────────────────────────────────────────────

const allProducts: Product[] = [
  {
    id: "nota-comercial-akin-cr",
    name: "Nota Comercial Akin CR",
    category: "Crédito Privado",
    categoryKey: "credito-privado",
    returnRate: "CDI + 5% a.a.",
    indexador: "CDI",
    liquidity: "No vencimento",
    term: "12 a 18 meses",
    minInvestment: 50000,
    risk: 3,
    tags: ["Sem FGC", "Produto privado", "Suitability obrigatório"],
    noFGC: true,
  },
  {
    id: "fidc-akin-senior",
    name: "FIDC Akin Sênior",
    category: "Fundos de Crédito",
    categoryKey: "fundos-credito",
    returnRate: "CDI + 4,5% a.a.",
    indexador: "CDI",
    liquidity: "Janela semestral ou vencimento",
    term: "24 a 36 meses",
    minInvestment: 50000,
    risk: 3,
    tags: ["FIDC", "Cota Sênior", "Sem FGC", "Baixa liquidez"],
    noFGC: true,
  },
  {
    id: "fidc-akin-fertilizantes",
    name: "FIDC Akin Fertilizantes",
    category: "Agro",
    categoryKey: "agro",
    returnRate: "CDI + 5,5% a.a.",
    indexador: "CDI",
    liquidity: "Janela anual ou vencimento",
    term: "24 a 36 meses",
    minInvestment: 50000,
    risk: 4,
    tags: ["FIDC", "Agro", "Fertilizantes", "CPR", "Baixa liquidez"],
    noFGC: true,
  },
  {
    id: "cri-akin-real-estate",
    name: "CRI Akin Real Estate",
    category: "Imobiliário",
    categoryKey: "imobiliario",
    returnRate: "IPCA + 10% a.a.",
    indexador: "IPCA",
    liquidity: "No vencimento",
    term: "36 meses",
    minInvestment: 50000,
    risk: 3,
    tags: ["CRI", "Real Estate", "Sem FGC", "Ativo real"],
    noFGC: true,
  },
  {
    id: "debenture-akin-privada",
    name: "Debênture Akin Privada",
    category: "Crédito Privado",
    categoryKey: "credito-privado",
    returnRate: "CDI + 6% a.a.",
    indexador: "CDI",
    liquidity: "No vencimento ou mercado secundário",
    term: "36 meses",
    minInvestment: 50000,
    risk: 4,
    tags: ["Debênture", "Crédito Privado", "Sem FGC"],
    noFGC: true,
  },
  {
    id: "debenture-conversivel-akin",
    name: "Debênture Conversível Akin",
    category: "Alternativos",
    categoryKey: "alternativos",
    returnRate: "10% a.a. + potencial de conversão",
    indexador: "Prefixado",
    liquidity: "No vencimento ou evento de liquidez",
    term: "36 a 60 meses",
    minInvestment: 50000,
    risk: 5,
    tags: ["Conversível", "Equity kicker", "Alta Convicção", "Sem FGC"],
    noFGC: true,
    equity: true,
  },
  {
    id: "scp-akin-alternativos",
    name: "SCP Akin Alternativos",
    category: "Alternativos",
    categoryKey: "alternativos",
    returnRate: "Participação econômica",
    indexador: "Participação",
    liquidity: "Conforme contrato",
    term: "36 meses ou mais",
    minInvestment: 30000,
    risk: 5,
    tags: ["SCP", "Alternativos", "Baixa liquidez", "Produto privado"],
    noFGC: true,
  },
  {
    id: "akin-equity-cvm88",
    name: "Akin Equity CVM 88",
    category: "Equity",
    categoryKey: "equity",
    returnRate: "Potencial de valorização",
    indexador: "Equity",
    liquidity: "Baixa ou inexistente",
    term: "Longo prazo",
    minInvestment: 5000,
    risk: 5,
    tags: ["CVM 88", "Equity", "Startup/PME", "Sem garantia"],
    noFGC: true,
    cvm88: true,
    equity: true,
    qualifiedOnly: false,
  },
];

const TABS = [
  { key: "todos", label: "Todos", icon: <Layers className="h-3.5 w-3.5" /> },
  { key: "credito-privado", label: "Crédito Privado", icon: <BarChart3 className="h-3.5 w-3.5" /> },
  { key: "fundos-credito", label: "Fundos de Crédito", icon: <Briefcase className="h-3.5 w-3.5" /> },
  { key: "imobiliario", label: "Imobiliário", icon: <Building2 className="h-3.5 w-3.5" /> },
  { key: "agro", label: "Agro", icon: <Sprout className="h-3.5 w-3.5" /> },
  { key: "alternativos", label: "Alternativos", icon: <Zap className="h-3.5 w-3.5" /> },
  { key: "equity", label: "Equity", icon: <TrendingUp className="h-3.5 w-3.5" /> },
];

const RISK_COLORS: Record<number, { bg: string; text: string; label: string }> = {
  1: { bg: "bg-emerald-500/15", text: "text-emerald-400", label: "Nível 1" },
  2: { bg: "bg-green-500/15", text: "text-green-400", label: "Nível 2" },
  3: { bg: "bg-yellow-500/15", text: "text-yellow-400", label: "Nível 3" },
  4: { bg: "bg-orange-500/15", text: "text-orange-400", label: "Nível 4" },
  5: { bg: "bg-red-500/15", text: "text-red-400", label: "Nível 5" },
};

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function RiskBadge({ risk }: { risk: 1 | 2 | 3 | 4 | 5 }) {
  const c = RISK_COLORS[risk];
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold", c.bg, c.text)}>
      <Shield className="h-2.5 w-2.5" />
      {c.label}
    </span>
  );
}

function RecommendedCard({ product }: { product: Product }) {
  const [fav, setFav] = useState(false);
  const router = useRouter();
  return (
    <div className="flex-shrink-0 w-[220px] rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-white font-semibold text-sm leading-tight">{product.name}</p>
          <p className="text-white/40 text-[11px] mt-0.5">{product.category}</p>
        </div>
        <button onClick={() => setFav(!fav)} className="text-white/30 hover:text-red-400 transition-colors shrink-0 mt-0.5">
          <Heart className={cn("h-4 w-4", fav && "fill-red-400 text-red-400")} />
        </button>
      </div>
      <div className="rounded-xl bg-[#00BC6E]/10 border border-[#00BC6E]/20 px-3 py-2">
        <p className="text-[10px] text-white/40 uppercase tracking-wider">Rentabilidade-alvo</p>
        <p className="text-[#00BC6E] font-bold text-sm mt-0.5">{product.returnRate}</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <p className="text-white/30 uppercase tracking-wider text-[9px]">Prazo</p>
          <p className="text-white/80 font-medium mt-0.5">{product.term}</p>
        </div>
        <div>
          <p className="text-white/30 uppercase tracking-wider text-[9px]">Mín.</p>
          <p className="text-white/80 font-medium mt-0.5">{fmt(product.minInvestment)}</p>
        </div>
      </div>
      <RiskBadge risk={product.risk} />
      <div className="flex gap-2 mt-auto">
        <Button size="sm" className="flex-1 h-8 bg-[#00BC6E] hover:bg-[#00a85f] text-white text-xs font-semibold rounded-lg"
          onClick={() => router.push(`/investor/products/${product.id}?simulate=true`)}>
          Simular
        </Button>
        <Button size="sm" variant="outline" className="flex-1 h-8 border-white/20 text-white/70 hover:text-white hover:bg-white/10 text-xs rounded-lg bg-transparent"
          onClick={() => router.push(`/investor/products/${product.id}`)}>
          Ver detalhes
        </Button>
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const [fav, setFav] = useState(false);
  const router = useRouter();
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-base leading-snug">{product.name}</p>
          <p className="text-white/40 text-xs mt-0.5">{product.category}</p>
        </div>
        <button onClick={() => setFav(!fav)} className="text-white/30 hover:text-red-400 transition-colors shrink-0">
          <Heart className={cn("h-4 w-4", fav && "fill-red-400 text-red-400")} />
        </button>
      </div>

      {/* Rentabilidade */}
      <div className="rounded-xl bg-[#00BC6E]/8 border border-[#00BC6E]/15 px-4 py-3 flex items-center justify-between">
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Rentabilidade-alvo</p>
          <p className="text-[#00BC6E] font-bold text-lg mt-0.5">{product.returnRate}</p>
        </div>
        <RiskBadge risk={product.risk} />
      </div>

      {/* Detalhes */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="flex flex-col gap-1">
          <p className="text-white/30 uppercase tracking-wider text-[9px] flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" /> Prazo
          </p>
          <p className="text-white/80 font-medium">{product.term}</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-white/30 uppercase tracking-wider text-[9px] flex items-center gap-1">
            <TrendingUp className="h-2.5 w-2.5" /> Resgate
          </p>
          <p className="text-white/80 font-medium">{product.liquidity}</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-white/30 uppercase tracking-wider text-[9px] flex items-center gap-1">
            <Shield className="h-2.5 w-2.5" /> Mínimo
          </p>
          <p className="text-white/80 font-medium">{fmt(product.minInvestment)}</p>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {product.tags.map((tag) => (
          <span key={tag} className="px-2 py-0.5 rounded-full bg-white/8 text-white/50 text-[10px] border border-white/10">
            {tag}
          </span>
        ))}
        {product.qualifiedOnly && (
          <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[10px] border border-amber-500/20 flex items-center gap-1">
            <AlertTriangle className="h-2.5 w-2.5" /> Qualificado
          </span>
        )}
        {product.cvm88 && (
          <span className="px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 text-[10px] border border-purple-500/20">
            CVM 88
          </span>
        )}
      </div>

      {/* Ações */}
      <div className="flex gap-2 pt-1 border-t border-white/8">
        <Button size="sm" className="flex-1 h-9 bg-[#00BC6E] hover:bg-[#00a85f] text-white text-sm font-semibold rounded-xl"
          onClick={() => router.push(`/investor/products/${product.id}?reserve=true`)}>
          Reservar
        </Button>
        <Button size="sm" variant="outline" className="h-9 px-4 border-white/20 text-white/70 hover:text-white hover:bg-white/10 text-sm rounded-xl bg-transparent"
          onClick={() => router.push(`/investor/products/${product.id}?simulate=true`)}>
          Simular
        </Button>
        <Button size="sm" variant="ghost" className="h-9 px-3 text-white/50 hover:text-white hover:bg-white/10 text-sm rounded-xl"
          onClick={() => router.push(`/investor/products/${product.id}`)}>
          Ver detalhes
        </Button>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function InvestPage() {
  const [activeTab, setActiveTab] = useState("todos");
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const carouselRef = useRef<HTMLDivElement>(null);
  const tabsRef = useRef<HTMLDivElement>(null);

  const FILTER_OPTIONS = [
    { key: "sem-fgc", label: "Sem FGC" },
    { key: "qualificado", label: "Qualificado" },
    { key: "cvm88", label: "CVM 88" },
    { key: "scp", label: "SCP" },
    { key: "fidc", label: "FIDC" },
    { key: "cri", label: "CRI" },
    { key: "debenture", label: "Debênture" },
    { key: "nota-comercial", label: "Nota Comercial" },
    { key: "risco-3", label: "Risco até 3" },
    { key: "min-5k", label: "Mín. até R$5k" },
    { key: "min-50k", label: "Mín. até R$50k" },
  ];

  const toggleFilter = (key: string) => {
    setActiveFilters((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    );
  };

  const scrollCarousel = (dir: "left" | "right") => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({ left: dir === "left" ? -240 : 240, behavior: "smooth" });
  };

  const filteredProducts = allProducts.filter((p) => {
    const tabMatch = activeTab === "todos" || p.categoryKey === activeTab;
    if (!tabMatch) return false;
    if (activeFilters.length === 0) return true;
    return activeFilters.every((f) => {
      if (f === "sem-fgc") return p.noFGC;
      if (f === "qualificado") return p.qualifiedOnly;
      if (f === "cvm88") return p.cvm88;
      if (f === "scp") return p.tags.some((t) => t.toLowerCase().includes("scp"));
      if (f === "fidc") return p.tags.some((t) => t.toLowerCase().includes("fidc"));
      if (f === "cri") return p.tags.some((t) => t.toLowerCase().includes("cri"));
      if (f === "debenture") return p.category.toLowerCase().includes("deb") || p.tags.some((t) => t.toLowerCase().includes("deb"));
      if (f === "nota-comercial") return p.id.includes("nota-comercial");
      if (f === "risco-3") return p.risk <= 3;
      if (f === "min-5k") return p.minInvestment <= 5000;
      if (f === "min-50k") return p.minInvestment <= 50000;
      return true;
    });
  });

  const recommended = allProducts.slice(0, 4);

  return (
    <div className="flex flex-col min-h-screen pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <h1 className="text-white font-bold text-2xl leading-tight">Produtos de Investimento</h1>
        <p className="text-white/50 text-sm mt-1 leading-relaxed">
          Explore nossa seleção privada de crédito estruturado, ativos reais, agro, imobiliário, infraestrutura e alternativos.
        </p>
      </div>

      {/* Recomendados */}
      <div className="px-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-white font-semibold text-sm">Recomendados para você</p>
          <div className="flex gap-1">
            <button onClick={() => scrollCarousel("left")}
              className="h-7 w-7 rounded-full bg-white/8 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/15 transition-colors">
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => scrollCarousel("right")}
              className="h-7 w-7 rounded-full bg-white/8 border border-white/10 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/15 transition-colors">
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div ref={carouselRef} className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
          {recommended.map((p) => <RecommendedCard key={p.id} product={p} />)}
        </div>
      </div>

      {/* Abas */}
      <div className="px-4 mb-3">
        <div ref={tabsRef} className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1">
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0",
                activeTab === tab.key
                  ? "bg-[#00BC6E]/15 text-[#00BC6E] border border-[#00BC6E]/30"
                  : "bg-white/5 text-white/50 border border-white/8 hover:text-white/80 hover:bg-white/8"
              )}>
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div className="px-4 mb-4">
        <button onClick={() => setShowFilters(!showFilters)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium border transition-all",
            showFilters || activeFilters.length > 0
              ? "bg-[#00BC6E]/10 text-[#00BC6E] border-[#00BC6E]/30"
              : "bg-white/5 text-white/50 border-white/10 hover:text-white/80"
          )}>
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filtros
          {activeFilters.length > 0 && (
            <span className="bg-[#00BC6E] text-white rounded-full px-1.5 py-0.5 text-[9px] font-bold">
              {activeFilters.length}
            </span>
          )}
        </button>

        {showFilters && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {FILTER_OPTIONS.map((f) => (
              <button key={f.key} onClick={() => toggleFilter(f.key)}
                className={cn(
                  "flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition-all",
                  activeFilters.includes(f.key)
                    ? "bg-[#00BC6E]/15 text-[#00BC6E] border-[#00BC6E]/30"
                    : "bg-white/5 text-white/50 border-white/8 hover:text-white/80"
                )}>
                {activeFilters.includes(f.key) && <X className="h-2.5 w-2.5" />}
                {f.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lista de produtos */}
      <div className="px-4 space-y-3">
        <p className="text-white/40 text-xs font-medium">
          Todos os produtos{" "}
          <span className="text-white/60">({filteredProducts.length})</span>
        </p>

        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-14 w-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-3">
              <Shield className="h-6 w-6 text-white/20" />
            </div>
            <p className="text-white/40 text-sm font-medium">Nenhum produto encontrado</p>
            <p className="text-white/20 text-xs mt-1">Ajuste os filtros para ver mais opções</p>
            <button onClick={() => setActiveFilters([])}
              className="mt-4 text-[#00BC6E] text-xs hover:underline">
              Limpar filtros
            </button>
          </div>
        ) : (
          filteredProducts.map((p) => <ProductCard key={p.id} product={p} />)
        )}
      </div>

      {/* Compliance footer */}
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
