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

    console.log("🔍 [DEBUG] Perfil do usuário logado (download):", profile);
    console.log("🔍 [DEBUG] Contract investor_id (download):", contract.investor_id);

    // Verificar se é admin
    const isAdmin = profile?.user_type === 'admin';
    
    // Verificar se é assessor e se o investidor é seu cliente
    const isAdvisor = profile?.user_type === 'distributor' && profile?.role === 'assessor';
    const isOffice = profile?.user_type === 'distributor' && profile?.role === 'escritorio';
    
    // Verificar se o investidor pertence ao assessor/escritório
    let hasPermission = false;
    
    if (isAdmin) {
      hasPermission = true;
    } else if (user.id === contract.investor_id) {
      // Investidor pode baixar seus próprios contratos
      hasPermission = true;
    } else if (isAdvisor || isOffice) {
      // Buscar o perfil do investidor para verificar se pertence ao assessor/escritório
      const { data: investorProfile } = await supabase
        .from("profiles")
        .select("parent_id, office_id")
        .eq("id", contract.investor_id)
        .single()
      
      console.log("🔍 [DEBUG] Perfil do investidor (download):", investorProfile);
      
      if (isAdvisor) {
        // Assessor pode baixar contratos de seus próprios investidores
        hasPermission = investorProfile?.parent_id === user.id;
      } else if (isOffice) {
        // Escritório pode baixar contratos de investidores do seu office_id
        hasPermission = investorProfile?.office_id === user.id;
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
