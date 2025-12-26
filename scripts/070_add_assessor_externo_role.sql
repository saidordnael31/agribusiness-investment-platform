-- Adicionar role "assessor_externo" ao sistema
-- Este script atualiza a constraint CHECK da coluna profiles.role
-- para incluir o novo role "assessor_externo", mantendo compatibilidade
-- com os roles já existentes.

-- Remover constraint antiga, se existir
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

-- Adicionar nova constraint incluindo assessor_externo
ALTER TABLE profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (
    role IN (
      'distribuidor',
      'escritorio',
      'gestor',
      'lider',
      'assessor',
      'assessor_externo',
      'investidor'
    )
  );

-- Comentário explicativo
COMMENT ON COLUMN profiles.role IS
  'Role do usuário na hierarquia: distribuidor -> escritorio -> assessor/assessor_externo -> investidor';


