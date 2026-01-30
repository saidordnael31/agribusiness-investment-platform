import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { checkIsAdmin, checkIsAdvisor, checkIsDistributor } from "@/lib/permission-utils"

export const dynamic = "force-dynamic"

// GET - Listar comprovantes do usuário ou todos (para admin)
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
    const userId = searchParams.get('userId')
    const status = searchParams.get('status') || 'all'
    const transactionId = searchParams.get('transactionId')

    // Verificar perfil do usuário usando APENAS user_type_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type_id")
      .eq("id", user.id)
      .single()

    if (!profile || !profile.user_type_id) {
      return NextResponse.json(
        { success: false, error: "Perfil sem user_type_id configurado" },
        { status: 403 }
      )
    }

    // Verificar tipos usando sistema dinâmico
    const isAdmin = await checkIsAdmin(supabase, user.id)
    const isDistributor = await checkIsDistributor(supabase, user.id)
    const isAdvisor = await checkIsAdvisor(supabase, user.id)
    
    // Buscar user_type para verificar se é office
    const { getUserTypeFromId } = await import("@/lib/user-type-utils")
    const userTypeData = await getUserTypeFromId(profile.user_type_id)
    const isOffice = userTypeData?.user_type === 'office' || userTypeData?.name === 'office'

    let query = supabase
      .from("pix_receipts")
      .select('*')
      .order('created_at', { ascending: false })

    // Se transactionId é fornecido, verificar permissão para aquele investimento específico
    if (transactionId) {
      // Buscar o investimento para verificar permissões
      const { data: investment } = await supabase
        .from("investments")
        .select("id, user_id")
        .eq("id", transactionId)
        .single()

      if (!investment) {
        // Investimento não encontrado, retornar vazio
        query = query.eq('id', '00000000-0000-0000-0000-000000000000')
      } else {
        // Verificar se o usuário tem permissão para ver este investimento
        let hasPermission = false

        if (isAdmin) {
          hasPermission = true
        } else if (user.id === investment.user_id) {
          // Dono do investimento
          hasPermission = true
        } else if (isDistributor) {
          // Buscar perfil do investidor
          const { data: investorProfile } = await supabase
            .from("profiles")
            .select("parent_id, office_id")
            .eq("id", investment.user_id)
            .single()

          if (isAdvisor) {
            hasPermission = investorProfile?.parent_id === user.id
          } else if (isOffice) {
            hasPermission = investorProfile?.office_id === user.id
          } else {
            // Distribuidor de nível superior: verificar se investidor está vinculado
            if (investorProfile?.office_id) {
              const { data: officeProfile } = await supabase
                .from("profiles")
                .select("id, parent_id")
                .eq("id", investorProfile.office_id)
                .single()
              
              if (officeProfile && (officeProfile.id === user.id || officeProfile.parent_id === user.id)) {
                hasPermission = true
              }
            }
            
            if (!hasPermission && investorProfile?.parent_id) {
              const { data: advisorProfile } = await supabase
                .from("profiles")
                .select("id, office_id")
                .eq("id", investorProfile.parent_id)
                .single()
              
              if (advisorProfile && (advisorProfile.id === user.id || advisorProfile.office_id === user.id)) {
                hasPermission = true
              }
            }
          }
        }

        if (hasPermission) {
          // Filtrar apenas comprovantes deste investimento
          query = query.eq('transaction_id', transactionId)
        } else {
          // Sem permissão, retornar vazio
          query = query.eq('id', '00000000-0000-0000-0000-000000000000')
        }
      }
    } else {
      // Sem transactionId, aplicar filtros normais por user_id
      // Definir filtros baseados no tipo de usuário
      if (isAdmin || (isDistributor && userId)) {
        // Admin pode ver todos os comprovantes
        // Distribuidor pode ver comprovantes de um usuário específico quando userId é fornecido
        if (userId) {
          query = query.eq('user_id', userId)
        }
      } else if (isAdvisor) {
        // Assessor pode ver comprovantes dos seus investidores
        // Buscar user_type_id do tipo "investor"
        const { data: investorType } = await supabase
          .from("user_types")
          .select("id")
          .or("user_type.eq.investor,name.eq.investor")
          .single()
        
        if (investorType) {
        const { data: investorIds } = await supabase
          .from("profiles")
          .select("id")
          .eq("parent_id", user.id)
            .eq("user_type_id", investorType.id)
        
        if (investorIds && investorIds.length > 0) {
          const ids = investorIds.map(inv => inv.id)
          query = query.in('user_id', ids)
        } else {
          // Se não tem investidores, retorna array vazio
            query = query.eq('user_id', '00000000-0000-0000-0000-000000000000')
          }
        } else {
          query = query.eq('user_id', '00000000-0000-0000-0000-000000000000')
        }
      } else if (isOffice) {
        // Escritório pode ver comprovantes dos investidores vinculados ao seu office_id
        // Buscar user_type_id do tipo "investor"
        const { data: investorType } = await supabase
          .from("user_types")
          .select("id")
          .or("user_type.eq.investor,name.eq.investor")
          .single()
        
        if (investorType) {
        const { data: officeInvestors } = await supabase
          .from("profiles")
          .select("id")
            .eq("user_type_id", investorType.id)
          .eq("office_id", user.id)

        if (officeInvestors && officeInvestors.length > 0) {
          const ids = officeInvestors.map(inv => inv.id)
          query = query.in('user_id', ids)
        } else {
          // Se não tem investidores vinculados, força retorno vazio
          query = query.eq('user_id', '00000000-0000-0000-0000-000000000000')
        }
      } else {
        // Usuário comum só pode ver seus próprios comprovantes
        query = query.eq('user_id', user.id)
      }
    }

    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: receipts, error } = await query

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json(
        { success: false, error: "Erro ao buscar comprovantes" },
        { status: 500 }
      )
    }


    return NextResponse.json({
      success: true,
      data: receipts || [],
    })
  } catch (error) {
    console.error("Get pix receipts error:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// POST - Upload de comprovante
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

    const formData = await request.formData()
    const file = formData.get('file') as File
    const transactionId = formData.get('transactionId') as string

    if (!file) {
      return NextResponse.json(
        { success: false, error: "Arquivo é obrigatório" },
        { status: 400 }
      )
    }

    // Validar tipo de arquivo
    const allowedTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/webp',
      'application/pdf'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { 
          success: false, 
          error: "Tipo de arquivo não permitido. Use JPG, PNG, WEBP ou PDF" 
        },
        { status: 400 }
      )
    }

    // Validar tamanho do arquivo (máximo 10MB)
    const maxSize = 10 * 1024 * 1024 // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: "Arquivo muito grande. Máximo 10MB" },
        { status: 400 }
      )
    }

    // Gerar nome único para o arquivo
    const fileExtension = file.name.split('.').pop()
    const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`
    
    // Upload do arquivo para o bucket pix_receipts
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('pix_receipts')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error("Upload error:", uploadError)
      return NextResponse.json(
        { success: false, error: "Erro ao fazer upload do arquivo" },
        { status: 500 }
      )
    }

    // Salvar informações do comprovante no banco
    const { data: savedReceipt, error: dbError } = await supabase
      .from("pix_receipts")
      .insert([{
        user_id: user.id,
        transaction_id: transactionId || null,
        file_name: file.name,
        file_path: uploadData.path,
        file_size: file.size,
        file_type: file.type,
        mime_type: file.type,
        uploaded_by: user.id,
        status: 'pending'
      }])
      .select()
      .single()

    if (dbError) {
      console.error("Database error:", dbError)
      // Se der erro no banco, tentar deletar o arquivo do storage
      await supabase.storage
        .from('pix_receipts')
        .remove([uploadData.path])
      
      return NextResponse.json(
        { success: false, error: "Erro ao salvar informações do comprovante" },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: savedReceipt,
    })
  } catch (error) {
    console.error("Upload pix receipt error:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

// DELETE - Deletar comprovante
export async function DELETE(request: NextRequest) {
  try {
    console.log('🗑️ Iniciando exclusão de comprovante')
    
    const supabase = await createServerClient()
    
    // Verificar autenticação
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      console.log('❌ Usuário não autenticado')
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const receiptId = searchParams.get('receiptId')
    
    console.log('📋 Receipt ID:', receiptId)

    if (!receiptId) {
      console.log('❌ ID do comprovante não fornecido')
      return NextResponse.json(
        { success: false, error: "ID do comprovante é obrigatório" },
        { status: 400 }
      )
    }

    // Verificar se é admin usando sistema dinâmico
    const isAdmin = await checkIsAdmin(supabase, user.id)
    console.log('👤 Usuário:', user.id, 'É admin:', isAdmin)

    // Buscar o comprovante para verificar permissões
    const { data: receipt, error: fetchError } = await supabase
      .from("pix_receipts")
      .select("id, user_id, file_path")
      .eq("id", receiptId)
      .single()

    console.log('📄 Comprovante encontrado:', receipt, 'Erro:', fetchError)

    if (fetchError || !receipt) {
      console.log('❌ Comprovante não encontrado')
      return NextResponse.json(
        { success: false, error: "Comprovante não encontrado" },
        { status: 404 }
      )
    }

    // Verificar permissões: admin pode deletar qualquer comprovante, usuário só os próprios
    if (!isAdmin && receipt.user_id !== user.id) {
      console.log('❌ Sem permissão para deletar este comprovante')
      return NextResponse.json(
        { success: false, error: "Sem permissão para deletar este comprovante" },
        { status: 403 }
      )
    }

    // Deletar arquivo do storage
    console.log('🗂️ Deletando arquivo do storage:', receipt.file_path)
    const { data: storageData, error: storageError } = await supabase.storage
      .from('pix_receipts')
      .remove([receipt.file_path])

    console.log('🗂️ Storage response:', { data: storageData, error: storageError })

    if (storageError) {
      console.error("❌ Storage error:", storageError)
      // Retornar erro se não conseguir deletar do storage
      return NextResponse.json(
        { success: false, error: `Erro ao deletar arquivo do storage: ${storageError.message}` },
        { status: 500 }
      )
    } else {
      console.log('✅ Arquivo deletado do storage com sucesso')
    }

    // Deletar registro do banco
    console.log('🗃️ Deletando registro do banco de dados')
    const { data: deleteData, error: dbError } = await supabase
      .from("pix_receipts")
      .delete()
      .eq("id", receiptId)
      .select()

    console.log('🗃️ Database delete response:', { data: deleteData, error: dbError })

    if (dbError) {
      console.error("❌ Database error:", dbError)
      return NextResponse.json(
        { success: false, error: "Erro ao deletar comprovante" },
        { status: 500 }
      )
    }

    // Verificar se realmente deletou
    if (!deleteData || deleteData.length === 0) {
      console.log('⚠️ Nenhum registro foi deletado do banco')
      return NextResponse.json(
        { success: false, error: "Comprovante não encontrado no banco de dados" },
        { status: 404 }
      )
    }

    console.log('✅ Comprovante deletado com sucesso:', deleteData[0])
    return NextResponse.json({
      success: true,
      message: "Comprovante deletado com sucesso"
    })
  } catch (error) {
    console.error("Delete pix receipt error:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
