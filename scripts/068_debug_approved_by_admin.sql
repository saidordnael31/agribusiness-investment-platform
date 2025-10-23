-- Script para debug da coluna approved_by_admin

-- 1. Verificar se a coluna existe
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'investments' 
AND column_name = 'approved_by_admin';

-- 2. Verificar a estrutura atual da tabela investments
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'investments'
ORDER BY ordinal_position;

-- 3. Verificar investimentos ativos e seus valores de approved_by_admin
SELECT 
  id,
  amount,
  status,
  approved_by_admin,
  created_at,
  updated_at
FROM investments 
WHERE status = 'active'
ORDER BY updated_at DESC
LIMIT 10;

-- 4. Contar investimentos por status de aprovação
SELECT 
  approved_by_admin,
  COUNT(*) as total
FROM investments 
WHERE status = 'active'
GROUP BY approved_by_admin;

