"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  TrendingUp,
  Calendar,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Info,
  FileText,
  DollarSign,
} from "lucide-react";

interface ProductDetailProps {
  productId: string;
}

// Product data - same as catalog
const productsData: Record<
  string,
  {
    id: string;
    name: string;
    shortName: string;
    description: string;
    fullDescription: string;
    category: string;
    type: string;
    returnRate: string;
    returnDescription: string;
    minInvestment: number;
    maxInvestment?: number;
    liquidity: string;
    liquidityDays: number;
    risk: "baixo" | "moderado" | "medio" | "alto";
    term: string;
    termMonths: number;
    highlight?: string;
    isNew?: boolean;
    features: string[];
    risks: string[];
    documents: { name: string; href: string }[];
    monthlyRate: number;
  }
> = {
  "cra-senior": {
    id: "cra-senior",
    name: "CRA Senior Agrinvest",
    shortName: "CRA Sr",
    description:
      "Certificado de Recebiveis do Agronegocio com garantias solidas e rentabilidade atrativa.",
    fullDescription:
      "O CRA Senior Agrinvest e uma oportunidade exclusiva de investimento em recebiveis do agronegocio brasileiro. Com garantias solidas lastreadas em producao agricola e rentabilidade competitiva indexada ao CDI, este produto oferece seguranca e retornos consistentes para investidores que buscam diversificar sua carteira com ativos reais.",
    category: "Renda Fixa",
    type: "CRA",
    returnRate: "CDI + 4,5%",
    returnDescription: "Rentabilidade liquida pos-impostos",
    minInvestment: 10000,
    maxInvestment: 1000000,
    liquidity: "Mensal",
    liquidityDays: 30,
    risk: "baixo",
    term: "12 a 36 meses",
    termMonths: 24,
    highlight: "Mais Popular",
    features: [
      "Garantia de recebiveis agricolas AAA",
      "Isento de Imposto de Renda para Pessoa Fisica",
      "Liquidez mensal apos carencia inicial",
      "Custodia no banco XP",
      "Acompanhamento em tempo real",
      "Relatorios mensais de performance",
    ],
    risks: [
      "Risco de credito do emissor",
      "Risco de mercado (variacao CDI)",
      "Risco de liquidez em mercado secundario",
    ],
    documents: [
      { name: "Lamina do Produto", href: "#" },
      { name: "Termo de Adesao", href: "#" },
      { name: "Regulamento", href: "#" },
    ],
    monthlyRate: 1.15,
  },
  "cra-subordinada": {
    id: "cra-subordinada",
    name: "CRA Subordinada Agrinvest",
    shortName: "CRA Sub",
    description:
      "Cota subordinada com maior potencial de retorno para investidores qualificados.",
    fullDescription:
      "A CRA Subordinada Agrinvest destina-se a investidores qualificados que buscam maior potencial de retorno em troca de maior exposicao ao risco. Esta cota participa dos resultados excedentes do fundo e oferece rentabilidade superior a cota senior.",
    category: "Renda Fixa",
    type: "CRA",
    returnRate: "CDI + 7%",
    returnDescription: "Rentabilidade para investidor qualificado",
    minInvestment: 50000,
    maxInvestment: 5000000,
    liquidity: "Anual",
    liquidityDays: 365,
    risk: "medio",
    term: "24 a 48 meses",
    termMonths: 36,
    features: [
      "Maior rentabilidade potencial",
      "Exclusivo para investidor qualificado",
      "Participacao nos resultados excedentes",
      "Gestao ativa da carteira",
    ],
    risks: [
      "Risco de credito elevado",
      "Menor prioridade em caso de inadimplencia",
      "Liquidez restrita",
    ],
    documents: [
      { name: "Lamina do Produto", href: "#" },
      { name: "Termo de Adesao", href: "#" },
    ],
    monthlyRate: 1.45,
  },
  "fiagro-premium": {
    id: "fiagro-premium",
    name: "FIAGRO Premium Akin",
    shortName: "FIAGRO",
    description:
      "Fundo de Investimento nas Cadeias Produtivas Agroindustriais.",
    fullDescription:
      "O FIAGRO Premium Akin oferece exposicao diversificada ao agronegocio brasileiro atraves de uma gestao ativa e profissional. O fundo investe em uma carteira diversificada de ativos do setor, buscando rentabilidade real acima da inflacao.",
    category: "Fundos",
    type: "FIAGRO",
    returnRate: "IPCA + 8%",
    returnDescription: "Meta de rentabilidade real",
    minInvestment: 25000,
    maxInvestment: 2000000,
    liquidity: "Semestral",
    liquidityDays: 180,
    risk: "moderado",
    term: "36 meses",
    termMonths: 36,
    isNew: true,
    features: [
      "Gestao ativa profissional",
      "Diversificacao geografica",
      "Protecao inflacionaria",
      "Relatorios trimestrais",
    ],
    risks: [
      "Risco de mercado",
      "Risco de credito da carteira",
      "Risco de liquidez",
    ],
    documents: [
      { name: "Lamina do Fundo", href: "#" },
      { name: "Regulamento", href: "#" },
    ],
    monthlyRate: 1.2,
  },
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

export function ProductDetail({ productId }: ProductDetailProps) {
  const router = useRouter();
  const product = productsData[productId];
  const [investmentAmount, setInvestmentAmount] = useState(
    product?.minInvestment || 10000
  );
  const [showInvestDialog, setShowInvestDialog] = useState(false);

  if (!product) {
    return (
      <div className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 text-amber-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">
            Produto nao encontrado
          </h2>
          <p className="text-white/60 mb-6">
            O produto solicitado nao existe ou foi removido.
          </p>
          <Button asChild>
            <Link href="/investor/products">Ver todos os produtos</Link>
          </Button>
        </div>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    }).format(value);
  };

  // Calculate projected returns
  const monthlyReturn = investmentAmount * (product.monthlyRate / 100);
  const annualReturn = investmentAmount * (product.monthlyRate / 100) * 12;
  const projectedValue =
    investmentAmount *
    Math.pow(1 + product.monthlyRate / 100, product.termMonths);

  const handleInvest = () => {
    // In real app, this would redirect to deposit/investment flow
    router.push(`/deposit?product=${productId}&amount=${investmentAmount}`);
  };

  return (
    <div className="px-4 py-6 md:px-8 md:py-8 max-w-3xl mx-auto">
      {/* Back Button */}
      <Button
        variant="ghost"
        className="mb-4 -ml-2 text-white/60 hover:text-white hover:bg-white/10"
        onClick={() => router.back()}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar
      </Button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <Badge variant="secondary" className="bg-white/10 text-white/70">
            {product.category}
          </Badge>
          {product.highlight && (
            <Badge className="bg-[#00BC6E]/20 text-[#00BC6E]">
              {product.highlight}
            </Badge>
          )}
          {product.isNew && (
            <Badge className="bg-cyan-500/20 text-cyan-400">Novo</Badge>
          )}
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">{product.name}</h1>
        <p className="text-white/60">{product.description}</p>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-1 mb-1">
            <TrendingUp className="h-3 w-3 text-[#00BC6E]" />
            <span className="text-[10px] text-white/40">Rentabilidade</span>
          </div>
          <span className="text-sm font-bold text-[#00BC6E]">
            {product.returnRate}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-1 mb-1">
            <Clock className="h-3 w-3 text-cyan-400" />
            <span className="text-[10px] text-white/40">Liquidez</span>
          </div>
          <span className="text-sm font-bold text-white">{product.liquidity}</span>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-1 mb-1">
            <Calendar className="h-3 w-3 text-amber-400" />
            <span className="text-[10px] text-white/40">Prazo</span>
          </div>
          <span className="text-sm font-bold text-white">{product.term}</span>
        </div>
        <div className="p-3 rounded-xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-1 mb-1">
            <Shield className="h-3 w-3 text-violet-400" />
            <span className="text-[10px] text-white/40">Risco</span>
          </div>
          <Badge
            className={cn("text-[10px] px-1.5 py-0", riskColors[product.risk])}
          >
            {riskLabels[product.risk]}
          </Badge>
        </div>
      </div>

      {/* Investment Calculator */}
      <div className="rounded-2xl bg-gradient-to-br from-[#00BC6E]/10 to-cyan-500/10 border border-[#00BC6E]/20 p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Calculator className="h-5 w-5 text-[#00BC6E]" />
          <h2 className="text-lg font-semibold text-white">Simule seu Investimento</h2>
        </div>

        {/* Amount Input */}
        <div className="mb-4">
          <label className="text-xs text-white/40 mb-2 block">
            Valor do investimento
          </label>
          <Input
            type="text"
            value={formatCurrency(investmentAmount)}
            onChange={(e) => {
              const value = e.target.value.replace(/\D/g, "");
              const numValue = parseInt(value) / 100;
              if (
                numValue >= product.minInvestment &&
                (!product.maxInvestment || numValue <= product.maxInvestment)
              ) {
                setInvestmentAmount(numValue);
              }
            }}
            className="bg-white/10 border-white/20 text-white text-lg font-bold"
          />
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-white/40">
              Min: {formatCurrency(product.minInvestment)}
            </span>
            {product.maxInvestment && (
              <span className="text-[10px] text-white/40">
                Max: {formatCurrency(product.maxInvestment)}
              </span>
            )}
          </div>
        </div>

        {/* Slider */}
        <Slider
          value={[investmentAmount]}
          min={product.minInvestment}
          max={product.maxInvestment || 500000}
          step={1000}
          onValueChange={(value) => setInvestmentAmount(value[0])}
          className="mb-6"
        />

        {/* Projections */}
        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-white/5">
            <span className="text-[10px] text-white/40 block mb-1">
              Rendimento Mensal
            </span>
            <span className="text-sm font-bold text-[#00BC6E]">
              {formatCurrency(monthlyReturn)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-white/5">
            <span className="text-[10px] text-white/40 block mb-1">
              Rendimento Anual
            </span>
            <span className="text-sm font-bold text-[#00BC6E]">
              {formatCurrency(annualReturn)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-white/5">
            <span className="text-[10px] text-white/40 block mb-1">
              Valor em {product.termMonths} meses
            </span>
            <span className="text-sm font-bold text-white">
              {formatCurrency(projectedValue)}
            </span>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white mb-3">
          Sobre o Produto
        </h2>
        <p className="text-sm text-white/70 leading-relaxed">
          {product.fullDescription}
        </p>
      </div>

      {/* Features */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white mb-3">
          Caracteristicas
        </h2>
        <div className="space-y-2">
          {product.features.map((feature, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 rounded-xl bg-white/5"
            >
              <CheckCircle2 className="h-4 w-4 text-[#00BC6E] mt-0.5 flex-shrink-0" />
              <span className="text-sm text-white/80">{feature}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Risks */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white mb-3">
          Fatores de Risco
        </h2>
        <div className="space-y-2">
          {product.risks.map((risk, index) => (
            <div
              key={index}
              className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10"
            >
              <AlertTriangle className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-white/70">{risk}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Documents */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white mb-3">Documentos</h2>
        <div className="space-y-2">
          {product.documents.map((doc, index) => (
            <a
              key={index}
              href={doc.href}
              className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-4 w-4 text-white/50" />
                <span className="text-sm text-white">{doc.name}</span>
              </div>
              <ChevronRight className="h-4 w-4 text-white/30" />
            </a>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="sticky bottom-20 md:bottom-4 bg-gradient-to-t from-[#01223F] via-[#01223F] to-transparent pt-6">
        <Button
          className="w-full h-14 bg-[#00BC6E] hover:bg-[#00BC6E]/90 text-[#003F28] font-bold text-lg"
          onClick={() => setShowInvestDialog(true)}
        >
          Investir {formatCurrency(investmentAmount)}
        </Button>
        <p className="text-[10px] text-white/40 text-center mt-2">
          Ao investir, voce concorda com os termos e condicoes do produto
        </p>
      </div>

      {/* Investment Confirmation Dialog */}
      <Dialog open={showInvestDialog} onOpenChange={setShowInvestDialog}>
        <DialogContent className="bg-[#01223F] border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Investimento</DialogTitle>
            <DialogDescription className="text-white/60">
              Revise os detalhes antes de confirmar
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
              <span className="text-sm text-white/60">Produto</span>
              <span className="text-sm font-medium text-white">
                {product.shortName}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
              <span className="text-sm text-white/60">Valor</span>
              <span className="text-sm font-bold text-[#00BC6E]">
                {formatCurrency(investmentAmount)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
              <span className="text-sm text-white/60">Rentabilidade</span>
              <span className="text-sm font-medium text-white">
                {product.returnRate}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 rounded-lg bg-white/5">
              <span className="text-sm text-white/60">Prazo</span>
              <span className="text-sm font-medium text-white">
                {product.term}
              </span>
            </div>
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button
              className="w-full bg-[#00BC6E] hover:bg-[#00BC6E]/90 text-[#003F28] font-bold"
              onClick={handleInvest}
            >
              Confirmar e Continuar
            </Button>
            <Button
              variant="ghost"
              className="w-full text-white/60 hover:text-white hover:bg-white/10"
              onClick={() => setShowInvestDialog(false)}
            >
              Cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
