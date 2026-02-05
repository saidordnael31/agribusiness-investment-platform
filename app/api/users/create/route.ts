import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação do usuário logado
    const supabase = await createServerClient();
    const {
      data: { user: loggedUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !loggedUser) {
      return NextResponse.json(
        { success: false, error: "Usuário não autenticado" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      email,
      password,
      name,
      selectedUserTypeId,
      userType,
      role,
      parentId,
      distributorId,
      officeId,
      phone,
      cpfCnpj,
      address,
      pixKey,
      bankName,
      bankBranch,
      bankAccount,
      notes,
    } = body;

    // Validar campos obrigatórios
    if (!email || !password || !name || !selectedUserTypeId) {
      return NextResponse.json(
        { success: false, error: "Campos obrigatórios faltando" },
        { status: 400 }
      );
    }

    // Usar service role para criar usuário sem afetar a sessão atual
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        { success: false, error: "Configuração do servidor não encontrada" },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Criar usuário no Supabase Auth usando admin
    const { data: authData, error: createAuthError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // Confirmar email automaticamente
        user_metadata: {
          full_name: name,
          user_type: userType,
          role: role,
          parent_id: parentId,
          cpf_cnpj: cpfCnpj,
          phone: phone,
          notes: notes,
          is_pass_temp: true,
        },
      });

    if (createAuthError || !authData.user) {
      console.error("Erro ao criar usuário:", createAuthError);
      return NextResponse.json(
        {
          success: false,
          error: createAuthError?.message || "Erro ao criar usuário",
        },
        { status: 400 }
      );
    }

    // Criar perfil
    const { error: profileError } = await supabaseAdmin.from("profiles").insert([
      {
        id: authData.user.id,
        email: authData.user.email,
        full_name: name,
        user_type_id: selectedUserTypeId,
        user_type: userType,
        role: role,
        parent_id: parentId || null,
        distributor_id: distributorId || null,
        office_id: officeId || null,
        phone: phone || null,
        cnpj: cpfCnpj || null,
        address: address || null,
        pix_usdt_key: pixKey || null,
        bank_name: bankName || null,
        bank_branch: bankBranch || null,
        bank_account: bankAccount || null,
        notes: notes || null,
        is_active: true,
        is_pass_temp: true,
      },
    ]);

    if (profileError) {
      console.error("Erro ao criar perfil:", profileError);
      // Tentar deletar o usuário criado se o perfil falhar
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json(
        {
          success: false,
          error: `Erro ao criar perfil: ${profileError.message}`,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        userId: authData.user.id,
        email: authData.user.email,
        password: password, // Retornar senha para enviar por email
      },
    });
  } catch (error: any) {
    console.error("Erro ao criar usuário:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Erro interno do servidor",
      },
      { status: 500 }
    );
  }
}

