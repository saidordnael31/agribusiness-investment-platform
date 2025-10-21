-- Script para verificar se há comprovantes na tabela pix_receipts
-- e identificar por que a API retorna array vazio

-- 1. Verificar se há dados na tabela pix_receipts
SELECT COUNT(*) as total_receipts FROM pix_receipts;

-- 2. Verificar alguns registros de exemplo
SELECT 
  id,
  user_id,
  transaction_id,
  file_name,
  file_path,
  file_type,
  file_size,
  status,
  created_at
FROM pix_receipts 
ORDER BY created_at DESC 
LIMIT 10;

-- 3. Verificar se há comprovantes para investimentos específicos
SELECT 
  i.id as investment_id,
  i.status as investment_status,
  i.amount,
  p.id as receipt_id,
  p.file_name,
  p.file_path,
  p.status as receipt_status,
  p.created_at as receipt_created_at
FROM investments i
LEFT JOIN pix_receipts p ON p.transaction_id = i.id
WHERE i.status = 'active'
ORDER BY i.created_at DESC
LIMIT 10;

-- 4. Verificar se há comprovantes pendentes
SELECT 
  id,
  user_id,
  transaction_id,
  file_name,
  status,
  created_at
FROM pix_receipts 
WHERE status = 'pending'
ORDER BY created_at DESC;

-- 5. Verificar se há comprovantes aprovados
SELECT 
  id,
  user_id,
  transaction_id,
  file_name,
  status,
  created_at
FROM pix_receipts 
WHERE status = 'approved'
ORDER BY created_at DESC;

-- 6. Verificar a estrutura da tabela pix_receipts
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'pix_receipts'
ORDER BY ordinal_position;
