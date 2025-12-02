/**
 * Gera uma senha temporária segura
 * @param length - Comprimento da senha (padrão: 12)
 * @returns Senha temporária aleatória
 */
export function generateTemporaryPassword(length: number = 12): string {
  // Usar caracteres que são fáceis de digitar e distinguir
  const uppercase = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // Sem I, O para evitar confusão
  const lowercase = "abcdefghijkmnpqrstuvwxyz"; // Sem l, o para evitar confusão
  const numbers = "23456789"; // Sem 0, 1 para evitar confusão
  const special = "!@#$%&*";
  
  const allChars = uppercase + lowercase + numbers + special;
  
  let password = "";
  
  // Garantir pelo menos um de cada tipo
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];
  
  // Completar o resto da senha
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }
  
  // Embaralhar a senha
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}





