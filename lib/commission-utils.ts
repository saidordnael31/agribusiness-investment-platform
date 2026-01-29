import { createClient } from "@/lib/supabase/client"
import { getUserTypeFromId } from "./user-type-utils"
import { getRentabilityConfig } from "./rentability-utils"

/**
 * Busca a taxa de comissão de um tipo de usuário do banco de dados
 * Fluxo: user_type_id -> user_types.rentability_id -> get_rentability_config
 * 
 * Para comissões mensais, usa a taxa mensal da rentabilidade
 * Se não houver taxa mensal, usa fixed_rate se disponível
 */
export async function getCommissionRate(
  user_type_id: number | null,
  period: number = 12,
  liquidity: string = "Mensal"
): Promise<number> {
  if (!user_type_id) {
    console.warn("[commission-utils] user_type_id não disponível")
    return 0
  }

  try {
    // 1. Buscar user_type
    const userType = await getUserTypeFromId(user_type_id)
    if (!userType || !userType.rentability_id) {
      console.warn(
        "[commission-utils] User type não encontrado ou sem rentability_id:",
        user_type_id
      )
      return 0
    }

    // 2. Buscar configuração de rentabilidade
    const rentabilityConfig = await getRentabilityConfig(userType.rentability_id)
    if (!rentabilityConfig) {
      console.warn("[commission-utils] Rentabilidade não encontrada:", userType.rentability_id)
      return 0
    }

    // 3. Se for fixa, retornar fixed_rate convertido para decimal (dividir por 100)
    // O fixed_rate vem como porcentagem (ex: 2 para 2%), precisa converter para decimal (0.02)
    if (rentabilityConfig.is_fixed && rentabilityConfig.fixed_rate !== null) {
      return Number(rentabilityConfig.fixed_rate) / 100
    }

    // 4. Se não for fixa, buscar taxa baseada na liquidez fornecida
    if (!rentabilityConfig.periods || rentabilityConfig.periods.length === 0) {
      console.warn("[commission-utils] Rentabilidade variável sem períodos configurados")
      return 0
    }

    // Encontrar período correspondente
    const periodConfig = rentabilityConfig.periods.find((p) => p.months === period)
    if (!periodConfig) {
      // Se não encontrar o período exato, tentar usar o período mais próximo
      // Para assessores/escritórios: usar mensal; para investidores: usar a liquidez fornecida
      const rateKey = liquidity === "Mensal" ? "monthly" : 
        liquidity === "Semestral" ? "semiannual" :
        liquidity === "Anual" ? "annual" :
        liquidity === "Bienal" ? "biennial" :
        liquidity === "Trienal" ? "triennial" : "monthly"
      
      const availablePeriod = rentabilityConfig.periods.find((p) => p.rates[rateKey] !== undefined)
      if (availablePeriod?.rates[rateKey] !== undefined) {
        // As taxas também vêm como porcentagem, converter para decimal
        return Number(availablePeriod.rates[rateKey]) / 100
      }
      console.warn("[commission-utils] Período não encontrado na rentabilidade:", period)
      return 0
    }

    // Mapear liquidez para chave de rate
    const liquidityToRateKey: Record<string, keyof typeof periodConfig.rates> = {
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
    
    const rateKey = liquidityToRateKey[liquidity] || "monthly"
    const rate = periodConfig.rates[rateKey]
    
    if (rate === undefined || rate === null) {
      // Fallback: tentar usar mensal se disponível
      if (periodConfig.rates.monthly !== undefined && periodConfig.rates.monthly !== null) {
        console.warn(`[commission-utils] Taxa ${liquidity} não encontrada para período ${period}, usando mensal como fallback`)
        return Number(periodConfig.rates.monthly) / 100
      }
      console.warn(`[commission-utils] Taxa ${liquidity} não encontrada para período ${period}`)
      return 0
    }

    // As taxas vêm como porcentagem, converter para decimal
    return Number(rate) / 100
  } catch (error) {
    console.error("[commission-utils] Erro ao obter taxa de comissão:", error)
    return 0
  }
}

/**
 * Busca taxas de comissão para múltiplos tipos de usuário
 * Retorna um objeto com as taxas de cada tipo
 */
export async function getCommissionRatesForUserTypes(
  userTypeIds: {
    investidor?: number | null
    assessor?: number | null
    escritorio?: number | null
    distribuidor?: number | null
  },
  period: number = 12,
  liquidity: string = "Mensal"
): Promise<{
  investidor: number
  assessor: number
  escritorio: number
  distribuidor: number
}> {
  const [investidorRate, assessorRate, escritorioRate, distribuidorRate] = await Promise.all([
    userTypeIds.investidor ? getCommissionRate(userTypeIds.investidor, period, liquidity) : Promise.resolve(0),
    userTypeIds.assessor ? getCommissionRate(userTypeIds.assessor, period, liquidity) : Promise.resolve(0),
    userTypeIds.escritorio ? getCommissionRate(userTypeIds.escritorio, period, liquidity) : Promise.resolve(0),
    userTypeIds.distribuidor ? getCommissionRate(userTypeIds.distribuidor, period, liquidity) : Promise.resolve(0),
  ])

  return {
    investidor: investidorRate,
    assessor: assessorRate,
    escritorio: escritorioRate,
    distribuidor: distribuidorRate,
  }
}

