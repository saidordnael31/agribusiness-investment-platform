import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/client"
import { createServerClient } from "@/lib/supabase/server"

// Força a rota a ser dinâmica para permitir uso de cookies
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    
    // Parâmetros de filtro
    const status = searchParams.get('status') || 'all'
    const userId = searchParams.get('userId')
    const quotaType = searchParams.get('quota_type')
    const search = searchParams.get('search')
    const dateFrom = searchParams.get('date_from')
    const dateTo = searchParams.get('date_to')
    
    // Parâmetros de paginação
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // Query base para investments
    let query = supabase
      .from("investments")
      .select('*, approved_by_admin, profitability_liquidity')
      .order('created_at', { ascending: false })

    // Aplicar filtros
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    if (userId) {
      query = query.eq('user_id', userId)
    }

    if (quotaType && quotaType !== 'all') {
      query = query.eq('quota_type', quotaType)
    }

    if (dateFrom) {
      query = query.gte('created_at', dateFrom)
    }

    if (dateTo) {
      const endDate = new Date(dateTo)
      endDate.setHours(23, 59, 59, 999)
      query = query.lte('created_at', endDate.toISOString())
    }

    // Buscar total para paginação (aplicando os mesmos filtros)
    let countQuery = supabase
      .from("investments")
      .select('*', { count: 'exact', head: true })

    // Aplicar os mesmos filtros para a contagem
    if (status !== 'all') {
      countQuery = countQuery.eq('status', status)
    }

    if (userId) {
      countQuery = countQuery.eq('user_id', userId)
    }

    if (quotaType && quotaType !== 'all') {
      countQuery = countQuery.eq('quota_type', quotaType)
    }

    if (dateFrom) {
      countQuery = countQuery.gte('created_at', dateFrom)
    }

    if (dateTo) {
      const endDate = new Date(dateTo)
      endDate.setHours(23, 59, 59, 999)
      countQuery = countQuery.lte('created_at', endDate.toISOString())
    }

    const { count: totalCount } = await countQuery

    // Aplicar paginação
    query = query.range(offset, offset + limit - 1)

    const { data: investments, error } = await query

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    // Buscar dados dos perfis para cada investimento
    const investmentsWithProfiles = await Promise.all(
      (investments || []).map(async (investment) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email, user_type")
          .eq("id", investment.user_id)
          .single()

        return {
          ...investment,
          profiles: profile || null
        }
      })
    )

    // Aplicar filtro de busca por nome ou email se especificado
    let filteredInvestments = investmentsWithProfiles
    if (search) {
      filteredInvestments = filteredInvestments.filter(investment => 
        investment.profiles?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
        investment.profiles?.email?.toLowerCase().includes(search.toLowerCase())
      )
    }

    const totalPages = Math.max(1, Math.ceil((totalCount || 0) / limit))

    return NextResponse.json({
      success: true,
      data: filteredInvestments,
      pagination: {
        page,
        limit,
        total: totalCount || 0,
        totalPages
      }
    })
  } catch (error) {
    console.error("Get investments error:", error)
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const investmentData = await request.json()
    const supabase = await createServerClient()

    const { data, error } = await supabase
      .from("investments")
      .insert([
        {
          user_id: investmentData.userId,
          quota_type: investmentData.quotaType,
          amount: investmentData.amount,
          status: "pending",
        },
      ])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    console.error("Create investment error:", error)
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 })
  }
}
