import { type NextRequest, NextResponse } from "next/server";
import { verifyOtpCode, getOtpCode } from "@/lib/otp-codes-persistent";

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

    console.log(`[FORGOT-PASSWORD-VERIFY] Verificando código para: ${normalizedEmail}`);
    console.log(`[FORGOT-PASSWORD-VERIFY] Código recebido: ${normalizedCode}`);

    // Verificar código OTP (agora é async porque usa persistência)
    const result = await verifyOtpCode(normalizedEmail, normalizedCode);

    console.log(`[FORGOT-PASSWORD-VERIFY] Resultado da verificação:`, result);

    if (!result.valid) {
      return NextResponse.json(
        { success: false, error: result.message || "Código inválido" },
        { status: 400 }
      );
    }

    // Verificar se o código foi marcado como verificado (agora é async)
    const otp = await getOtpCode(normalizedEmail);
    if (otp && otp.verified) {
      console.log(`[FORGOT-PASSWORD-VERIFY] ✅ Código verificado com sucesso para: ${normalizedEmail}`);
      return NextResponse.json({
        success: true,
        message: "Código verificado com sucesso",
        verified: true,
      });
    }

    console.log(`[FORGOT-PASSWORD-VERIFY] ❌ Erro: código não foi marcado como verificado`);
    return NextResponse.json(
      { success: false, error: "Erro ao verificar código" },
      { status: 500 }
    );
  } catch (error: any) {
    console.error("[FORGOT-PASSWORD-VERIFY] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao processar verificação" },
      { status: 500 }
    );
  }
}

