import { getCommissionRate } from "./commission-utils"

/**
 * Sistema de cálculo de comissões baseado em rentabilidades do banco
 * 
 * REGRAS DE COMISSIONAMENTO:
 * - Pagamento sempre no quinto dia útil do mês
 * - Separação em períodos de dia 20 (corte mensal)
 * - ASSESSORES/DISTRIBUIDORES e ESCRITÓRIOS: Sem D+60, cálculo proporcional aos dias entre entrada e dia 20
 * - INVESTIDORES: D+60 da entrada do valor do investimento para início do período de comissionamento
 *   IMPORTANTE: Investimentos de investidores só entram no corte atual se já passaram 60 dias desde a data do investimento
 *   Se não passaram 60 dias, a comissão no corte atual é zero (mas pode entrar em cortes futuros)
 * - Valor proporcional da comissão calculado para 30 dias corridos (apenas investidores)
 * - Pagamento no 5º dia útil do mês seguinte ao término do período
 * 
 * IMPORTANTE: Todas as taxas de comissão vêm do banco via user_type_id -> rentability_id
 * NÃO há valores hardcoded - tudo é buscado dinamicamente
 */

export interface CommissionRates {
  investidor: number
  escritorio: number
  assessor: number
  distribuidor: number
}

export type LiquidityOption = "mensal" | "semestral" | "anual" | "bienal" | "trienal";

interface InvestorRateRule {
  months: number;
  liquidity: LiquidityOption;
  rate: number;
}

export const INVESTOR_RATE_RULES: InvestorRateRule[] = [
  { months: 3, liquidity: "mensal", rate: 0.018 },
  { months: 6, liquidity: "mensal", rate: 0.019 },
  { months: 6, liquidity: "semestral", rate: 0.02 },
  { months: 12, liquidity: "mensal", rate: 0.021 },
  { months: 12, liquidity: "semestral", rate: 0.022 },
  { months: 12, liquidity: "anual", rate: 0.025 },
  { months: 24, liquidity: "mensal", rate: 0.023 },
  { months: 24, liquidity: "semestral", rate: 0.025 },
  { months: 24, liquidity: "anual", rate: 0.027 },
  { months: 24, liquidity: "bienal", rate: 0.03 },
  { months: 36, liquidity: "mensal", rate: 0.024 },
  { months: 36, liquidity: "semestral", rate: 0.026 },
  { months: 36, liquidity: "bienal", rate: 0.032 },
  { months: 36, liquidity: "trienal", rate: 0.035 },
];

export const INVESTOR_RATE_MATRIX: Record<number, Partial<Record<LiquidityOption, number>>> =
  INVESTOR_RATE_RULES.reduce((acc, { months, liquidity, rate }) => {
    if (!acc[months]) {
      acc[months] = {};
    }
    acc[months]![liquidity] = rate;
    return acc;
  }, {} as Record<number, Partial<Record<LiquidityOption, number>>>);

export function getAvailableLiquidityOptions(commitmentPeriod: number): LiquidityOption[] {
  const matrix = INVESTOR_RATE_MATRIX[commitmentPeriod];
  if (!matrix) {
    return [];
  }
  return Object.keys(matrix) as LiquidityOption[];
}

export function getInvestorMonthlyRate(commitmentPeriod: number, liquidity: LiquidityOption): number {
  const matrix = INVESTOR_RATE_MATRIX[commitmentPeriod];
  if (!matrix) {
    return 0;
  }
  const rate = matrix[liquidity];
  if (typeof rate === "number") {
    return rate;
  }
  // Fallback: tentar usar liquidez mensal se existir
  if (matrix.mensal) {
    return matrix.mensal;
  }
  return 0;
}

export function getLiquidityCycleMonths(liquidity: LiquidityOption): number {
  switch (liquidity) {
    case "mensal":
      return 1;
    // Para rentabilidades com pagamento não mensal,
    // usamos múltiplos de meses como ciclos de recebimento
    case "semestral":
      return 6;
    case "anual":
      return 12;
    case "bienal":
      return 24;
    case "trienal":
      return 36;
    default:
      return 1;
  }
}

export function getRedemptionWindow(commitmentPeriod: number): { months: number; days: number; label: string } {
  const mapping: Record<number, { days: number; label: string }> = {
    3: { days: 90, label: "3 meses" },
    6: { days: 180, label: "6 meses" },
    12: { days: 360, label: "12 meses" },
    24: { days: 720, label: "24 meses" },
    36: { days: 1080, label: "36 meses" },
  };

  const normalized =
    mapping[commitmentPeriod] ??
    (commitmentPeriod < 3
      ? mapping[3]
      : commitmentPeriod < 6
        ? mapping[6]
        : commitmentPeriod < 12
          ? mapping[12]
          : commitmentPeriod < 24
            ? mapping[24]
            : mapping[36]);

  return {
    months: normalized.days / 30,
    days: normalized.days,
    label: normalized.label,
  };
}

/**
 * DEPRECATED: Não usar mais COMMISSION_RATES hardcoded
 * Use getCommissionRate() de lib/commission-utils.ts para buscar do banco
 * 
 * Mantido apenas para compatibilidade durante migração
 * TODO: Remover após migração completa
 */
export const COMMISSION_RATES: CommissionRates = {
  investidor: 0.02,    // DEPRECATED - usar getCommissionRate()
  escritorio: 0.01,  // DEPRECATED - usar getCommissionRate()
  assessor: 0.03,    // DEPRECATED - usar getCommissionRate()
  distribuidor: 0.01, // DEPRECATED - usar getCommissionRate()
};

export interface CommissionCalculation {
  monthlyCommission: number;
  totalCommission: number;
  roleRate: number;
  roleName: string;
  months: number;
  amount: number;
}

export interface CommissionBreakdown {
  investidorCommission: number;
  escritorioCommission: number;
  assessorCommission: number;
  totalCommission: number;
}

/**
 * DEPRECATED: Use calculateNewCommissionLogic() que busca taxas do banco
 * 
 * Calcula comissão baseada no role do usuário
 * Esta função ainda usa COMMISSION_RATES hardcoded - não usar mais
 */
