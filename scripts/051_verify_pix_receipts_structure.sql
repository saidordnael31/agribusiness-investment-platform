-- Script para verificar a estrutura correta da tabela pix_receipts
-- e identificar as colunas disponíveis

-- 1. Verificar se a tabela existe
SELECT 
  table_name, 
  table_type 
FROM information_schema.tables 
WHERE table_name = 'pix_receipts';

-- 2. Verificar todas as colunas da tabela
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

-- 4. Verificar alguns registros de exemplo (se existirem)
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
LIMIT 5;

-- 5. Verificar se a tabela tem as colunas necessárias
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pix_receipts' AND column_name = 'transaction_id') 
    THEN '✅ transaction_id existe' 
    ELSE '❌ transaction_id NÃO existe' 
  END as transaction_id_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pix_receipts' AND column_name = 'investment_id') 
    THEN '✅ investment_id existe' 
    ELSE '❌ investment_id NÃO existe' 
  END as investment_id_status,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pix_receipts' AND column_name = 'file_path') 
    THEN '✅ file_path existe' 
    ELSE '❌ file_path NÃO existe' 
  END as file_path_status;

