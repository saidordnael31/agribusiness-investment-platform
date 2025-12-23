import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(_request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado" },
        { status: 401 },
      )
    }

    // Verificar se é admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()

    if (profile?.user_type !== "admin") {
      return NextResponse.json(
        { success: false, error: "Apenas administradores podem listar usuários sem contrato" },
        { status: 403 },
      )
    }

    // Usar service role para evitar problemas de RLS em consultas agregadas
    const { createClient: createAdminClient } = await import("@supabase/supabase-js")

    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    )

    // Buscar todos os investidores
    const { data: investors, error: investorsError } = await supabaseAdmin
      .from("profiles")
      .select("id, full_name, email")
      .eq("user_type", "investor")

    if (investorsError) {
      console.error("❌ [ADMIN CONTRACTS] Erro ao buscar investidores:", investorsError)
      return NextResponse.json(
        { success: false, error: "Erro ao buscar investidores" },
        { status: 500 },
      )
    }

    if (!investors || investors.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      })
    }

    // Buscar contratos existentes para saber quem já tem contrato ativo
    const { data: contracts, error: contractsError } = await supabaseAdmin
      .from("investor_contracts")
      .select("investor_id, status")

    if (contractsError) {
      console.error("❌ [ADMIN CONTRACTS] Erro ao buscar contratos existentes:", contractsError)
      return NextResponse.json(
        { success: false, error: "Erro ao buscar contratos existentes" },
        { status: 500 },
      )
    }

    const hasActiveContract = new Set<string>()

    ;(contracts || []).forEach((contract: any) => {
      if (contract.status === "active" && contract.investor_id) {
        hasActiveContract.add(contract.investor_id)
      }
    })

    // Filtrar apenas investidores que NÃO possuem contrato ativo
    const candidates = investors.filter((inv: any) => !hasActiveContract.has(inv.id))

    return NextResponse.json({
      success: true,
      data: candidates,
    })
  } catch (error) {
    console.error("Get admin contract candidates error:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 },
    )
  }
}


