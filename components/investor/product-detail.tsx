"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  TrendingUp,
  Calendar,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ChevronRight,
  Lock,
  DollarSign,
  BarChart3,
  Layers,
  Calculator,
  Info,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type RiskLevel = "baixo" | "medio" | "alto" | "muito-alto";
type StatusType = "aberta" | "estruturacao" | "breve" | "encerrado";

interface TimelineStep {
  label: string;
}

interface RiskItem {
  title: string;
  description: string;
}

interface ProductData {
  id: string;
  name: string;
  category: string;
  returnRate: string;
  indexador: string;
  term: string;
  termMonths: number;
  liquidity: string;
  minInvestment: number;
  maxInvestment?: number;
  riskLevel: RiskLevel;
  riskNumber: number;
  status: StatusType;
  qualifiedOnly?: boolean;
  about: string;
  objective: string;
  collateral: string[];
  timeline: TimelineStep[];
  risks: RiskItem[];
  documents: { name: string }[];
  monthlyRate: number;
}

// ─── Dados dos Produtos ───────────────────────────────────────────────────────

const productsData: Record<string, ProductData> = {
  "ccb-recebiveis": {
    id: "ccb-recebiveis",
    name: "CCB Akin Recebíveis 180D",
    category: "Renda Fixa Privada",
    returnRate: "115% do CDI",
    indexador: "CDI",
    term: "180 dias",
    termMonths: 6,
    liquidity: "No vencimento",
    minInvestment: 5000,
    riskLevel: "medio",
    riskNumber: 2,
    status: "aberta",
    about:
      "A CCB Akin Recebíveis 180D é uma operação de crédito privado estruturada pela Akin S.A., com objetivo de financiar operações comerciais e recebíveis selecionados. O produto é direcionado a investidores que buscam exposição a crédito privado com prazo definido, rentabilidade-alvo e acompanhamento digital pela plataforma Agrinvest.",
    objective:
      "Os recursos captados são destinados ao financiamento de operações previamente analisadas pela Akin S.A., respeitando critérios internos de crédito, documentação, garantias e monitoramento.",
    collateral: [
      "Recebíveis comerciais selecionados",
      "Contratos ou títulos representativos da operação",
      "Conta de acompanhamento da operação",
      "Relatórios periódicos",
      "Eventuais garantias adicionais conforme documentação específica",
    ],
    timeline: [
      { label: "Reserva" },
      { label: "Assinatura dos documentos" },
      { label: "Integralização" },
      { label: "Alocação na operação" },
      { label: "Acompanhamento mensal" },
      { label: "Pagamento no vencimento" },
    ],
    risks: [
      {
        title: "Risco de crédito",
        description: "Possibilidade de inadimplência do devedor dos recebíveis.",
      },
      {
        title: "Risco de liquidez",
        description: "O produto não possui liquidez antes do vencimento.",
      },
      {
        title: "Risco de mercado",
        description: "Variação das taxas de juros pode afetar a marcação a mercado.",
      },
      {
        title: "Risco operacional",
        description: "Falhas em processos internos ou sistemas de gestão.",
      },
      {
        title: "Risco regulatório",
        description: "Mudanças na legislação podem impactar as condições da operação.",
      },
    ],
    documents: [
      { name: "Lâmina do produto" },
      { name: "Termo de ciência de risco" },
      { name: "Contrato de investimento" },
      { name: "Relatório de lastro" },
      { name: "Política de suitability" },
      { name: "Informações regulatórias" },
    ],
    monthlyRate: 1.05,
  },
  "fidc-senior": {
    id: "fidc-senior",
    name: "FIDC Akin Sênior",
    category: "Fundo de Crédito",
    returnRate: "CDI + 3,5% a.a.",
    indexador: "CDI",
    term: "12 meses",
    termMonths: 12,
    liquidity: "360 dias",
    minInvestment: 10000,
    riskLevel: "medio",
    riskNumber: 3,
    status: "aberta",
    qualifiedOnly: true,
    about:
      "O FIDC Akin Sênior é um fundo de investimento em direitos creditórios estruturado para oferecer exposição diversificada a recebíveis comerciais do agronegócio. A cota sênior tem prioridade no recebimento dos rendimentos e na devolução do principal.",
    objective:
      "Os recursos captados são alocados em uma carteira diversificada de direitos creditórios originados de operações agroindustriais, com rigorosos critérios de elegibilidade e monitoramento contínuo.",
    collateral: [
      "Direitos creditórios do agronegócio",
      "Reserva de liquidez mínima de 10%",
      "Estrutura de subordinação com cotas juniores",
      "Cessão fiduciária dos recebíveis",
      "Conta vinculada ao fundo",
    ],
    timeline: [
      { label: "Reserva" },
      { label: "Assinatura dos documentos" },
      { label: "Integralização" },
      { label: "Alocação na carteira" },
      { label: "Rendimentos mensais" },
      { label: "Resgate após 360 dias" },
    ],
    risks: [
      {
        title: "Risco de crédito",
        description: "Inadimplência dos cedentes ou devedores dos recebíveis.",
      },
      {
        title: "Risco de liquidez",
        description: "Prazo mínimo de 360 dias para resgate das cotas.",
      },
      {
        title: "Risco de mercado",
        description: "Oscilação do CDI e das condições de crédito.",
      },
      {
        title: "Risco operacional",
        description: "Risco de erros na gestão e custódia dos ativos.",
      },
      {
        title: "Risco regulatório",
        description: "Alterações normativas da CVM ou Banco Central.",
      },
    ],
    documents: [
      { name: "Lâmina do fundo" },
      { name: "Regulamento" },
      { name: "Termo de adesão" },
      { name: "Relatório de lastro" },
      { name: "Política de suitability" },
      { name: "Informações regulatórias" },
    ],
    monthlyRate: 1.18,
  },
  "cra-agro": {
    id: "cra-agro",
    name: "CRA Akin Agro",
    category: "Agro",
    returnRate: "IPCA + 9,5% a.a.",
    indexador: "IPCA",
    term: "36 meses",
    termMonths: 36,
    liquidity: "No vencimento",
    minInvestment: 1000,
    riskLevel: "medio",
    riskNumber: 3,
    status: "aberta",
    about:
      "O CRA Akin Agro é um Certificado de Recebíveis do Agronegócio emitido para financiar produtores rurais e empresas do setor. Conta com isenção de Imposto de Renda para pessoas físicas e é lastreado em recebíveis de operações agroindustriais selecionadas.",
    objective:
      "Os recursos são direcionados ao financiamento de operações agroindustriais com garantias reais, contribuindo para o desenvolvimento do agronegócio brasileiro de forma sustentável.",
    collateral: [
      "Recebíveis do agronegócio selecionados",
      "Hipotecas e garantias rurais",
      "Certificados e contratos agroindustriais",
      "Conta de acompanhamento da operação",
      "Relatórios periódicos de performance",
    ],
    timeline: [
      { label: "Reserva" },
      { label: "Assinatura dos documentos" },
      { label: "Integralização" },
      { label: "Alocação nas operações" },
      { label: "Acompanhamento semestral" },
      { label: "Pagamento no vencimento" },
    ],
    risks: [
      {
        title: "Risco de crédito",
        description: "Inadimplência dos produtores rurais financiados.",
      },
      {
        title: "Risco de liquidez",
        description: "Sem resgate antecipado; liquidez apenas no vencimento.",
      },
      {
        title: "Risco de mercado",
        description: "Variação do IPCA e das condições do mercado agrícola.",
      },
      {
        title: "Risco operacional",
        description: "Riscos climáticos e de produção afetando o lastro.",
      },
      {
        title: "Risco regulatório",
        description: "Mudanças na legislação do agronegócio ou tributária.",
      },
    ],
    documents: [
      { name: "Lâmina do produto" },
      { name: "Termo de ciência de risco" },
      { name: "Contrato de investimento" },
      { name: "Relatório de lastro" },
      { name: "Política de suitability" },
      { name: "Informações regulatórias" },
    ],
    monthlyRate: 1.22,
  },
};

