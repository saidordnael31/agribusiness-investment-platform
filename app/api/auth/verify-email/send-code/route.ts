import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateEmailVerificationCode } from "@/lib/email-verification-codes";
import nodemailer from "nodemailer";

export async function POST(request: NextRequest) {
  try {
    const { email, userId } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email é obrigatório" },
        { status: 400 }
      );
    }

    if (!userId || typeof userId !== "string") {
      return NextResponse.json(
        { success: false, error: "ID do usuário é obrigatório" },
        { status: 400 }
      );
    }

    // Normalizar email
    const normalizedEmail = email.toLowerCase().trim();
    
    console.log(`[VERIFY-EMAIL] 📧 Gerando código de verificação para: ${normalizedEmail}`);

    // Gerar código OTP
    const code = await generateEmailVerificationCode(normalizedEmail, userId);
    
    console.log(`[VERIFY-EMAIL] ✅ Código ${code} gerado para: ${normalizedEmail}`);

    // Enviar email com código
    let emailSent = false;
    let emailError: any = null;

    try {
      // Configuração do Hostinger
      const transporter = nodemailer.createTransport({
        host: "smtp.hostinger.com",
        port: 465,
        secure: true,
        auth: {
          user: "agrinvest@akintec.com",
          pass: "+qSNE$0#kW",
        },
        tls: {
          rejectUnauthorized: false,
        },
        connectionTimeout: 10000,
        greetingTimeout: 30000,
        socketTimeout: 60000,
        debug: true,
      });

      // Verificar conexão antes de enviar
      try {
        await transporter.verify();
        console.log("[VERIFY-EMAIL] Conexão SMTP verificada com sucesso");
      } catch (verifyError) {
        console.error("[VERIFY-EMAIL] Erro na verificação SMTP:", verifyError);
        throw new Error(`Falha na conexão SMTP: ${verifyError instanceof Error ? verifyError.message : String(verifyError)}`);
      }

      const emailHtml = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Confirmação de Email - AGRINVEST</title>
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
            .code-box {
              background-color: #e8f5e8;
              border: 2px solid #00BC6E;
              border-radius: 8px;
              padding: 20px;
              text-align: center;
              margin: 30px 0;
            }
            .code {
              font-size: 32px;
              font-weight: bold;
              color: #003F28;
              letter-spacing: 8px;
              font-family: monospace;
            }
            .warning {
              background-color: #fff3e0;
              border-left: 4px solid #ff9800;
              padding: 15px;
              border-radius: 5px;
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
            
            <h2>Confirmação de Email</h2>
            
            <p>Olá,</p>
            
            <p>Obrigado por se cadastrar na plataforma AGRINVEST! Use o código abaixo para confirmar seu email:</p>
            
            <div class="code-box">
              <div class="code">${code}</div>
            </div>
            
            <div class="warning">
              <strong>⚠️ Importante:</strong>
              <ul>
                <li>Este código é válido por 10 minutos</li>
                <li>Não compartilhe este código com ninguém</li>
                <li>Após confirmar, você poderá fazer login na plataforma</li>
              </ul>
            </div>
            
            <p>Se você não se cadastrou na AGRINVEST, pode ignorar este email com segurança.</p>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} AGRINVEST - Todos os direitos reservados</p>
              <p>Este é um email automático, por favor não responda.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: "agrinvest@akintec.com",
        to: normalizedEmail,
        subject: "🌱 Confirmação de Email - AGRINVEST",
        html: emailHtml,
      };

      const info = await transporter.sendMail(mailOptions);
      emailSent = true;
      console.log(`[VERIFY-EMAIL] ✅ Código enviado com sucesso para: ${normalizedEmail}`, info.messageId);
    } catch (error) {
      emailError = error;
      console.error("[VERIFY-EMAIL] ❌ Erro ao enviar email:", error);
    }

    // Sempre salvar código em arquivo em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      try {
        const { writeFileSync, existsSync, mkdirSync } = await import('fs');
        const { join } = await import('path');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `email-verification-code-${timestamp}.txt`;
        const emailsDir = join(process.cwd(), 'emails');
        
        if (!existsSync(emailsDir)) {
          mkdirSync(emailsDir, { recursive: true });
        }

        const emailContent = `
========================================
CÓDIGO DE VERIFICAÇÃO DE EMAIL
========================================
Para: ${normalizedEmail}
User ID: ${userId}
Data: ${new Date().toLocaleString('pt-BR')}
Email Enviado: ${emailSent ? 'SIM ✅' : 'NÃO ❌'}
${emailError ? `Erro: ${emailError.message}` : ''}
========================================
CÓDIGO DE VERIFICAÇÃO: ${code}
========================================
Este código é válido por 10 minutos.

Se você não se cadastrou, ignore este email.
========================================
`;
        
        const filePath = join(emailsDir, fileName);
        writeFileSync(filePath, emailContent, 'utf8');
        console.log(`[VERIFY-EMAIL] 📁 Código salvo em arquivo: ${filePath}`);
      } catch (fileError) {
        console.error("[VERIFY-EMAIL] Erro ao salvar código em arquivo:", fileError);
      }
      
      console.log(`[VERIFY-EMAIL] 🔑 CÓDIGO GERADO para ${normalizedEmail}: ${code}`);
    }

    return NextResponse.json({
      success: true,
      message: "Código de verificação enviado com sucesso.",
      debug: process.env.NODE_ENV === 'development' ? {
        emailSent,
        emailError: emailError ? emailError.message : null,
      } : undefined,
    });
  } catch (error: any) {
    console.error("[VERIFY-EMAIL] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao processar solicitação" },
      { status: 500 }
    );
  }
}







