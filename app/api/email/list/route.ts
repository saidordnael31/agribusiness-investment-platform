import { type NextRequest, NextResponse } from "next/server";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

export async function GET(request: NextRequest) {
  try {
    const emailsDir = join(process.cwd(), 'emails');
    
    // Verificar se o diretório existe
    try {
      const files = readdirSync(emailsDir);
      const emailFiles = files
        .filter(file => file.startsWith('pix-email-') && file.endsWith('.txt'))
        .map(file => {
          const filePath = join(emailsDir, file);
          const content = readFileSync(filePath, 'utf8');
          const lines = content.split('\n');
          
          // Extrair informações do email
          const email = lines.find(line => line.startsWith('Para:'))?.replace('Para:', '').trim() || '';
          const name = lines.find(line => line.startsWith('Nome:'))?.replace('Nome:', '').trim() || '';
          const value = lines.find(line => line.startsWith('Valor:'))?.replace('Valor:', '').trim() || '';
          const cpf = lines.find(line => line.startsWith('CPF:'))?.replace('CPF:', '').trim() || '';
          const pixCode = lines.find(line => line.includes('000201')) || '';
          
          return {
            fileName: file,
            email,
            name,
            value,
            cpf,
            pixCode: pixCode.substring(0, 50) + '...', // Mostrar apenas parte do código
            content,
            createdAt: file.replace('pix-email-', '').replace('.txt', '').replace(/-/g, ':').replace(/T/, ' ')
          };
        })
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)); // Mais recentes primeiro

      return NextResponse.json({
        success: true,
        emails: emailFiles,
        count: emailFiles.length
      });
    } catch (error) {
      return NextResponse.json({
        success: true,
        emails: [],
        count: 0,
        message: "Nenhum email encontrado"
      });
    }
  } catch (error) {
    console.error("[v0] Erro ao listar emails:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Erro interno do servidor",
      },
      { status: 500 }
    );
  }
}
