import { type NextRequest, NextResponse } from "next/server";
import { writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

export async function POST(request: NextRequest) {
  try {
    const { email, userName, pixCode, amount, cpf } = await request.json();

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `pix-email-${timestamp}.txt`;
    const emailsDir = join(process.cwd(), 'emails');
    
    // Criar diretório de emails se não existir
    if (!existsSync(emailsDir)) {
      mkdirSync(emailsDir, { recursive: true });
    }

    const emailContent = `
========================================
EMAIL PIX - ${new Date().toLocaleString('pt-BR')}
========================================
Para: ${email}
Nome: ${userName}
Valor: R$ ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
CPF: ${cpf}
========================================
Assunto: 🌱 Código PIX - Investimento Agroderi - R$ ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
========================================

Olá ${userName}!

Seu código PIX foi gerado com sucesso para o investimento.

📱 Informações do PIX:
Valor: R$ ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
CPF: ${cpf}
Código PIX:
${pixCode}

📋 Instruções para Pagamento:
1. Abra o aplicativo do seu banco
2. Selecione a opção "PIX"
3. Escolha "PIX Copia e Cola"
4. Cole o código PIX acima
5. Confirme os dados e finalize o pagamento

Importante: Este código PIX é válido por 24 horas.

Agroderi - Clube de Investimentos Agropecuários
========================================
`;

    // Salvar email em arquivo
    const filePath = join(emailsDir, fileName);
    writeFileSync(filePath, emailContent, 'utf8');

    console.log("[v0] ========================================");
    console.log("[v0] EMAIL PIX SIMULADO");
    console.log("[v0] ========================================");
    console.log(`[v0] Para: ${email}`);
    console.log(`[v0] Nome: ${userName}`);
    console.log(`[v0] Valor: R$ ${amount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`);
    console.log(`[v0] CPF: ${cpf}`);
    console.log(`[v0] Código PIX: ${pixCode}`);
    console.log(`[v0] Email salvo em: ${filePath}`);
    console.log("[v0] ========================================");

    return NextResponse.json({
      success: true,
      message: `Email PIX simulado com sucesso! Arquivo salvo em: ${fileName}`,
      filePath: filePath,
      emailContent: emailContent
    });
  } catch (error) {
    console.error("[v0] Erro ao simular email PIX:", error);
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
