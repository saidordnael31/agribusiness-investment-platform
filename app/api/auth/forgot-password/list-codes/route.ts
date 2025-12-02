import { type NextRequest, NextResponse } from "next/server";
import { getAllOtpCodes } from "@/lib/otp-codes-persistent";

// Endpoint apenas para desenvolvimento - lista todos os códigos OTP armazenados
export async function GET(request: NextRequest) {
  // Apenas permitir em desenvolvimento
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { success: false, error: "Endpoint disponível apenas em desenvolvimento" },
      { status: 403 }
    );
  }

  try {
    const codes = await getAllOtpCodes();
    
    return NextResponse.json({
      success: true,
      total: codes.length,
      codes: codes.map(c => ({
        email: c.email,
        code: c.code,
        expiresAt: c.expiresAt.toISOString(),
        verified: c.verified,
        expired: c.expiresAt.getTime() < Date.now(),
      })),
    });
  } catch (error: any) {
    console.error("[FORGOT-PASSWORD-LIST] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao listar códigos" },
      { status: 500 }
    );
  }
}