export function calculateRoleCommission(
  amount: number,
  userRole: keyof CommissionRates,
  months: number = 12
): CommissionCalculation {
  console.warn("[DEPRECATED] calculateRoleCommission usa valores hardcoded. Use calculateNewCommissionLogic() com user_type_id")
  const roleRate = COMMISSION_RATES[userRole];
  const roleName = getRoleDisplayName(userRole);
  
  const monthlyCommission = amount * roleRate;
  const totalCommission = monthlyCommission * months;

  return {
    monthlyCommission,
    totalCommission,
    roleRate,
    roleName,
    months,
    amount,
  };
}

/**
 * Calcula divisão de comissões entre todos os roles
 */
/**
 * DEPRECATED: Esta função usa valores hardcoded
 * Para calcular comissões, use calculateNewCommissionLogic() que busca do banco
 * 
 * Calcula divisão de comissões entre todos os roles
 */
export function calculateCommissionBreakdown(
  amount: number,
  months: number = 12
): CommissionBreakdown {
  console.warn("[DEPRECATED] calculateCommissionBreakdown usa valores hardcoded. Use calculateNewCommissionLogic() com user_type_id")
  const investidorCommission = amount * COMMISSION_RATES.investidor * months;
  const escritorioCommission = amount * COMMISSION_RATES.escritorio * months;
  const assessorCommission = amount * COMMISSION_RATES.assessor * months;
  
  const totalCommission = investidorCommission + escritorioCommission + assessorCommission;

  return {
    investidorCommission,
    escritorioCommission,
    assessorCommission,
    totalCommission,
  };
}

/**
 * Retorna o nome de exibição do role
 */
export function getRoleDisplayName(role: keyof CommissionRates): string {
  const roleNames = {
    investidor: "Investidor",
    escritorio: "Escritório",
    assessor: "Assessor",
    distribuidor: "Distribuidor",
  };
  
  return roleNames[role];
}

/**
 * Retorna a taxa de comissão formatada
 */
export function getFormattedRate(role: keyof CommissionRates): string {
  return `${(COMMISSION_RATES[role] * 100).toFixed(0)}%`;
}

/**
 * Calcula comissão com bônus de performance
 */
export function calculateCommissionWithBonus(
  amount: number,
  userRole: keyof CommissionRates,
  months: number = 12
): CommissionCalculation & { performanceBonus: number; bonusDescription: string } {
  const baseCalculation = calculateRoleCommission(amount, userRole, months);
  
  let performanceBonus = 0;
  let bonusDescription = "Nenhum bônus";

  // Bônus de performance baseado no valor captado
  if (amount >= 1000000) {
    performanceBonus = amount * 0.03 * months; // +3% adicional
    bonusDescription = "Meta 2 atingida: +3% adicional";
  } else if (amount >= 500000) {
    performanceBonus = amount * 0.01 * months; // +1% adicional
    bonusDescription = "Meta 1 atingida: +1% adicional";
  }

  return {
    ...baseCalculation,
    performanceBonus,
    bonusDescription,
  };
}

/**
 * Valida se o role é válido
 */
export function isValidRole(role: string): role is keyof CommissionRates {
  return role in COMMISSION_RATES;
}

/**
 * Retorna todos os roles disponíveis
 */
export function getAvailableRoles(): Array<{ key: keyof CommissionRates; name: string; rate: string }> {
  return Object.entries(COMMISSION_RATES).map(([key, rate]) => ({
    key: key as keyof CommissionRates,
    name: getRoleDisplayName(key as keyof CommissionRates),
    rate: `${(rate * 100).toFixed(0)}%`,
  }));
}

/**
 * UTILITÁRIOS DE DATA PARA NOVA LÓGICA DE COMISSÕES
 */

/**
 * Verifica se uma data é dia útil (segunda a sexta, exceto feriados nacionais)
 * Por enquanto, considera apenas segunda a sexta como dias úteis
 */
export function isBusinessDay(date: Date): boolean {
  // IMPORTANTE: Usar getUTCDay() para garantir consistência com timezone UTC
  const day = date.getUTCDay(); // 0 = domingo, 6 = sábado
  return day > 0 && day < 6; // Segunda (1) a Sexta (5)
}

/**
 * Encontra o quinto dia útil do mês
 * IMPORTANTE: Sempre retorna o 5º dia útil, nunca antes
 */
export function getFifthBusinessDayOfMonth(year: number, month: number): Date {
  // Usar Date.UTC para garantir consistência independente do timezone
  const firstDay = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  let currentDate = new Date(firstDay);
  let businessDaysCount = 0;
  
  // Garantir que não ultrapassamos o último dia do mês (31)
  const lastDayOfMonth = new Date(Date.UTC(year, month + 1, 0, 0, 0, 0, 0));
  
  while (businessDaysCount < 5 && currentDate <= lastDayOfMonth) {
    if (isBusinessDay(currentDate)) {
      businessDaysCount++;
      if (businessDaysCount === 5) {
        // Retornar data normalizada no fuso local para evitar regressão de dia
        return new Date(
          currentDate.getUTCFullYear(),
          currentDate.getUTCMonth(),
          currentDate.getUTCDate(),
          0, 0, 0, 0
        );
      }
    }
    // Avançar para o próximo dia
    currentDate = new Date(Date.UTC(
      currentDate.getUTCFullYear(),
      currentDate.getUTCMonth(),
      currentDate.getUTCDate() + 1,
      0, 0, 0, 0
    ));
  }
  
  // Se não encontrou 5 dias úteis (não deveria acontecer), retornar o último dia encontrado
  // Mas isso nunca deveria acontecer em um mês normal
  return new Date(
    currentDate.getUTCFullYear(),
    currentDate.getUTCMonth(),
    currentDate.getUTCDate(),
    0, 0, 0, 0
  );
}

/**
 * Calcula a data de corte (dia 20) de um mês/ano
 */
export function getCutoffDate(year: number, month: number): Date {
  return new Date(year, month, 20);
}

/**
 * Calcula a data de corte atual (dia 20 do mês atual ou anterior, dependendo do dia de hoje)
 * Se hoje é dia 20 ou depois, o corte atual é dia 20 deste mês
 * Se hoje é antes do dia 20, o corte atual é dia 20 do mês anterior
 */
