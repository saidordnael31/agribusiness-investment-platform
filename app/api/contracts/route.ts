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
    const investorId = searchParams.get('investorId')

    if (!investorId) {
      return NextResponse.json(
        { success: false, error: "ID do investidor é obrigatório" },
        { status: 400 }
      )
    }

    // Verificar permissões
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()

    // Apenas admins podem ver contratos de outros usuários
    // Investidores podem ver apenas seus próprios contratos
    if (profile?.user_type !== 'admin' && user.id !== investorId) {
      return NextResponse.json(
        { success: false, error: "Acesso negado" },
        { status: 403 }
      )
    }

    // Buscar contratos do investidor
    const { data: contracts, error } = await supabase
      .from("investor_contracts")
      .select("*")
      .eq("investor_id", investorId)
      .eq("status", "active")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Get contracts error:", error)
      return NextResponse.json(
        { success: false, error: "Erro ao buscar contratos" },
        { status: 500 }
      )
    }

    // Buscar informações dos usuários que fizeram upload
    const contractsWithUploaderInfo = await Promise.all(
      contracts.map(async (contract) => {
        const { data: uploaderProfile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", contract.uploaded_by)
          .single()

        return {
          ...contract,
          uploaded_by_profile: uploaderProfile || { full_name: "Usuário removido", email: "N/A" }
        }
      })
    )

    return NextResponse.json({
      success: true,
      data: contractsWithUploaderInfo
    })

  } catch (error) {
    console.error("Get contracts error:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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

    // Verificar se é admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()

    if (profile?.user_type !== 'admin') {
      return NextResponse.json(
        { success: false, error: "Apenas administradores podem deletar contratos" },
        { status: 403 }
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
    const { data: contract, error: fetchError } = await supabase
      .from("investor_contracts")
      .select("file_url")
      .eq("id", contractId)
      .single()

    if (fetchError || !contract) {
      return NextResponse.json(
        { success: false, error: "Contrato não encontrado" },
        { status: 404 }
      )
    }

    // Extrair o caminho do arquivo da URL
    const url = new URL(contract.file_url)
    const filePath = url.pathname.split('/').slice(-2).join('/') // Pega os últimos 2 segmentos (bucket/file)

    // Deletar do storage
    const { error: storageError } = await supabase.storage
      .from('investor_contracts')
      .remove([filePath])

    if (storageError) {
      console.error("Storage delete error:", storageError)
    }

    // Deletar do banco de dados
    const { error: dbError } = await supabase
      .from("investor_contracts")
      .delete()
      .eq("id", contractId)

    if (dbError) {
      console.error("DB delete error:", dbError)
      return NextResponse.json(
        { success: false, error: "Erro ao deletar contrato" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Contrato deletado com sucesso!"
    })

  } catch (error) {
    console.error("Delete contract error:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
