import { createClient } from "@/lib/supabase/client"
import { checkIsAdmin, checkIsAdvisor, checkIsDistributor } from "@/lib/permission-utils"
import { getUserTypeFromId } from "@/lib/user-type-utils"

type SupabaseClient = Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>

/**
 * Valida se o usuário logado tem acesso aos dados de um usuário específico
 * Verifica hierarquia (parent_id, office_id) e ownership
 * @param supabaseClient - Cliente Supabase opcional (obrigatório em API routes)
 */
export async function validateUserAccess(
  loggedUserId: string,
  targetUserId: string,
  supabaseClient?: SupabaseClient
): Promise<boolean> {
  if (!loggedUserId || !targetUserId) {
    return false
  }

  // Se for o próprio usuário, tem acesso
  if (loggedUserId === targetUserId) {
    return true
  }

  const supabase = supabaseClient ?? createClient()

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

  // DISTRIBUIDOR: pode ver Escritórios, Assessores dos Escritórios dele, e Investidores dos Assessores
  if (loggedUserType.user_type === "distributor") {
    // Pode ver Escritórios que são seus filhos (parent_id = distribuidor)
    if (targetUserType.user_type === "office" && targetProfile.parent_id === loggedUserId) {
      return true
    }
    
    // Pode ver Assessores dos Escritórios dele
    if (targetUserType.user_type === "advisor") {
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
    
    // Pode ver Investidores dos Assessores dos Escritórios dele
    if (targetUserType.user_type === "investor") {
      // Verificar se o investidor está vinculado a assessor de escritório do distribuidor
      if (targetProfile.parent_id) {
        // Buscar o assessor do investidor
        const { data: advisorProfile } = await supabase
          .from("profiles")
          .select("office_id, user_type_id")
          .eq("id", targetProfile.parent_id)
          .single()
        
        if (advisorProfile && advisorProfile.office_id) {
          // Buscar o escritório do assessor
          const { data: officeProfile } = await supabase
            .from("profiles")
            .select("parent_id")
            .eq("id", advisorProfile.office_id)
            .single()
          
          if (officeProfile && officeProfile.parent_id === loggedUserId) {
            return true
          }
        }
      }
      
      // Verificar se o investidor está vinculado diretamente a escritório do distribuidor
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

  // ESCRITÓRIO: pode ver Assessores e Investidores dos Assessores dele
  if (loggedUserType.user_type === "office") {
    // Pode ver Assessores que são seus filhos (office_id = escritório)
    if (targetUserType.user_type === "advisor" && targetProfile.office_id === loggedUserId) {
      return true
    }
    
    // Pode ver Investidores dos Assessores dele
    if (targetUserType.user_type === "investor") {
      // Verificar se o investidor tem assessor vinculado ao escritório
      if (targetProfile.parent_id) {
        const { data: advisorProfile } = await supabase
          .from("profiles")
          .select("office_id")
          .eq("id", targetProfile.parent_id)
          .single()
        
        if (advisorProfile && advisorProfile.office_id === loggedUserId) {
          return true
        }
      }
      
      // Verificar se o investidor está vinculado diretamente ao escritório
      if (targetProfile.office_id === loggedUserId) {
        return true
      }
    }
  }

  // ASSESSOR: pode ver Investidores que são seus filhos
  if (loggedUserType.user_type === "advisor") {
    if (targetUserType.user_type === "investor" && targetProfile.parent_id === loggedUserId) {
      return true
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
 * @param loggedUserId - ID do usuário logado
 * @param supabaseClient - Cliente Supabase opcional (obrigatório em API routes no servidor para ter sessão)
 */
export async function validateAdminAccess(
  loggedUserId: string,
  supabaseClient?: SupabaseClient
): Promise<boolean> {
  if (!loggedUserId) {
    return false
  }

  const supabase = supabaseClient ?? createClient()
  return await checkIsAdmin(supabase, loggedUserId)
}

/**
 * Valida se o usuário logado pode criar investimento para um usuário específico
 * @param supabaseClient - Cliente Supabase opcional (obrigatório em API routes)
 */
export async function validateCanCreateInvestmentForUser(
  loggedUserId: string,
  targetUserId: string,
  supabaseClient?: SupabaseClient
): Promise<boolean> {
  // Admin pode criar para qualquer um
  const isAdmin = await validateAdminAccess(loggedUserId, supabaseClient)
  if (isAdmin) {
    return true
  }

  // Verificar se tem acesso ao usuário alvo
  return validateUserAccess(loggedUserId, targetUserId, supabaseClient)
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

  const supabase = createClient()
  
  // Buscar user_type_id do usuário logado
  const { data: profile } = await supabase
    .from("profiles")
    .select("user_type_id")
    .eq("id", loggedUserId)
    .single()
  
  if (!profile?.user_type_id) {
    return false
  }
  
  const loggedUserType = await getUserTypeFromId(profile.user_type_id)
  if (!loggedUserType) {
    return false
  }

  // DISTRIBUIDOR: pode criar Escritórios
  if (loggedUserType.user_type === "distributor" && targetUserType === "office") {
    return true
  }

  // ESCRITÓRIO: pode criar Assessores
  if (loggedUserType.user_type === "office" && targetUserType === "advisor") {
    return true
  }

  // DISTRIBUIDOR/ESCRITÓRIO/ASSESSOR: pode criar Investidores
  if (targetUserType === "investor") {
    return loggedUserType.user_type === "distributor" || 
           loggedUserType.user_type === "office" || 
           loggedUserType.user_type === "advisor"
  }

  return false
}

