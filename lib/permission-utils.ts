import { getUserTypeFromId } from "./user-type-utils"

/**
 * Verifica se um usuário tem um determinado tipo
 * Usa APENAS user_type_id da tabela user_types
 */
export async function hasUserType(
  user_type_id: number | null,
  allowedTypes: string[]
): Promise<boolean> {
  if (!user_type_id) {
    return false
  }

  const userTypeData = await getUserTypeFromId(user_type_id)
  if (!userTypeData) {
    return false
  }

  const userTypeToCheck = userTypeData.user_type || userTypeData.name

  // Verificar se o tipo do usuário está nos tipos permitidos
  return allowedTypes.some((allowedType) => {
    // Comparação direta
    return userTypeToCheck === allowedType
  })
}

/**
 * Verifica se usuário é admin
 */
export async function isAdmin(user_type_id: number | null): Promise<boolean> {
  return hasUserType(user_type_id, ["admin"])
}

/**
 * Verifica se usuário é advisor
 */
export async function isAdvisor(user_type_id: number | null): Promise<boolean> {
  return hasUserType(user_type_id, ["advisor"])
}

/**
 * Verifica se usuário é distributor
 */
export async function isDistributor(user_type_id: number | null): Promise<boolean> {
  return hasUserType(user_type_id, ["distributor"])
}

/**
 * Verifica se usuário é investor
 */
export async function isInvestor(user_type_id: number | null): Promise<boolean> {
  return hasUserType(user_type_id, ["investor"])
}

/**
 * Versão para rotas de API (server-side)
 * Recebe o supabase client e verifica permissões do usuário
 * Usa APENAS user_type_id
 */
export async function checkUserPermissionWithSupabase(
  supabase: any,
  userId: string,
  allowedTypes: string[]
): Promise<boolean> {
  try {
    const { data: profile, error } = await supabase
      .from("profiles")
      .select("user_type_id")
      .eq("id", userId)
      .single()

    if (error || !profile || !profile.user_type_id) {
      return false
    }

    return hasUserType(profile.user_type_id, allowedTypes)
  } catch (error) {
    console.error("Error checking user permission:", error)
    return false
  }
}

/**
 * Versão para rotas de API - verifica se é admin
 * Recebe o supabase client como parâmetro
 */
export async function checkIsAdmin(supabase: any, userId: string): Promise<boolean> {
  return checkUserPermissionWithSupabase(supabase, userId, ["admin"])
}

/**
 * Versão para rotas de API - verifica se é advisor
 * Recebe o supabase client como parâmetro
 */
export async function checkIsAdvisor(supabase: any, userId: string): Promise<boolean> {
  return checkUserPermissionWithSupabase(supabase, userId, ["advisor"])
}

/**
 * Versão para rotas de API - verifica se é distributor
 * Recebe o supabase client como parâmetro
 */
export async function checkIsDistributor(supabase: any, userId: string): Promise<boolean> {
  return checkUserPermissionWithSupabase(supabase, userId, ["distributor"])
}

/**
 * Versão para rotas de API - verifica se é investor
 * Recebe o supabase client como parâmetro
 */
export async function checkIsInvestor(supabase: any, userId: string): Promise<boolean> {
  return checkUserPermissionWithSupabase(supabase, userId, ["investor"])
}

/**
 * Versão síncrona - NÃO RECOMENDADO
 * Use apenas quando absolutamente necessário e user_type_id já estiver disponível
 * Para componentes React, prefira usar hooks assíncronos ou aguardar user_type_id
 */
export function hasUserTypeSync(
  user_type_id: number | null,
  allowedTypes: string[]
): boolean {
  // Esta função não pode consultar o banco, então retorna false se não tiver user_type_id
  // Componentes devem usar hooks assíncronos ou aguardar user_type_id estar disponível
  if (!user_type_id) {
    return false
  }
  
  // Nota: Esta função não pode fazer lookup no banco de forma síncrona
  // É melhor usar versões assíncronas ou hooks que já tenham o user_type carregado
  console.warn("hasUserTypeSync called - prefer async versions or hooks with user_type_id")
  return false
}

