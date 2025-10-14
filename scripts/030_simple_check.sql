-- Verificação simples da tabela pix_receipts

-- 1. Verificar se a tabela existe
SELECT 'Tabela pix_receipts existe' AS status
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name = 'pix_receipts';

-- 2. Contar total de registros
SELECT COUNT(*) AS total_comprovantes FROM public.pix_receipts;

-- 3. Ver estrutura da tabela
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'pix_receipts'
ORDER BY ordinal_position;

-- 4. Ver alguns registros (se existirem)
SELECT 
  id,
  user_id,
  transaction_id,
  file_name,
  file_size,
  file_type,
  status,
  created_at
FROM public.pix_receipts
ORDER BY created_at DESC
LIMIT 5;