// Fallback para IDs antigos
const idAliases: Record<string, string> = {
  "cra-senior": "cra-agro",
  "cra-subordinada": "cra-agro",
  "fiagro-premium": "fidc-senior",
};

// ─── Helpers visuais ──────────────────────────────────────────────────────────

const statusConfig: Record<StatusType, { label: string; className: string }> = {
  aberta: { label: "Reserva aberta", className: "bg-[#00BC6E]/20 text-[#00BC6E]" },
  estruturacao: { label: "Em estruturação", className: "bg-amber-500/20 text-amber-400" },
  breve: { label: "Disponível em breve", className: "bg-cyan-500/20 text-cyan-400" },
  encerrado: { label: "Encerrado", className: "bg-white/10 text-white/40" },
};

const riskConfig: Record<RiskLevel, { label: string; className: string }> = {
  baixo: { label: "Nível 1 — Baixo", className: "bg-[#00BC6E]/20 text-[#00BC6E]" },
  medio: { label: "Nível 2 — Médio", className: "bg-amber-500/20 text-amber-400" },
  alto: { label: "Nível 3 — Alto", className: "bg-orange-500/20 text-orange-400" },
  "muito-alto": { label: "Nível 4 — Muito Alto", className: "bg-red-500/20 text-red-400" },
};

