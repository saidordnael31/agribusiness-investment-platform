import { createClient } from "@/lib/supabase/client"

export interface UserType {
  id: number
  name: string
  display_name: string
  rentability_id: number | null
  user_type: string | null
}

/**
 * Busca um user_type pelo ID
 */
export async function getUserTypeFromId(user_type_id: number | null): Promise<UserType | null> {
  if (!user_type_id) return null

  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from("user_types")
      .select("id, name, display_name, rentability_id, user_type")
      .eq("id", user_type_id)
      .single()

    if (error) {
      console.error("[user-type-utils] Erro ao buscar user_type:", error)
      return null
    }

    return data
  } catch (error) {
    console.error("[user-type-utils] Erro inesperado ao buscar user_type:", error)
    return null
  }
}

/**
 * Obtém o nome de exibição de um user_type pelo ID
 */
export async function getUserTypeDisplayName(user_type_id: number | null): Promise<string | null> {
  const userType = await getUserTypeFromId(user_type_id)
  return userType?.display_name || null
}

/**
 * Verifica se um usuário tem um determinado tipo baseado no user_type_id
 */
export async function isUserType(
  user_type_id: number | null,
  user_type_name: string
): Promise<boolean> {
  const userType = await getUserTypeFromId(user_type_id)
  if (!userType) return false

  // Comparar APENAS pelo campo user_type, não pelo name (slug)
  return userType.user_type === user_type_name
}

/**
 * Obtém a hierarquia de um user_type (relações pai-filho)
 * Retorna os IDs dos tipos filhos permitidos
 */
export async function getUserTypeHierarchy(
  user_type_id: number | null
): Promise<number[]> {
  if (!user_type_id) return []

  try {
    const supabase = createClient()
    const { data, error } = await supabase.rpc("get_user_type_relations", {
      p_parent_user_type_id: user_type_id,
    })

    if (error) {
      console.error("[user-type-utils] Erro ao buscar hierarquia:", error)
      return []
    }

    // Retornar array de IDs dos tipos filhos
    return (data || []).map((relation: any) => relation.child_user_type_id)
  } catch (error) {
    console.error("[user-type-utils] Erro inesperado ao buscar hierarquia:", error)
    return []
  }
}

/**
 * Mapeia valores antigos de user_type/role para o novo user_type_id
 * Útil durante a migração para manter compatibilidade
 */
export function mapLegacyUserTypeToNew(
  user_type: string | null,
  role: string | null
): string | null {
  // Mapeamentos conhecidos
  const mappings: Record<string, string> = {
    assessor: "advisor",
    assessor_externo: "advisor",
    lider: "admin",
    gestor: "admin",
    distribuidor: "distributor",
    escritorio: "office",
    investidor: "investor",
    investor: "investor",
    admin: "admin",
  }

  // Tentar mapear pelo role primeiro (mais específico)
  if (role && mappings[role]) {
    return mappings[role]
  }

  // Tentar mapear pelo user_type
  if (user_type && mappings[user_type]) {
    return mappings[user_type]
  }

  // Retornar o próprio user_type se não houver mapeamento
  return user_type
}

