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
      .select("user_type, role, parent_id, office_id")
      .eq("id", user.id)
      .single()

    console.log("🔍 [DEBUG] Perfil do usuário logado:", profile);
    console.log("🔍 [DEBUG] User ID (auth.uid()):", user.id);
    console.log("🔍 [DEBUG] Contract investor_id:", contract.investor_id);

    // Verificar se é admin
    const isAdmin = profile?.user_type === 'admin';
    const isDistributor = profile?.user_type === 'distributor';
    
    // Verificar se é assessor e se o investidor é seu cliente
    const isAdvisor = profile?.user_type === 'distributor' && (profile?.role === 'assessor' || profile?.role === 'assessor_externo');
    const isOffice = profile?.user_type === 'distributor' && profile?.role === 'escritorio';
    
    // Verificar se o investidor pertence ao assessor/escritório
    let hasPermission = false;
    
    if (isAdmin) {
      hasPermission = true;
    } else if (user.id === contract.investor_id) {
      // Investidor pode ver seus próprios contratos
      hasPermission = true;
    } else if (isDistributor) {
      // Buscar o perfil do investidor para verificar relacionamento
      const { data: investorProfile } = await supabase
        .from("profiles")
        .select("parent_id, office_id, distributor_id")
        .eq("id", contract.investor_id)
        .single()
      
      console.log("🔍 [DEBUG] Perfil do investidor:", investorProfile);
      console.log("🔍 [DEBUG] Comparação distributor_id:", {
        investor_distributor_id: investorProfile?.distributor_id,
        logged_user_id: user.id,
        match: investorProfile?.distributor_id === user.id
      });
      
      if (isAdvisor) {
        // Assessor pode ver contratos de seus próprios investidores
        hasPermission = investorProfile?.parent_id === user.id;
      } else if (isOffice) {
        // Escritório pode ver contratos de investidores do seu office_id
        hasPermission = investorProfile?.office_id === user.id;
      } else {
        // Distribuidor de nível superior: verificar se investidor está vinculado
        if (investorProfile?.distributor_id === user.id) {
          hasPermission = true;
        } else if (investorProfile?.office_id) {
          const { data: officeProfile } = await supabase
            .from("profiles")
            .select("id, parent_id")
            .eq("id", investorProfile.office_id)
            .single()
          
          if (officeProfile && (officeProfile.id === user.id || officeProfile.parent_id === user.id)) {
            hasPermission = true;
          }
        }
        
        if (!hasPermission && investorProfile?.parent_id) {
          const { data: advisorProfile } = await supabase
            .from("profiles")
            .select("id, office_id")
            .eq("id", investorProfile.parent_id)
            .single()
          
          if (advisorProfile && (advisorProfile.id === user.id || advisorProfile.office_id === user.id)) {
            hasPermission = true;
          }
        }
      }
    }

    console.log("🔍 [DEBUG] Tem permissão para visualizar:", hasPermission);

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: "Acesso negado. Você não tem permissão para visualizar este contrato." },
        { status: 403 }
      )
    }

    // Verificar se é um arquivo PDF
    if (!contract.file_type.includes('pdf')) {
      return NextResponse.json(
        { success: false, error: "Apenas arquivos PDF podem ser visualizados" },
        { status: 400 }
      )
    }

    // Extrair o caminho do arquivo da URL
    console.log("🔍 [DEBUG] Contract file_url:", contract.file_url);
    
    const url = new URL(contract.file_url)
    console.log("🔍 [DEBUG] URL pathname:", url.pathname);
    
    // O caminho deve ser extraído corretamente da URL pública
    // A URL pública tem formato: https://xxx.supabase.co/storage/v1/object/public/investor_contracts/contracts/filename
    const pathParts = url.pathname.split('/')
    console.log("🔍 [DEBUG] Path parts:", pathParts);
    
    // Encontrar o índice do bucket 'investor_contracts' e pegar tudo depois dele
    const bucketIndex = pathParts.findIndex(part => part === 'investor_contracts')
    if (bucketIndex === -1 || bucketIndex === pathParts.length - 1) {
      throw new Error("Formato de URL inválido")
    }
    
    const filePath = pathParts.slice(bucketIndex + 1).join('/')
    console.log("🔍 [DEBUG] Extracted file path:", filePath);
    console.log("🔍 [DEBUG] User ID para verificação de storage:", user.id);
    console.log("🔍 [DEBUG] Contract file_url para comparação:", contract.file_url);

    // Verificar se o arquivo existe no storage
    console.log("🔍 [DEBUG] Verificando se arquivo existe no storage...");
    const { data: fileList, error: listError } = await supabase.storage
      .from('investor_contracts')
      .list('contracts', {
        search: pathParts[pathParts.length - 1] // Nome do arquivo
      });

    console.log("🔍 [DEBUG] File list result:", { fileList, listError });

    if (listError) {
      console.error("List files error:", listError);
    }

    // Tentar gerar URL assinada para visualização
    let viewUrl = contract.file_url; // Fallback para URL pública
    let useSignedUrl = false;
    
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('investor_contracts')
      .createSignedUrl(filePath, 3600) // Válida por 1 hora

    if (signedUrlError) {
      console.error("Signed URL error:", signedUrlError);
      console.error("Signed URL error details:", JSON.stringify(signedUrlError, null, 2));
      
      // Tratamento específico para arquivo não encontrado ou erro de permissão
      if (signedUrlError.statusCode === '404' || 
          signedUrlError.message?.includes('Object not found') ||
          signedUrlError.message?.includes('Bucket not found') ||
          signedUrlError.message?.includes('row-level security') ||
          signedUrlError.message?.includes('policy')) {
        console.log("🔍 [DEBUG] Erro de permissão ou bucket não encontrado, tentando usar URL pública como fallback...");
        // Usar URL pública como fallback
        viewUrl = contract.file_url;
        useSignedUrl = false;
      } else {
        return NextResponse.json(
          { 
            success: false, 
            error: "Erro ao gerar link de visualização",
            details: signedUrlError.message || "Erro desconhecido"
          },
          { status: 500 }
        )
      }
    } else {
      viewUrl = signedUrlData.signedUrl;
      useSignedUrl = true;
    }

    console.log("🔍 [DEBUG] View URL final:", viewUrl);
    console.log("🔍 [DEBUG] Usando signed URL:", useSignedUrl);

    return NextResponse.json({
      success: true,
      data: {
        viewUrl: viewUrl,
        fileName: contract.file_name,
        fileType: contract.file_type,
        fileSize: contract.file_size,
        useSignedUrl: useSignedUrl
      }
    })

  } catch (error: any) {
    console.error("View error:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}
