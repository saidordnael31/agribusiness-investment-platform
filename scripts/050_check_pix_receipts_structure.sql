-- Script para verificar a estrutura da tabela pix_receipts
-- e identificar problemas com a visualização de comprovantes

-- 1. Verificar se a tabela existe
SELECT 
  table_name, 
  table_type 
FROM information_schema.tables 
WHERE table_name = 'pix_receipts';

-- 2. Verificar estrutura da tabela
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'pix_receipts'
ORDER BY ordinal_position;

-- 3. Verificar se há dados na tabela
SELECT COUNT(*) as total_receipts FROM pix_receipts;

-- 4. Verificar alguns registros de exemplo
SELECT 
  id,
  investment_id,
  file_name,
  file_path,
  file_type,
  file_size,
  status,
  created_at
FROM pix_receipts 
ORDER BY created_at DESC 
LIMIT 5;

-- 5. Verificar se há comprovantes para investimentos aprovados
SELECT 
  i.id as investment_id,
  i.status as investment_status,
  p.id as receipt_id,
  p.file_name,
  p.file_path,
  p.status as receipt_status
FROM investments i
LEFT JOIN pix_receipts p ON p.investment_id = i.id
WHERE i.status = 'active'
ORDER BY i.created_at DESC
LIMIT 10;

-- 6. Verificar políticas RLS da tabela pix_receipts
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename = 'pix_receipts';
