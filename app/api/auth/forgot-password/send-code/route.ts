import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateOtpCode } from "@/lib/otp-codes-persistent";
import nodemailer from "nodemailer";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email é obrigatório" },
        { status: 400 }
      );
    }

    // Verificar se o email existe no Supabase
    // Por segurança, sempre retornar sucesso mesmo se email não existir
    // Isso evita que atacantes descubram quais emails estão cadastrados
    try {
      const supabase = createAdminClient();
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers();

      if (!authError && authData?.users) {
        const userExists = authData.users.some(
          (user) => user.email?.toLowerCase() === email.toLowerCase()
        );
        // Não fazer nada com essa informação, apenas verificar silenciosamente
        console.log(`[FORGOT-PASSWORD] Verificação de email para: ${email}`);
      }
    } catch (error) {
      console.error("Erro ao verificar usuário:", error);
      // Continuar mesmo com erro, não revelar se email existe ou não
    }
    
    // Normalizar email antes de gerar código
    const normalizedEmail = email.toLowerCase().trim();
    
    console.log(`[FORGOT-PASSWORD] 📧 Gerando código para email: ${normalizedEmail}`);
    
    // Gerar código OTP (agora é async porque usa persistência)
    const code = await generateOtpCode(normalizedEmail);
    
    console.log(`[FORGOT-PASSWORD] ✅ Código ${code} gerado e armazenado para: ${normalizedEmail}`);

    // Enviar email com código
    let emailSent = false;
    let emailError: any = null;

    try {
      // Configuração do Hostinger (mesma que funciona no projeto)
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
        console.log("[FORGOT-PASSWORD] Conexão SMTP verificada com sucesso");
      } catch (verifyError) {
        console.error("[FORGOT-PASSWORD] Erro na verificação SMTP:", verifyError);
        throw new Error(`Falha na conexão SMTP: ${verifyError instanceof Error ? verifyError.message : String(verifyError)}`);
      }

      const emailHtml = `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Código de Verificação - AGRINVEST</title>
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
            
            <h2>Código de Verificação para Redefinição de Senha</h2>
            
            <p>Olá,</p>
            
            <p>Você solicitou a redefinição de senha na plataforma AGRINVEST. Use o código abaixo para continuar:</p>
            
            <div class="code-box">
              <div class="code">${code}</div>
            </div>
            
            <div class="warning">
              <strong>⚠️ Importante:</strong>
              <ul>
                <li>Este código é válido por 10 minutos</li>
                <li>Não compartilhe este código com ninguém</li>
                <li>Se você não solicitou esta redefinição, ignore este email</li>
              </ul>
            </div>
            
            <p>Se você não solicitou esta redefinição de senha, pode ignorar este email com segurança.</p>
            
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
        to: email,
        subject: "🌱 Código de Verificação - Redefinição de Senha AGRINVEST",
        html: emailHtml,
      };

      const info = await transporter.sendMail(mailOptions);
      emailSent = true;
      console.log(`[FORGOT-PASSWORD] ✅ Código enviado com sucesso para: ${email}`, info.messageId);
    } catch (error) {
      emailError = error;
      console.error("[FORGOT-PASSWORD] ❌ Erro ao enviar email:", error);
    }

    // Sempre salvar código em arquivo em desenvolvimento para facilitar debug
    if (process.env.NODE_ENV === 'development') {
      try {
        const { writeFileSync, existsSync, mkdirSync } = await import('fs');
        const { join } = await import('path');
        
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `forgot-password-code-${timestamp}.txt`;
        const emailsDir = join(process.cwd(), 'emails');
        
        if (!existsSync(emailsDir)) {
          mkdirSync(emailsDir, { recursive: true });
        }

        const emailContent = `
========================================
CÓDIGO DE VERIFICAÇÃO - ESQUECI SENHA
========================================
Para: ${email}
Data: ${new Date().toLocaleString('pt-BR')}
Email Enviado: ${emailSent ? 'SIM ✅' : 'NÃO ❌'}
${emailError ? `Erro: ${emailError.message}` : ''}
========================================
CÓDIGO DE VERIFICAÇÃO: ${code}
========================================
Este código é válido por 10 minutos.

Se você não solicitou esta redefinição de senha, ignore este email.
========================================
`;
        
        const filePath = join(emailsDir, fileName);
        writeFileSync(filePath, emailContent, 'utf8');
        console.log(`[FORGOT-PASSWORD] 📁 Código salvo em arquivo: ${filePath}`);
      } catch (fileError) {
        console.error("[FORGOT-PASSWORD] Erro ao salvar código em arquivo:", fileError);
      }
      
      // Sempre mostrar o código no console em desenvolvimento
      console.log(`[FORGOT-PASSWORD] 🔑 CÓDIGO GERADO para ${email}: ${code}`);
      console.log(`[FORGOT-PASSWORD] 🔗 Ou acesse: /api/auth/forgot-password/debug-code?email=${encodeURIComponent(email)}`);
    }

    // Sempre retornar sucesso para não revelar se o email existe
    // Mas incluir informações de debug em desenvolvimento
    const response: any = {
      success: true,
      message: "Se o email estiver cadastrado, você receberá um código de verificação.",
    };

    // Em desenvolvimento, incluir informações de debug
    if (process.env.NODE_ENV === 'development') {
      response.debug = {
        emailSent,
        emailError: emailError ? emailError.message : null,
        codeGenerated: !!code,
        // Não incluir o código real por segurança
      };
      
      if (!emailSent && emailError) {
        console.warn(`[FORGOT-PASSWORD] ⚠️ Email não foi enviado para ${email}`);
        console.warn(`[FORGOT-PASSWORD] ⚠️ Erro: ${emailError.message || emailError}`);
      }
    }

    return NextResponse.json(response);
  } catch (error: any) {
    console.error("[FORGOT-PASSWORD] Erro:", error);
    return NextResponse.json(
      { success: false, error: "Erro ao processar solicitação" },
      { status: 500 }
    );
  }
}

