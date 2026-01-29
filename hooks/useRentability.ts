"use client"

import { useState, useEffect, useCallback } from "react"
import {
  getRateByPeriodAndLiquidity,
  getRentabilityByUserType,
  getRentabilityByCondition,
  getRentabilityConfig,
  type RentabilityConfig,
} from "@/lib/rentability-utils"

export interface UseRentabilityReturn {
  getRate: (
    period: number,
    liquidity: string,
    condition_ids?: number[]
  ) => Promise<number>
  getRateByUserType: (period: number, liquidity: string) => Promise<number>
  getRateByCondition: (
    period: number,
    liquidity: string,
    condition_ids: number[]
  ) => Promise<number>
  rentabilityConfig: RentabilityConfig | null
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
}

/**
 * Hook para obter rentabilidades dinamicamente
 * Cacheia a configuração de rentabilidade para evitar múltiplas queries
 */
export function useRentability(
  user_type_id: number | null
): UseRentabilityReturn {
  const [rentabilityConfig, setRentabilityConfig] =
    useState<RentabilityConfig | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchRentabilityConfig = useCallback(async () => {
    if (!user_type_id) {
      setRentabilityConfig(null)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Buscar user_type para obter rentability_id
      const { getUserTypeFromId } = await import("@/lib/user-type-utils")
      const userType = await getUserTypeFromId(user_type_id)

      if (!userType || !userType.rentability_id) {
        setRentabilityConfig(null)
        setIsLoading(false)
        return
      }

      // Buscar configuração de rentabilidade
      const config = await getRentabilityConfig(userType.rentability_id)
      setRentabilityConfig(config)
    } catch (err) {
      console.error("[useRentability] Erro ao buscar rentabilidade:", err)
      setError(err instanceof Error ? err : new Error("Erro desconhecido"))
      setRentabilityConfig(null)
    } finally {
      setIsLoading(false)
    }
  }, [user_type_id])

  useEffect(() => {
    fetchRentabilityConfig()
  }, [fetchRentabilityConfig])

  const getRate = useCallback(
    async (
      period: number,
      liquidity: string,
      condition_ids?: number[]
    ): Promise<number> => {
      return getRateByPeriodAndLiquidity(
        user_type_id,
        period,
        liquidity,
        condition_ids
      )
    },
    [user_type_id]
  )

  const getRateByUserType = useCallback(
    async (period: number, liquidity: string): Promise<number> => {
      return getRentabilityByUserType(user_type_id, period, liquidity)
    },
    [user_type_id]
  )

  const getRateByCondition = useCallback(
    async (
      period: number,
      liquidity: string,
      condition_ids: number[]
    ): Promise<number> => {
      return getRentabilityByCondition(
        user_type_id,
        condition_ids,
        period,
        liquidity
      )
    },
    [user_type_id]
  )

  return {
    getRate,
    getRateByUserType,
    getRateByCondition,
    rentabilityConfig,
    isLoading,
    error,
    refresh: fetchRentabilityConfig,
  }
}


