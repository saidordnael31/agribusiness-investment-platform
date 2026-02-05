import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { checkIsAdmin, checkIsAdvisor, checkIsDistributor } from "@/lib/permission-utils"

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

    // Verificar permissões usando APENAS user_type_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_type_id, parent_id, office_id")
      .eq("id", user.id)
      .single()

    console.log("🔍 [DEBUG] Perfil do usuário logado (download):", profile);
    console.log("🔍 [DEBUG] Contract investor_id (download):", contract.investor_id);

    if (!profile || !profile.user_type_id) {
      return NextResponse.json(
        { success: false, error: "Perfil sem user_type_id configurado" },
        { status: 403 }
      )
    }

    // Verificar tipos usando sistema dinâmico
    const isAdmin = await checkIsAdmin(supabase, user.id);
    const isDistributor = await checkIsDistributor(supabase, user.id);
    const isAdvisor = await checkIsAdvisor(supabase, user.id);
    
    // Buscar user_type para verificar se é office
    const { getUserTypeFromId } = await import("@/lib/user-type-utils");
    const userTypeData = await getUserTypeFromId(profile.user_type_id);
    const isOffice = userTypeData?.user_type === 'office' || userTypeData?.name === 'office';
    
    // Verificar se o investidor pertence ao assessor/escritório
    let hasPermission = false;
    
    if (isAdmin) {
      hasPermission = true;
    } else if (user.id === contract.investor_id) {
      // Investidor pode baixar seus próprios contratos
      hasPermission = true;
    } else if (isDistributor || isOffice) {
      // Buscar o perfil do investidor para verificar relacionamento
      const { data: investorProfile } = await supabase
        .from("profiles")
        .select("parent_id, office_id, distributor_id")
        .eq("id", contract.investor_id)
        .single()
      
      if (isAdvisor && !isOffice) {
        hasPermission = investorProfile?.parent_id === user.id;
      } else if (isOffice) {
        hasPermission = investorProfile?.office_id === user.id;
        if (!hasPermission && investorProfile?.parent_id) {
          const { data: advisorProfile } = await supabase
            .from("profiles")
            .select("office_id")
            .eq("id", investorProfile.parent_id)
            .single();
          hasPermission = advisorProfile?.office_id === user.id;
        }
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

    console.log("🔍 [DEBUG] Tem permissão para download:", hasPermission);

    if (!hasPermission) {
      return NextResponse.json(
        { success: false, error: "Acesso negado. Você não tem permissão para baixar este contrato." },
        { status: 403 }
      )
    }

    // Extrair o caminho do arquivo da URL
    console.log("🔍 [DEBUG] Contract file_url (download):", contract.file_url);
    
    const url = new URL(contract.file_url)
    console.log("🔍 [DEBUG] URL pathname (download):", url.pathname);
    
    // O caminho deve ser extraído corretamente da URL pública
    // A URL pública tem formato: https://xxx.supabase.co/storage/v1/object/public/investor_contracts/contracts/filename
    const pathParts = url.pathname.split('/')
    console.log("🔍 [DEBUG] Path parts (download):", pathParts);
    
    // Encontrar o índice do bucket 'investor_contracts' e pegar tudo depois dele
    const bucketIndex = pathParts.findIndex(part => part === 'investor_contracts')
    if (bucketIndex === -1 || bucketIndex === pathParts.length - 1) {
      throw new Error("Formato de URL inválido")
    }
    
    const filePath = pathParts.slice(bucketIndex + 1).join('/')
    console.log("🔍 [DEBUG] Extracted file path (download):", filePath);

    // Verificar se o arquivo existe no storage
    console.log("🔍 [DEBUG] Verificando se arquivo existe no storage (download)...");
    const { data: fileList, error: listError } = await supabase.storage
      .from('investor_contracts')
      .list('contracts', {
        search: pathParts[pathParts.length - 1] // Nome do arquivo
      });

    console.log("🔍 [DEBUG] File list result (download):", { fileList, listError });

    if (listError) {
      console.error("List files error (download):", listError);
    }

    // Tentar gerar URL assinada para download
    let downloadUrl = contract.file_url; // Fallback para URL pública
    let useSignedUrl = false;
    
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('investor_contracts')
      .createSignedUrl(filePath, 3600) // Válida por 1 hora

    if (signedUrlError) {
      console.error("Signed URL error (download):", signedUrlError);
      
      // Tratamento específico para arquivo não encontrado
      if (signedUrlError.statusCode === '404' || signedUrlError.message.includes('Object not found')) {
        console.log("🔍 [DEBUG] Tentando usar URL pública como fallback (download)...");
        // Usar URL pública como fallback
        downloadUrl = contract.file_url;
        useSignedUrl = false;
      } else {
        return NextResponse.json(
          { success: false, error: "Erro ao gerar link de download" },
          { status: 500 }
        )
      }
    } else {
      downloadUrl = signedUrlData.signedUrl;
      useSignedUrl = true;
    }

    console.log("🔍 [DEBUG] Download URL final:", downloadUrl);
    console.log("🔍 [DEBUG] Usando signed URL (download):", useSignedUrl);

    return NextResponse.json({
      success: true,
      data: {
        downloadUrl: downloadUrl,
        fileName: contract.file_name,
        fileType: contract.file_type,
        fileSize: contract.file_size,
        useSignedUrl: useSignedUrl
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
