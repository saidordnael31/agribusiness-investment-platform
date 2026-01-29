import { createClient } from "@/lib/supabase/client"
import { getUserTypeFromId } from "./user-type-utils"

export interface RentabilityPeriod {
  months: number
  rates: {
    monthly?: number
    semiannual?: number
    annual?: number
    biennial?: number
    triennial?: number
  }
}

export interface RentabilityConfig {
  id: number
  title: string
  is_fixed: boolean
  fixed_rate: number | null
  payout_start_days: number | null
  periods: RentabilityPeriod[] | null
}

/**
 * Mapeia nomes de liquidez para chaves de rates
 */
const liquidityToRateKey: Record<string, keyof RentabilityPeriod["rates"]> = {
  Mensal: "monthly",
  mensal: "monthly",
  Monthly: "monthly",
  monthly: "monthly",
  Semestral: "semiannual",
  semestral: "semiannual",
  Semiannual: "semiannual",
  semiannual: "semiannual",
  Anual: "annual",
  anual: "annual",
  Annual: "annual",
  annual: "annual",
  Bienal: "biennial",
  bienal: "biennial",
  Biennial: "biennial",
  biennial: "biennial",
  Trienal: "triennial",
  trienal: "triennial",
  Triennial: "triennial",
  triennial: "triennial",
}

/**
 * Busca a configuração de rentabilidade pelo ID
 */
export async function getRentabilityConfig(
  rentability_id: number | null
): Promise<RentabilityConfig | null> {
  if (!rentability_id) return null

  try {
    const supabase = createClient()
    const { data, error } = await supabase.rpc("get_rentability_config", {
      p_rentability_id: rentability_id,
    })

    if (error) {
      console.error("[rentability-utils] Erro ao buscar rentabilidade:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("[rentability-utils] Erro inesperado ao buscar rentabilidade:", error)
    return null
  }
}

/**
 * Obtém a taxa de rentabilidade baseada em período e liquidez
 * Esta é a função centralizada que substitui as tabelas hardcoded
 */
export async function getRateByPeriodAndLiquidity(
  user_type_id: number | null,
  period: number,
  liquidity: string,
  condition_ids?: number[]
): Promise<number> {
  try {
    // 1. Buscar user_type
    const userType = await getUserTypeFromId(user_type_id)
    if (!userType || !userType.rentability_id) {
      console.warn(
        "[rentability-utils] User type não encontrado ou sem rentability_id:",
        user_type_id
      )
      return 0
    }

    // 2. Verificar se há condições aplicáveis
    // Se houver condition_ids, verificar se alguma condição tem rentabilidade diferente
    let rentability_id = userType.rentability_id

    if (condition_ids && condition_ids.length > 0) {
      const supabase = createClient()

      // Buscar condições e suas rentabilidades
      const { data: conditions } = await supabase
        .from("user_type_conditions")
        .select("condition_id, conditions(rentability_id)")
        .eq("user_type_id", user_type_id)
        .in("condition_id", condition_ids)

      // Se alguma condição aplicável tiver rentabilidade, usar ela
      // Por enquanto, assumimos que a primeira condição encontrada sobrescreve
      // (isso pode ser ajustado conforme a lógica de negócio)
      if (conditions && conditions.length > 0) {
        const firstCondition = conditions[0] as any
        if (firstCondition?.conditions?.rentability_id) {
          rentability_id = firstCondition.conditions.rentability_id
        }
      }
    }

    // 3. Buscar configuração de rentabilidade
    const rentabilityConfig = await getRentabilityConfig(rentability_id)
    if (!rentabilityConfig) {
      console.warn("[rentability-utils] Rentabilidade não encontrada:", rentability_id)
      return 0
    }

    // 4. Se for fixa, retornar fixed_rate convertido para decimal
    // O fixed_rate vem como porcentagem (ex: 2 para 2%), precisa converter para decimal (0.02)
    if (rentabilityConfig.is_fixed && rentabilityConfig.fixed_rate !== null) {
      return Number(rentabilityConfig.fixed_rate) / 100
    }

    // 5. Se não for fixa, buscar taxa no período e liquidez específicos
    if (!rentabilityConfig.periods || rentabilityConfig.periods.length === 0) {
      console.warn("[rentability-utils] Rentabilidade variável sem períodos configurados")
      return 0
    }

    // Encontrar período correspondente
    const periodConfig = rentabilityConfig.periods.find((p) => p.months === period)
    if (!periodConfig) {
      console.warn(
        "[rentability-utils] Período não encontrado na rentabilidade:",
        period
      )
      return 0
    }

    // Mapear liquidez para chave de rate
    const rateKey = liquidityToRateKey[liquidity]
    if (!rateKey) {
      console.warn("[rentability-utils] Liquidez não reconhecida:", liquidity)
      return 0
    }

    // Obter taxa
    const rate = periodConfig.rates[rateKey]
    if (rate === undefined || rate === null) {
      console.warn(
        "[rentability-utils] Taxa não encontrada para período",
        period,
        "e liquidez",
        liquidity
      )
      return 0
    }

    // As taxas vêm como porcentagem (ex: 1.55 para 1.55%), converter para decimal (0.0155)
    const rateDecimal = Number(rate) / 100
    console.log(`[rentability-utils] Taxa convertida: ${rate}% → ${rateDecimal} (decimal)`)
    return rateDecimal
  } catch (error) {
    console.error("[rentability-utils] Erro ao obter taxa:", error)
    return 0
  }
}

/**
 * Obtém rentabilidade por user_type (sem condições)
 */
export async function getRentabilityByUserType(
  user_type_id: number | null,
  period: number,
  liquidity: string
): Promise<number> {
  return getRateByPeriodAndLiquidity(user_type_id, period, liquidity)
}

/**
 * Obtém rentabilidade considerando condições
 */
export async function getRentabilityByCondition(
  user_type_id: number | null,
  condition_ids: number[],
  period: number,
  liquidity: string
): Promise<number> {
  return getRateByPeriodAndLiquidity(user_type_id, period, liquidity, condition_ids)
}

