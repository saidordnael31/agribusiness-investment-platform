import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Erro de autenticação", 
          details: authError.message,
          code: authError.status
        },
        { status: 401 }
      )
    }
    
    if (!user) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Usuário não autenticado",
          details: "Nenhum usuário encontrado na sessão atual"
        },
        { status: 401 }
      )
    }

    // Verificar perfil do usuário
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type, role, id")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json(
        { success: false, error: "Perfil do usuário não encontrado" },
        { status: 404 }
      )
    }

    // Verificar se é admin ou assessor
    const isAdmin = profile.user_type === 'admin'
    const isAdvisor = profile.user_type === 'distributor' && (profile.role === 'assessor' || profile.role === 'assessor_externo')
    
    if (!isAdmin && !isAdvisor) {
      return NextResponse.json(
        { success: false, error: "Acesso negado. Apenas administradores e assessores podem aprovar investimentos" },
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

    // Se for assessor, verificar se tem permissão para aprovar este investimento
    if (isAdvisor) {
      const { data: investorProfile, error: investorError } = await supabase
        .from("profiles")
        .select("parent_id")
        .eq("id", investment.user_id)
        .eq("user_type", "investor")
        .single()

      if (investorError || !investorProfile) {
        return NextResponse.json(
          { success: false, error: "Investidor não encontrado" },
          { status: 404 }
        )
      }

      // Verificar se o investidor pertence ao assessor
      if (investorProfile.parent_id !== profile.id) {
        return NextResponse.json(
          { success: false, error: "Acesso negado. Você só pode aprovar investimentos dos seus investidores" },
          { status: 403 }
        )
      }
    }

    // Upload do comprovante para o Supabase Storage
    const fileExt = receiptFile.name.split('.').pop()
    const fileName = `${investmentId}-${Date.now()}.${fileExt}`
    const filePath = `admin-receipts/${fileName}`

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pix_receipts')
      .upload(filePath, receiptFile)

    if (uploadError) {
      return NextResponse.json(
        { success: false, error: "Erro ao fazer upload do comprovante" },
        { status: 500 }
      )
    }

    // Tentar salvar o comprovante na tabela pix_receipts
    try {
      // Tentar inserir diretamente na tabela primeiro
      const { data: receiptData, error: receiptError } = await supabase
        .from("pix_receipts")
        .insert({
          user_id: investment.user_id,
          transaction_id: investmentId,
          file_name: receiptFile.name,
          file_path: filePath,
          file_size: receiptFile.size,
          file_type: receiptFile.type,
          mime_type: receiptFile.type,
          status: 'approved',
          uploaded_by: user.id,
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .select()
        .single()

      if (receiptError) {
        // Se der erro de RLS, tentar usar função RPC
        if (receiptError.code === '42501') {
          const { data: rpcData, error: rpcError } = await supabase
            .rpc('insert_pix_receipt', {
              p_user_id: investment.user_id,
              p_transaction_id: investmentId,
              p_file_name: receiptFile.name,
              p_file_path: filePath,
              p_file_size: receiptFile.size,
              p_file_type: receiptFile.type,
              p_mime_type: receiptFile.type,
              p_uploaded_by: user.id,
              p_approved_by: user.id,
              p_status: 'approved',
              p_approved_at: new Date().toISOString()
            })

          if (rpcError) {
            return NextResponse.json(
              { 
                success: false, 
                error: "Erro ao salvar comprovante na base de dados",
                details: rpcError.message
              },
              { status: 500 }
            )
          }
        } else {
          return NextResponse.json(
            { 
              success: false, 
              error: "Erro ao salvar comprovante na base de dados",
              details: receiptError.message
            },
            { status: 500 }
          )
        }
      }
    } catch (receiptTableError) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Erro ao salvar comprovante",
          details: receiptTableError instanceof Error ? receiptTableError.message : String(receiptTableError)
        },
        { status: 500 }
      )
    }

    // Aprovar o investimento
    const updatedAt = new Date().toISOString()
    const updateData = { 
      status: 'active',
      payment_date: paymentDateObj.toISOString(),
      approved_by_admin: isAdvisor ? false : true, // Se for assessor, marcar como não aprovado pelo admin
      updated_at: updatedAt
    }
    
    const { data: updatedInvestment, error: updateError } = await supabase
      .from("investments")
      .update(updateData)
      .eq('id', investmentId)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Erro ao aprovar investimento",
          details: updateError.message,
          code: updateError.code
        },
        { status: 500 }
      )
    }
    return NextResponse.json({
      success: true,
      data: {
        investment: updatedInvestment,
        receipt: {
          filePath,
          fileName: receiptFile.name,
          fileSize: receiptFile.size,
          fileType: receiptFile.type
        }
      },
      message: isAdvisor 
        ? "Investimento aprovado pelo assessor com comprovante enviado! Aguardando aprovação final do administrador."
        : "Investimento aprovado definitivamente pelo administrador com comprovante enviado!",
    })

  } catch (error) {
    return NextResponse.json(
      { 
        success: false, 
        error: "Erro interno do servidor",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}
