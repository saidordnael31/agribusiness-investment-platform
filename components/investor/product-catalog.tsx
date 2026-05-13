"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Search,
  Filter,
  TrendingUp,
  Clock,
  Shield,
  ArrowRight,
  ChevronDown,
  Sparkles,
  Leaf,
  Building,
  Coins,
  BarChart3,
} from "lucide-react";

export interface Product {
  id: string;
  name: string;
  shortName: string;
  description: string;
  category: "renda-fixa" | "fundos" | "estruturados";
  type: string;
  returnRate: string;
  returnDescription: string;
  minInvestment: number;
  liquidity: string;
  liquidityDays?: number;
  risk: "baixo" | "moderado" | "medio" | "alto";
  term: string;
  highlight?: string;
  isNew?: boolean;
  features: string[];
  icon: React.ReactNode;
}

const products: Product[] = [
  {
    id: "cra-senior",
    name: "CRA Senior Agrinvest",
    shortName: "CRA Sr",
    description:
      "Certificado de Recebiveis do Agronegocio com garantias solidas e rentabilidade atrativa indexada ao CDI.",
    category: "renda-fixa",
    type: "CRA",
    returnRate: "CDI + 4,5%",
    returnDescription: "Rentabilidade liquida pos-impostos",
    minInvestment: 10000,
    liquidity: "Mensal",
    liquidityDays: 30,
    risk: "baixo",
    term: "12 a 36 meses",
    highlight: "Mais Popular",
    features: [
      "Garantia de recebiveis agricolas",
      "Isento de IR para PF",
      "Liquidez mensal",
    ],
    icon: <Leaf className="h-6 w-6" />,
  },
  {
    id: "cra-subordinada",
    name: "CRA Subordinada Agrinvest",
    shortName: "CRA Sub",
    description:
      "Cota subordinada com maior potencial de retorno para investidores qualificados.",
    category: "renda-fixa",
    type: "CRA",
    returnRate: "CDI + 7%",
    returnDescription: "Rentabilidade para investidor qualificado",
    minInvestment: 50000,
    liquidity: "Anual",
    liquidityDays: 365,
    risk: "medio",
    term: "24 a 48 meses",
    features: [
      "Maior rentabilidade",
      "Para investidor qualificado",
      "Participacao nos resultados",
    ],
    icon: <TrendingUp className="h-6 w-6" />,
  },
  {
    id: "fiagro-premium",
    name: "FIAGRO Premium Akin",
    shortName: "FIAGRO",
    description:
      "Fundo de Investimento nas Cadeias Produtivas Agroindustriais com gestao ativa e diversificada.",
    category: "fundos",
    type: "FIAGRO",
    returnRate: "IPCA + 8%",
    returnDescription: "Meta de rentabilidade real",
    minInvestment: 25000,
    liquidity: "Semestral",
    liquidityDays: 180,
    risk: "moderado",
    term: "36 meses",
    isNew: true,
    features: [
      "Gestao ativa profissional",
      "Diversificacao geografica",
      "Protecao inflacionaria",
    ],
    icon: <BarChart3 className="h-6 w-6" />,
  },
  {
    id: "lca-agro",
    name: "LCA Agronegocio",
    shortName: "LCA",
    description:
      "Letra de Credito do Agronegocio com garantia do FGC e isencao de imposto de renda.",
    category: "renda-fixa",
    type: "LCA",
    returnRate: "100% CDI",
    returnDescription: "Liquido de impostos",
    minInvestment: 5000,
    liquidity: "Diaria",
    liquidityDays: 1,
    risk: "baixo",
    term: "12 meses",
    features: ["Garantia FGC", "Isento de IR", "Liquidez diaria"],
    icon: <Shield className="h-6 w-6" />,
  },
  {
    id: "debenture-infra",
    name: "Debenture Infraestrutura Rural",
    shortName: "Deb Infra",
    description:
      "Debenture incentivada para projetos de infraestrutura do agronegocio brasileiro.",
    category: "renda-fixa",
    type: "Debenture",
    returnRate: "IPCA + 6,5%",
    returnDescription: "Isento de IR para PF",
    minInvestment: 15000,
    liquidity: "Semestral",
    liquidityDays: 180,
    risk: "moderado",
    term: "48 a 60 meses",
    features: [
      "Projeto de infraestrutura",
      "Incentivo fiscal",
      "Renda real garantida",
    ],
    icon: <Building className="h-6 w-6" />,
  },
  {
    id: "coe-agro",
    name: "COE Agro Protegido",
    shortName: "COE",
    description:
      "Certificado de Operacoes Estruturadas com protecao de capital e exposicao ao agronegocio.",
    category: "estruturados",
    type: "COE",
    returnRate: "Ate 150% CDI",
    returnDescription: "Com protecao de capital",
    minInvestment: 30000,
    liquidity: "No vencimento",
    liquidityDays: 720,
    risk: "moderado",
    term: "24 meses",
    features: [
      "Capital protegido",
      "Potencial de alta rentabilidade",
      "Exposicao ao setor",
    ],
    icon: <Coins className="h-6 w-6" />,
  },
];