// ─── Componente ───────────────────────────────────────────────────────────────

interface ProductDetailProps {
  productId: string;
}

export function ProductDetail({ productId }: ProductDetailProps) {
  const router = useRouter();
  const resolvedId = idAliases[productId] ?? productId;
  const product = productsData[resolvedId];

  const [amount, setAmount] = useState(product?.minInvestment ?? 5000);
  const [rawInput, setRawInput] = useState("");
  const [inputFocused, setInputFocused] = useState(false);

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-6 text-center">
        <AlertTriangle className="h-12 w-12 text-amber-400 mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Produto não encontrado</h2>
        <p className="text-white/60 mb-6 text-sm">
          O produto solicitado não existe ou foi removido da prateleira.
        </p>
        <Button asChild className="bg-[#00BC6E] text-[#003F28] font-semibold">
          <Link href="/investor/invest">Ver todos os produtos</Link>
        </Button>
      </div>
    );
  }

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
    }).format(v);

  const grossReturn = amount * Math.pow(1 + product.monthlyRate / 100, product.termMonths) - amount;
  const netReturn = grossReturn * 0.85; // IR estimado de 15%
  const grossTotal = amount + grossReturn;
  const netTotal = amount + netReturn;

  const status = statusConfig[product.status];
  const risk = riskConfig[product.riskLevel];

  const summaryCards = [
    { icon: <TrendingUp className="h-4 w-4 text-[#00BC6E]" />, label: "Rentabilidade", value: product.returnRate },
    { icon: <Calendar className="h-4 w-4 text-amber-400" />, label: "Prazo", value: product.term },
    { icon: <Clock className="h-4 w-4 text-cyan-400" />, label: "Liquidez", value: product.liquidity },
    { icon: <DollarSign className="h-4 w-4 text-violet-400" />, label: "Aplicação mínima", value: formatCurrency(product.minInvestment) },
    { icon: <Shield className="h-4 w-4 text-orange-400" />, label: "Risco", value: `Nível ${product.riskNumber}` },
    { icon: <BarChart3 className="h-4 w-4 text-white/50" />, label: "Indexador", value: product.indexador },
  ];

  return (
    <div className="pb-32 md:pb-10">
      {/* ── Topo ── */}
      <div className="px-4 pt-4 pb-6 md:px-8 md:pt-6 bg-gradient-to-b from-[#003020] to-transparent">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-white/50 hover:text-white transition-colors text-sm mb-5"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>

        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-xs text-white/40 font-medium uppercase tracking-wide">
            {product.category}
          </span>
          <Badge className={cn("text-[11px] px-2 py-0.5", status.className)}>
            {status.label}
          </Badge>
          {product.qualifiedOnly && (
            <Badge className="bg-violet-500/20 text-violet-400 text-[11px] px-2 py-0.5">
              <Lock className="h-2.5 w-2.5 mr-1" />
              Qualificado
            </Badge>
          )}
        </div>

        <h1 className="text-2xl font-bold text-white leading-tight mb-1 text-balance">
          {product.name}
        </h1>
        <Badge className={cn("text-[11px] px-2 py-0.5 mt-1", risk.className)}>
          {risk.label}
        </Badge>
      </div>

      {/* ── Cards de resumo ── */}
      <div className="px-4 md:px-8 mb-6">
        <div className="grid grid-cols-3 gap-2">
          {summaryCards.map((card, i) => (
            <div
              key={i}
              className="flex flex-col gap-1.5 p-3 rounded-xl bg-white/5 border border-white/8"
            >
              <div className="flex items-center gap-1.5">
                {card.icon}
                <span className="text-[10px] text-white/40 leading-none">{card.label}</span>
              </div>
              <span className="text-sm font-semibold text-white leading-tight">{card.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 md:px-8 space-y-8">

        {/* ── 1. Sobre o produto ── */}
        <section>
          <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
            <Info className="h-4 w-4 text-[#00BC6E]" />
            Sobre o produto
          </h2>
          <p className="text-sm text-white/65 leading-relaxed">{product.about}</p>
        </section>

        {/* ── 2. Objetivo da operação ── */}
        <section>
          <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
            <Layers className="h-4 w-4 text-cyan-400" />
            Objetivo da operação
          </h2>
          <p className="text-sm text-white/65 leading-relaxed">{product.objective}</p>
        </section>

        {/* ── 3. Lastro e garantias ── */}
        <section>
          <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
            <Shield className="h-4 w-4 text-violet-400" />
            Lastro e garantias
          </h2>
          <div className="space-y-2">
            {product.collateral.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-white/5">
                <CheckCircle2 className="h-4 w-4 text-[#00BC6E] mt-0.5 shrink-0" />
                <span className="text-sm text-white/70">{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── 4. Fluxo de pagamento ── */}
        <section>
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Calendar className="h-4 w-4 text-amber-400" />
            Fluxo de pagamento
          </h2>
          <div className="relative">
            {/* linha vertical */}
            <div className="absolute left-3.5 top-0 bottom-0 w-px bg-white/10" />
            <div className="space-y-0">
              {product.timeline.map((step, i) => (
                <div key={i} className="relative flex items-start gap-4 pb-5 last:pb-0">
                  <div className="relative z-10 flex items-center justify-center h-7 w-7 rounded-full bg-[#01223F] border border-[#00BC6E]/50 shrink-0">
                    <span className="text-[10px] font-bold text-[#00BC6E]">{i + 1}</span>
                  </div>
                  <div className="pt-0.5">
                    <span className="text-sm text-white/80">{step.label}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5. Riscos ── */}
        <section>
          <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Riscos
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {product.risks.map((risk, i) => (
              <div
                key={i}
                className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/15"
              >
                <p className="text-xs font-semibold text-amber-400 mb-1">{risk.title}</p>
                <p className="text-xs text-white/55 leading-relaxed">{risk.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── 6. Documentos ── */}
        <section>
          <h2 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4 text-white/50" />
            Documentos
          </h2>
          <div className="space-y-2">
            {product.documents.map((doc, i) => (
              <button
                key={i}
                className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/8 hover:bg-white/10 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-white/40 shrink-0" />
                  <span className="text-sm text-white/80">{doc.name}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-white/30 shrink-0" />
              </button>
            ))}
          </div>
        </section>

        {/* ── 7. Simulador ── */}
        <section>
          <h2 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
            <Calculator className="h-4 w-4 text-[#00BC6E]" />
            Simulador
          </h2>

          <div className="rounded-2xl border border-[#00BC6E]/20 bg-gradient-to-br from-[#00BC6E]/8 to-transparent p-5 space-y-5">
            {/* Valor */}
            <div>
              <label className="text-xs text-white/40 block mb-2">Valor do investimento</label>
              <Input
                type="text"
                value={inputFocused ? rawInput : formatCurrency(amount)}
                onFocus={() => {
                  setInputFocused(true);
                  setRawInput(String(amount));
                }}
                onBlur={() => {
                  setInputFocused(false);
                  const parsed = parseFloat(rawInput.replace(",", "."));
                  if (!isNaN(parsed) && parsed >= product.minInvestment) {
                    setAmount(parsed);
                  }
                }}
                onChange={(e) => setRawInput(e.target.value)}
                className="bg-white/8 border-white/15 text-white font-bold text-lg h-12"
              />
              <p className="text-[11px] text-white/35 mt-1.5">
                Mínimo: {formatCurrency(product.minInvestment)}
              </p>
            </div>

            {/* Slider */}
            <Slider
              value={[amount]}
              min={product.minInvestment}
              max={product.maxInvestment ?? Math.max(500000, product.minInvestment * 100)}
              step={500}
              onValueChange={([v]) => { setAmount(v); setRawInput(String(v)); }}
            />

            {/* Campos de resultado */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-white/5">
                <span className="text-[10px] text-white/40 block mb-1">Prazo</span>
                <span className="text-sm font-semibold text-white">{product.term}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5">
                <span className="text-[10px] text-white/40 block mb-1">Rentabilidade indicativa</span>
                <span className="text-sm font-semibold text-[#00BC6E]">{product.returnRate}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5">
                <span className="text-[10px] text-white/40 block mb-1">Liquidez</span>
                <span className="text-sm font-semibold text-white">{product.liquidity}</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5">
                <span className="text-[10px] text-white/40 block mb-1">Indexador</span>
                <span className="text-sm font-semibold text-white">{product.indexador}</span>
              </div>
            </div>

            {/* Resultados estimados */}
            <div className="rounded-xl border border-white/10 bg-white/5 divide-y divide-white/8">
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-white/50">Resultado estimado bruto</span>
                <div className="text-right">
                  <span className="text-sm font-bold text-[#00BC6E] block">
                    {formatCurrency(grossTotal)}
                  </span>
                  <span className="text-[10px] text-[#00BC6E]/60">
                    +{formatCurrency(grossReturn)}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between px-4 py-3">
                <span className="text-xs text-white/50">Resultado estimado líquido</span>
                <div className="text-right">
                  <span className="text-sm font-bold text-white block">
                    {formatCurrency(netTotal)}
                  </span>
                  <span className="text-[10px] text-white/40">
                    +{formatCurrency(netReturn)}
                  </span>
                </div>
              </div>
            </div>

            {/* Aviso simulador */}
            <p className="text-[11px] text-white/35 leading-relaxed">
              Simulação meramente indicativa. A rentabilidade pode variar conforme condições
              da operação, prazo, custos, tributos e riscos envolvidos.
            </p>
          </div>
        </section>

      </div>{/* /px wrapper */}

      {/* ── Botões fixos no rodapé mobile ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
        <div className="bg-gradient-to-t from-[#01223F] via-[#01223F]/95 to-transparent pt-6 pb-6 px-4">
          <div className="flex gap-3">
            <Button
              variant="outline"
              className="flex-1 h-12 border-white/20 text-white bg-white/5 hover:bg-white/10 font-semibold"
              onClick={() => {
                const el = document.getElementById("simulador-section");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Simular
            </Button>
            <Button
              className="flex-1 h-12 bg-[#00BC6E] hover:bg-[#00a85f] text-[#003F28] font-bold"
              onClick={() =>
                router.push(`/deposit?product=${product.id}&amount=${amount}`)
              }
            >
              Reservar investimento
            </Button>
          </div>
        </div>
      </div>

      {/* Botão desktop */}
      <div className="hidden md:flex gap-3 px-8 mt-10 max-w-2xl">
        <Button
          variant="outline"
          className="flex-1 h-12 border-white/20 text-white bg-white/5 hover:bg-white/10 font-semibold"
        >
          Simular
        </Button>
        <Button
          className="flex-1 h-12 bg-[#00BC6E] hover:bg-[#00a85f] text-[#003F28] font-bold"
          onClick={() =>
            router.push(`/deposit?product=${product.id}&amount=${amount}`)
          }
        >
          Reservar investimento
        </Button>
      </div>

    </div>
  );
}
