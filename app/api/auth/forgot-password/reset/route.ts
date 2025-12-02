import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getOtpCode, deleteOtpCode } from "@/lib/otp-codes-persistent";

export async function POST(request: NextRequest) {
  try {
    const { email, code, newPassword } = await request.json();

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

    if (!newPassword || typeof newPassword !== "string") {
      return NextResponse.json(
        { success: false, error: "Nova senha é obrigatória" },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { success: false, error: "A senha deve ter pelo menos 6 caracteres" },
        { status: 400 }
      );
    }

    // Normalizar email
    const normalizedEmail = email.toLowerCase().trim();
    const normalizedCode = code.trim();

    console.log(`[FORGOT-PASSWORD-RESET] Tentando resetar senha para: ${normalizedEmail}`);

    // Verificar se o código foi verificado (agora é async)
    const otp = await getOtpCode(normalizedEmail);
    
    console.log(`[FORGOT-PASSWORD-RESET] Código encontrado:`, otp ? {
      code: otp.code,
      verified: otp.verified,
      expiresAt: new Date(otp.expiresAt).toLocaleString('pt-BR'),
      expired: otp.expiresAt < Date.now(),
    } : 'NÃO ENCONTRADO');

    if (!otp || !otp.verified || otp.code !== normalizedCode) {
      console.log(`[FORGOT-PASSWORD-RESET] ❌ Código inválido ou não verificado`);
      return NextResponse.json(
        { success: false, error: "Código não verificado ou inválido" },
        { status: 400 }
      );
    }

    // Verificar se o código não expirou
    if (otp.expiresAt < Date.now()) {
      console.log(`[FORGOT-PASSWORD-RESET] ❌ Código expirado`);
      await deleteOtpCode(normalizedEmail);
      return NextResponse.json(
        { success: false, error: "Código expirado. Solicite um novo código." },
        { status: 400 }
      );
    }

    // Buscar usuário pelo email e atualizar senha
    const supabase = createAdminClient();
    
    // Primeiro, verificar se o usuário existe na tabela profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("email", normalizedEmail)
      .single();

    if (profileError || !profile) {
      console.error("Erro ao buscar perfil:", profileError);
      console.log(`[FORGOT-PASSWORD-RESET] Usuário não encontrado na tabela profiles para: ${normalizedEmail}`);
      return NextResponse.json(
        { success: false, error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    console.log(`[FORGOT-PASSWORD-RESET] Perfil encontrado: ${profile.id}`);

    // Tentar buscar usuário no Auth pelo email
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

    // Se encontrou usuário no Auth, atualizar senha
    if (authUser) {
      console.log(`[FORGOT-PASSWORD-RESET] Atualizando senha para usuário existente: ${authUser.id}`);
      
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        authUser.id,
        { password: newPassword }
      );

      if (updateError) {
        console.error("Erro ao atualizar senha:", updateError);
        return NextResponse.json(
          { success: false, error: "Erro ao atualizar senha" },
          { status: 500 }
        );
      }

      console.log(`[FORGOT-PASSWORD-RESET] ✅ Senha atualizada com sucesso`);
    } else {
      // Usuário não tem conta de autenticação, criar uma
      console.log(`[FORGOT-PASSWORD-RESET] Usuário não tem conta de autenticação, criando...`);
      
      // Primeiro, tentar atualizar usando o profile.id (caso seja um UUID do Auth)
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(profile.id);
      
      if (isUUID) {
        // Tentar atualizar usando o ID do profile
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          profile.id,
          { password: newPassword }
        );

        if (!updateError) {
          console.log(`[FORGOT-PASSWORD-RESET] ✅ Senha atualizada usando ID do profile`);
        } else {
          // Se falhar, criar nova conta
          console.log(`[FORGOT-PASSWORD-RESET] ID do profile não é do Auth, criando nova conta...`);
          const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email: normalizedEmail,
            password: newPassword,
            email_confirm: true,
          });

          if (createError) {
            console.error("Erro ao criar usuário no Auth:", createError);
            return NextResponse.json(
              { success: false, error: "Erro ao criar conta de autenticação" },
              { status: 500 }
            );
          }

          console.log(`[FORGOT-PASSWORD-RESET] ✅ Conta de autenticação criada com ID: ${newUser.user.id}`);
        }
      } else {
        // Profile.id não é UUID, criar nova conta
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: normalizedEmail,
          password: newPassword,
          email_confirm: true,
        });

        if (createError) {
          console.error("Erro ao criar usuário no Auth:", createError);
          return NextResponse.json(
            { success: false, error: "Erro ao criar conta de autenticação" },
            { status: 500 }
          );
        }

        console.log(`[FORGOT-PASSWORD-RESET] ✅ Conta de autenticação criada com ID: ${newUser.user.id}`);
      }
    }

    // Remover código OTP após uso bem-sucedido (agora é async)
    await deleteOtpCode(normalizedEmail);

    console.log(`[FORGOT-PASSWORD-RESET] Senha atualizada para: ${email}`);

    return NextResponse.json({
      success: true,
      message: "Senha redefinida com sucesso",
    });
  } catch (error: any) {
    console.error("[FORGOT-PASSWORD-RESET] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao processar redefinição de senha" },
      { status: 500 }
    );
  }
}

