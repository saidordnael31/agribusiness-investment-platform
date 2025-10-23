import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { value, cpf, email, userName } = await request.json()

    console.log("[v0] Gerando QR Code PIX fixo para:", { value, cpf, email, userName })

    const fixedPixCode =
      "00020101021126360014br.gov.bcb.pix0114630936810001085204000053039865802BR5913AGRINVEST SCP6009SAO PAULO62070503***6304A7ED"

    console.log("[v0] Enviando email com código PIX para:", { email, userName })
    // Enviar email com código PIX se email e nome do usuário foram fornecidos
    if (email && userName) {
      try {
        // Tentar primeiro com Hostinger (se configurado)
        let emailResponse = await fetch(`${request.nextUrl.origin}/api/email/send-pix-code-hostinger`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email,
            userName,
            pixCode: fixedPixCode,
            amount: Number.parseFloat(value),
            cpf
          })
        })

        if (!emailResponse.ok) {
          console.log("[v0] Hostinger falhou, usando simulação local...")
          
          // Se Hostinger falhar, usar simulação local
          emailResponse = await fetch(`${request.nextUrl.origin}/api/email/send-pix-code-simple`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email,
              userName,
              pixCode: fixedPixCode,
              amount: Number.parseFloat(value),
              cpf
            })
          })
        }

        if (emailResponse.ok) {
          console.log("[v0] Email PIX enviado com sucesso para:", email)
        } else {
          console.error("[v0] Erro ao enviar email PIX:", await emailResponse.text())
        }
      } catch (emailError) {
        console.error("[v0] Erro ao enviar email PIX:", emailError)
        // Não falha a geração do QR Code se o email falhar
      }
    }

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