-- Adicionar role "distribuidor" ao sistema
-- Este script atualiza a constraint CHECK para incluir o novo role "distribuidor"

-- Remover constraint antiga
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Adicionar nova constraint com distribuidor
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('distribuidor', 'escritorio', 'gestor', 'lider', 'assessor', 'investidor'));

-- Comentário explicativo
COMMENT ON COLUMN profiles.role IS 'Role do usuário na hierarquia: distribuidor -> escritorio -> assessor -> investidor';

