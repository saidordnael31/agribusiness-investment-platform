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
    const paymentDate = formData.get('paymentDate') as string

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

    if (!paymentDate) {
      return NextResponse.json(
        { success: false, error: "Data de pagamento é obrigatória" },
        { status: 400 }
      )
    }

    // Validar formato da data
    const paymentDateObj = new Date(paymentDate)
    if (isNaN(paymentDateObj.getTime())) {
      return NextResponse.json(
        { success: false, error: "Data de pagamento inválida" },
        { status: 400 }
      )
    }

    // Verificar se o investimento existe e está pendente
    const { data: investment, error: investmentError } = await supabase
      .from("investments")
      .select("*")
      .eq("id", investmentId)
      .eq("status", "pending")
      .single()

    if (investmentError || !investment) {
      return NextResponse.json(
        { success: false, error: "Investimento não encontrado ou já processado" },
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
        status: 'approved', // Aprovado automaticamente pelo admin
        uploaded_by: user.id,
        approved_by: user.id,
        approved_at: new Date().toISOString()
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

    // Aprovar o investimento
    const updatedAt = new Date().toISOString()
    const { data: updatedInvestment, error: updateError } = await supabase
      .from("investments")
      .update({ 
        status: 'active',
        payment_date: paymentDateObj.toISOString(),
        updated_at: updatedAt
      })
      .eq('id', investmentId)
      .select()
      .single()

    if (updateError) {
      console.error("Erro ao aprovar investimento:", updateError)
      return NextResponse.json(
        { success: false, error: "Erro ao aprovar investimento" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        investment: updatedInvestment,
        receipt: savedReceipt
      },
      message: "Investimento aprovado com comprovante enviado com sucesso!",
    })

  } catch (error) {
    console.error("Erro na aprovação com comprovante:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
