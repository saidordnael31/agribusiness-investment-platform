import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { value, cpf } = await request.json()

    console.log("[v0] Gerando QR Code PIX fixo para:", { value, cpf })

    const fixedPixCode =
      "00020101021126430014br.gov.bcb.pix0121agrinvest@akintec.com5204000053039865802BR5907AKINTEC6009SAO PAULO622905251K5CDD6XWS83EN88991WEBV4G63047E03"

    // Retornando QR Code fixo em vez de chamar API externa
    return NextResponse.json(
      {
        success: true,
        qrCode: "/images/qr-code-pix.png", // Usando imagem local em vez de base64
        paymentString: fixedPixCode,
        originalData: {
          value: Number.parseFloat(value),
          cpf: cpf,
          message: "QR Code PIX fixo - AKINTEC",
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("[v0] Erro ao gerar QR Code:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro interno do servidor",
      },
      { status: 500 },
    )
  }
}
