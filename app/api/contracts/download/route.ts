import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const contractId = searchParams.get('contractId')

    if (!contractId) {
      return NextResponse.json(
        { success: false, error: "ID do contrato é obrigatório" },
        { status: 400 }
      )
    }

    // Buscar informações do contrato
    const { data: contract, error: contractError } = await supabase
      .from("investor_contracts")
      .select("*")
      .eq("id", contractId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json(
        { success: false, error: "Contrato não encontrado" },
        { status: 404 }
      )
    }

    // Verificar permissões
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()

    // Apenas admins ou o próprio investidor podem acessar
    if (profile?.user_type !== 'admin' && user.id !== contract.investor_id) {
      return NextResponse.json(
        { success: false, error: "Acesso negado" },
        { status: 403 }
      )
    }

    // Extrair o caminho do arquivo da URL
    const url = new URL(contract.file_url)
    const filePath = url.pathname.split('/').slice(-2).join('/') // Pega os últimos 2 segmentos (bucket/file)

    // Gerar URL assinada para download
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('investor_contracts')
      .createSignedUrl(filePath, 3600) // Válida por 1 hora

    if (signedUrlError) {
      console.error("Signed URL error:", signedUrlError)
      return NextResponse.json(
        { success: false, error: "Erro ao gerar link de download" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        downloadUrl: signedUrlData.signedUrl,
        fileName: contract.file_name,
        fileType: contract.file_type,
        fileSize: contract.file_size
      }
    })

  } catch (error: any) {
    console.error("Download error:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