export function getCurrentCutoffDate(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const currentDay = today.getDate();
  
  // Se hoje é dia 20 ou depois, o corte atual é dia 20 deste mês
  if (currentDay >= 20) {
    return getCutoffDate(currentYear, currentMonth);
  } else {
    // Se hoje é antes do dia 20, o corte atual é dia 20 do mês anterior
    let prevMonth = currentMonth - 1;
    let prevYear = currentYear;
    if (prevMonth < 0) {
      prevMonth = 11;
      prevYear -= 1;
    }
    return getCutoffDate(prevYear, prevMonth);
  }
}

/**
 * Determina o período de corte baseado na payment_date
 * Retorna o mês e ano do corte (dia 20) em que o investimento entra
 * 
 * REGRA DO CORTE NO DIA 20:
 * - O corte no dia 20 considera investimentos que já existiam antes do dia 20
 * - E que continuaram existindo até o dia 20
 * 
 * Lógica:
 * - Se o investimento foi feito ANTES do dia 20: corte é dia 20 do mesmo mês
 *   (Exemplo: entrada em 10/10 => já existia antes de 20/10 => corte em 20/10)
 * - Se foi no dia 20 ou DEPOIS: corte é dia 20 do próximo mês
 *   (Exemplo: entrada em 21/10 => não existia antes de 20/10 => corte em 20/11)
 */
export function getInvestmentCutoffPeriod(paymentDate: Date): { year: number; month: number; cutoffDate: Date } {
  // Usar métodos UTC para evitar problemas de timezone
  let cutoffMonth = paymentDate.getUTCMonth();
  let cutoffYear = paymentDate.getUTCFullYear();
  
  // Se o pagamento foi no dia 20 ou depois, o corte é do próximo mês
  // Porque o investimento não existia antes do dia 20, então não entra no corte do mês atual
  if (paymentDate.getUTCDate() >= 20) {
    cutoffMonth += 1;
    if (cutoffMonth > 11) {
      cutoffMonth = 0;
      cutoffYear += 1;
    }
  }
  // Se foi antes do dia 20, o corte é dia 20 do mesmo mês
  // Porque o investimento já existia antes do dia 20 e continuou existindo até o dia 20
  // Exemplo: entrada em 10/10 => já existia antes de 20/10 => corte em 20/10
  
  const cutoffDate = getCutoffDate(cutoffYear, cutoffMonth);
  return { year: cutoffYear, month: cutoffMonth, cutoffDate };
}

/**
 * Calcula o período de comissionamento baseado no corte
 * O período considera D+60 da entrada do valor, mas é representado pelos meses
 * O período vai do corte até o próximo corte (dia 20 ao próximo dia 20)
 * Exemplo: Corte 20/01 -> Período [20/01, 20/02]
 * O D+60 já está considerado no fato de que o período começa 60 dias após a entrada
 */
export function getCommissionPeriod(cutoffDate: Date): { startDate: Date; endDate: Date } {
  const startDate = new Date(cutoffDate);
  
  // Fim do período é o próximo corte (próximo dia 20)
  const endDate = new Date(cutoffDate);
  endDate.setMonth(endDate.getMonth() + 1);
  
  return { startDate, endDate };
}

/**
 * Verifica se um investimento de investidor pode entrar no corte atual
 * REGRA: Investidores precisam ter passado D+60 (60 dias) desde a data do investimento
 * para entrar no corte atual
 * 
 * @param paymentDate Data do investimento (payment_date)
 * @param cutoffDate Data do corte atual (dia 20)
 * @returns true se o investimento pode entrar no corte atual (já passaram 60 dias)
 */
export function canInvestorEnterCurrentCutoff(paymentDate: Date, cutoffDate: Date): boolean {
  // Calcular data de início do período de comissionamento (D+60)
  const commissionStartDate = new Date(paymentDate);
  commissionStartDate.setUTCDate(commissionStartDate.getUTCDate() + 60);
  commissionStartDate.setUTCHours(0, 0, 0, 0);
  
  // Normalizar cutoffDate para UTC meia-noite
  const cutoffDateUTC = new Date(Date.UTC(
    cutoffDate.getUTCFullYear(),
    cutoffDate.getUTCMonth(),
    cutoffDate.getUTCDate(),
    0, 0, 0, 0
  ));
  
  // O investimento só pode entrar no corte atual se a data de início do comissionamento
  // (D+60) já passou ou é igual à data do corte
  return commissionStartDate <= cutoffDateUTC;
}

/**
 * Calcula a data de pagamento baseado no período de comissionamento
 * O pagamento é sempre no 5º dia útil do mês seguinte ao término do período de comissionamento
 * Exemplo: Período [20/01, 20/02] termina em 20/02, pagamento no 5º dia útil de março
 */
export function getPaymentDate(commissionPeriodEnd: Date): Date {
  // Pagamento no 5º dia útil do mês seguinte ao término do período
  const year = commissionPeriodEnd.getFullYear();
  const month = commissionPeriodEnd.getMonth() + 1; // Mês seguinte ao término do período
  
  // Ajustar para próximo ano se necessário
  if (month > 11) {
    return getFifthBusinessDayOfMonth(year + 1, 0);
  }
  
  return getFifthBusinessDayOfMonth(year, month);
}

/**
 * Calcula comissão proporcional para 30 dias corridos
 */
export function calculateProportionalCommission(
  amount: number,
  rate: number,
  daysInPeriod: number = 30
): number {
  // Comissão mensal completa
  const monthlyCommission = amount * rate;
  // Proporcional para 30 dias
  return (monthlyCommission / 30) * daysInPeriod;
}

/**
 * Interface para comissão calculada com nova lógica
 */
