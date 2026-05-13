"use client";

import { useState, useRef } from "react";
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
  Star,
  Leaf,
  Building2,
  Layers,
  BarChart3,
  Coins,
  Sprout,
  AlertTriangle,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Product {
  id: string;
  name: string;
  category: string;
  categoryKey: string;
  returnRate: string;
  liquidity: string;
  term: string;
  minInvestment: number;
  risk: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  qualifiedOnly?: boolean;
  isFavorite?: boolean;
}

// ─── Dados ────────────────────────────────────────────────────────────────────

const recommended: Product[] = [
  {
    id: "ccb-recebiveis",
    name: "CCB Akin Recebíveis",
    category: "Renda Fixa Privada",
    categoryKey: "renda-fixa",
    returnRate: "115% do CDI",
    liquidity: "No vencimento",
    term: "180 dias",
    minInvestment: 5000,
    risk: 2,
    tags: ["CCB", "Recebíveis", "Crédito Privado"],
  },
  {
    id: "fidc-senior",
    name: "FIDC Akin Sênior",
    category: "Fundo de Crédito",
    categoryKey: "fundos",
    returnRate: "CDI + 3,5% a.a.",
    liquidity: "360 dias",
    term: "12 meses",
    minInvestment: 10000,
    risk: 3,
    tags: ["FIDC", "Cota Sênior", "Recebíveis"],
  },
  {
    id: "cra-agro",
    name: "CRA Akin Agro",
    category: "Agro",
    categoryKey: "agro",
    returnRate: "IPCA + 9,5% a.a.",
    liquidity: "No vencimento",
    term: "36 meses",
    minInvestment: 1000,
    risk: 3,
    tags: ["CRA", "Agro", "Recebíveis do Agronegócio"],
  },
  {
    id: "scp-alternativos",
    name: "SCP Akin Alternativos",
    category: "Alternativos",
    categoryKey: "alternativos",
    returnRate: "Estratégia privada",
    liquidity: "Conforme contrato",
    term: "Longo prazo",
    minInvestment: 5000,
    risk: 4,
    tags: ["SCP", "Alternativos", "Privado"],
    qualifiedOnly: true,
  },
];

const allProducts: Product[] = [
  {
    id: "ccb-recebiveis",
    name: "CCB Akin Recebíveis 180D",
    category: "Renda Fixa Privada",
    categoryKey: "renda-fixa",
    returnRate: "115% do CDI",
    liquidity: "No vencimento",
    term: "180 dias",
    minInvestment: 5000,
    risk: 2,
    tags: ["CCB", "Recebíveis", "Crédito Privado"],
  },
  {
    id: "debenture-estrategica",
    name: "Debênture Akin Estratégica",
    category: "Crédito Privado",
    categoryKey: "credito-privado",
    returnRate: "CDI + 5% a.a.",
    liquidity: "No vencimento",
    term: "36 meses",
    minInvestment: 10000,
    risk: 4,
    tags: ["Debênture", "Crédito Privado", "Longo Prazo"],
  },
  {
    id: "fidc-senior",
    name: "FIDC Akin Sênior",
    category: "Fundo de Crédito",
    categoryKey: "fundos",
    returnRate: "CDI + 3,5% a.a.",
    liquidity: "360 dias",
    term: "12 meses",
    minInvestment: 10000,
    risk: 3,
    tags: ["FIDC", "Cota Sênior", "Recebíveis"],
  },
  {
    id: "fidc-fertilizantes",
    name: "FIDC Akin Fertilizantes",
    category: "Agro / Crédito Privado",
    categoryKey: "agro",
    returnRate: "CDI + 5% a.a.",
    liquidity: "180 a 360 dias",
    term: "12 a 24 meses",
    minInvestment: 5000,
    risk: 4,
    tags: ["FIDC", "Fertilizantes", "Agro"],
  },
  {
    id: "cra-agro",
    name: "CRA Akin Agro",
    category: "Agro",
    categoryKey: "agro",
    returnRate: "IPCA + 9,5% a.a.",
    liquidity: "No vencimento",
    term: "36 meses",
    minInvestment: 1000,
    risk: 3,
    tags: ["CRA", "Agro", "Recebíveis do Agronegócio"],
  },
  {
    id: "cri-real-estate",
    name: "CRI Akin Real Estate",
    category: "Imobiliário",
    categoryKey: "imobiliario",
    returnRate: "IPCA + 10% a.a.",
    liquidity: "No vencimento",
    term: "48 meses",
    minInvestment: 5000,
    risk: 3,
    tags: ["CRI", "Imobiliário", "Real Estate"],
  },
  {
    id: "fundo-infraestrutura",
    name: "Fundo de Infraestrutura Akin",
    category: "Infraestrutura",
    categoryKey: "infraestrutura",
    returnRate: "IPCA + 8,5% a.a.",
    liquidity: "Janela semestral",
    term: "60 meses",
    minInvestment: 5000,
    risk: 4,
    tags: ["Infraestrutura", "IPCA+", "Longo Prazo"],
  },
  {
    id: "scp-alternativos",
    name: "SCP Akin Alternativos",
    category: "Alternativos",
    categoryKey: "alternativos",
    returnRate: "Estratégia privada",
    liquidity: "Conforme contrato da SCP",
    term: "Longo prazo",
    minInvestment: 5000,
    risk: 4,
    tags: ["SCP", "Alternativos", "Privado"],
    qualifiedOnly: true,
  },
];

