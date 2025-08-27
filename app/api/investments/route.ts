import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient()

    const mockInvestments = [
      {
        id: "1",
        user_id: "demo-investidor",
        quota_type: "senior",
        amount: 25000,
        current_value: 27500,
        monthly_return: 750,
        created_at: "2024-01-15T00:00:00Z",
        status: "active",
      },
      {
        id: "2",
        user_id: "demo-investidor",
        quota_type: "subordinada",
        amount: 50000,
        current_value: 55250,
        monthly_return: 1750,
        created_at: "2024-02-01T00:00:00Z",
        status: "active",
      },
    ]

    return NextResponse.json({
      success: true,
      data: mockInvestments,
    })
  } catch (error) {
    console.error("Get investments error:", error)
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const investmentData = await request.json()
    const supabase = createServerClient()

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
