import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { value, cpf } = await request.json()

    console.log("[v0] Gerando QR Code PIX para:", { value, cpf })

    const externalApiUrl = "https://api.agroderivative.tech/api/generate-fiat-deposit-qrcode/"

    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-API-Key": "55211ed1-2782-4ae9-b0d1-7569adccd86d",
    }

    const data = {
      value: Number.parseFloat(value),
      cpf: cpf,
    }

    console.log("[v0] Fazendo requisição para:", externalApiUrl)
    console.log("[v0] Dados enviados:", data)

    const response = await fetch(externalApiUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      console.log("[v0] Erro na API externa:", response.status, response.statusText)
      throw new Error(`API externa retornou erro: ${response.error}`)
    }

    const responseData = await response.json()
    console.log("[v0] Resposta da API externa:", responseData)

    return NextResponse.json(
      {
        success: true,
        qrCode: `data:image/png;base64,${responseData.qrCode}`,
        paymentString:
          responseData.paymentString ||
          responseData.payment_string ||
          responseData.pix_code ||
          responseData.code ||
          null,
        originalData: responseData,
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
