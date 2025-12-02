// Gerenciamento de códigos OTP para verificação de email com persistência em arquivo
// Em produção, considere usar Redis ou banco de dados

import { promises as fs } from 'fs';
import { join } from 'path';

interface EmailVerificationCode {
  code: string;
  email: string;
  userId: string;
  expiresAt: number;
  attempts: number;
  verified: boolean;
}

const VERIFICATION_FILE_PATH = join(process.cwd(), '.email-verification-codes.json');

// Cache em memória para performance
let verificationCodesCache: Map<string, EmailVerificationCode> | null = null;

// Carregar códigos do arquivo
async function loadVerificationCodes(): Promise<Map<string, EmailVerificationCode>> {
  if (verificationCodesCache) {
    return verificationCodesCache;
  }

  try {
    const fileContent = await fs.readFile(VERIFICATION_FILE_PATH, 'utf-8');
    const data = JSON.parse(fileContent);
    verificationCodesCache = new Map(Object.entries(data));
    
    // Limpar códigos expirados ao carregar
    const now = Date.now();
    for (const [email, codeData] of verificationCodesCache.entries()) {
      if (codeData.expiresAt < now) {
        verificationCodesCache.delete(email);
      }
    }
    
    // Salvar arquivo limpo
    await saveVerificationCodes(verificationCodesCache);
    
    console.log(`[EMAIL-VERIFICATION] Carregados ${verificationCodesCache.size} códigos do arquivo`);
    return verificationCodesCache;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Arquivo não existe, criar Map vazio
      verificationCodesCache = new Map();
      await saveVerificationCodes(verificationCodesCache);
      return verificationCodesCache;
    }
    console.error('[EMAIL-VERIFICATION] Erro ao carregar códigos:', error);
    verificationCodesCache = new Map();
    return verificationCodesCache;
  }
}

// Salvar códigos no arquivo
async function saveVerificationCodes(codes: Map<string, EmailVerificationCode>): Promise<void> {
  try {
    const data = Object.fromEntries(codes);
    await fs.writeFile(VERIFICATION_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    verificationCodesCache = codes;
  } catch (error) {
    console.error('[EMAIL-VERIFICATION] Erro ao salvar códigos:', error);
  }
}

// Limpar códigos expirados a cada 5 minutos
setInterval(async () => {
  try {
    const codes = await loadVerificationCodes();
    const now = Date.now();
    let cleaned = false;
    
    for (const [email, codeData] of codes.entries()) {
      if (codeData.expiresAt < now) {
        codes.delete(email);
        cleaned = true;
      }
    }
    
    if (cleaned) {
      await saveVerificationCodes(codes);
      console.log(`[EMAIL-VERIFICATION] Códigos expirados removidos`);
    }
  } catch (error) {
    console.error('[EMAIL-VERIFICATION] Erro ao limpar códigos expirados:', error);
  }
}, 5 * 60 * 1000);

export async function generateEmailVerificationCode(email: string, userId: string): Promise<string> {
  // Normalizar email
  const normalizedEmail = email.toLowerCase().trim();
  
  // Gerar código de 6 dígitos
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Expira em 10 minutos
  const expiresAt = Date.now() + 10 * 60 * 1000;
  
  const codes = await loadVerificationCodes();
  codes.set(normalizedEmail, {
    code,
    email: normalizedEmail,
    userId,
    expiresAt,
    attempts: 0,
    verified: false,
  });
  
  await saveVerificationCodes(codes);
  
  console.log(`[EMAIL-VERIFICATION] Código gerado para: ${normalizedEmail}`);
  console.log(`[EMAIL-VERIFICATION] Código: ${code}, Expira em: ${new Date(expiresAt).toLocaleString('pt-BR')}`);
  
  return code;
}

export async function verifyEmailVerificationCode(email: string, code: string): Promise<{ valid: boolean; userId?: string; message?: string }> {
  // Normalizar email e código
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedCode = code.trim();
  
  console.log(`[EMAIL-VERIFICATION] Tentativa de verificação para: ${normalizedEmail}`);
  
  const codes = await loadVerificationCodes();
  const codeData = codes.get(normalizedEmail);
  
  if (!codeData) {
    console.log(`[EMAIL-VERIFICATION] ❌ Código não encontrado para: ${normalizedEmail}`);
    return { valid: false, message: "Código não encontrado ou expirado" };
  }
  
  if (codeData.expiresAt < Date.now()) {
    console.log(`[EMAIL-VERIFICATION] ❌ Código expirado`);
    codes.delete(normalizedEmail);
    await saveVerificationCodes(codes);
    return { valid: false, message: "Código expirado. Solicite um novo código." };
  }
  
  if (codeData.attempts >= 5) {
    console.log(`[EMAIL-VERIFICATION] ❌ Muitas tentativas`);
    codes.delete(normalizedEmail);
    await saveVerificationCodes(codes);
    return { valid: false, message: "Muitas tentativas incorretas. Solicite um novo código." };
  }
  
  if (codeData.verified) {
    console.log(`[EMAIL-VERIFICATION] ❌ Código já utilizado`);
    return { valid: false, message: "Este código já foi utilizado" };
  }
  
  codeData.attempts += 1;
  
  if (codeData.code !== normalizedCode) {
    console.log(`[EMAIL-VERIFICATION] ❌ Código incorreto. Tentativa ${codeData.attempts}/5`);
    await saveVerificationCodes(codes);
    return { valid: false, message: `Código incorreto. Tentativa ${codeData.attempts}/5` };
  }
  
  console.log(`[EMAIL-VERIFICATION] ✅ Código verificado com sucesso!`);
  codeData.verified = true;
  await saveVerificationCodes(codes);
  return { valid: true, userId: codeData.userId };
}

export async function getEmailVerificationCode(email: string): Promise<EmailVerificationCode | undefined> {
  const codes = await loadVerificationCodes();
  return codes.get(email.toLowerCase().trim());
}

export async function deleteEmailVerificationCode(email: string): Promise<void> {
  const codes = await loadVerificationCodes();
  codes.delete(email.toLowerCase().trim());
  await saveVerificationCodes(codes);
}





