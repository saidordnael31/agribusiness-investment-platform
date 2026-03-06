import { type NextRequest, NextResponse } from "next/server";
import { generateTemporaryPassword } from "@/lib/password-utils";
import nodemailer from "nodemailer";

export async function POST(request: NextRequest) {
  try {
    const { email, userName, password } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email é obrigatório" },
        { status: 400 }
      );
    }

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Senha é obrigatória" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const displayName = userName || email.split("@")[0];
    
    console.log(`[SEND-TEMP-PASSWORD] 📧 Enviando senha temporária para: ${normalizedEmail}`);

    // Enviar email com senha temporária
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
        console.log("[SEND-TEMP-PASSWORD] Conexão SMTP verificada com sucesso");
      } catch (verifyError) {
        console.error("[SEND-TEMP-PASSWORD] Erro na verificação SMTP:", verifyError);
        throw new Error(`Falha na conexão SMTP: ${verifyError instanceof Error ? verifyError.message : String(verifyError)}`);
      }

      const emailHtml = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Bem-vindo à AGRINVEST</title>
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
            .credentials-box {
              background-color: #e8f5e8;
              border: 2px solid #00BC6E;
              border-radius: 8px;
              padding: 20px;
              margin: 30px 0;
            }
            .password-box {
              background-color: #fff3e0;
              border: 2px solid #ff9800;
              border-radius: 8px;
              padding: 15px;
              text-align: center;
              margin: 20px 0;
            }
            .password {
              font-size: 24px;
              font-weight: bold;
              color: #003F28;
              letter-spacing: 2px;
              font-family: monospace;
              word-break: break-all;
            }
            .warning {
              background-color: #fff3e0;
              border-left: 4px solid #ff9800;
              padding: 15px;
              border-radius: 5px;
              margin: 20px 0;
            }
            .info {
              background-color: #e3f2fd;
              border-left: 4px solid #2196f3;
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
            .button {
              display: inline-block;
              padding: 12px 24px;
              background-color: #012544;
              color: white;
              text-decoration: none;
              border-radius: 8px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🌱 AGRINVEST</div>
              <p>Clube de Investimentos Agropecuários</p>
            </div>
            
            <h2>Bem-vindo, ${displayName}!</h2>
            
            <p>Sua conta foi criada com sucesso na plataforma AGRINVEST.</p>
            
            <div class="credentials-box">
              <p><strong>Email:</strong> ${normalizedEmail}</p>
            </div>
            
            <div class="password-box">
              <p style="margin: 0 0 10px 0; font-weight: bold; color: #003F28;">Sua senha temporária:</p>
              <div class="password">${password}</div>
            </div>
            
            <div class="warning">
              <strong>⚠️ Importante - Troca de Senha Obrigatória:</strong>
              <ul style="margin: 10px 0; padding-left: 20px;">
                <li>Esta é uma senha temporária de uso único</li>
                <li>Você será <strong>obrigado a alterar esta senha</strong> no primeiro login</li>
                <li>Não compartilhe esta senha com ninguém</li>
                <li>Após o primeiro login, use uma senha pessoal e segura</li>
              </ul>
            </div>
            
            <div class="info">
              <strong>📋 Como acessar:</strong>
              <ol style="margin: 10px 0; padding-left: 20px;">
                <li>Acesse o link de login abaixo</li>
                <li>Use seu email e a senha temporária acima</li>
                <li>Siga as instruções para criar sua senha definitiva</li>
              </ol>
            </div>
            
            <div style="text-align: center;">
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.agrinvest.app'}/login" class="button">
                Acessar Plataforma
              </a>
            </div>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} AGRINVEST - Todos os direitos reservados</p>
              <p>Este é um email automático, por favor não responda.</p>
              <p style="font-size: 12px; color: #999;">
                Se você não solicitou este cadastro, ignore este email com segurança.
              </p>
            </div>
          </div>
        </body>
        </html>
      `;

      const mailOptions = {
        from: "agrinvest@akintec.com",
        to: normalizedEmail,
        subject: "🌱 Bem-vindo à AGRINVEST - Suas Credenciais de Acesso",
        html: emailHtml,
      };

      const info = await transporter.sendMail(mailOptions);
      emailSent = true;
      console.log(`[SEND-TEMP-PASSWORD] ✅ Senha temporária enviada com sucesso para: ${normalizedEmail}`, info.messageId);
    } catch (error) {
      emailError = error;
      console.error("[SEND-TEMP-PASSWORD] ❌ Erro ao enviar email:", error);
    }

    // Sempre salvar em arquivo em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      try {
        const { writeFileSync, existsSync, mkdirSync } = await import('fs');
        const { join } = await import('path');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `temporary-password-${timestamp}.txt`;
        const emailsDir = join(process.cwd(), 'emails');
        
        if (!existsSync(emailsDir)) {
          mkdirSync(emailsDir, { recursive: true });
        }

        const emailContent = `
========================================
SENHA TEMPORÁRIA
========================================
Para: ${normalizedEmail}
Nome: ${displayName}
Data: ${new Date().toLocaleString('pt-BR')}
Email Enviado: ${emailSent ? 'SIM ✅' : 'NÃO ❌'}
${emailError ? `Erro: ${emailError.message}` : ''}
========================================
EMAIL: ${normalizedEmail}
SENHA TEMPORÁRIA: ${password}
========================================
⚠️ IMPORTANTE: Esta é uma senha temporária.
O usuário será obrigado a alterar esta senha no primeiro login.

Acesse: ${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.agrinvest.app'}/login
========================================
`;
        
        const filePath = join(emailsDir, fileName);
        writeFileSync(filePath, emailContent, 'utf8');
        console.log(`[SEND-TEMP-PASSWORD] 📁 Senha salva em arquivo: ${filePath}`);
      } catch (fileError) {
        console.error("[SEND-TEMP-PASSWORD] Erro ao salvar senha em arquivo:", fileError);
      }
      
      console.log(`[SEND-TEMP-PASSWORD] 🔑 SENHA TEMPORÁRIA para ${normalizedEmail}: ${password}`);
    }

    return NextResponse.json({
      success: true,
      message: "Senha temporária enviada com sucesso.",
      debug: process.env.NODE_ENV === 'development' ? {
        emailSent,
        emailError: emailError ? emailError.message : null,
        password: password, // Apenas em desenvolvimento
      } : undefined,
    });
  } catch (error: any) {
    console.error("[SEND-TEMP-PASSWORD] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao processar solicitação" },
      { status: 500 }
    );
  }
}










