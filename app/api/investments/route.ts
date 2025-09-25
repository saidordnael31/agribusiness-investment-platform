import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/client"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'

    let query = supabase
      .from("investments")
      .select('*')
      .order('created_at', { ascending: false })

    if (status !== 'all') {
      query = query.eq('status', status)
    }

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

    console.log("investmentsWithProfiles", investmentsWithProfiles)

    return NextResponse.json({
      success: true,
      data: investmentsWithProfiles,
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
