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
    const isDistributor = profile?.user_type === 'distributor'
    const isOwner = receipt.user_id === user.id
    const isAdvisor =
      profile?.user_type === 'distributor' &&
      (profile?.role === 'assessor' || profile?.role === 'assessor_externo')
    const isOffice = profile?.user_type === 'distributor' && profile?.role === 'escritorio'

    // Buscar perfil do usuário que possui o comprovante
    const { data: receiptOwnerProfile } = await supabase
      .from("profiles")
      .select("user_type, role, parent_id, office_id")
      .eq("id", receipt.user_id)
      .single()

    let hasAccess = false

    if (isAdmin || isOwner) {
      hasAccess = true
    } else if (isDistributor && receiptOwnerProfile) {
      // Distribuidor pode ver comprovantes de escritórios, assessores e investidores vinculados
      const isTargetOffice = receiptOwnerProfile.user_type === 'distributor' && receiptOwnerProfile.role === 'escritorio'
      const isTargetAdvisor = receiptOwnerProfile.user_type === 'distributor' && (receiptOwnerProfile.role === 'assessor' || receiptOwnerProfile.role === 'assessor_externo')
      const isTargetInvestor = receiptOwnerProfile.user_type === 'investor'

      if (isTargetOffice || isTargetAdvisor) {
        // Pode ver comprovantes de escritórios e assessores
        hasAccess = true
      } else if (isTargetInvestor) {
        // Investidor: verificar se está vinculado ao distribuidor
        if (isAdvisor) {
          hasAccess = receiptOwnerProfile.parent_id === user.id
        } else if (isOffice) {
          hasAccess = receiptOwnerProfile.office_id === user.id
        } else {
          // Distribuidor de nível superior: verificar se investidor está vinculado a seus escritórios/assessores
          if (receiptOwnerProfile.office_id) {
            const { data: officeProfile } = await supabase
              .from("profiles")
              .select("id, parent_id")
              .eq("id", receiptOwnerProfile.office_id)
              .single()
            
            if (officeProfile && (officeProfile.id === user.id || officeProfile.parent_id === user.id)) {
              hasAccess = true
            }
          }
          
          if (!hasAccess && receiptOwnerProfile.parent_id) {
            const { data: advisorProfile } = await supabase
              .from("profiles")
              .select("id, office_id")
              .eq("id", receiptOwnerProfile.parent_id)
              .single()
            
            if (advisorProfile && (advisorProfile.id === user.id || advisorProfile.office_id === user.id)) {
              hasAccess = true
            }
          }
        }
      }
    }

    if (!hasAccess) {
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