export interface NewCommissionCalculation {
  investmentId: string;
  investorId: string;
  investorName: string;
  amount: number;
  paymentDate: Date; // payment_date do investimento
  cutoffPeriod: {
    year: number;
    month: number;
    cutoffDate: Date;
  };
  commissionPeriod: {
    startDate: Date;
    endDate: Date;
  };
  paymentDueDate: Date[]; // Array com os 5º dias úteis de cada mês até o término do investimento
  advisorCommission: number;
  officeCommission: number;
  investorCommission: number;
  advisorRate?: number; // Taxa real do assessor (em decimal, ex: 0.03 para 3%)
  officeRate?: number; // Taxa real do escritório (em decimal, ex: 0.01 para 1%)
  investorRate?: number; // Taxa real do investidor (em decimal)
  advisorId?: string;
  advisorName?: string;
  officeId?: string;
  officeName?: string;
  periodLabel: string; // Ex: "Novembro + Dezembro"
  description: string; // Descrição detalhada da comissão
  monthlyBreakdown: Array<{
    month: string;
    monthNumber: number;
    year: number;
    advisorCommission: number;
    officeCommission: number;
    investorCommission: number;
  }>; // Detalhamento mensal dos rendimentos
}

/**
 * Calcula comissões seguindo a nova lógica:
 * - Cortes no dia 20
 * - ASSESSORES/DISTRIBUIDORES e ESCRITÓRIOS: Sem D+60, cálculo proporcional aos dias entre entrada e dia 20
 * - INVESTIDORES: D+60 para início do período de comissionamento + 30 dias corridos
 */
