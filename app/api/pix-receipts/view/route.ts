import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

// GET - Visualizar comprovante
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

    const { searchParams } = new URL(request.url)
    const receiptId = searchParams.get('receiptId')

    if (!receiptId) {
      return NextResponse.json(
        { success: false, error: "ID do comprovante é obrigatório" },
        { status: 400 }
      )
    }

    // Buscar informações do comprovante
    const { data: receipt, error: fetchError } = await supabase
      .from("pix_receipts")
      .select("*")
      .eq("id", receiptId)
      .single()

    if (fetchError || !receipt) {
      return NextResponse.json(
        { success: false, error: "Comprovante não encontrado" },
        { status: 404 }
      )
    }

    // Verificar permissões
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()

    const isAdmin = profile?.user_type === 'admin'
    const isOwner = receipt.user_id === user.id

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { success: false, error: "Acesso negado" },
        { status: 403 }
      )
    }

    // Gerar URL assinada para visualizar o arquivo
    const { data: signedUrl, error: urlError } = await supabase.storage
      .from('pix_receipts')
      .createSignedUrl(receipt.file_path, 3600) // URL válida por 1 hora

    if (urlError) {
      console.error("URL generation error:", urlError)
      return NextResponse.json(
        { success: false, error: "Erro ao gerar URL do arquivo" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        ...receipt,
        signed_url: signedUrl.signedUrl
      }
    })
  } catch (error) {
    console.error("View pix receipt error:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
