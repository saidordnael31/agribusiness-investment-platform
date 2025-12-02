import { type NextRequest, NextResponse } from "next/server";
import { getOtpCode } from "@/lib/otp-codes-persistent";

// Endpoint apenas para desenvolvimento - retorna o código mais recente para um email
export async function GET(request: NextRequest) {
  // Apenas permitir em desenvolvimento
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { success: false, error: "Endpoint disponível apenas em desenvolvimento" },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { success: false, error: "Email é obrigatório" },
        { status: 400 }
      );
    }

    const otp = await getOtpCode(email);

    if (!otp) {
      return NextResponse.json(
        { success: false, error: "Código não encontrado para este email" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      code: otp.code,
      expiresAt: new Date(otp.expiresAt).toISOString(),
      verified: otp.verified,
      attempts: otp.attempts,
    });
  } catch (error: any) {
    console.error("[FORGOT-PASSWORD-DEBUG] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao buscar código" },
      { status: 500 }
    );
  }
}