const categoryLabels = {
  "renda-fixa": "Renda Fixa",
  fundos: "Fundos",
  estruturados: "Estruturados",
};

const riskColors = {
  baixo: "bg-[#00BC6E]/20 text-[#00BC6E]",
  moderado: "bg-amber-500/20 text-amber-400",
  medio: "bg-orange-500/20 text-orange-400",
  alto: "bg-red-500/20 text-red-400",
};

const riskLabels = {
  baixo: "Risco Baixo",
  moderado: "Risco Moderado",
  medio: "Risco Medio",
  alto: "Risco Alto",
};

export function ProductCatalog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedRisk, setSelectedRisk] = useState<string>("all");
  const [showFilters, setShowFilters] = useState(false);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value);
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || product.category === selectedCategory;
    const matchesRisk =
      selectedRisk === "all" || product.risk === selectedRisk;
    return matchesSearch && matchesCategory && matchesRisk;
  });

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-[#00BC6E]" />
          <h1 className="text-2xl font-bold text-white">Produtos de Investimento</h1>
        </div>
        <p className="text-white/60 text-sm">
          Explore nossa selecao exclusiva de produtos do agronegocio brasileiro
        </p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <Input
            placeholder="Buscar produtos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-[#00BC6E]/50"
          />
        </div>

        {/* Filter Toggle */}
        <Button
          variant="ghost"
          className="w-full justify-between text-white/60 hover:text-white hover:bg-white/5 border border-white/10"
          onClick={() => setShowFilters(!showFilters)}
        >
          <span className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filtros
          </span>
          <ChevronDown
            className={cn(
              "h-4 w-4 transition-transform",
              showFilters && "rotate-180"
            )}
          />
        </Button>

        {/* Filters */}
        {showFilters && (
          <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-white/5 border border-white/10">
            <div>
              <label className="text-xs text-white/40 mb-1 block">
                Categoria
              </label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent className="bg-[#01223F] border-white/10">
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="renda-fixa">Renda Fixa</SelectItem>
                  <SelectItem value="fundos">Fundos</SelectItem>
                  <SelectItem value="estruturados">Estruturados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1 block">Risco</label>
              <Select value={selectedRisk} onValueChange={setSelectedRisk}>
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent className="bg-[#01223F] border-white/10">
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="baixo">Baixo</SelectItem>
                  <SelectItem value="moderado">Moderado</SelectItem>
                  <SelectItem value="medio">Medio</SelectItem>
                  <SelectItem value="alto">Alto</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Results count */}
      <p className="text-xs text-white/40 mb-4">
        {filteredProducts.length} produto(s) encontrado(s)
      </p>

      {/* Products List */}
      <div className="space-y-4">
        {filteredProducts.map((product) => (
          <Link
            key={product.id}
            href={`/investor/products/${product.id}`}
            className="group block"
          >
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200">
              {/* Header */}
              <div className="flex items-start gap-4 mb-3">
                {/* Icon */}
                <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#00BC6E]/30 to-cyan-500/30 text-[#00BC6E]">
                  {product.icon}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-semibold text-white">
                      {product.name}
                    </span>
                    {product.highlight && (
                      <Badge className="bg-[#00BC6E]/20 text-[#00BC6E] text-[10px] px-1.5 py-0">
                        {product.highlight}
                      </Badge>
                    )}
                    {product.isNew && (
                      <Badge className="bg-cyan-500/20 text-cyan-400 text-[10px] px-1.5 py-0">
                        Novo
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-white/50 line-clamp-2">
                    {product.description}
                  </p>
                </div>

                {/* Arrow */}
                <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all flex-shrink-0 mt-1" />
              </div>

              {/* Stats */}
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#00BC6E]/10">
                  <TrendingUp className="h-3 w-3 text-[#00BC6E]" />
                  <span className="text-xs font-medium text-[#00BC6E]">
                    {product.returnRate}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5">
                  <Clock className="h-3 w-3 text-white/50" />
                  <span className="text-xs text-white/50">
                    {product.liquidity}
                  </span>
                </div>
                <Badge
                  variant="secondary"
                  className={cn("text-[10px] px-1.5 py-0", riskColors[product.risk])}
                >
                  {riskLabels[product.risk]}
                </Badge>
                <span className="text-[10px] text-white/40 ml-auto">
                  Min: {formatCurrency(product.minInvestment)}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Empty State */}
      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Search className="h-12 w-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">
            Nenhum produto encontrado
          </h3>
          <p className="text-sm text-white/50">
            Tente ajustar os filtros ou termo de busca
          </p>
        </div>
      )}
    </div>
  );
}
