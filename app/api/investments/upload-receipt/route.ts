import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
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

    // Verificar se é admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()

    if (profile?.user_type !== 'admin') {
      return NextResponse.json(
        { success: false, error: "Acesso negado. Apenas administradores" },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const investmentId = formData.get('investmentId') as string
    const receiptFile = formData.get('receipt') as File

    if (!investmentId) {
      return NextResponse.json(
        { success: false, error: "ID do investimento é obrigatório" },
        { status: 400 }
      )
    }

    if (!receiptFile) {
      return NextResponse.json(
        { success: false, error: "Comprovante é obrigatório" },
        { status: 400 }
      )
    }

    // Verificar se o investimento existe
    const { data: investment, error: investmentError } = await supabase
      .from("investments")
      .select("*")
      .eq("id", investmentId)
      .single()

    if (investmentError || !investment) {
      return NextResponse.json(
        { success: false, error: "Investimento não encontrado" },
        { status: 404 }
      )
    }

    // Upload do comprovante para o Supabase Storage
    const fileExt = receiptFile.name.split('.').pop()
    const fileName = `${investmentId}-${Date.now()}.${fileExt}`
    const filePath = `admin-receipts/${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pix_receipts')
      .upload(filePath, receiptFile)

    if (uploadError) {
      console.error("Erro no upload:", uploadError)
      return NextResponse.json(
        { success: false, error: "Erro ao fazer upload do comprovante" },
        { status: 500 }
      )
    }

    // Salvar informações do comprovante no banco
    const { data: savedReceipt, error: dbError } = await supabase
      .from("pix_receipts")
      .insert([{
        user_id: investment.user_id,
        transaction_id: investmentId,
        file_name: receiptFile.name,
        file_path: uploadData.path,
        file_size: receiptFile.size,
        file_type: receiptFile.type,
        mime_type: receiptFile.type,
        status: 'pending', // Deixar como pendente para o admin aprovar depois
        uploaded_by: user.id
      }])
      .select()
      .single()

    if (dbError) {
      console.error("Erro ao salvar comprovante:", dbError)
      // Tentar deletar o arquivo do storage se falhou ao salvar no banco
      await supabase.storage.from('pix_receipts').remove([filePath])
      return NextResponse.json(
        { success: false, error: "Erro ao salvar comprovante" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: savedReceipt,
      message: "Comprovante enviado com sucesso! Aguardando aprovação.",
    })

  } catch (error) {
    console.error("Erro no upload de comprovante:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
