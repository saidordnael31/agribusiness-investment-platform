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
      .select("user_type, role")
      .eq("id", user.id)
      .single()

    const isAdmin = profile?.user_type === 'admin'
    const isOwner = receipt.user_id === user.id
    const isAdvisor = profile?.user_type === 'distributor' && profile?.role === 'assessor'
    const isOffice = profile?.user_type === 'distributor' && profile?.role === 'escritorio'

    // Verificar se assessor tem acesso ao investidor
    let hasAdvisorAccess = false
    if (isAdvisor) {
      const { data: investorProfile } = await supabase
        .from("profiles")
        .select("parent_id")
        .eq("id", receipt.user_id)
        .eq("user_type", "investor")
        .single()
      
      hasAdvisorAccess = investorProfile?.parent_id === user.id
    }

    // Verificar se escritório tem acesso ao investidor (via office_id)
    let hasOfficeAccess = false
    if (isOffice) {
      const { data: investorProfile } = await supabase
        .from("profiles")
        .select("office_id")
        .eq("id", receipt.user_id)
        .eq("user_type", "investor")
        .single()

      hasOfficeAccess = investorProfile?.office_id === user.id
    }

    if (!isAdmin && !isOwner && !hasAdvisorAccess && !hasOfficeAccess) {
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
      // Se o arquivo não existe, retornar erro específico
      if (urlError.statusCode === '404' || urlError.message.includes('Object not found')) {
        return NextResponse.json(
          { success: false, error: "Arquivo não encontrado no storage" },
          { status: 404 }
        )
      }
      
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