const categories = [
  { key: "todos", label: "Todos", icon: <BarChart3 className="h-4 w-4" /> },
  { key: "renda-fixa", label: "Renda Fixa", icon: <Coins className="h-4 w-4" /> },
  { key: "credito-privado", label: "Crédito Privado", icon: <TrendingUp className="h-4 w-4" /> },
  { key: "agro", label: "Agro", icon: <Sprout className="h-4 w-4" /> },
  { key: "imobiliario", label: "Imobiliário", icon: <Building2 className="h-4 w-4" /> },
  { key: "infraestrutura", label: "Infraestrutura", icon: <Layers className="h-4 w-4" /> },
  { key: "fundos", label: "Fundos", icon: <Leaf className="h-4 w-4" /> },
  { key: "alternativos", label: "Alternativos", icon: <Star className="h-4 w-4" /> },
];

const filterChips = [
  "Baixo risco",
  "Liquidez até 180 dias",
  "Isento de IR",
  "CDI",
  "IPCA+",
  "Agro",
  "Imobiliário",
  "Infraestrutura",
  "Investidor qualificado",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const riskLabel = (risk: number) => {
  const labels: Record<number, string> = {
    1: "Nível 1",
    2: "Nível 2",
    3: "Nível 3",
    4: "Nível 4",
    5: "Nível 5",
  };
  return labels[risk] ?? "—";
};

const riskColor = (risk: number) => {
  if (risk <= 1) return "bg-sky-500/20 text-sky-300 border-sky-500/30";
  if (risk === 2) return "bg-emerald-500/20 text-emerald-300 border-emerald-500/30";
  if (risk === 3) return "bg-amber-500/20 text-amber-300 border-amber-500/30";
  return "bg-red-500/20 text-red-300 border-red-500/30";
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

// ─── Sub-componentes ───────────────────────────────────────────────────────────

function RecommendedCard({ product }: { product: Product }) {
  const [fav, setFav] = useState(false);

  return (
    <div className="flex-shrink-0 w-64 rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col gap-3 snap-start">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-white font-semibold text-sm leading-tight line-clamp-2">
            {product.name}
          </p>
          <p className="text-white/50 text-xs mt-0.5">{product.category}</p>
        </div>
        <button
          onClick={() => setFav(!fav)}
          className="flex-shrink-0 h-7 w-7 rounded-full flex items-center justify-center text-white/30 hover:text-red-400 transition-colors"
          aria-label="Favoritar"
        >
          <Heart className={cn("h-4 w-4", fav && "fill-red-400 text-red-400")} />
        </button>
      </div>

      {/* Rentabilidade */}
      <div className="bg-[#00BC6E]/10 border border-[#00BC6E]/20 rounded-xl px-3 py-2">
        <p className="text-[10px] text-white/50 uppercase tracking-wider">Rentabilidade</p>
        <p className="text-[#00BC6E] font-bold text-base leading-tight">{product.returnRate}</p>
      </div>

      {/* Detalhes */}
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wide">Prazo</p>
          <p className="text-white/80 text-xs font-medium">{product.term}</p>
        </div>
        <div>
          <p className="text-[10px] text-white/40 uppercase tracking-wide">Mín.</p>
          <p className="text-white/80 text-xs font-medium">{formatCurrency(product.minInvestment)}</p>
        </div>
      </div>

      {/* Risk badge */}
      <div className="flex items-center gap-2">
        <Badge className={cn("text-[10px] px-2 py-0.5 border font-medium", riskColor(product.risk))}>
          <Shield className="h-2.5 w-2.5 mr-1" />
          Risco {riskLabel(product.risk)}
        </Badge>
        {product.qualifiedOnly && (
          <Badge className="text-[10px] px-2 py-0.5 bg-purple-500/20 text-purple-300 border border-purple-500/30">
            Qualificado
          </Badge>
        )}
      </div>

      {/* Ações */}
      <div className="flex gap-2 mt-auto">
        <Button
          size="sm"
          className="flex-1 h-8 bg-[#00BC6E] hover:bg-[#00a85f] text-white text-xs font-semibold rounded-lg"
        >
          Simular
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="flex-1 h-8 border-white/20 text-white/70 hover:text-white hover:bg-white/10 text-xs rounded-lg bg-transparent"
        >
          Ver detalhes
        </Button>
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const [fav, setFav] = useState(false);

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-4 flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-white font-semibold text-sm leading-tight">{product.name}</p>
            {product.qualifiedOnly && (
              <Badge className="text-[9px] px-1.5 py-0 h-4 bg-purple-500/20 text-purple-300 border border-purple-500/30 flex-shrink-0">
                Qualificado
              </Badge>
            )}
          </div>
          <p className="text-white/50 text-xs mt-0.5">{product.category}</p>
        </div>
        <button
          onClick={() => setFav(!fav)}
          className="flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-white/30 hover:text-red-400 transition-colors"
          aria-label="Favoritar"
        >
          <Heart className={cn("h-4 w-4", fav && "fill-red-400 text-red-400")} />
        </button>
      </div>

      {/* Rentabilidade + Risco */}
      <div className="flex items-center gap-3">
        <div className="flex-1 bg-[#00BC6E]/10 border border-[#00BC6E]/20 rounded-xl px-3 py-2">
          <p className="text-[10px] text-white/40 uppercase tracking-wider">Rentabilidade</p>
          <p className="text-[#00BC6E] font-bold text-sm">{product.returnRate}</p>
        </div>
        <Badge className={cn("text-[10px] px-2.5 py-1.5 border font-medium flex items-center gap-1", riskColor(product.risk))}>
          <Shield className="h-3 w-3" />
          {riskLabel(product.risk)}
        </Badge>
      </div>

      {/* Prazo / Resgate / Mínimo */}
      <div className="grid grid-cols-3 gap-2">
        <div className="flex flex-col gap-0.5">
          <p className="text-[10px] text-white/40 uppercase tracking-wide flex items-center gap-1">
            <Clock className="h-2.5 w-2.5" /> Prazo
          </p>
          <p className="text-white/80 text-xs font-medium">{product.term}</p>
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-[10px] text-white/40 uppercase tracking-wide flex items-center gap-1">
            <TrendingUp className="h-2.5 w-2.5" /> Resgate
          </p>
          <p className="text-white/80 text-xs font-medium">{product.liquidity}</p>
        </div>
        <div className="flex flex-col gap-0.5">
          <p className="text-[10px] text-white/40 uppercase tracking-wide">Mínimo</p>
          <p className="text-white/80 text-xs font-medium">{formatCurrency(product.minInvestment)}</p>
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5">
        {product.tags.map((tag) => (
          <span
            key={tag}
            className="text-[10px] px-2 py-0.5 rounded-full bg-white/8 border border-white/10 text-white/50"
          >
            {tag}
          </span>
        ))}
      </div>

      {/* Aviso qualificado */}
      {product.qualifiedOnly && (
        <div className="flex items-start gap-2 bg-purple-500/10 border border-purple-500/20 rounded-xl px-3 py-2">
          <AlertTriangle className="h-3.5 w-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
          <p className="text-purple-300 text-[11px] leading-tight">
            Disponível apenas para investidores qualificados (patrimônio acima de R$ 1.000.000).
          </p>
        </div>
      )}

      {/* Ações */}
      <div className="flex gap-2 mt-1">
        <Button
          size="sm"
          className="flex-1 h-9 bg-[#00BC6E] hover:bg-[#00a85f] text-white text-sm font-semibold rounded-xl"
        >
          Reservar
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-9 px-4 border-white/20 text-white/70 hover:text-white hover:bg-white/10 text-sm rounded-xl bg-transparent"
        >
          Simular
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-9 px-3 text-white/50 hover:text-white hover:bg-white/10 text-sm rounded-xl"
        >
          Ver detalhes
        </Button>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function InvestPage() {
  const [activeCategory, setActiveCategory] = useState("todos");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const carouselRef = useRef<HTMLDivElement>(null);

  const toggleFilter = (filter: string) => {
    setActiveFilters((prev) =>
      prev.includes(filter) ? prev.filter((f) => f !== filter) : [...prev, filter]
    );
  };

  const scrollCarousel = (dir: "left" | "right") => {
    if (!carouselRef.current) return;
    carouselRef.current.scrollBy({ left: dir === "right" ? 280 : -280, behavior: "smooth" });
  };

  const filtered =
    activeCategory === "todos"
      ? allProducts
      : allProducts.filter((p) => p.categoryKey === activeCategory);

  return (
    <div className="px-4 md:px-8 max-w-4xl mx-auto py-6 flex flex-col gap-8">
      {/* ── Cabeçalho ── */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight text-balance">Investir</h1>
        <p className="text-white/50 text-sm mt-1 leading-relaxed text-pretty">
          Prateleira privada de produtos estruturados, crédito, agro, infraestrutura e alternativos da Akin S.A.
        </p>
      </div>

      {/* ── Carrossel: Recomendados ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-base">Recomendados para você</h2>
          <div className="flex gap-1.5">
            <button
              onClick={() => scrollCarousel("left")}
              className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors"
              aria-label="Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => scrollCarousel("right")}
              className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 hover:text-white transition-colors"
              aria-label="Próximo"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div
          ref={carouselRef}
          className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 scrollbar-none"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {recommended.map((p) => (
            <RecommendedCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* ── Grid de categorias ── */}
      <section>
        <h2 className="text-white font-semibold text-base mb-3">Categorias</h2>
        <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={cn(
                "flex flex-col items-center justify-center gap-1.5 rounded-2xl p-3 border transition-all duration-200 text-center",
                activeCategory === cat.key
                  ? "bg-[#00BC6E]/15 border-[#00BC6E]/40 text-[#00BC6E]"
                  : "bg-white/5 border-white/10 text-white/50 hover:text-white/80 hover:bg-white/10"
              )}
            >
              {cat.icon}
              <span className="text-[10px] font-medium leading-tight">{cat.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Chips de filtro ── */}
      <section>
        <h2 className="text-white font-semibold text-base mb-3">Filtros</h2>
        <div className="flex flex-wrap gap-2">
          {filterChips.map((chip) => (
            <button
              key={chip}
              onClick={() => toggleFilter(chip)}
              className={cn(
                "text-xs px-3 py-1.5 rounded-full border transition-all duration-200 font-medium",
                activeFilters.includes(chip)
                  ? "bg-[#00BC6E]/20 border-[#00BC6E]/50 text-[#00BC6E]"
                  : "bg-white/5 border-white/15 text-white/60 hover:text-white/80 hover:bg-white/10"
              )}
            >
              {chip}
            </button>
          ))}
        </div>
      </section>

      {/* ── Lista de produtos ── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-base">
            {activeCategory === "todos"
              ? "Todos os produtos"
              : categories.find((c) => c.key === activeCategory)?.label}
            <span className="ml-2 text-white/40 text-sm font-normal">({filtered.length})</span>
          </h2>
        </div>

        <div className="flex flex-col gap-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      {/* ── Rodapé legal ── */}
      <footer className="border-t border-white/10 pt-4 pb-2">
        <p className="text-white/30 text-[11px] leading-relaxed text-center text-pretty">
          Produtos sujeitos à disponibilidade, análise de perfil, documentação e regras específicas de cada oferta.
        </p>
      </footer>
    </div>
  );
}
