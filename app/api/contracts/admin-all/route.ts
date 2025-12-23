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
        { success: false, error: "Apenas administradores podem listar todos os contratos" },
        { status: 403 },
      )
    }

    // Usar service role para contornar possíveis regras de RLS na tabela de contratos
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

    // Buscar todos os contratos
    const { data: contracts, error } = await supabaseAdmin
      .from("investor_contracts")
      .select("*")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("❌ [ADMIN CONTRACTS] Erro ao buscar contratos:", error)
      return NextResponse.json(
        { success: false, error: "Erro ao buscar contratos" },
        { status: 500 },
      )
    }

    if (!contracts || contracts.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
      })
    }

    // Carregar perfis de investidores e de quem fez upload em batch para evitar N chamadas
    const investorIds = Array.from(
      new Set(
        contracts
          .map((c: any) => c.investor_id)
          .filter((id: string | null) => Boolean(id)),
      ),
    )

    const uploaderIds = Array.from(
      new Set(
        contracts
          .map((c: any) => c.uploaded_by)
          .filter((id: string | null) => Boolean(id)),
      ),
    )

    const [investorsResult, uploadersResult] = await Promise.all([
      investorIds.length
        ? supabaseAdmin
            .from("profiles")
            .select("id, full_name, email")
            .in("id", investorIds)
        : Promise.resolve({ data: [], error: null }),
      uploaderIds.length
        ? supabaseAdmin
            .from("profiles")
            .select("id, full_name, email")
            .in("id", uploaderIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (investorsResult.error) {
      console.error("❌ [ADMIN CONTRACTS] Erro ao buscar perfis de investidores:", investorsResult.error)
    }

    if (uploadersResult.error) {
      console.error("❌ [ADMIN CONTRACTS] Erro ao buscar perfis de uploaders:", uploadersResult.error)
    }

    const investorMap = new Map(
      (investorsResult.data || []).map((p: any) => [p.id, p]),
    )
    const uploaderMap = new Map(
      (uploadersResult.data || []).map((p: any) => [p.id, p]),
    )

    const enrichedContracts = contracts.map((contract: any) => ({
      ...contract,
      investor_profile:
        (contract.investor_id && investorMap.get(contract.investor_id)) || null,
      uploaded_by_profile:
        (contract.uploaded_by && uploaderMap.get(contract.uploaded_by)) || null,
    }))

    return NextResponse.json({
      success: true,
      data: enrichedContracts,
    })
  } catch (error) {
    console.error("Get admin contracts error:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 },
    )
  }
}


