// Gerenciamento de códigos OTP para reset de senha
// Em produção, considere usar Redis ou banco de dados

interface OtpCode {
  code: string;
  email: string;
  expiresAt: number;
  attempts: number;
  verified: boolean;
}

// Armazenamento em memória (limpar após reinicialização do servidor)
// Em produção, usar Redis ou tabela no banco de dados
const otpCodes = new Map<string, OtpCode>();

// Limpar códigos expirados a cada 5 minutos
setInterval(() => {
  const now = Date.now();
  for (const [email, otp] of otpCodes.entries()) {
    if (otp.expiresAt < now) {
      otpCodes.delete(email);
    }
  }
}, 5 * 60 * 1000);

export function generateOtpCode(email: string): string {
  // Normalizar email
  const normalizedEmail = email.toLowerCase().trim();
  
  // Gerar código de 6 dígitos
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Expira em 10 minutos
  const expiresAt = Date.now() + 10 * 60 * 1000;
  
  otpCodes.set(normalizedEmail, {
    code,
    email: normalizedEmail,
    expiresAt,
    attempts: 0,
    verified: false,
  });
  
  console.log(`[OTP-CODES] Código gerado para: ${normalizedEmail}`);
  console.log(`[OTP-CODES] Código: ${code}, Expira em: ${new Date(expiresAt).toLocaleString('pt-BR')}`);
  console.log(`[OTP-CODES] Total de códigos armazenados: ${otpCodes.size}`);
  
  return code;
}

export function verifyOtpCode(email: string, code: string): { valid: boolean; message?: string } {
  // Normalizar email e código
  const normalizedEmail = email.toLowerCase().trim();
  const normalizedCode = code.trim();
  
  console.log(`[OTP-CODES] Tentativa de verificação para: ${normalizedEmail}`);
  console.log(`[OTP-CODES] Código recebido: ${normalizedCode}`);
  console.log(`[OTP-CODES] Total de códigos armazenados: ${otpCodes.size}`);
  console.log(`[OTP-CODES] Emails armazenados:`, Array.from(otpCodes.keys()));
  
  const otp = otpCodes.get(normalizedEmail);
  
  if (!otp) {
    console.log(`[OTP-CODES] ❌ Código não encontrado para: ${normalizedEmail}`);
    return { valid: false, message: "Código não encontrado ou expirado" };
  }
  
  console.log(`[OTP-CODES] Código encontrado! Expira em: ${new Date(otp.expiresAt).toLocaleString('pt-BR')}`);
  console.log(`[OTP-CODES] Código esperado: ${otp.code}, Recebido: ${normalizedCode}`);
  
  if (otp.expiresAt < Date.now()) {
    console.log(`[OTP-CODES] ❌ Código expirado`);
    otpCodes.delete(normalizedEmail);
    return { valid: false, message: "Código expirado. Solicite um novo código." };
  }
  
  if (otp.attempts >= 5) {
    console.log(`[OTP-CODES] ❌ Muitas tentativas`);
    otpCodes.delete(normalizedEmail);
    return { valid: false, message: "Muitas tentativas incorretas. Solicite um novo código." };
  }
  
  if (otp.verified) {
    console.log(`[OTP-CODES] ❌ Código já utilizado`);
    return { valid: false, message: "Este código já foi utilizado" };
  }
  
  otp.attempts += 1;
  
  if (otp.code !== normalizedCode) {
    console.log(`[OTP-CODES] ❌ Código incorreto. Tentativa ${otp.attempts}/5`);
    return { valid: false, message: `Código incorreto. Tentativa ${otp.attempts}/5` };
  }
  
  console.log(`[OTP-CODES] ✅ Código verificado com sucesso!`);
  otp.verified = true;
  return { valid: true };
}

export function getOtpCode(email: string): OtpCode | undefined {
  const normalizedEmail = email.toLowerCase().trim();
  console.log(`[OTP-CODES] Buscando código para: ${normalizedEmail}`);
  console.log(`[OTP-CODES] Códigos disponíveis:`, Array.from(otpCodes.keys()));
  return otpCodes.get(normalizedEmail);
}

export function deleteOtpCode(email: string): void {
  otpCodes.delete(email.toLowerCase().trim());
}

// Função de debug para listar todos os códigos (apenas desenvolvimento)
export function getAllOtpCodes(): Array<{ email: string; code: string; expiresAt: Date; verified: boolean }> {
  const allCodes: Array<{ email: string; code: string; expiresAt: Date; verified: boolean }> = [];
  for (const [email, otp] of otpCodes.entries()) {
    allCodes.push({
      email,
      code: otp.code,
      expiresAt: new Date(otp.expiresAt),
      verified: otp.verified,
    });
  }
  return allCodes;
}

