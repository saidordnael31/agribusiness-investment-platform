import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/client"

export async function POST(request: NextRequest) {
  try {
    const depositData = await request.json()
    const supabase = createClient()

    const { data, error } = await supabase
      .from("transactions")
      .insert([
        {
          user_id: depositData.userId,
          type: "deposit",
          amount: depositData.amount,
          quota_type: depositData.quotaType,
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
      message: "Depósito solicitado com sucesso!",
    })
  } catch (error) {
    console.error("Create deposit error:", error)
    return NextResponse.json({ success: false, error: "Erro interno do servidor" }, { status: 500 })
  }
}
