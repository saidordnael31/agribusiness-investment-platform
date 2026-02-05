import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import nodemailer from "nodemailer"

export const dynamic = "force-dynamic"

/**
 * Envia e-mail de alerta de renovação para investimentos próximos do vencimento
 */
export async function POST(request: NextRequest) {
  try {
    const { investmentId, userId, amount, expiryDate } = await request.json()
    const supabase = await createServerClient()

    if (!investmentId || !userId || !amount) {
      return NextResponse.json(
        { success: false, error: "Dados obrigatórios: investmentId, userId, amount" },
        { status: 400 }
      )
    }

    // Buscar dados do usuário
    const { data: user, error: userError } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", userId)
      .single()

    if (userError || !user) {
      return NextResponse.json(
        { success: false, error: "Usuário não encontrado" },
        { status: 404 }
      )
    }

    // Formatar valor
    const formattedAmount = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(Number(amount))

    // Formatar data de vencimento
    const formattedExpiryDate = expiryDate
      ? new Date(expiryDate).toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : "em breve"

    // Configurar transporter de e-mail
    const transporter = nodemailer.createTransport({
      host: "smtp.akintec.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER || "agrinvest@akintec.com",
        pass: process.env.EMAIL_PASS || "12345678",
      },
      tls: {
        rejectUnauthorized: false,
        ciphers: 'SSLv3'
      },
      connectionTimeout: 60000,
      greetingTimeout: 30000,
      socketTimeout: 60000,
    })

    // Template do e-mail
    const emailHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Alerta de Renovação - AGRINVEST</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f4f4f4;
          }
          .container {
            background-color: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #00BC6E;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #003F28;
            margin-bottom: 10px;
          }
          .alert-box {
            background-color: #fff3e0;
            border-left: 4px solid #ff9800;
            padding: 20px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .amount-box {
            background-color: #e8f5e8;
            border: 2px solid #00BC6E;
            border-radius: 8px;
            padding: 20px;
            text-align: center;
            margin: 30px 0;
          }
          .amount {
            font-size: 32px;
            font-weight: bold;
            color: #003F28;
          }
          .button-container {
            text-align: center;
            margin: 30px 0;
          }
          .button {
            display: inline-block;
            background-color: #00BC6E;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 5px;
            font-weight: bold;
            margin: 10px;
          }
          .button-secondary {
            background-color: #003F28;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🌱 AGRINVEST</div>
            <p>Clube de Investimentos Agropecuários</p>
          </div>
          
          <h2>Alerta de Renovação de Investimento</h2>
          
          <p>Olá, ${user.full_name || "Investidor"},</p>
          
          <div class="alert-box">
            <strong>⚠️ Seu investimento está próximo do vencimento!</strong>
            <p>Data de vencimento: <strong>${formattedExpiryDate}</strong></p>
          </div>
          
          <p>Você tem um investimento que está próximo do vencimento. Deseja renovar?</p>
          
          <div class="amount-box">
            <div class="amount">${formattedAmount}</div>
            <p style="margin-top: 10px; color: #666;">Valor investido</p>
          </div>
          
          <div class="button-container">
            <p><strong>O que você deseja fazer?</strong></p>
            <p>Você pode renovar seu investimento ou renovar e aumentar o aporte através da plataforma.</p>
          </div>
          
          <p>Acesse sua conta na plataforma AGRINVEST para gerenciar a renovação do seu investimento.</p>
          
          <div class="footer">
            <p>© ${new Date().getFullYear()} AGRINVEST - Todos os direitos reservados</p>
            <p>Este é um email automático, por favor não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `

    const mailOptions = {
      from: "agrinvest@akintec.com",
      to: user.email,
      subject: "🌱 Alerta de Renovação - Seu investimento está próximo do vencimento",
      html: emailHtml,
    }

    try {
      await transporter.verify()
      const info = await transporter.sendMail(mailOptions)
      console.log(`[RENEWAL-EMAIL] ✅ E-mail enviado com sucesso para: ${user.email}`, info.messageId)

      return NextResponse.json({
        success: true,
        message: "E-mail de renovação enviado com sucesso",
        messageId: info.messageId
      })
    } catch (emailError) {
      console.error("[RENEWAL-EMAIL] ❌ Erro ao enviar e-mail:", emailError)
      
      // Salvar e-mail em arquivo em desenvolvimento
      if (process.env.NODE_ENV === "development") {
        const fs = await import("fs")
        const path = await import("path")
        const emailsDir = path.join(process.cwd(), "emails")
        if (!fs.existsSync(emailsDir)) {
          fs.mkdirSync(emailsDir, { recursive: true })
        }
        const filename = `renewal-email-${new Date().toISOString().replace(/:/g, "-")}.txt`
        const filepath = path.join(emailsDir, filename)
        fs.writeFileSync(filepath, emailHtml)
        console.log(`[RENEWAL-EMAIL] E-mail salvo em: ${filepath}`)
      }

      return NextResponse.json({
        success: false,
        error: "Erro ao enviar e-mail, mas o alerta foi registrado",
        details: emailError instanceof Error ? emailError.message : String(emailError)
      }, { status: 500 })
    }
  } catch (error) {
    console.error("Erro ao enviar e-mail de renovação:", error)
    return NextResponse.json(
      { success: false, error: "Erro interno do servidor" },
      { status: 500 }
    )
  }
}

