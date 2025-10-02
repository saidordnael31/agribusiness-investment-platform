-- Adicionar campos que estão faltando na tabela profiles
-- Baseado nos campos usados no código mas que não estão nos scripts anteriores

-- Adicionar campos de perfil pessoal
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS rg VARCHAR(20);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profession VARCHAR(100);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS marital_status VARCHAR(20);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nationality VARCHAR(50);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pix_usdt_key TEXT;

-- Adicionar constraints para marital_status
ALTER TABLE profiles ADD CONSTRAINT IF NOT EXISTS check_marital_status 
CHECK (marital_status IN ('solteiro', 'casado', 'divorciado', 'viuvo', 'uniao_estavel') OR marital_status IS NULL);

-- Adicionar constraints para nationality
ALTER TABLE profiles ADD CONSTRAINT IF NOT EXISTS check_nationality 
CHECK (nationality IN ('brasileira', 'estrangeira') OR nationality IS NULL);

-- Comentários para documentar os campos
COMMENT ON COLUMN profiles.address IS 'Endereço completo do usuário';
COMMENT ON COLUMN profiles.rg IS 'Número do RG do usuário';
COMMENT ON COLUMN profiles.profession IS 'Profissão do usuário';
COMMENT ON COLUMN profiles.marital_status IS 'Estado civil do usuário';
COMMENT ON COLUMN profiles.nationality IS 'Nacionalidade do usuário';
COMMENT ON COLUMN profiles.pix_usdt_key IS 'Chave PIX ou USDT para pagamentos';
