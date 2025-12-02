import { type NextRequest, NextResponse } from "next/server";
import { verifyEmailVerificationCode, deleteEmailVerificationCode } from "@/lib/email-verification-codes";
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

    console.log(`[VERIFY-EMAIL-VERIFY] Verificando código para: ${normalizedEmail}`);

    // Verificar código OTP
    const result = await verifyEmailVerificationCode(normalizedEmail, normalizedCode);

    if (!result.valid) {
      return NextResponse.json(
        { success: false, error: result.message || "Código inválido" },
        { status: 400 }
      );
    }

    if (!result.userId) {
      return NextResponse.json(
        { success: false, error: "ID do usuário não encontrado" },
        { status: 500 }
      );
    }

    console.log(`[VERIFY-EMAIL-VERIFY] ✅ Código verificado. Confirmando email do usuário: ${result.userId}`);

    // Confirmar email no Supabase usando admin API
    const supabase = createAdminClient();
    
    // Buscar usuário atual
    const { data: user, error: getUserError } = await supabase.auth.admin.getUserById(result.userId);
    
    if (getUserError || !user) {
      console.error("Erro ao buscar usuário:", getUserError);
      return NextResponse.json(
        { success: false, error: "Usuário não encontrado" },
        { status: 404 }
      );
    }

    // Atualizar usuário para marcar email como confirmado
    // O Supabase usa email_confirmed_at para marcar emails confirmados
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      result.userId,
      { 
        email_confirm: true,
        email_confirmed_at: new Date().toISOString(),
      }
    );

    if (updateError) {
      console.error("Erro ao confirmar email:", updateError);
      // Não retornar erro se o email já estava confirmado
      if (!updateError.message.includes("already confirmed")) {
        return NextResponse.json(
          { success: false, error: "Erro ao confirmar email" },
          { status: 500 }
        );
      }
    }

    // Remover código após uso bem-sucedido
    await deleteEmailVerificationCode(normalizedEmail);

    console.log(`[VERIFY-EMAIL-VERIFY] ✅ Email confirmado com sucesso para: ${normalizedEmail}`);

    return NextResponse.json({
      success: true,
      message: "Email confirmado com sucesso!",
    });
  } catch (error: any) {
    console.error("[VERIFY-EMAIL-VERIFY] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao processar verificação" },
      { status: 500 }
    );
  }
}

