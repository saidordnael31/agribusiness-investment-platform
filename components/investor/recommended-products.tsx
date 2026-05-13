"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, TrendingUp, Clock, Shield, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  name: string;
  shortName: string;
  category: string;
  returnRate: string;
  minInvestment: number;
  liquidity: string;
  risk: "baixo" | "moderado" | "medio";
  highlight?: string;
  isNew?: boolean;
}

const recommendedProducts: Product[] = [
  {
    id: "cra-senior",
    name: "CRA Senior",
    shortName: "CRA Sr",
    category: "Renda Fixa",
    returnRate: "CDI + 4,5%",
    minInvestment: 10000,
    liquidity: "Mensal",
    risk: "baixo",
    highlight: "Mais Popular",
  },
  {
    id: "fiagro-premium",
    name: "FIAGRO Premium",
    shortName: "FIAGRO",
    category: "Fundos",
    returnRate: "IPCA + 8%",
    minInvestment: 25000,
    liquidity: "Semestral",
    risk: "moderado",
    isNew: true,
  },
  {
    id: "cra-subordinada",
    name: "CRA Subordinada",
    shortName: "CRA Sub",
    category: "Renda Fixa",
    returnRate: "CDI + 7%",
    minInvestment: 50000,
    liquidity: "Anual",
    risk: "medio",
  },
];

const riskColors = {
  baixo: "bg-[#00BC6E]/20 text-[#00BC6E]",
  moderado: "bg-amber-500/20 text-amber-400",
  medio: "bg-orange-500/20 text-orange-400",
};

const riskLabels = {
  baixo: "Risco Baixo",
  moderado: "Risco Moderado",
  medio: "Risco Medio",
};

export function RecommendedProducts() {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[#00BC6E]" />
          <h3 className="text-lg font-semibold text-white">Produtos para Voce</h3>
        </div>
        <Link
          href="/investor/products"
          className="flex items-center gap-1 text-sm text-[#00BC6E] hover:text-[#00BC6E]/80 transition-colors"
        >
          Ver todos
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Products Grid */}
      <div className="grid gap-3">
        {recommendedProducts.map((product) => (
          <Link
            key={product.id}
            href={`/investor/products/${product.id}`}
            className="group flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200"
          >
            {/* Product Icon */}
            <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-[#00BC6E]/30 to-cyan-500/30">
              <TrendingUp className="h-6 w-6 text-[#00BC6E]" />
            </div>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-semibold text-white truncate">
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
              <div className="flex items-center gap-3 text-xs text-white/50">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {product.liquidity}
                </span>
                <span>Min: {formatCurrency(product.minInvestment)}</span>
              </div>
            </div>

            {/* Return Rate & Risk */}
            <div className="flex flex-col items-end gap-1">
              <span className="text-sm font-bold text-[#00BC6E]">
                {product.returnRate}
              </span>
              <Badge
                variant="secondary"
                className={cn("text-[10px] px-1.5 py-0", riskColors[product.risk])}
              >
                {riskLabels[product.risk]}
              </Badge>
            </div>

            {/* Arrow */}
            <ArrowRight className="h-4 w-4 text-white/30 group-hover:text-white/60 group-hover:translate-x-1 transition-all" />
          </Link>
        ))}
      </div>

      {/* CTA Button */}
      <Button
        asChild
        className="w-full bg-[#00BC6E] hover:bg-[#00BC6E]/90 text-[#003F28] font-semibold"
      >
        <Link href="/investor/products">
          Explorar Todos os Produtos
          <ArrowRight className="h-4 w-4 ml-2" />
        </Link>
      </Button>
    </div>
  );
}
