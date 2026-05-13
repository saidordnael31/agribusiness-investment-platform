import { type NextRequest, NextResponse } from "next/server";
import { verifyOtpCode, getOtpCode, deleteOtpCode } from "@/lib/otp-codes-persistent";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email é obrigatório" },
        { status: 400 }
      );
    }

    if (!code || typeof code !== "string") {
      return NextResponse.json(
        { success: false, error: "Código é obrigatório" },
        { status: 400 }
      );
    }

    // Normalizar email e código
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = code.trim();

    console.log(`[LOGIN-WITH-CODE-VERIFY] Verificando código para: ${normalizedEmail}`);
    console.log(`[LOGIN-WITH-CODE-VERIFY] Código recebido: ${normalizedCode}`);

    // Verificar código OTP
    const result = await verifyOtpCode(normalizedEmail, normalizedCode);

    console.log(`[LOGIN-WITH-CODE-VERIFY] Resultado da verificação:`, result);

    if (!result.valid) {
      return NextResponse.json(
        { success: false, error: result.message || "Código inválido" },
        { status: 400 }
      );
    }

    // Verificar se o código foi marcado como verificado
    const otp = await getOtpCode(normalizedEmail);
    if (!otp || !otp.verified || otp.code !== normalizedCode) {
      console.log(`[LOGIN-WITH-CODE-VERIFY] ❌ Erro: código não foi marcado como verificado`);
      return NextResponse.json(
        { success: false, error: "Erro ao verificar código" },
        { status: 500 }
      );
    }

    // Buscar usuário na tabela profiles
    const supabase = createAdminClient();
    let { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("email", normalizedEmail)
      .single();

    // Se o perfil não existe, criar um novo perfil de investidor
    if (profileError || !profile) {
      console.log(`[LOGIN-WITH-CODE-VERIFY] Perfil não encontrado, criando novo perfil para: ${normalizedEmail}`);
      
      const newProfileId = crypto.randomUUID();
      const { data: newProfile, error: createError } = await supabase
        .from("profiles")
        .insert({
          id: newProfileId,
          email: normalizedEmail,
          full_name: normalizedEmail.split("@")[0],
          user_type: "investor",
          is_pass_temp: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (createError || !newProfile) {
        console.error("Erro ao criar perfil:", createError);
        return NextResponse.json(
          { success: false, error: "Erro ao criar perfil do usuário" },
          { status: 500 }
        );
      }

      profile = newProfile;
      console.log(`[LOGIN-WITH-CODE-VERIFY] ✅ Novo perfil criado: ${profile.id}`);
    } else {
      console.log(`[LOGIN-WITH-CODE-VERIFY] ✅ Perfil encontrado: ${profile.id}`);
    }

    // Verificar se o usuário tem conta de autenticação no Supabase Auth
    let authUser = null;
    try {
      const { data: users, error: listError } = await supabase.auth.admin.listUsers();
      
      if (!listError && users?.users) {
        authUser = users.users.find(
          (u) => u.email?.toLowerCase() === normalizedEmail
        );
      }
    } catch (error) {
      console.error("Erro ao listar usuários do Auth:", error);
    }

    // Se o usuário não tem conta de autenticação, ainda permitir login usando apenas o profile
    // O sistema pode funcionar com ou sem autenticação do Supabase Auth

    // Preparar dados do usuário
    const userData = {
      id: profile.id,
      email: profile.email,
      name: profile.full_name || profile.email.split("@")[0],
      user_type: profile.user_type || "investor",
      office_id: profile.office_id || null,
      role: profile.role || null,
      rescue_type: profile.rescue_type || null,
    };

    // Remover código OTP após uso bem-sucedido
    await deleteOtpCode(normalizedEmail);

    console.log(`[LOGIN-WITH-CODE-VERIFY] ✅ Login realizado com sucesso para: ${normalizedEmail}`);

    return NextResponse.json({
      success: true,
      message: "Login realizado com sucesso",
      user: userData,
    });
  } catch (error: any) {
    console.error("[LOGIN-WITH-CODE-VERIFY] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao processar login" },
      { status: 500 }
    );
  }
}














