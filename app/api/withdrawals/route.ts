import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const withdrawalData = await request.json()
    const supabase = createServerClient()

    const { data, error } = await supabase
      .from("transactions")
      .insert([
        {
          user_id: withdrawalData.userId,
          type: "withdrawal",
          amount: withdrawalData.amount,
          quota_type: withdrawalData.quotaType,
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
      message: "Resgate solicitado com sucesso!",
    })
  } catch (error) {
    console.error("Create withdrawal error:", error)
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 })
  }
}
