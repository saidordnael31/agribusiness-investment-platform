import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
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
        { success: false, error: "Apenas administradores podem fazer upload de contratos" },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    const investorId = formData.get('investorId') as string
    const contractName = formData.get('contractName') as string

    if (!file || !investorId || !contractName) {
      return NextResponse.json(
        { success: false, error: "Dados obrigatórios não fornecidos" },
        { status: 400 }
      )
    }

    // Verificar se o investidor existe
    const { data: investor } = await supabase
      .from("profiles")
      .select("id, user_type")
      .eq("id", investorId)
      .single()

    if (!investor || investor.user_type !== 'investor') {
      return NextResponse.json(
        { success: false, error: "Investidor não encontrado" },
        { status: 404 }
      )
    }

    // Validar tipo de arquivo
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: "Tipo de arquivo não permitido. Apenas PDF, JPEG e PNG são aceitos" },
        { status: 400 }
      )
    }

    // Validar tamanho do arquivo (10MB máximo)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: "Arquivo muito grande. Tamanho máximo: 10MB" },
        { status: 400 }
      )
    }

    // Gerar nome único para o arquivo
    const fileExtension = file.name.split('.').pop()
    const fileName = `${investorId}_${Date.now()}.${fileExtension}`
    const filePath = `contracts/${fileName}`

    // Upload do arquivo para o Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('investor_contracts')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json(
        { success: false, error: "Erro ao fazer upload do arquivo" },
        { status: 500 }
      )
    }

    // Obter URL pública do arquivo
    const { data: urlData } = supabase.storage
      .from('investor_contracts')
      .getPublicUrl(filePath)

    // Salvar informações do contrato no banco de dados
    const { data: contractData, error: dbError } = await supabase
      .from("investor_contracts")
      .insert([{
        investor_id: investorId,
        contract_name: contractName,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_size: file.size,
        file_type: file.type,
        uploaded_by: user.id,
        status: 'active'
      }])
      .select()
      .single()

    if (dbError) {
      // Se houver erro ao salvar no banco, remover o arquivo do storage
      await supabase.storage
        .from('investor_contracts')
        .remove([filePath])
      
      return NextResponse.json(
        { success: false, error: "Erro ao salvar informações do contrato" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: contractData,
      message: "Contrato enviado com sucesso!"
    })

  } catch (error) {
    console.error("Upload contract error:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
