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
      .select("user_type, role, parent_id, office_id")
      .eq("id", user.id)
      .single()

    console.log("🔍 [DEBUG] Perfil do usuário logado:", profile);
    console.log("🔍 [DEBUG] InvestorId solicitado:", investorId);

    // Verificar se é admin
    const isAdmin = profile?.user_type === 'admin';
    
    // Verificar se é assessor e se o investidor é seu cliente
    const isAdvisor = profile?.user_type === 'distributor' && profile?.role === 'assessor';
    const isOffice = profile?.user_type === 'distributor' && profile?.role === 'escritorio';
    
    // Verificar se o investidor pertence ao assessor/escritório
    let hasPermission = false;
    
    if (isAdmin) {
      hasPermission = true;
    } else if (isAdvisor || isOffice) {
      // Buscar o perfil do investidor para verificar se pertence ao assessor/escritório
      const { data: investorProfile } = await supabase
        .from("profiles")
        .select("parent_id, office_id")
        .eq("id", investorId)
        .single()
      
      console.log("🔍 [DEBUG] Perfil do investidor:", investorProfile);
      
      if (isAdvisor) {
        // Assessor pode ver contratos de seus próprios investidores
        hasPermission = investorProfile?.parent_id === user.id;
      } else if (isOffice) {
        // Escritório pode ver contratos de investidores do seu office_id
        hasPermission = investorProfile?.office_id === user.id;
      }
    } else if (user.id === investorId) {
      // Investidor pode ver seus próprios contratos
      hasPermission = true;
    }

    console.log("🔍 [DEBUG] Tem permissão:", hasPermission);

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: "Acesso negado. Você não tem permissão para ver os contratos deste investidor." },
        { status: 403 }
      )
    }

    // Buscar contratos do investidor usando RPC para contornar RLS
    console.log("🔍 [DEBUG] Buscando contratos na tabela investor_contracts para investor_id:", investorId);
    
    // Primeiro, tentar buscar diretamente
    let { data: contracts, error } = await supabase
      .from("investor_contracts")
      .select("*")
      .eq("investor_id", investorId)
      .eq("status", "active")
      .order("created_at", { ascending: false })

    console.log("🔍 [DEBUG] Resultado da consulta direta:", { contracts, error });

    // Se der erro de RLS, tentar com bypass
    if (error && error.message.includes('row-level security')) {
      console.log("🔍 [DEBUG] Erro de RLS detectado, tentando bypass...");
      
      // Usar service role para contornar RLS
      const { createClient } = await import('@supabase/supabase-js');
      const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      );

      const { data: contractsAdmin, error: errorAdmin } = await supabaseAdmin
        .from("investor_contracts")
        .select("*")
        .eq("investor_id", investorId)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      console.log("🔍 [DEBUG] Resultado com bypass RLS:", { contractsAdmin, errorAdmin });
      
      if (!errorAdmin) {
        contracts = contractsAdmin;
        error = null;
      }
    }

    if (error) {
      console.error("❌ [DEBUG] Erro ao buscar contratos:", error)
      return NextResponse.json(
        { success: false, error: "Erro ao buscar contratos" },
        { status: 500 }
      )
    }

    console.log("✅ [DEBUG] Contratos encontrados:", contracts?.length || 0);

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

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Verificar autenticação
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado" },
        { status: 401 },
      )
    }

    // Verificar se é admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type")
      .eq("id", user.id)
      .single()

    if (profile?.user_type !== "admin") {
      return NextResponse.json(
        { success: false, error: "Apenas administradores podem alterar o vínculo de contratos" },
        { status: 403 },
      )
    }

    const body = await request.json()
    const contractId = body.contractId as string | undefined
    const investmentId = body.investmentId as string | undefined

    if (!contractId) {
      return NextResponse.json(
        { success: false, error: "ID do contrato é obrigatório" },
        { status: 400 },
      )
    }

    if (!investmentId) {
      return NextResponse.json(
        { success: false, error: "ID do investimento é obrigatório" },
        { status: 400 },
      )
    }

    // Buscar contrato para obter o investidor
    const {
      data: contract,
      error: contractError,
    } = await supabase
      .from("investor_contracts")
      .select("id, investor_id")
      .eq("id", contractId)
      .single()

    if (contractError || !contract) {
      return NextResponse.json(
        { success: false, error: "Contrato não encontrado" },
        { status: 404 },
      )
    }

    // Validar se o investimento existe e pertence ao mesmo investidor
    const {
      data: investment,
      error: investmentError,
    } = await supabase
      .from("investments")
      .select("id, user_id")
      .eq("id", investmentId)
      .single()

    if (investmentError || !investment) {
      return NextResponse.json(
        { success: false, error: "Investimento não encontrado" },
        { status: 404 },
      )
    }

    if (investment.user_id !== contract.investor_id) {
      return NextResponse.json(
        { success: false, error: "Investimento selecionado não pertence ao mesmo investidor do contrato" },
        { status: 400 },
      )
    }

    // Atualizar vínculo
    const {
      data: updated,
      error: updateError,
    } = await supabase
      .from("investor_contracts")
      .update({ investment_id: investmentId })
      .eq("id", contractId)
      .select()
      .single()

    if (updateError) {
      console.error("DB update error:", updateError)
      return NextResponse.json(
        { success: false, error: "Erro ao atualizar vínculo do contrato" },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Vínculo do contrato atualizado com sucesso!",
    })
  } catch (error) {
    console.error("Patch contract link error:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 },
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
