import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const userData = await request.json()

    const registrationData = {
      username: userData.email,
      email: userData.email,
      password: userData.password,
      password2: userData.password, // confirmação da senha
      first_name: userData.firstName,
      last_name: userData.lastName,
      cpf: userData.cpf?.replace(/\D/g, "") || "", // remove máscaras
      whatsapp: userData.phone?.replace(/\D/g, "") || "", // remove máscaras
      rg: userData.rg?.replace(/\D/g, "") || "", // remove máscaras
    }

    console.log("[v0] Enviando dados para API externa:", registrationData)

    const response = await fetch("https://api.agroderivative.tech/api/users/register/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(registrationData),
    })

    const responseData = await response.json()

    if (!response.ok) {
      console.error("[v0] Erro da API externa:", responseData)
      return NextResponse.json(
        {
          success: false,
          error: responseData.message || "Erro ao cadastrar usuário na API externa",
        },
        { status: response.status },
      )
    }

    console.log("[v0] Usuário cadastrado com sucesso na API externa:", responseData)

    return NextResponse.json({
      success: true,
      data: responseData,
      message: "Usuário cadastrado com sucesso na API externa.",
    })
  } catch (error) {
    console.error("[v0] Erro no proxy de registro:", error)
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Erro interno do servidor",
      },
      { status: 500 },
    )
  }
}
