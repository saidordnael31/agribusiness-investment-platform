// Gerenciamento de códigos OTP para reset de senha com persistência em arquivo
// Em produção, considere usar Redis ou banco de dados

import { promises as fs } from 'fs';
import { join } from 'path';

interface OtpCode {
  code: string;
  email: string;
  expiresAt: number;
  attempts: number;
  verified: boolean;
}

const OTP_FILE_PATH = join(process.cwd(), '.otp-codes.json');

// Cache em memória para performance
let otpCodesCache: Map<string, OtpCode> | null = null;

// Carregar códigos do arquivo
async function loadOtpCodes(): Promise<Map<string, OtpCode>> {
  if (otpCodesCache) {
    return otpCodesCache;
  }

  try {
    const fileContent = await fs.readFile(OTP_FILE_PATH, 'utf-8');
    const data = JSON.parse(fileContent);
    otpCodesCache = new Map(Object.entries(data));
    
    // Limpar códigos expirados ao carregar
    const now = Date.now();
    for (const [email, otp] of otpCodesCache.entries()) {
      if (otp.expiresAt < now) {
        otpCodesCache.delete(email);
      }
    }
    
    // Salvar arquivo limpo
    await saveOtpCodes(otpCodesCache);
    
    console.log(`[OTP-CODES] Carregados ${otpCodesCache.size} códigos do arquivo`);
    return otpCodesCache;
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Arquivo não existe, criar Map vazio
      otpCodesCache = new Map();
      await saveOtpCodes(otpCodesCache);
      return otpCodesCache;
    }
    console.error('[OTP-CODES] Erro ao carregar códigos:', error);
    otpCodesCache = new Map();
    return otpCodesCache;
  }
}

// Salvar códigos no arquivo
async function saveOtpCodes(codes: Map<string, OtpCode>): Promise<void> {
  try {
    const data = Object.fromEntries(codes);
    await fs.writeFile(OTP_FILE_PATH, JSON.stringify(data, null, 2), 'utf-8');
    otpCodesCache = codes;
  } catch (error) {
    console.error('[OTP-CODES] Erro ao salvar códigos:', error);
  }
}

// Limpar códigos expirados a cada 5 minutos
setInterval(async () => {
  try {
    const codes = await loadOtpCodes();
    const now = Date.now();
    let cleaned = false;
    
    for (const [email, otp] of codes.entries()) {
      if (otp.expiresAt < now) {
        codes.delete(email);
        cleaned = true;
      }
    }
    
    if (cleaned) {
      await saveOtpCodes(codes);
      console.log(`[OTP-CODES] Códigos expirados removidos`);
    }
  } catch (error) {
    console.error('[OTP-CODES] Erro ao limpar códigos expirados:', error);
  }
}, 5 * 60 * 1000);

export async function generateOtpCode(email: string): Promise<string> {
  // Normalizar email
  const normalizedEmail = email.toLowerCase().trim();
  
  // Gerar código de 6 dígitos
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Expira em 10 minutos
  const expiresAt = Date.now() + 10 * 60 * 1000;
  
  const codes = await loadOtpCodes();
  codes.set(normalizedEmail, {
    code,
    email: normalizedEmail,
    expiresAt,
    attempts: 0,
    verified: false,
  });
  
  await saveOtpCodes(codes);
  
  console.log(`[OTP-CODES] Código gerado para: ${normalizedEmail}`);
  console.log(`[OTP-CODES] Código: ${code}, Expira em: ${new Date(expiresAt).toLocaleString('pt-BR')}`);
  console.log(`[OTP-CODES] Total de códigos armazenados: ${codes.size}`);
  
  return code;
}

export async function verifyOtpCode(email: string, code: string): Promise<{ valid: boolean; message?: string }> {
  // Normalizar email e código
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedCode = code.trim();
  
  console.log(`[OTP-CODES] Tentativa de verificação para: ${normalizedEmail}`);
  console.log(`[OTP-CODES] Código recebido: ${normalizedCode}`);
  
  const codes = await loadOtpCodes();
  
  console.log(`[OTP-CODES] Total de códigos armazenados: ${codes.size}`);
  console.log(`[OTP-CODES] Emails armazenados:`, Array.from(codes.keys()));
  
  const otp = codes.get(normalizedEmail);
  
  if (!otp) {
    console.log(`[OTP-CODES] ❌ Código não encontrado para: ${normalizedEmail}`);
    return { valid: false, message: "Código não encontrado ou expirado" };
  }
  
  console.log(`[OTP-CODES] Código encontrado! Expira em: ${new Date(otp.expiresAt).toLocaleString('pt-BR')}`);
  console.log(`[OTP-CODES] Código esperado: ${otp.code}, Recebido: ${normalizedCode}`);
  
  if (otp.expiresAt < Date.now()) {
    console.log(`[OTP-CODES] ❌ Código expirado`);
    codes.delete(normalizedEmail);
    await saveOtpCodes(codes);
    return { valid: false, message: "Código expirado. Solicite um novo código." };
  }
  
  if (otp.attempts >= 5) {
    console.log(`[OTP-CODES] ❌ Muitas tentativas`);
    codes.delete(normalizedEmail);
    await saveOtpCodes(codes);
    return { valid: false, message: "Muitas tentativas incorretas. Solicite um novo código." };
  }
  
  if (otp.verified) {
    console.log(`[OTP-CODES] ❌ Código já utilizado`);
    return { valid: false, message: "Este código já foi utilizado" };
  }
  
  otp.attempts += 1;
  
  if (otp.code !== normalizedCode) {
    console.log(`[OTP-CODES] ❌ Código incorreto. Tentativa ${otp.attempts}/5`);
    await saveOtpCodes(codes);
    return { valid: false, message: `Código incorreto. Tentativa ${otp.attempts}/5` };
  }
  
  console.log(`[OTP-CODES] ✅ Código verificado com sucesso!`);
  otp.verified = true;
  await saveOtpCodes(codes);
  return { valid: true };
}

export async function getOtpCode(email: string): Promise<OtpCode | undefined> {
  const normalizedEmail = email.toLowerCase().trim();
  const codes = await loadOtpCodes();
  console.log(`[OTP-CODES] Buscando código para: ${normalizedEmail}`);
  console.log(`[OTP-CODES] Códigos disponíveis:`, Array.from(codes.keys()));
  return codes.get(normalizedEmail);
}

export async function deleteOtpCode(email: string): Promise<void> {
  const codes = await loadOtpCodes();
  codes.delete(email.toLowerCase().trim());
  await saveOtpCodes(codes);
}

// Função de debug para listar todos os códigos (apenas desenvolvimento)
export async function getAllOtpCodes(): Promise<Array<{ email: string; code: string; expiresAt: Date; verified: boolean }>> {
  const codes = await loadOtpCodes();
  const allCodes: Array<{ email: string; code: string; expiresAt: Date; verified: boolean }> = [];
  for (const [email, otp] of codes.entries()) {
    allCodes.push({
      email,
      code: otp.code,
      expiresAt: new Date(otp.expiresAt),
      verified: otp.verified,
    });
  }
  return allCodes;
}














