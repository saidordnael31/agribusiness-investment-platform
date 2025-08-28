import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const userData = await request.json()
    const { email, password, name, userType, parentId } = userData

    const supabase = createServerClient()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo:
          process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${process.env.NEXT_PUBLIC_SITE_URL}/login`,
        data: {
          full_name: name,
          user_type: userType,
          parent_id: parentId,
        },
      },
    })

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: data.user?.id,
          email: data.user?.email,
          name,
          type: userType,
          role: userType,
        },
        message: "Usuário criado com sucesso. Verifique seu email para confirmar a conta.",
      },
    })
  } catch (error) {
    console.error("Register error:", error)
    return NextResponse.json({ success: false, error: error.message}, { status: 500 })
  }
}