export async function calculateNewCommissionLogic(
  investment: {
    id: string;
    user_id: string;
    amount: number;
    payment_date: Date | string;
    commitment_period?: number; // Período de compromisso em meses (padrão: 12)
    liquidity?: LiquidityOption | string; // Liquidez da rentabilidade (mensal, semestral, anual, bienal, trienal)
    investorName?: string;
    advisorId?: string;
    advisorName?: string;
    advisorRole?: string;
    advisorUserTypeId?: number | null; // user_type_id do assessor
    officeId?: string;
    officeName?: string;
    officeUserTypeId?: number | null; // user_type_id do escritório
    investorUserTypeId?: number | null; // user_type_id do investidor
    isForAdvisor?: boolean; // Flag para identificar se é cálculo para assessor
  }
): Promise<NewCommissionCalculation> {
  // Converter payment_date para Date, tratando diferentes formatos
  // IMPORTANTE: Usar UTC para evitar problemas de timezone
  let paymentDate: Date;
  if (typeof investment.payment_date === 'string') {
    // Extrair apenas a parte da data (YYYY-MM-DD) para evitar problemas de timezone
    const dateOnly = investment.payment_date.split('T')[0];
    const [year, month, day] = dateOnly.split('-').map(Number);
    
    // Verificar se a data é válida
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      console.error('Data de pagamento inválida:', investment.payment_date);
      paymentDate = new Date(); // Fallback para data atual
    } else {
      // Criar data usando UTC para evitar problemas de timezone
      paymentDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    }
  } else if (investment.payment_date instanceof Date) {
    paymentDate = investment.payment_date;
    // Normalizar para UTC meia-noite
    paymentDate = new Date(Date.UTC(
      paymentDate.getUTCFullYear(),
      paymentDate.getUTCMonth(),
      paymentDate.getUTCDate(),
      0, 0, 0, 0
    ));
  } else {
    // Se não for string nem Date, criar nova data
    paymentDate = new Date(investment.payment_date);
    // Normalizar para UTC meia-noite
    if (!isNaN(paymentDate.getTime())) {
      paymentDate = new Date(Date.UTC(
        paymentDate.getUTCFullYear(),
        paymentDate.getUTCMonth(),
        paymentDate.getUTCDate(),
        0, 0, 0, 0
      ));
    }
  }
  
  // Garantir que a data seja válida
  if (isNaN(paymentDate.getTime())) {
    console.error('Data de pagamento inválida:', investment.payment_date);
    paymentDate = new Date(); // Fallback para data atual
    paymentDate = new Date(Date.UTC(
      paymentDate.getUTCFullYear(),
      paymentDate.getUTCMonth(),
      paymentDate.getUTCDate(),
      0, 0, 0, 0
    ));
  }
  
  const monthNames = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];
  
  // Período de compromisso (padrão: 12 meses)
  const commitmentPeriod = investment.commitment_period || 12;

  // Liquidez da rentabilidade (frequência de recebimento do investidor)
  let liquidityOption: LiquidityOption = "mensal";
  if (investment.liquidity) {
    const raw = String(investment.liquidity).toLowerCase();
    if (raw.includes("semestral")) liquidityOption = "semestral";
    else if (raw.includes("anual")) liquidityOption = "anual";
    else if (raw.includes("bienal")) liquidityOption = "bienal";
    else if (raw.includes("trienal")) liquidityOption = "trienal";
    else liquidityOption = "mensal";
  }
  const liquidityCycleMonths = getLiquidityCycleMonths(liquidityOption);
  
  // Buscar taxas de comissão do banco via user_type_id -> rentability_id
  // Se não tiver user_type_id fornecido, tentar buscar do perfil
  const { createClient } = await import("@/lib/supabase/client")
  const supabase = createClient()
  
  // Buscar user_type_id dos perfis se não foram fornecidos
  let advisorUserTypeId = investment.advisorUserTypeId
  let officeUserTypeId = investment.officeUserTypeId
  let investorUserTypeId = investment.investorUserTypeId
  
  if (!advisorUserTypeId && investment.advisorId) {
    const { data: advisorProfile } = await supabase
      .from("profiles")
      .select("user_type_id")
      .eq("id", investment.advisorId)
      .single()
    advisorUserTypeId = advisorProfile?.user_type_id || null
  }
  
  if (!officeUserTypeId && investment.officeId) {
    const { data: officeProfile } = await supabase
      .from("profiles")
      .select("user_type_id")
      .eq("id", investment.officeId)
      .single()
    officeUserTypeId = officeProfile?.user_type_id || null
  }
  
  if (!investorUserTypeId && investment.user_id) {
    const { data: investorProfile } = await supabase
      .from("profiles")
      .select("user_type_id")
      .eq("id", investment.user_id)
      .single()
    investorUserTypeId = investorProfile?.user_type_id || null
  }
  
  // Normalizar liquidez do investimento
  const normalizedLiquidity = investment.liquidity 
    ? investment.liquidity.toLowerCase() === "mensal" ? "Mensal"
      : investment.liquidity.toLowerCase() === "semestral" || investment.liquidity.toLowerCase() === "semiannual" ? "Semestral"
      : investment.liquidity.toLowerCase() === "anual" || investment.liquidity.toLowerCase() === "annual" ? "Anual"
      : investment.liquidity.toLowerCase() === "bienal" || investment.liquidity.toLowerCase() === "biennial" ? "Bienal"
      : investment.liquidity.toLowerCase() === "trienal" || investment.liquidity.toLowerCase() === "triennial" ? "Trienal"
      : "Mensal" // Fallback
    : "Mensal" // Fallback
  
  // Buscar taxas de comissão do banco
  // Para assessor e escritório: sempre usar liquidez mensal (comissões são sempre mensais)
  // Para investidor: usar a liquidez real do investimento para calcular a rentabilidade correta
  const [advisorRate, officeRate, investorRate] = await Promise.all([
    getCommissionRate(advisorUserTypeId, commitmentPeriod, "Mensal"),
    getCommissionRate(officeUserTypeId, commitmentPeriod, "Mensal"),
    getCommissionRate(investorUserTypeId, commitmentPeriod, normalizedLiquidity),
  ])
  
  let cutoffPeriod: { year: number; month: number; cutoffDate: Date };
  let commissionPeriod: { startDate: Date; endDate: Date };
  let paymentDueDate: Date[];
  let advisorCommission: number;
  let officeCommission: number;
  let investorCommission: number;
  let periodLabel: string;
  let description: string;
  let monthlyBreakdown: Array<{
    month: string;
    monthNumber: number;
    year: number;
    advisorCommission: number;
    officeCommission: number;
    investorCommission: number;
  }>;
  
  // Função auxiliar para calcular todas as datas de pagamento (5º dia útil de cada mês)
  const calculatePaymentDueDates = (startCutoffDate: Date, months: number): Date[] => {
    const dates: Date[] = [];
    // IMPORTANTE: Usar métodos UTC para evitar problemas de timezone
    let currentYear = startCutoffDate.getUTCFullYear();
    let currentMonth = startCutoffDate.getUTCMonth();
    
    // Primeira data: 5º dia útil do mês seguinte ao primeiro corte
    for (let i = 0; i < months; i++) {
      const paymentMonth = currentMonth + 1 + i;
      let year = currentYear;
      let month = paymentMonth;
      
      if (month > 11) {
        year += Math.floor(month / 12);
        month = month % 12;
      }
      
      // IMPORTANTE: Calcular o 5º dia útil usando UTC
      const fifthDay = getFifthBusinessDayOfMonth(year, month);
      
      // IMPORTANTE: Normalizar para UTC meia-noite para evitar problemas de timezone
      const fifthDayUTC = new Date(Date.UTC(
        fifthDay.getUTCFullYear(),
        fifthDay.getUTCMonth(),
        fifthDay.getUTCDate(),
        0, 0, 0, 0
      ));
      
      // Verificar se o dia retornado é realmente o 5º dia útil (validação)
      const dayOfMonth = fifthDayUTC.getUTCDate();
      const monthOfYear = fifthDayUTC.getUTCMonth();
      const yearOfDate = fifthDayUTC.getUTCFullYear();
      
      // Recontar os dias úteis do mês para garantir que está correto
      const firstDay = new Date(Date.UTC(yearOfDate, monthOfYear, 1, 0, 0, 0, 0));
      let businessDaysCount = 0;
      let checkDate = new Date(firstDay);
      const lastDay = new Date(Date.UTC(yearOfDate, monthOfYear + 1, 0, 0, 0, 0, 0));
      
      while (checkDate <= lastDay && businessDaysCount < 5) {
        if (isBusinessDay(checkDate)) {
          businessDaysCount++;
          if (businessDaysCount === 5) {
            const correctDay = checkDate.getUTCDate();
            // Se o dia calculado não corresponde ao 5º dia útil, corrigir
            if (correctDay !== dayOfMonth) {
              console.warn(`[COMISSÃO] Corrigindo data de pagamento para mês ${monthOfYear + 1}/${yearOfDate}: dia ${dayOfMonth} -> dia ${correctDay}`);
              dates.push(new Date(Date.UTC(
                checkDate.getUTCFullYear(),
                checkDate.getUTCMonth(),
                checkDate.getUTCDate(),
                0, 0, 0, 0
              )));
            } else {
              dates.push(fifthDayUTC);
            }
            break;
          }
        }
        checkDate = new Date(Date.UTC(
          checkDate.getUTCFullYear(),
          checkDate.getUTCMonth(),
          checkDate.getUTCDate() + 1,
          0, 0, 0, 0
        ));
      }
      
      // Se não encontrou o 5º dia útil (não deveria acontecer), usar a data calculada
      if (businessDaysCount < 5) {
        dates.push(fifthDayUTC);
      }
    }
    
    return dates;
  };
  
    // 1. Determinar período de corte
    cutoffPeriod = getInvestmentCutoffPeriod(paymentDate);
    
    // VERIFICAR SE É PARA ASSESSOR/DISTRIBUIDOR
    const isForAdvisor = investment.isForAdvisor === true;
    
    if (isForAdvisor) {
    // REGRA PARA ASSESSORES/DISTRIBUIDORES:
    // - Sem D+60
    // - Sempre paga comissão (se houver dias até o corte), usando pró-rata
    // - Para o primeiro período, o corte considerado é SEMPRE o primeiro corte do investimento
    //   (dia 20 calculado por getInvestmentCutoffPeriod), independente da data atual.
    //   Períodos seguintes são tratados via monthlyBreakdown.
    
    // Para o cálculo deste objeto, usamos apenas o corte inicial do investimento
    const cutoffDate = cutoffPeriod.cutoffDate;
    
      // Ajustar cutoffDate para meia-noite para cálculo correto (usar UTC)
      const cutoffDateMidnight = new Date(Date.UTC(
        cutoffDate.getUTCFullYear(),
        cutoffDate.getUTCMonth(),
        cutoffDate.getUTCDate(),
        0, 0, 0, 0
      ));

      // Dia seguinte ao depósito (D+1)
      const paymentDateNextDay = new Date(Date.UTC(
        paymentDate.getUTCFullYear(),
        paymentDate.getUTCMonth(),
        paymentDate.getUTCDate(),
        0, 0, 0, 0
      ));
      paymentDateNextDay.setUTCDate(paymentDateNextDay.getUTCDate() + 1);

      // Calcular diferença em dias acumulados desde o dia seguinte ao depósito até o corte inicial
      // Exemplo: depósito dia 23/09, conta de 24/09 até 20/10 = 27 dias
      const rawDaysDiff = Math.floor(
        (cutoffDateMidnight.getTime() - paymentDateNextDay.getTime()) /
        (1000 * 60 * 60 * 24)
      ) + 1; // +1 para incluir o dia do corte
      const daysDiff = Math.max(0, rawDaysDiff);
      
      // Taxa do assessor vem do banco (rentabilidade do assessor)
      // Se for assessor_externo, buscar seu próprio user_type_id e rentabilidade
      let advisorBaseRate = advisorRate
      if (investment.advisorRole === "assessor_externo" && investment.advisorUserTypeId) {
        // Buscar rentabilidade específica do assessor externo
        advisorBaseRate = await getCommissionRate(investment.advisorUserTypeId, commitmentPeriod, "Mensal")
      }
      // Armazenar a taxa real usada para o assessor
      const finalAdvisorRate = advisorBaseRate
      
      // Taxa diária do assessor e escritório (baseadas nas rentabilidades do banco)
      const dailyRateAdvisor = advisorBaseRate / 30;
      const dailyRateOffice = officeRate / 30;
      
    // Comissão proporcional: taxa diária * dias acumulados
      const proportionalRateAdvisor = dailyRateAdvisor * daysDiff;
      const proportionalRateOffice = dailyRateOffice * daysDiff;
      
    // Calcular comissões de assessor e escritório (proporcionais)
      advisorCommission = investment.amount * proportionalRateAdvisor;
      officeCommission = investment.amount * proportionalRateOffice;
    
    // INVESTIDORES: Com D+60 + 30 dias corridos
    // IMPORTANTE: Verificar se o investimento pode entrar no corte atual (D+60)
    const commissionStartDate = new Date(paymentDate);
    commissionStartDate.setUTCDate(commissionStartDate.getUTCDate() + 60);
    commissionStartDate.setUTCHours(0, 0, 0, 0);
    
    // Verificar se o investimento pode entrar no corte atual
    const canEnterCutoff = canInvestorEnterCurrentCutoff(paymentDate, cutoffDate);
    
    if (canEnterCutoff) {
      // Se pode entrar no corte atual, calcular comissão proporcional
      // Calcular quantos dias do período de comissionamento já passaram desde D+60 até o corte atual
      const cutoffDateUTC = new Date(Date.UTC(
        cutoffDate.getUTCFullYear(),
        cutoffDate.getUTCMonth(),
        cutoffDate.getUTCDate(),
        0, 0, 0, 0
      ));
      
      // Calcular dias desde D+60 até o corte atual (máximo 30 dias para o primeiro período)
      const daysSinceCommissionStart = Math.max(0, Math.floor((cutoffDateUTC.getTime() - commissionStartDate.getTime()) / (1000 * 60 * 60 * 24)));
      const daysInPeriod = Math.min(30, daysSinceCommissionStart + 1); // +1 para incluir o dia do corte
      
      investorCommission = calculateProportionalCommission(investment.amount, investorRate, daysInPeriod);
    } else {
      // Se não pode entrar no corte atual (ainda não passaram 60 dias), comissão é zero
      investorCommission = 0;
    }
    
    // Calcular todas as datas de pagamento (uma por mês até o término do investimento)
    // Usar o corte inicial para calcular as datas de pagamento, não o corte atual
    paymentDueDate = calculatePaymentDueDates(cutoffPeriod.cutoffDate, commitmentPeriod);
    
    // Período de comissionamento: do dia da entrada até o corte atual (para cálculo)
      commissionPeriod = {
        startDate: new Date(paymentDate),
        endDate: new Date(cutoffDate),
      };
      
      // Calcular todas as datas de pagamento primeiro (para usar como base)
      paymentDueDate = calculatePaymentDueDates(cutoffPeriod.cutoffDate, commitmentPeriod);
      
    // Calcular comissão mensal completa para cada mês futuro
    // Comissão mensal = valor * taxa mensal (assessorBaseRate para assessor, 1% para escritório, 2% para investidor)
    const monthlyAdvisorCommission = investment.amount * advisorBaseRate;
    const monthlyOfficeCommission = investment.amount * officeRate;
    const monthlyInvestorCommission = investment.amount * investorRate;
      
      // Construir monthlyBreakdown alinhado com as DATAS DE PAGAMENTO
      // 1. Primeiro mês: comissão proporcional aos dias acumulados até o corte atual,
      //    pago no 5º dia útil do mês seguinte ao corte
      // 2. Meses futuros: comissão mensal completa (30 dias = 3% do valor),
      //    sempre mostrando o mês em que a comissão é paga
      monthlyBreakdown = [];
      
      // Adicionar período atual (proporcional) - primeiro mês
      const firstPaymentDate = paymentDueDate[0];
      const monthName = monthNames[firstPaymentDate.getMonth()];
      monthlyBreakdown.push({
        month: monthName,
        monthNumber: firstPaymentDate.getMonth() + 1,
        year: firstPaymentDate.getFullYear(),
        advisorCommission, // Comissão proporcional calculada acima
        officeCommission, // Comissão proporcional calculada acima
        investorCommission: 0, // será ajustado pela lógica de liquidez abaixo
      });
      
      // Adicionar períodos futuros (comissão mensal completa)
      // Cada data de pagamento corresponde a um mês no breakdown
      // Começar do segundo pagamento (índice 1) porque o primeiro já foi adicionado
      for (let i = 1; i < paymentDueDate.length; i++) {
        const paymentDateMonth = paymentDueDate[i];
        const futureMonthName = monthNames[paymentDateMonth.getMonth()];
        
        monthlyBreakdown.push({
          month: futureMonthName,
          monthNumber: paymentDateMonth.getMonth() + 1,
          year: paymentDateMonth.getFullYear(),
          advisorCommission: monthlyAdvisorCommission, // Comissão mensal completa (3%)
          officeCommission: monthlyOfficeCommission, // Comissão mensal completa (1%)
          investorCommission: 0, // será ajustado pela lógica de liquidez abaixo
        });
      }
      
      // Ajustar o fluxo do INVESTIDOR para respeitar D+60 e liquidez
      // - D+60: já considerado em investorCommission (primeiro período, pró-rata)
      // - Liquidez: mensal/semestral/anual/bienal/trienal => paga apenas no fim do ciclo, somando o que acumulou
      if (paymentDueDate.length > 0) {
        const investorPerMonth = new Array<number>(paymentDueDate.length).fill(0);
        let cycleAcc = 0;
        
        for (let i = 0; i < paymentDueDate.length; i++) {
          if (i === 0) {
            // Primeiro período: usar o valor pró-rata calculado com D+60
            cycleAcc += investorCommission;
          } else {
            // Períodos seguintes: acumular mês cheio
            cycleAcc += monthlyInvestorCommission;
          }
          
          // Fim de ciclo de liquidez: pagar tudo que acumulou
          if ((i + 1) % liquidityCycleMonths === 0) {
            investorPerMonth[i] = cycleAcc;
            cycleAcc = 0;
          }
        }
        
        // Se sobrou algo acumulado (ex.: compromisso não fecha ciclo exato), paga no último mês
        if (cycleAcc > 0) {
          investorPerMonth[investorPerMonth.length - 1] += cycleAcc;
        }
        
        // Aplicar no breakdown
        monthlyBreakdown = monthlyBreakdown.map((m, idx) => ({
          ...m,
          investorCommission: investorPerMonth[idx] || 0,
        }));
      }
      
      periodLabel = monthName;
      
    // Descrição simplificada focada apenas na comissão do assessor
    const roleName = investment.advisorName || 'Assessor';
    const roleRate = advisorBaseRate;
    
    description = `Comissão de ${roleName} calculada sobre investimento de ${investment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. ` +
      `Taxa de comissão: ${(roleRate * 100).toFixed(0)}% ao mês. ` +
      `A comissão é calculada proporcionalmente aos dias desde a entrada do investimento até o próximo corte (dia 20). ` +
      `A partir do segundo mês, a comissão será fixa de ${(roleRate * 100).toFixed(0)}% ao mês. ` +
      `Pagamento mensal no 5º dia útil de cada mês durante ${commitmentPeriod} meses.`;
    } else {
    // REGRA PARA ESCRITÓRIO: Sem D+60, cálculo proporcional aos dias acumulados até o corte atual (igual assessores)
    
    // Calcular a data de corte atual (dia 20 do mês atual ou anterior)
    const currentCutoffDate = getCurrentCutoffDate();
    currentCutoffDate.setHours(0, 0, 0, 0);
    
    // Usar o corte atual se for mais recente que o corte inicial do investimento
    // Caso contrário, usar o corte inicial
    const cutoffDate = currentCutoffDate > cutoffPeriod.cutoffDate 
      ? currentCutoffDate 
      : cutoffPeriod.cutoffDate;
    
    // Ajustar cutoffDate para meia-noite para cálculo correto (usar UTC)
    const cutoffDateMidnight = new Date(Date.UTC(cutoffDate.getUTCFullYear(), cutoffDate.getUTCMonth(), cutoffDate.getUTCDate(), 0, 0, 0, 0));
    // IMPORTANTE: Contar a partir do dia seguinte ao depósito
    // Exemplo: depósito dia 13, conta do dia 14 até o dia 20 = 7 dias
    const paymentDateNextDay = new Date(Date.UTC(paymentDate.getUTCFullYear(), paymentDate.getUTCMonth(), paymentDate.getUTCDate(), 0, 0, 0, 0));
    paymentDateNextDay.setUTCDate(paymentDateNextDay.getUTCDate() + 1); // Dia seguinte ao depósito
    
    // Calcular diferença em dias acumulados desde o dia seguinte ao depósito até o corte atual
    // Exemplo: depósito dia 13, conta do dia 14 até 20/10 = 7 dias (14, 15, 16, 17, 18, 19, 20)
      const rawDaysDiff = Math.floor((cutoffDateMidnight.getTime() - paymentDateNextDay.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const daysDiff = Math.max(0, rawDaysDiff);
    
    // Taxa diária (baseadas nas rentabilidades do banco)
    const dailyRateAdvisor = advisorRate / 30;
    const dailyRateOffice = officeRate / 30;
    const dailyRateInvestor = investorRate / 30;
    
    // Comissão proporcional: taxa diária * dias acumulados
    const proportionalRateAdvisor = dailyRateAdvisor * daysDiff;
    const proportionalRateOffice = dailyRateOffice * daysDiff;
    const proportionalRateInvestor = dailyRateInvestor * daysDiff;
    
    // Calcular comissões de assessor e escritório (proporcionais, sem D+60)
    advisorCommission = investment.amount * proportionalRateAdvisor;
    officeCommission = investment.amount * proportionalRateOffice;
    
    // INVESTIDORES: Com D+60 + 30 dias corridos
    // IMPORTANTE: Verificar se o investimento pode entrar no corte atual (D+60)
    const commissionStartDate = new Date(paymentDate);
    commissionStartDate.setUTCDate(commissionStartDate.getUTCDate() + 60);
    commissionStartDate.setUTCHours(0, 0, 0, 0);
    
    // Verificar se o investimento pode entrar no corte atual
    const canEnterCutoff = canInvestorEnterCurrentCutoff(paymentDate, cutoffDate);
    
    if (canEnterCutoff) {
      // Se pode entrar no corte atual, calcular comissão proporcional
      // Calcular quantos dias do período de comissionamento já passaram desde D+60 até o corte atual
      const cutoffDateUTC = new Date(Date.UTC(
        cutoffDate.getUTCFullYear(),
        cutoffDate.getUTCMonth(),
        cutoffDate.getUTCDate(),
        0, 0, 0, 0
      ));
      
      // Calcular dias desde D+60 até o corte atual (máximo 30 dias para o primeiro período)
      const daysSinceCommissionStart = Math.max(0, Math.floor((cutoffDateUTC.getTime() - commissionStartDate.getTime()) / (1000 * 60 * 60 * 24)));
      const daysInPeriod = Math.min(30, daysSinceCommissionStart + 1); // +1 para incluir o dia do corte
      
      investorCommission = calculateProportionalCommission(investment.amount, investorRate, daysInPeriod);
    } else {
      // Se não pode entrar no corte atual (ainda não passaram 60 dias), comissão é zero
      investorCommission = 0;
    }
    
    // Calcular todas as datas de pagamento primeiro (para usar como base)
    paymentDueDate = calculatePaymentDueDates(cutoffPeriod.cutoffDate, commitmentPeriod);
    
    // Calcular comissão mensal completa para cada mês futuro
    // Comissão mensal = valor * taxa mensal (vem do banco via rentabilidade)
    const monthlyAdvisorCommission = investment.amount * advisorRate;
    const monthlyOfficeCommission = investment.amount * officeRate;
    const monthlyInvestorCommission = investment.amount * investorRate;
    
    // Período de comissionamento: do dia da entrada até o corte atual (para cálculo)
    commissionPeriod = {
      startDate: new Date(paymentDate),
      endDate: new Date(cutoffDate),
    };
    
    // Construir monthlyBreakdown alinhado com as DATAS DE PAGAMENTO
    // 1. Primeiro mês: comissão proporcional aos dias acumulados até o corte atual,
    //    pago no 5º dia útil do mês seguinte ao corte
    // 2. Meses futuros: comissão mensal completa (30 dias = taxa mensal),
    //    sempre mostrando o mês em que a comissão é paga
    monthlyBreakdown = [];
    
    // Adicionar período atual (proporcional) - primeiro mês
    const firstPaymentDate = paymentDueDate[0];
    const monthName = monthNames[firstPaymentDate.getMonth()];
    monthlyBreakdown.push({
      month: monthName,
      monthNumber: firstPaymentDate.getMonth() + 1,
      year: firstPaymentDate.getFullYear(),
      advisorCommission, // Comissão proporcional calculada acima
      officeCommission, // Comissão proporcional calculada acima
      investorCommission: 0, // será ajustado pela lógica de liquidez abaixo
    });
    
    // Adicionar períodos futuros (comissão mensal completa)
    // Cada data de pagamento corresponde a um mês no breakdown
    // Começar do segundo pagamento (índice 1) porque o primeiro já foi adicionado
    for (let i = 1; i < paymentDueDate.length; i++) {
      const paymentDateMonth = paymentDueDate[i];
      const futureMonthName = monthNames[paymentDateMonth.getMonth()];
      
      monthlyBreakdown.push({
        month: futureMonthName,
        monthNumber: paymentDateMonth.getMonth() + 1,
        year: paymentDateMonth.getFullYear(),
        advisorCommission: monthlyAdvisorCommission, // Comissão mensal completa (3%)
        officeCommission: monthlyOfficeCommission, // Comissão mensal completa (1%)
        investorCommission: 0, // será ajustado pela lógica de liquidez abaixo
      });
    }
    
    // Ajustar o fluxo do INVESTIDOR para respeitar D+60 e liquidez
    if (paymentDueDate.length > 0) {
      const investorPerMonth = new Array<number>(paymentDueDate.length).fill(0);
      let cycleAcc = 0;
      
      for (let i = 0; i < paymentDueDate.length; i++) {
        if (i === 0) {
          // Primeiro período (pró-rata com D+60)
          cycleAcc += investorCommission;
        } else {
          // Meses seguintes: mês cheio
          cycleAcc += monthlyInvestorCommission;
        }
        
        if ((i + 1) % liquidityCycleMonths === 0) {
          investorPerMonth[i] = cycleAcc;
          cycleAcc = 0;
        }
      }
      
      if (cycleAcc > 0) {
        investorPerMonth[investorPerMonth.length - 1] += cycleAcc;
      }
      
      monthlyBreakdown = monthlyBreakdown.map((m, idx) => ({
        ...m,
        investorCommission: investorPerMonth[idx] || 0,
      }));
    }
    
    periodLabel = monthName;
      
    // Descrição simplificada focada apenas na comissão do escritório
    const roleName = investment.officeName || 'Escritório';
    const roleRate = officeRate;
    
    description = `Comissão de ${roleName} calculada sobre investimento de ${investment.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}. ` +
      `Taxa de comissão: ${(roleRate * 100).toFixed(0)}% ao mês. ` +
      `A comissão é calculada proporcionalmente aos dias desde a entrada do investimento até o próximo corte (dia 20). ` +
      `A partir do segundo mês, a comissão será fixa de ${(roleRate * 100).toFixed(0)}% ao mês. ` +
      `Pagamento mensal no 5º dia útil de cada mês durante ${commitmentPeriod} meses.`;
  }
  
  // Determinar qual taxa usar para retornar (assessor ou escritório)
  // Se for assessor, usar a taxa do assessor; se for escritório, não retornar advisorRate
  let finalAdvisorRate: number | undefined
  if (isForAdvisor) {
    if (investment.advisorRole === "assessor_externo" && investment.advisorUserTypeId) {
      finalAdvisorRate = await getCommissionRate(investment.advisorUserTypeId, commitmentPeriod, "Mensal")
    } else {
      finalAdvisorRate = advisorRate
    }
  }
  
  return {
    investmentId: investment.id,
    investorId: investment.user_id,
    investorName: investment.investorName || 'Investidor',
    amount: investment.amount,
    paymentDate,
    cutoffPeriod,
    commissionPeriod,
    paymentDueDate,
    advisorCommission,
    officeCommission,
    investorCommission,
    advisorRate: finalAdvisorRate,
    officeRate: officeRate,
    investorRate: investorRate,
    advisorId: investment.advisorId,
    advisorName: investment.advisorName,
    officeId: investment.officeId,
    officeName: investment.officeName,
    periodLabel,
    description,
    monthlyBreakdown,
  };
}

