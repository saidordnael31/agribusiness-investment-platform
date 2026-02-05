import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { validateAdminAccess } from "@/lib/client-permission-utils"

// Força a rota a ser dinâmica para permitir uso de cookies
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado" },
        { status: 401 }
      )
    }

    // Validar se é admin (esta rota retorna todos os investidores sem investimentos)
    const isAdmin = await validateAdminAccess(user.id, supabase)
    if (!isAdmin) {
      return NextResponse.json(
        { success: false, error: "Acesso negado: apenas administradores podem acessar esta funcionalidade" },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    
    // Parâmetros de filtro
    const search = searchParams.get('search') || ''
    const filterType = searchParams.get('filterType') || 'all' // 'none', 'no_recent', 'all'
    
    // Parâmetros de paginação
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Data de 12 meses atrás
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
    const twelveMonthsAgoISO = twelveMonthsAgo.toISOString()

    // Buscar user_type_id de "investor"
    const { data: investorUserType } = await supabase
      .from("user_types")
      .select("id")
      .eq("user_type", "investor")
      .limit(1);

    if (!investorUserType || investorUserType.length === 0) {
      return NextResponse.json({ success: false, error: "Tipo de usuário 'investor' não encontrado" }, { status: 400 });
    }

    // Buscar todos os investidores usando user_type_id
    let profilesQuery = supabase
      .from("profiles")
      .select("id, full_name, email, phone, created_at, user_type_id, parent_id")
      .eq("user_type_id", investorUserType[0].id)
      .order("created_at", { ascending: false })

    // Aplicar filtro de busca
    if (search) {
      profilesQuery = profilesQuery.or(`full_name.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data: allInvestors, error: profilesError } = await profilesQuery

    if (profilesError) {
      console.error("Database error:", profilesError)
      return NextResponse.json({ success: false, error: profilesError.message }, { status: 400 })
    }

    if (!allInvestors || allInvestors.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        pagination: {
          page: 1,
          limit,
          total: 0,
          totalPages: 1
        }
      })
    }

    // Buscar todos os investimentos para verificar quais clientes têm investimentos
    const { data: allInvestments, error: investmentsError } = await supabase
      .from("investments")
      .select("user_id, created_at, status")
      .in("status", ["active", "pending"])

    if (investmentsError) {
      console.error("Database error:", investmentsError)
      return NextResponse.json({ success: false, error: investmentsError.message }, { status: 400 })
    }

    // Criar mapas para facilitar a busca
    const investorsWithInvestments = new Set<string>()
    const investorsWithRecentInvestments = new Set<string>()
    const lastInvestmentDate = new Map<string, Date>()

    // Processar investimentos
    if (allInvestments) {
      allInvestments.forEach((investment) => {
        const userId = investment.user_id
        investorsWithInvestments.add(userId)
        
        const investmentDate = new Date(investment.created_at)
        if (investmentDate >= twelveMonthsAgo) {
          investorsWithRecentInvestments.add(userId)
        }

        // Guardar a data do último investimento
        const currentLastDate = lastInvestmentDate.get(userId)
        if (!currentLastDate || investmentDate > currentLastDate) {
          lastInvestmentDate.set(userId, investmentDate)
        }
      })
    }

    // Filtrar clientes sem investimentos ou sem investimentos recentes
    const clientsWithoutInvestments = allInvestors
      .map((investor) => {
        const hasInvestments = investorsWithInvestments.has(investor.id)
        const hasRecentInvestments = investorsWithRecentInvestments.has(investor.id)
        const lastInvestment = lastInvestmentDate.get(investor.id)

        return {
          ...investor,
          hasInvestments,
          hasRecentInvestments,
          lastInvestmentDate: lastInvestment || null,
          reason: !hasInvestments 
            ? 'no_investments' 
            : !hasRecentInvestments 
              ? 'no_recent_investments' 
              : null
        }
      })
      .filter((client) => {
        if (filterType === 'none') {
          return !client.hasInvestments
        } else if (filterType === 'no_recent') {
          return client.hasInvestments && !client.hasRecentInvestments
        } else {
          // 'all' - inclui ambos
          return !client.hasInvestments || !client.hasRecentInvestments
        }
      })

    // Buscar informações dos assessores (parent_id)
    const advisorIds = clientsWithoutInvestments
      .map(client => client.parent_id)
      .filter((id): id is string => id !== null && id !== undefined)
      .filter((id, index, self) => self.indexOf(id) === index) // Remover duplicatas

    const advisorMap = new Map<string, { full_name: string | null; email: string }>()
    
    if (advisorIds.length > 0) {
      const { data: advisors, error: advisorsError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", advisorIds)

      if (!advisorsError && advisors) {
        advisors.forEach((advisor) => {
          advisorMap.set(advisor.id, {
            full_name: advisor.full_name,
            email: advisor.email
          })
        })
      }
    }

    // Adicionar informações do assessor a cada cliente
    const clientsWithAdvisor = clientsWithoutInvestments.map((client) => {
      const advisor = client.parent_id ? advisorMap.get(client.parent_id) : null
      return {
        ...client,
        advisor: advisor ? {
          name: advisor.full_name || advisor.email.split("@")[0],
          email: advisor.email
        } : null
      }
    })

    // Aplicar paginação
    const total = clientsWithAdvisor.length
    const paginatedClients = clientsWithAdvisor.slice(offset, offset + limit)
    const totalPages = Math.max(1, Math.ceil(total / limit))

    return NextResponse.json({
      success: true,
      data: paginatedClients,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    })
  } catch (error) {
    console.error("Get clients without investments error:", error)
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 })
  }
}

