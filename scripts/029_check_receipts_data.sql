-- Verificar se os comprovantes estão sendo salvos na tabela

-- 1. Contar total de comprovantes
SELECT 'Total de comprovantes na tabela:' AS info, COUNT(*) AS count FROM public.pix_receipts;

-- 2. Ver os últimos comprovantes salvos
SELECT 
  id,
  user_id,
  transaction_id,
  file_name,
  file_path,
  file_size,
  file_type,
  status,
  created_at,
  uploaded_by
FROM public.pix_receipts
ORDER BY created_at DESC
LIMIT 10;

-- 3. Verificar se transaction_id está sendo salvo corretamente
SELECT 
  transaction_id,
  COUNT(*) AS count,
  STRING_AGG(file_name, ', ') AS files
FROM public.pix_receipts
WHERE transaction_id IS NOT NULL
GROUP BY transaction_id
ORDER BY count DESC;

-- 4. Verificar comprovantes sem transaction_id
SELECT 
  id,
  file_name,
  transaction_id,
  created_at
FROM public.pix_receipts
WHERE transaction_id IS NULL
ORDER BY created_at DESC;

-- 5. Verificar se os transaction_id correspondem a investimentos válidos
SELECT 
  pr.id AS receipt_id,
  pr.transaction_id,
  pr.file_name,
  pr.status,
  i.id AS investment_exists,
  i.amount
FROM public.pix_receipts pr
LEFT JOIN public.investments i ON pr.transaction_id = i.id
WHERE pr.transaction_id IS NOT NULL
ORDER BY pr.uploaded_at DESC
LIMIT 10;
