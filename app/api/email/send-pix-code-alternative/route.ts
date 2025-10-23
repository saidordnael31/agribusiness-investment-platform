import { type NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: NextRequest) {
  try {
    const { email, userName, pixCode, amount, cpf } = await request.json();

    console.log("[v0] Tentando configuração SMTP alternativa para:", {
      email,
      userName,
      pixCode,
      amount,
      cpf,
    });

    // Configurações alternativas para tentar
    const alternativeConfigs = [
      {
        host: "smtp.akintec.com",
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER || "agrinvest@akintec.com",
          pass: process.env.EMAIL_PASS || "12345678",
        },
        tls: { rejectUnauthorized: false }
      },
      {
        host: "mail.akintec.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER || "agrinvest@akintec.com",
          pass: process.env.EMAIL_PASS || "12345678",
        },
        tls: { rejectUnauthorized: false }
      },
      {
        host: "smtp.akintec.com",
        port: 25,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER || "agrinvest@akintec.com",
          pass: process.env.EMAIL_PASS || "12345678",
        },
        tls: { rejectUnauthorized: false }
      },
      {
        host: "mail.akintec.com",
        port: 465,
        secure: true,
        auth: {
          user: process.env.EMAIL_USER || "agrinvest@akintec.com",
          pass: process.env.EMAIL_PASS || "12345678",
        },
        tls: { rejectUnauthorized: false }
      }
    ];

    let transporter;
    let lastError;

    // Tentar cada configuração alternativa
    for (const config of alternativeConfigs) {
      try {
        transporter = nodemailer.createTransport({
          ...config,
          connectionTimeout: 30000,
          greetingTimeout: 15000,
          socketTimeout: 30000,
        });
        
        // Testar a conexão
        await transporter.verify();
        console.log(`[v0] Configuração alternativa funcionou: ${config.host}:${config.port}`);
        break;
      } catch (error) {
        console.log(`[v0] Falha na configuração alternativa ${config.host}:${config.port}:`, error instanceof Error ? error.message : String(error));
        lastError = error;
        continue;
      }
    }

    if (!transporter) {
      throw new Error(`Todas as configurações alternativas falharam. Último erro: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
    }

    // Template do email (mesmo da API principal)
    const emailHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Código PIX - AGRINVEST</title>
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
            border-bottom: 2px solid #2e7d32;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo {
            font-size: 24px;
            font-weight: bold;
            color: #2e7d32;
            margin-bottom: 10px;
          }
          .content {
            margin-bottom: 30px;
          }
          .pix-info {
            background-color: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #2e7d32;
            margin: 20px 0;
          }
          .pix-code {
            background-color: #e8f5e8;
            padding: 15px;
            border-radius: 5px;
            font-family: monospace;
            font-size: 14px;
            word-break: break-all;
            margin: 10px 0;
            border: 1px solid #c8e6c9;
          }
          .amount {
            font-size: 20px;
            font-weight: bold;
            color: #2e7d32;
            text-align: center;
            margin: 15px 0;
          }
          .instructions {
            background-color: #fff3e0;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #ff9800;
            margin: 20px 0;
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
          
          <div class="content">
            <h2>Olá, ${userName}!</h2>
            <p>Seu código PIX foi gerado com sucesso para o investimento.</p>
            
            <div class="pix-info">
              <h3>📱 Informações do PIX</h3>
              <div class="amount">Valor: R$ ${amount.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}</div>
              <p><strong>CPF:</strong> ${cpf}</p>
              <p><strong>Código PIX:</strong></p>
              <div class="pix-code">${pixCode}</div>
            </div>
            
            <div class="instructions">
              <h3>📋 Instruções para Pagamento</h3>
              <ol>
                <li>Abra o aplicativo do seu banco</li>
                <li>Selecione a opção "PIX"</li>
                <li>Escolha "PIX Copia e Cola"</li>
                <li>Cole o código PIX acima</li>
                <li>Confirme os dados e finalize o pagamento</li>
              </ol>
            </div>
            
            <p><strong>Importante:</strong> Este código PIX é válido por 24 horas. Após esse período, será necessário gerar um novo código.</p>
          </div>
          
          <div class="footer">
            <p>Este é um email automático, não responda.</p>
            <p>Em caso de dúvidas, entre em contato com seu assessor.</p>
            <p>© 2024 AGRINVEST - Todos os direitos reservados</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Configuração do email
    const mailOptions = {
      from: process.env.EMAIL_USER || "agrinvest@akintec.com",
      to: email,
      subject: `🌱 Código PIX - Investimento AGRINVEST - R$ ${amount.toLocaleString(
        "pt-BR",
        { minimumFractionDigits: 2 }
      )}`,
      html: emailHtml,
      text: `
        Olá ${userName}!
        
        Seu código PIX foi gerado com sucesso para o investimento.
        
        Valor: R$ ${amount.toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
        })}
        CPF: ${cpf}
        Código PIX: ${pixCode}
        
        Instruções:
        1. Abra o aplicativo do seu banco
        2. Selecione a opção "PIX"
        3. Escolha "PIX Copia e Cola"
        4. Cole o código PIX acima
        5. Confirme os dados e finalize o pagamento
        
        Este código PIX é válido por 24 horas.
        
        AGRINVEST - Clube de Investimentos Agropecuários
      `,
    };

    // Enviar email
    await transporter.sendMail(mailOptions);

    console.log(`[v0] Email PIX enviado com sucesso via configuração alternativa para: ${email}`);

    return NextResponse.json({
      success: true,
      message: "Email com código PIX enviado com sucesso via configuração alternativa",
    });
  } catch (error) {
    console.error("[v0] Erro ao enviar email PIX via configuração alternativa:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Erro interno do servidor",
      },
      { status: 500 }
    );
  }
}
