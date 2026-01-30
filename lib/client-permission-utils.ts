import { createClient } from "@/lib/supabase/client"
import { checkIsAdmin, checkIsAdvisor, checkIsDistributor } from "@/lib/permission-utils"
import { getUserTypeFromId } from "@/lib/user-type-utils"

/**
 * Valida se o usuário logado tem acesso aos dados de um usuário específico
 * Verifica hierarquia (parent_id, office_id) e ownership
 */
export async function validateUserAccess(
  loggedUserId: string,
  targetUserId: string
): Promise<boolean> {
  if (!loggedUserId || !targetUserId) {
    return false
  }

  // Se for o próprio usuário, tem acesso
  if (loggedUserId === targetUserId) {
    return true
  }

  const supabase = createClient()

  // Verificar se é admin
  const isAdmin = await checkIsAdmin(supabase, loggedUserId)
  if (isAdmin) {
    return true
  }

  // Buscar perfil do usuário logado
  const { data: loggedUserProfile, error: loggedError } = await supabase
    .from("profiles")
    .select("user_type_id, parent_id, office_id")
    .eq("id", loggedUserId)
    .single()

  if (loggedError || !loggedUserProfile) {
    return false
  }

  // Buscar perfil do usuário alvo
  const { data: targetProfile, error: targetError } = await supabase
    .from("profiles")
    .select("user_type_id, parent_id, office_id")
    .eq("id", targetUserId)
    .single()

  if (targetError || !targetProfile) {
    return false
  }

  // Verificar tipo do usuário logado
  const loggedUserType = await getUserTypeFromId(loggedUserProfile.user_type_id)
  if (!loggedUserType) {
    return false
  }

  const targetUserType = await getUserTypeFromId(targetProfile.user_type_id)
  if (!targetUserType) {
    return false
  }

  // Se o usuário logado é distribuidor/escritório/assessor, verificar hierarquia
  if (loggedUserType.user_type === "distributor" || loggedUserType.user_type === "office" || loggedUserType.user_type === "advisor") {
    // Se o alvo é investidor, verificar se está vinculado
    if (targetUserType.user_type === "investor") {
      // Verificar se o investidor tem o assessor como parent_id
      if (targetProfile.parent_id === loggedUserId) {
        return true
      }
      // Verificar se o investidor tem o escritório como office_id
      if (targetProfile.office_id === loggedUserId) {
        return true
      }
      // Se o usuário logado é escritório, verificar assessores vinculados
      if (loggedUserType.user_type === "office") {
        // Buscar assessores do escritório
        const { data: advisors } = await supabase
          .from("profiles")
          .select("id")
          .eq("office_id", loggedUserId)
        
        if (advisors && advisors.some(a => a.id === targetProfile.parent_id)) {
          return true
        }
      }
      // Se o usuário logado é distribuidor, verificar hierarquia completa
      if (loggedUserType.user_type === "distributor") {
        // Verificar se o investidor está vinculado a escritórios/assessores do distribuidor
        if (targetProfile.office_id) {
          const { data: officeProfile } = await supabase
            .from("profiles")
            .select("parent_id")
            .eq("id", targetProfile.office_id)
            .single()
          
          if (officeProfile && officeProfile.parent_id === loggedUserId) {
            return true
          }
        }
      }
    }
  }

  return false
}

/**
 * Valida se o usuário logado tem acesso a um investimento específico
 */
export async function validateInvestmentAccess(
  loggedUserId: string,
  investmentUserId: string
): Promise<boolean> {
  return validateUserAccess(loggedUserId, investmentUserId)
}

/**
 * Valida se o usuário logado é admin
 */
export async function validateAdminAccess(loggedUserId: string): Promise<boolean> {
  if (!loggedUserId) {
    return false
  }

  const supabase = createClient()
  return await checkIsAdmin(supabase, loggedUserId)
}

/**
 * Valida se o usuário logado pode criar investimento para um usuário específico
 */
export async function validateCanCreateInvestmentForUser(
  loggedUserId: string,
  targetUserId: string
): Promise<boolean> {
  // Admin pode criar para qualquer um
  const isAdmin = await validateAdminAccess(loggedUserId)
  if (isAdmin) {
    return true
  }

  // Verificar se tem acesso ao usuário alvo
  return validateUserAccess(loggedUserId, targetUserId)
}

/**
 * Valida se o usuário logado pode modificar um perfil
 */
export async function validateCanModifyProfile(
  loggedUserId: string,
  targetUserId: string
): Promise<boolean> {
  // Admin pode modificar qualquer perfil
  const isAdmin = await validateAdminAccess(loggedUserId)
  if (isAdmin) {
    return true
  }

  // Usuário pode modificar seu próprio perfil
  if (loggedUserId === targetUserId) {
    return true
  }

  // Distribuidor/escritório/assessor pode modificar perfis de seus investidores
  return validateUserAccess(loggedUserId, targetUserId)
}

/**
 * Valida se o usuário logado pode criar perfis
 */
export async function validateCanCreateProfile(
  loggedUserId: string,
  targetUserType: string
): Promise<boolean> {
  if (!loggedUserId) {
    return false
  }

  // Admin pode criar qualquer tipo
  const isAdmin = await validateAdminAccess(loggedUserId)
  if (isAdmin) {
    return true
  }

  // Distribuidor/escritório/assessor pode criar investidores
  if (targetUserType === "investor") {
    const supabase = createClient()
    const isDistributor = await checkIsDistributor(supabase, loggedUserId)
    const isAdvisor = await checkIsAdvisor(supabase, loggedUserId)
    
    // Buscar se é escritório
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type_id")
      .eq("id", loggedUserId)
      .single()
    
    if (profile?.user_type_id) {
      const userType = await getUserTypeFromId(profile.user_type_id)
      const isOffice = userType?.user_type === "office"
      
      return isDistributor || isAdvisor || isOffice
    }
  }

  return false
}

