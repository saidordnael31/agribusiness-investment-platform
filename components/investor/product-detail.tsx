"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ChevronRight,
  DollarSign,
  Info,
  TrendingUp,
  Calendar,
  Percent,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type StatusType = "aberta" | "estruturacao" | "breve" | "encerrado";

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
  riskNumber: 1 | 2 | 3 | 4 | 5;
  status: StatusType;
  qualifiedOnly?: boolean;
  cvm88?: boolean;
  equity?: boolean;
  about: string;
  objective: string;
  issuer: string;
  collateral: string[];
  guarantees: string[];
  taxation: string;
  timeline: { label: string }[];
  risks: RiskItem[];
  documents: { name: string }[];
  tags: string[];
  annualRate?: number; // taxa anual base para simulador (null = equity sem retorno fixo)
}

// ─── Dados dos Produtos ───────────────────────────────────────────────────────

const productsData: Record<string, ProductData> = {
  "nota-comercial-akin-cr": {
    id: "nota-comercial-akin-cr",
    name: "Nota Comercial Akin CR",
    category: "Crédito Privado",
    returnRate: "CDI + 5% a.a.",
    indexador: "CDI",
    term: "12 a 18 meses",
    termMonths: 18,
    liquidity: "No vencimento",
    minInvestment: 50000,
    riskNumber: 3,
    status: "aberta",
    about: "A Nota Comercial Akin CR é um título de crédito privado emitido pela estrutura Akin para captação junto a investidores qualificados. Oferece remuneração atrelada ao CDI com spread adicional, com prazo de 12 a 18 meses e pagamento integral no vencimento.",
    objective: "Financiar operações de crédito estruturado da carteira da Akin S.A., com lastro em recebíveis e contratos comerciais previamente selecionados.",
    issuer: "Akin S.A. — Estruturador e Emissor",
    collateral: [
      "Recebíveis comerciais vinculados à operação",
      "Contratos firmados com contrapartes selecionadas",
      "Cessão fiduciária de direitos creditórios",
    ],
    guarantees: [
      "Cessão fiduciária de recebíveis",
      "Fundo de reserva de liquidez",
    ],
    taxation: "Tabela regressiva de IR: 22,5% (até 180 dias), 20% (181–360 dias), 17,5% (361–720 dias), 15% (acima de 720 dias). IOF regressivo até 30 dias.",
    timeline: [
      { label: "Subscrição" },
      { label: "Integralização" },
      { label: "Acumulação de rendimento" },
      { label: "Vencimento e resgate" },
    ],
    risks: [
      { title: "Risco de crédito", description: "Possibilidade de inadimplência do emissor ou dos devedores da carteira." },
      { title: "Risco de liquidez", description: "Produto sem mercado secundário ativo. O resgate ocorre apenas no vencimento." },
      { title: "Risco de mercado", description: "Variação do CDI pode afetar rentabilidade relativa." },
      { title: "Sem FGC", description: "Este produto não conta com a cobertura do Fundo Garantidor de Crédito." },
    ],
    documents: [
      { name: "Instrumento de emissão" },
      { name: "Lâmina do produto" },
      { name: "Relatório de due diligence" },
      { name: "Política de suitability" },
    ],
    tags: ["Sem FGC", "Produto privado", "Suitability obrigatório"],
    annualRate: 0.165,
  },

  "fidc-akin-senior": {
    id: "fidc-akin-senior",
    name: "FIDC Akin Sênior",
    category: "Fundos de Crédito",
    returnRate: "CDI + 4,5% a.a.",
    indexador: "CDI",
    term: "24 a 36 meses",
    termMonths: 36,
    liquidity: "Janela semestral ou vencimento",
    minInvestment: 50000,
    riskNumber: 3,
    status: "aberta",
    about: "O FIDC Akin Sênior é um Fundo de Investimento em Direitos Creditórios cujas cotas sênior oferecem prioridade no recebimento de rendimentos e amortizações, com subordinação mínima de 20% de cotas subordinadas para proteção.",
    objective: "Adquirir direitos creditórios de operações comerciais e do agronegócio, proporcionando rentabilidade superior ao CDI com proteção estrutural via subordinação.",
    issuer: "Akin S.A. (Gestor e Administrador) — FIDC regulamentado pela CVM",
    collateral: [
      "Direitos creditórios cedidos por originadores selecionados",
      "Cotas subordinadas como camada de proteção",
      "Diversificação por sacado e setor",
    ],
    guarantees: [
      "Subordinação mínima de 20%",
      "Fundo de reserva",
      "Critérios de elegibilidade dos créditos",
    ],
    taxation: "Tributação de fundos: 15% de IR na fonte sobre rendimentos para PF (tabela regressiva). IOF regressivo em resgates até 30 dias.",
    timeline: [
      { label: "Captação" },
      { label: "Aquisição de direitos creditórios" },
      { label: "Janela de resgate semestral" },
      { label: "Liquidação final" },
    ],
    risks: [
      { title: "Risco de crédito", description: "Inadimplência nos direitos creditórios da carteira." },
      { title: "Risco de concentração", description: "Exposição a setores ou sacados específicos." },
      { title: "Risco de liquidez", description: "Resgate condicionado a janelas semestrais." },
      { title: "Sem FGC", description: "Cotas de FIDC não são cobertas pelo FGC." },
    ],
    documents: [
      { name: "Regulamento do FIDC" },
      { name: "Lâmina de informações essenciais" },
      { name: "Relatório mensal de carteira" },
      { name: "Política de elegibilidade" },
    ],
    tags: ["FIDC", "Cota Sênior", "Sem FGC", "Baixa liquidez"],
    annualRate: 0.155,
  },

  "fidc-akin-fertilizantes": {
    id: "fidc-akin-fertilizantes",
    name: "FIDC Akin Fertilizantes",
    category: "Agro / Crédito Privado",
    returnRate: "CDI + 5,5% a.a.",
    indexador: "CDI",
    term: "24 a 36 meses",
    termMonths: 36,
    liquidity: "Janela anual ou vencimento",
    minInvestment: 50000,
    riskNumber: 4,
    status: "aberta",
    about: "O FIDC Akin Fertilizantes é um fundo especializado em direitos creditórios originados no setor de insumos agrícolas, com lastro em CPRs e contratos de fornecimento de fertilizantes e defensivos para produtores rurais selecionados.",
    objective: "Prover capital de giro para a cadeia de insumos agrícolas, adquirindo CPRs e recebíveis de produtores rurais com histórico comprovado.",
    issuer: "Akin S.A. (Gestor) — FIDC regulamentado pela CVM",
    collateral: [
      "CPRs (Cédulas de Produto Rural) físicas e financeiras",
      "Recebíveis de contratos de fornecimento de insumos",
      "Penhor de safra e garantias reais rurais",
    ],
    guarantees: [
      "CPR com aval",
      "Seguro de produção agrícola",
      "Cotas subordinadas como proteção",
    ],
    taxation: "Tributação de fundos: 15% de IR sobre rendimentos. Janela anual de resgate.",
    timeline: [
      { label: "Captação e estruturação" },
      { label: "Aquisição de CPRs e recebíveis" },
      { label: "Safra e liquidação dos créditos" },
      { label: "Janela anual de resgate" },
      { label: "Liquidação final" },
    ],
    risks: [
      { title: "Risco agrícola", description: "Perdas de safra por clima, pragas ou eventos de força maior." },
      { title: "Risco de crédito rural", description: "Inadimplência de produtores rurais." },
      { title: "Risco de liquidez", description: "Resgate apenas em janelas anuais." },
      { title: "Sem FGC", description: "FIDC não possui cobertura do FGC." },
    ],
    documents: [
      { name: "Regulamento do FIDC" },
      { name: "Política de elegibilidade de CPRs" },
      { name: "Relatório de safra e carteira" },
      { name: "Lâmina de informações" },
    ],
    tags: ["FIDC", "Agro", "Fertilizantes", "CPR", "Baixa liquidez"],
    annualRate: 0.165,
  },

  "cri-akin-real-estate": {
    id: "cri-akin-real-estate",
    name: "CRI Akin Real Estate",
    category: "Imobiliário",
    returnRate: "IPCA + 10% a.a.",
    indexador: "IPCA",
    term: "36 meses",
    termMonths: 36,
    liquidity: "No vencimento",
    minInvestment: 50000,
    riskNumber: 3,
    status: "aberta",
    about: "O CRI Akin Real Estate é um Certificado de Recebíveis Imobiliários lastreado em contratos de locação e recebíveis imobiliários de empreendimentos selecionados. Oferece proteção inflacionária via IPCA com spread adicional.",
    objective: "Financiar empreendimentos e operações imobiliárias com lastro em recebíveis de locação e contratos de compra e venda, proporcionando proteção real ao patrimônio do investidor.",
    issuer: "Securitizadora parceira — CRI regulamentado pela CVM",
    collateral: [
      "Recebíveis de locação de imóveis comerciais e logísticos",
      "Contratos de alienação fiduciária de imóveis",
      "Fiança corporativa dos devedores",
    ],
    guarantees: [
      "Alienação fiduciária dos imóveis lastro",
      "Fundo de reserva de liquidez",
      "Fiança corporativa",
    ],
    taxation: "Isento de IR para pessoa física (Lei 12.431). Sujeito a IOF regressivo em resgates até 30 dias.",
    timeline: [
      { label: "Emissão e subscrição" },
      { label: "Integralização" },
      { label: "Pagamento de juros semestral" },
      { label: "Amortização e vencimento" },
    ],
    risks: [
      { title: "Risco imobiliário", description: "Desvalorização ou vacância dos imóveis lastro." },
      { title: "Risco de crédito", description: "Inadimplência do devedor do CRI." },
      { title: "Risco de liquidez", description: "Sem mercado secundário ativo garantido." },
      { title: "Sem FGC", description: "CRI não possui cobertura do FGC." },
    ],
    documents: [
      { name: "Termo de securitização" },
      { name: "Escritura do CRI" },
      { name: "Relatório de due diligence imobiliária" },
      { name: "Lâmina do produto" },
    ],
    tags: ["CRI", "Real Estate", "Sem FGC", "Ativo real"],
    annualRate: 0.10,
  },

  "debenture-akin-privada": {
    id: "debenture-akin-privada",
    name: "Debênture Akin Privada",
    category: "Crédito Privado",
    returnRate: "CDI + 6% a.a.",
    indexador: "CDI",
    term: "36 meses",
    termMonths: 36,
    liquidity: "No vencimento ou mercado secundário",
    minInvestment: 50000,
    riskNumber: 4,
    status: "aberta",
    about: "A Debênture Akin Privada é um título de dívida de médio prazo emitido diretamente pela Akin S.A., com remuneração atrativa atrelada ao CDI. Destinada a investidores que buscam crédito privado com rentabilidade superior ao mercado de capitais tradicional.",
    objective: "Captação de recursos para expansão das operações de crédito estruturado da Akin S.A., com uso de recursos previamente definido em relatório de destino.",
    issuer: "Akin S.A. — Emissora direta",
    collateral: [
      "Carteira de recebíveis da Akin S.A.",
      "Ativos operacionais da companhia",
    ],
    guarantees: [
      "Penhor de ações da emissora",
      "Fiança dos sócios controladores",
    ],
    taxation: "Tabela regressiva de IR: 22,5% (até 180 dias), 20% (181–360 dias), 17,5% (361–720 dias), 15% (acima de 720 dias).",
    timeline: [
      { label: "Emissão e bookbuilding" },
      { label: "Integralização" },
      { label: "Acumulação de rendimento" },
      { label: "Vencimento e resgate" },
    ],
    risks: [
      { title: "Risco de crédito corporativo", description: "Risco de inadimplência da Akin S.A. como emissora." },
      { title: "Risco de liquidez", description: "Mercado secundário pode não estar disponível ou ter spreads elevados." },
      { title: "Risco de mercado", description: "Variação do CDI pode afetar a rentabilidade relativa." },
      { title: "Sem FGC", description: "Debêntures não possuem cobertura do FGC." },
    ],
    documents: [
      { name: "Escritura de emissão" },
      { name: "Lâmina do produto" },
      { name: "Demonstrações financeiras da emissora" },
      { name: "Relatório de destino de recursos" },
    ],
    tags: ["Debênture", "Crédito Privado", "Sem FGC"],
    annualRate: 0.17,
  },

  "debenture-conversivel-akin": {
    id: "debenture-conversivel-akin",
    name: "Debênture Conversível Akin",
    category: "Alternativos",
    returnRate: "10% a.a. + potencial de conversão",
    indexador: "Prefixado",
    term: "36 a 60 meses",
    termMonths: 60,
    liquidity: "No vencimento ou evento de liquidez",
    minInvestment: 50000,
    riskNumber: 5,
    status: "aberta",
    qualifiedOnly: true,
    equity: true,
    about: "A Debênture Conversível Akin combina remuneração mínima contratual de 10% a.a. com a opção de conversão em participação societária em evento futuro qualificado. Produto destinado a investidores qualificados com alta tolerância a risco e horizonte de longo prazo.",
    objective: "Financiar o crescimento de empresa ou projeto selecionado com possibilidade de upside via conversão em equity, caso ocorra evento de liquidez, rodada qualificada ou IPO.",
    issuer: "Akin S.A. em nome da empresa portfólio — Instrumento privado",
    collateral: [
      "Direito contratual de conversão em participação",
      "Garantias pessoais dos fundadores",
    ],
    guarantees: [
      "Direito de conversão em rodada qualificada",
      "Tag along e anti-diluição contratual",
    ],
    taxation: "Tabela regressiva de IR sobre a parcela de rendimento fixo. Ganho de capital em conversão sujeito a tributação específica.",
    timeline: [
      { label: "Emissão e subscrição" },
      { label: "Acumulação de rendimento mínimo" },
      { label: "Evento de conversão ou vencimento" },
      { label: "Liquidação ou participação societária" },
    ],
    risks: [
      { title: "Risco de negócio", description: "A empresa portfólio pode não atingir as metas projetadas." },
      { title: "Risco de conversão", description: "Evento de conversão pode não ocorrer dentro do prazo." },
      { title: "Risco de diluição", description: "Novas rodadas podem diluir a participação convertida." },
      { title: "Risco de liquidez", description: "Produto de baixíssima liquidez. Resgate apenas em vencimento ou evento." },
      { title: "Sem FGC e sem garantia de retorno do equity", description: "A parcela equity não possui garantia de rentabilidade." },
    ],
    documents: [
      { name: "Instrumento de emissão conversível" },
      { name: "Contrato social da empresa portfólio" },
      { name: "Memorando de investimento" },
      { name: "Projeções financeiras" },
    ],
    tags: ["Conversível", "Equity kicker", "Alta Convicção", "Sem FGC"],
    annualRate: 0.10,
  },

  "scp-akin-alternativos": {
    id: "scp-akin-alternativos",
    name: "SCP Akin Alternativos",
    category: "Alternativos",
    returnRate: "Participação econômica",
    indexador: "Participação",
    term: "36 meses ou mais",
    termMonths: 36,
    liquidity: "Conforme contrato",
    minInvestment: 30000,
    riskNumber: 5,
    status: "aberta",
    qualifiedOnly: true,
    about: "A SCP Akin Alternativos é uma Sociedade em Conta de Participação estruturada para investidores que buscam participação econômica em projetos e operações alternativas selecionadas pela Akin S.A. Não há rentabilidade fixa contratual.",
    objective: "Viabilizar participação conjunta em projetos alternativos de alta convicção, incluindo operações agro, energia, logística e crédito estruturado fora do mercado de capitais regulado.",
    issuer: "Akin S.A. como sócia ostensiva — SCP regulamentada pelo Código Civil",
    collateral: [
      "Participação nos ativos e receitas do projeto",
      "Contrato de SCP com cláusulas de proteção ao participante",
    ],
    guarantees: [
      "Participação proporcional nos resultados",
      "Direito de veto em decisões relevantes (conforme contrato)",
    ],
    taxation: "Tributação como pessoa jurídica participante. Distribuição de lucros conforme apuração. Consulte seu assessor fiscal.",
    timeline: [
      { label: "Assinatura do contrato de SCP" },
      { label: "Integralização da participação" },
      { label: "Operação e distribuição de resultados" },
      { label: "Liquidação conforme contrato" },
    ],
    risks: [
      { title: "Risco operacional", description: "Resultados dependem do desempenho do projeto." },
      { title: "Risco de liquidez", description: "Participação sem mercado secundário e resgate apenas conforme contrato." },
      { title: "Risco de perda do capital", description: "Resultados negativos podem impactar o capital investido." },
      { title: "Risco regulatório", description: "Alterações no marco regulatório do setor podem afetar os resultados." },
    ],
    documents: [
      { name: "Contrato de SCP" },
      { name: "Memorando do projeto" },
      { name: "Relatório de viabilidade econômica" },
      { name: "Política de distribuição de resultados" },
    ],
    tags: ["SCP", "Alternativos", "Baixa liquidez", "Produto privado"],
    annualRate: undefined,
  },

  "akin-equity-cvm88": {
    id: "akin-equity-cvm88",
    name: "Akin Equity CVM 88",
    category: "Equity / Crowdinvesting",
    returnRate: "Potencial de valorização",
    indexador: "Equity",
    term: "Longo prazo",
    termMonths: 60,
    liquidity: "Baixa ou inexistente antes de evento de liquidez",
    minInvestment: 5000,
    riskNumber: 5,
    status: "aberta",
    cvm88: true,
    equity: true,
    about: "A oferta Akin Equity CVM 88 é uma oportunidade de participação em empresa ou projeto regulamentada pela Instrução CVM 88 (Crowdfunding de Investimento). Não há rentabilidade fixa. O retorno está condicionado à valorização da empresa, distribuição de dividendos ou evento de liquidez.",
    objective: "Democratizar o acesso a oportunidades de participação em startups, PMEs e projetos de alto potencial, dentro do marco regulatório CVM 88.",
    issuer: "Empresa emissora parceira da Akin S.A. — Oferta regulamentada CVM 88",
    collateral: [
      "Participação acionária ou quotas na empresa emissora",
      "Direitos econômicos conforme estatuto ou contrato social",
    ],
    guarantees: [
      "Direitos de tag along",
      "Direito a informações periódicas",
    ],
    taxation: "Ganho de capital na alienação das participações sujeito à alíquota de 15% a 22,5% conforme o valor do ganho. Dividendos isentos para PF.",
    timeline: [
      { label: "Oferta pública CVM 88" },
      { label: "Captação e integralização" },
      { label: "Operação e crescimento da empresa" },
      { label: "Evento de liquidez (M&A, IPO ou dividendos)" },
    ],
    risks: [
      { title: "Risco de perda total", description: "O investimento pode resultar na perda integral do capital investido." },
      { title: "Risco de iliquidez", description: "Não há garantia de mercado secundário antes de evento de liquidez." },
      { title: "Risco de negócio", description: "A empresa pode não alcançar seu potencial projetado." },
      { title: "Risco de diluição", description: "Novas rodadas de captação podem diluir a participação atual." },
      { title: "Sem FGC e sem retorno garantido", description: "Produto de risco máximo sem qualquer garantia de retorno." },
    ],
    documents: [
      { name: "Documento de oferta CVM 88" },
      { name: "Estatuto social da emissora" },
      { name: "Demonstrações financeiras" },
      { name: "Plano de negócios" },
      { name: "Termo de ciência de risco" },
    ],
    tags: ["CVM 88", "Equity", "Startup/PME", "Sem garantia", "Alta volatilidade"],
    annualRate: undefined,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RISK_COLORS: Record<number, { bg: string; border: string; text: string; label: string }> = {
  1: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", label: "Nível 1 — Muito baixo" },
  2: { bg: "bg-green-500/10", border: "border-green-500/20", text: "text-green-400", label: "Nível 2 — Baixo" },
  3: { bg: "bg-yellow-500/10", border: "border-yellow-500/20", text: "text-yellow-400", label: "Nível 3 — Moderado" },
  4: { bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-400", label: "Nível 4 — Alto" },
  5: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", label: "Nível 5 — Muito alto" },
};

const STATUS_MAP: Record<StatusType, { label: string; color: string }> = {
  aberta: { label: "Captação aberta", color: "text-emerald-400" },
  estruturacao: { label: "Em estruturação", color: "text-yellow-400" },
  breve: { label: "Em breve", color: "text-blue-400" },
  encerrado: { label: "Encerrado", color: "text-white/40" },
};

const fmt = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

const fmtFull = (v: number) =>
  v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

// ─── Simulador ────────────────────────────────────────────────────────────────

function ProductSimulator({ product }: { product: ProductData }) {
  const [amount, setAmount] = useState("");
  const [years, setYears] = useState(1);
  const isEquity = product.equity || product.annualRate === undefined;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    setAmount(raw);
  };

  const inv = parseFloat(amount) || 0;
  const rate = product.annualRate ?? 0;
  const grossFinal = inv > 0 && !isEquity ? inv * Math.pow(1 + rate, years) : 0;
  const grossReturn = grossFinal - inv;
  const irRate = years <= 0.5 ? 0.225 : years <= 1 ? 0.20 : years <= 2 ? 0.175 : 0.15;
  const netReturn = grossReturn * (1 - irRate);
  const netFinal = inv + netReturn;

  const fmtInput = (raw: string) => {
    if (!raw) return "";
    const n = parseInt(raw);
    return (n / 100).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  };

  if (isEquity) {
    return (
      <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4">
        <h3 className="text-white font-semibold text-sm">Tese de retorno</h3>
        <div className="space-y-3">
          {[
            { label: "Conservador", desc: "Operação sem evento de liquidez no prazo. Retorno mínimo contratual, se houver." },
            { label: "Base", desc: "Evento de liquidez parcial (dividendos ou venda secundária) com ganho de 1,5x a 3x." },
            { label: "Otimista", desc: "Evento de liquidez pleno (IPO ou M&A) com ganho de 3x ou mais sobre o investido." },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-white/5 border border-white/8 px-4 py-3">
              <p className="text-white/70 text-xs font-semibold mb-1">{s.label}</p>
              <p className="text-white/40 text-xs leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <p className="text-red-400 text-xs leading-relaxed font-medium">
              Este produto não possui rentabilidade fixa. O capital investido pode ser perdido total ou parcialmente.
            </p>
          </div>
        </div>
        <p className="text-white/20 text-[10px] leading-relaxed">
          Simulação meramente indicativa. Rentabilidade-alvo não representa garantia de retorno.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-4">
      <h3 className="text-white font-semibold text-sm">Simulador</h3>

      {/* Valor */}
      <div className="space-y-1.5">
        <label className="text-white/50 text-xs font-medium">Valor do investimento</label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30 text-sm">R$</span>
          <input type="text" inputMode="numeric" placeholder="Digite o valor"
            value={fmtInput(amount)}
            onChange={handleAmountChange}
            className="w-full h-11 rounded-xl bg-white/5 border border-white/10 pl-9 pr-4 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#00BC6E]/50 focus:ring-1 focus:ring-[#00BC6E]/20 transition-all" />
        </div>
        <p className="text-white/25 text-[11px]">Mínimo: {fmt(product.minInvestment)}</p>
      </div>

      {/* Prazo */}
      <div className="space-y-1.5">
        <label className="text-white/50 text-xs font-medium">Horizonte de tempo</label>
        <div className="flex gap-2">
          {[1, 2, 3].map((y) => (
            <button key={y} onClick={() => setYears(y)}
              className={cn("flex-1 h-10 rounded-xl text-xs font-medium border transition-all",
                years === y
                  ? "bg-[#00BC6E]/15 text-[#00BC6E] border-[#00BC6E]/30"
                  : "bg-white/5 text-white/50 border-white/10 hover:text-white/80")}>
              {y} {y === 1 ? "ano" : "anos"}
            </button>
          ))}
        </div>
      </div>

      {/* Resultado */}
      {inv >= product.minInvestment ? (
        <div className="rounded-xl bg-white/5 border border-white/8 divide-y divide-white/8">
          <div className="px-4 py-4">
            <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Valor estimado bruto</p>
            <p className="text-[#00BC6E] text-2xl font-bold">{fmtFull(grossFinal)}</p>
            <p className="text-white/30 text-xs mt-0.5">em {years} {years === 1 ? "ano" : "anos"}</p>
          </div>
          <div className="grid grid-cols-2 divide-x divide-white/8">
            <div className="px-4 py-3">
              <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Ganho bruto</p>
              <p className="text-white font-semibold">{fmtFull(grossReturn)}</p>
            </div>
            <div className="px-4 py-3">
              <p className="text-white/40 text-[10px] uppercase tracking-wider mb-1">Estimado líquido</p>
              <p className="text-white font-semibold">{fmtFull(netFinal)}</p>
              <p className="text-white/30 text-[10px]">IR {(irRate * 100).toFixed(1)}%</p>
            </div>
          </div>
        </div>
      ) : inv > 0 ? (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 px-4 py-3">
          <p className="text-amber-400 text-xs">Valor mínimo para simulação: {fmt(product.minInvestment)}</p>
        </div>
      ) : null}

      <p className="text-white/20 text-[10px] leading-relaxed">
        Simulação meramente indicativa. Rentabilidade-alvo não representa garantia de retorno. Cálculo baseado na rentabilidade-alvo anual de {product.returnRate}. IR pela tabela regressiva.
      </p>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface ProductDetailProps {
  productId: string;
}

export function ProductDetail({ productId }: ProductDetailProps) {
  const router = useRouter();
  const product = productsData[productId];

  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <div className="h-16 w-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
          <Info className="h-8 w-8 text-white/20" />
        </div>
        <p className="text-white/60 text-center">Produto não encontrado.</p>
        <Button variant="outline" onClick={() => router.push("/investor/invest")}
          className="border-white/20 text-white/70 bg-transparent hover:bg-white/10">
          Ver todos os produtos
        </Button>
      </div>
    );
  }

  const risk = RISK_COLORS[product.riskNumber];
  const statusInfo = STATUS_MAP[product.status];

  return (
    <div className="flex flex-col min-h-screen pb-28">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <button onClick={() => router.back()}
          className="flex items-center gap-1.5 text-white/50 hover:text-white text-sm mb-5 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </button>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-white/40 text-xs">{product.category}</span>
              <span className={cn("text-[10px] font-medium", statusInfo.color)}>
                • {statusInfo.label}
              </span>
            </div>
            <h1 className="text-white font-bold text-xl leading-snug">{product.name}</h1>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          <span className={cn("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold border", risk.bg, risk.border, risk.text)}>
            <Shield className="h-2.5 w-2.5" /> {risk.label}
          </span>
          {product.tags.map((tag) => (
            <span key={tag} className="px-2.5 py-1 rounded-full bg-white/8 text-white/50 text-[10px] border border-white/10">
              {tag}
            </span>
          ))}
          {product.qualifiedOnly && (
            <span className="px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 text-[10px] border border-amber-500/20 flex items-center gap-1">
              <AlertTriangle className="h-2.5 w-2.5" /> Qualificado obrigatório
            </span>
          )}
          {product.cvm88 && (
            <span className="px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-400 text-[10px] border border-purple-500/20">
              CVM 88
            </span>
          )}
        </div>
      </div>

      {/* Grid de resumo */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: <TrendingUp className="h-3.5 w-3.5" />, label: "Rentabilidade-alvo", value: product.returnRate },
            { icon: <Clock className="h-3.5 w-3.5" />, label: "Prazo", value: product.term },
            { icon: <Calendar className="h-3.5 w-3.5" />, label: "Liquidez", value: product.liquidity },
            { icon: <DollarSign className="h-3.5 w-3.5" />, label: "Aplicação mínima", value: fmt(product.minInvestment) },
          ].map((item) => (
            <div key={item.label} className="rounded-xl bg-white/5 border border-white/8 px-4 py-3">
              <div className="flex items-center gap-1.5 text-white/40 text-[10px] uppercase tracking-wider mb-1">
                {item.icon} {item.label}
              </div>
              <p className="text-white font-semibold text-sm">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Sobre */}
        <Section title="Sobre o produto" icon={<Info className="h-4 w-4" />}>
          <p className="text-white/60 text-sm leading-relaxed">{product.about}</p>
        </Section>

        {/* Objetivo */}
        <Section title="Objetivo da operação" icon={<TrendingUp className="h-4 w-4" />}>
          <p className="text-white/60 text-sm leading-relaxed">{product.objective}</p>
          <div className="mt-3 rounded-xl bg-white/5 border border-white/8 px-4 py-3">
            <p className="text-white/30 text-[10px] uppercase tracking-wider mb-0.5">Emissor / Estrutura</p>
            <p className="text-white/70 text-sm">{product.issuer}</p>
          </div>
        </Section>

        {/* Lastro e garantias */}
        <Section title="Lastro e garantias" icon={<Shield className="h-4 w-4" />}>
          <div className="space-y-2">
            <p className="text-white/40 text-[10px] uppercase tracking-wider">Lastro</p>
            {product.collateral.map((c, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#00BC6E] shrink-0 mt-0.5" />
                <p className="text-white/60 text-sm leading-snug">{c}</p>
              </div>
            ))}
          </div>
          {product.guarantees.length > 0 && (
            <div className="space-y-2 mt-4">
              <p className="text-white/40 text-[10px] uppercase tracking-wider">Garantias</p>
              {product.guarantees.map((g, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <p className="text-white/60 text-sm leading-snug">{g}</p>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Fluxo de pagamento */}
        <Section title="Fluxo de pagamento" icon={<Calendar className="h-4 w-4" />}>
          <div className="space-y-0">
            {product.timeline.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex flex-col items-center">
                  <div className="h-7 w-7 rounded-full bg-[#00BC6E]/15 border border-[#00BC6E]/30 flex items-center justify-center text-[#00BC6E] text-xs font-bold shrink-0">
                    {i + 1}
                  </div>
                  {i < product.timeline.length - 1 && (
                    <div className="w-px h-6 bg-white/10 my-0.5" />
                  )}
                </div>
                <p className="text-white/60 text-sm pt-1.5">{step.label}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Tributação */}
        <Section title="Tributação" icon={<Percent className="h-4 w-4" />}>
          <p className="text-white/60 text-sm leading-relaxed">{product.taxation}</p>
        </Section>

        {/* Riscos */}
        <Section title="Riscos do produto" icon={<AlertTriangle className="h-4 w-4" />}>
          <div className="grid grid-cols-1 gap-2">
            {product.risks.map((r, i) => (
              <div key={i} className="rounded-xl bg-white/5 border border-white/8 px-4 py-3">
                <p className="text-white/80 text-xs font-semibold mb-1">{r.title}</p>
                <p className="text-white/40 text-xs leading-relaxed">{r.description}</p>
              </div>
            ))}
          </div>
        </Section>

        {/* Documentos */}
        <Section title="Documentos" icon={<FileText className="h-4 w-4" />}>
          <div className="space-y-1">
            {product.documents.map((doc, i) => (
              <div key={i} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-white/30" />
                  <span className="text-white/60 text-sm">{doc.name}</span>
                </div>
                <ChevronRight className="h-4 w-4 text-white/20" />
              </div>
            ))}
          </div>
        </Section>

        {/* Simulador */}
        <ProductSimulator product={product} />

        {/* Compliance */}
        <div className="rounded-xl bg-white/3 border border-white/8 px-4 py-4">
          <p className="text-white/25 text-[10px] leading-relaxed">
            Rentabilidade passada, projetada ou estimada não representa garantia de retorno futuro. Produtos sujeitos a risco de crédito, mercado, liquidez, operacional e regulatório. A disponibilidade depende do perfil do investidor, documentação aplicável e regras específicas de cada oferta. Alguns produtos não contam com garantia do FGC.
          </p>
        </div>
      </div>

      {/* Botões fixos mobile */}
      <div className="fixed bottom-16 left-0 right-0 z-40 px-4 py-3 bg-gradient-to-t from-[#01223F] to-transparent md:hidden">
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1 h-11 border-white/20 text-white bg-transparent hover:bg-white/10"
            onClick={() => router.push(`/investor/invest`)}>
            Simular
          </Button>
          <Button className="flex-1 h-11 bg-[#00BC6E] hover:bg-[#00a85f] text-white font-semibold"
            onClick={() => {}}>
            Reservar investimento
          </Button>
        </div>
      </div>

      {/* Botões desktop */}
      <div className="hidden md:flex gap-3 px-4 mt-4 pb-8">
        <Button variant="outline" className="h-11 border-white/20 text-white bg-transparent hover:bg-white/10"
          onClick={() => router.push(`/investor/invest`)}>
          Simular outro produto
        </Button>
        <Button className="h-11 bg-[#00BC6E] hover:bg-[#00a85f] text-white font-semibold px-8"
          onClick={() => {}}>
          Reservar investimento
        </Button>
      </div>
    </div>
  );
}

// ─── Section helper ───────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-3">
      <div className="flex items-center gap-2 text-white/70 text-sm font-semibold">
        <span className="text-[#00BC6E]">{icon}</span>
        {title}
      </div>
      {children}
    </div>
  );
}
