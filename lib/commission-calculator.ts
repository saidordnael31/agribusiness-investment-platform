/**
 * Sistema de cálculo de comissões baseado em roles
 */

export interface CommissionRates {
  investor: number;    // 2%
  escritorio: number;  // 1%
  assessor: number;    // 3%
}

export const COMMISSION_RATES: CommissionRates = {
  investor: 0.02,    // 2%
  escritorio: 0.01,  // 1%
  assessor: 0.03,    // 3%
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
  investorCommission: number;
  escritorioCommission: number;
  assessorCommission: number;
  totalCommission: number;
}

/**
 * Calcula comissão baseada no role do usuário
 */
export function calculateRoleCommission(
  amount: number,
  userRole: keyof CommissionRates,
  months: number = 12
): CommissionCalculation {
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
export function calculateCommissionBreakdown(
  amount: number,
  months: number = 12
): CommissionBreakdown {
  const investorCommission = amount * COMMISSION_RATES.investor * months;
  const escritorioCommission = amount * COMMISSION_RATES.escritorio * months;
  const assessorCommission = amount * COMMISSION_RATES.assessor * months;
  
  const totalCommission = investorCommission + escritorioCommission + assessorCommission;

  return {
    investorCommission,
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
    investor: "Investidor",
    escritorio: "Escritório",
    assessor: "Assessor",
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
