import { type NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: NextRequest) {
  try {
    const { email, userName, pixCode, amount, cpf } = await request.json();

    console.log("[HOSTINGER] Enviando email PIX para:", {
      email,
      userName,
      pixCode,
      amount,
      cpf,
    });

    // Configuração oficial do Hostinger
    const transporter = nodemailer.createTransport({
      host: "smtp.hostinger.com", // Host oficial do Hostinger
      port: 465, // Porta oficial para SSL/TLS
      secure: true, // SSL/TLS conforme documentação oficial
      auth: {
          user: "agrinvest@akintec.com",
          pass: "+qSNE$0#kW",
      },
      tls: {
        rejectUnauthorized: false, // Para certificados auto-assinados
      },
      connectionTimeout: 10000, // 10 segundos
      greetingTimeout: 30000, // 30 segundos
      socketTimeout: 60000, // 60 segundos
      debug: true, // Ativar debug para troubleshooting
    });

    // Verificar conexão antes de enviar
    try {
      await transporter.verify();
      console.log("[HOSTINGER] Conexão SMTP verificada com sucesso");
    } catch (error) {
      console.error("[HOSTINGER] Erro na verificação SMTP:", error);
      throw new Error(`Falha na conexão SMTP Hostinger: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Template do email
    const emailHtml = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Código PIX - Agroderi</title>
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
          .button {
            display: inline-block;
            background-color: #2e7d32;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 5px;
            margin: 10px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">🌱 Agroderi</div>
            <p>Clube de Investimentos Agropecuários</p>
          </div>
          
          <div class="content">
            <h2>Olá, ${userName}!</h2>
            
            <p>Seu código PIX foi gerado com sucesso para o investimento.</p>
            
            <div class="pix-info">
              <h3>📱 Informações do PIX</h3>
              <div class="amount">R$ ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
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
            
            <p><strong>⏰ Importante:</strong> Este código PIX é válido por 24 horas.</p>
            <p><strong>📅 Data de geração:</strong> ${new Date().toLocaleString('pt-BR')}</p>
          </div>
          
          <div class="footer">
            <p>Agroderi - Clube de Investimentos Agropecuários</p>
            <p>Este é um email automático, não responda.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Enviar email
    const info = await transporter.sendMail({
      from: "agrinvest@akintec.com",
      to: email,
      subject: `🌱 Código PIX - Investimento Agroderi - R$ ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
      html: emailHtml,
      text: `
Olá ${userName}!

Seu código PIX foi gerado com sucesso para o investimento.

📱 Informações do PIX:
Valor: R$ ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
CPF: ${cpf}
Código PIX: ${pixCode}

📋 Instruções para Pagamento:
1. Abra o aplicativo do seu banco
2. Selecione a opção "PIX"
3. Escolha "PIX Copia e Cola"
4. Cole o código PIX acima
5. Confirme os dados e finalize o pagamento

⏰ Importante: Este código PIX é válido por 24 horas.
📅 Data de geração: ${new Date().toLocaleString('pt-BR')}

Agroderi - Clube de Investimentos Agropecuários
      `.trim()
    });

    console.log("[HOSTINGER] Email PIX enviado com sucesso:", info.messageId);

    return NextResponse.json({
      success: true,
      message: "Email PIX enviado com sucesso via Hostinger!",
      messageId: info.messageId,
      recipient: email
    });

  } catch (error) {
    console.error("[HOSTINGER] Erro ao enviar email PIX:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro interno do servidor",
        provider: "Hostinger"
      },
      { status: 500 }
    );
  }
}
