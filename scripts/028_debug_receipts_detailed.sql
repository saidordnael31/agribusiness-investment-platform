-- Script detalhado para debug dos comprovantes PIX

-- 1. Verificar se a tabela pix_receipts existe e tem dados
SELECT 'Verificando tabela pix_receipts...' AS status;

SELECT 
  COUNT(*) AS total_receipts,
  COUNT(DISTINCT user_id) AS unique_users,
  COUNT(DISTINCT transaction_id) AS unique_transactions
FROM public.pix_receipts;

-- 2. Ver todos os comprovantes com detalhes
SELECT 
  id,
  user_id,
  transaction_id,
  file_name,
  file_path,
  file_size,
  file_type,
  status,
  uploaded_at,
  rejection_reason
FROM public.pix_receipts
ORDER BY uploaded_at DESC
LIMIT 10;

-- 3. Verificar se os transaction_id correspondem a investimentos válidos
SELECT 
  pr.id AS receipt_id,
  pr.transaction_id,
  pr.file_name,
  pr.status,
  i.id AS investment_id,
  i.amount,
  i.status AS investment_status
FROM public.pix_receipts pr
LEFT JOIN public.investments i ON pr.transaction_id = i.id
ORDER BY pr.uploaded_at DESC;

-- 4. Verificar investimentos que NÃO têm comprovantes
SELECT 
  i.id AS investment_id,
  i.amount,
  i.status,
  i.created_at,
  COUNT(pr.id) AS receipt_count
FROM public.investments i
LEFT JOIN public.pix_receipts pr ON i.id = pr.transaction_id
GROUP BY i.id, i.amount, i.status, i.created_at
HAVING COUNT(pr.id) = 0
ORDER BY i.created_at DESC
LIMIT 10;

-- 5. Verificar investimentos que TÊM comprovantes
SELECT 
  i.id AS investment_id,
  i.amount,
  i.status,
  i.created_at,
  COUNT(pr.id) AS receipt_count,
  STRING_AGG(pr.file_name, ', ') AS receipt_files
FROM public.investments i
LEFT JOIN public.pix_receipts pr ON i.id = pr.transaction_id
GROUP BY i.id, i.amount, i.status, i.created_at
HAVING COUNT(pr.id) > 0
ORDER BY i.created_at DESC
LIMIT 10;

-- 6. Verificar RLS policies da tabela pix_receipts
SELECT 
  policyname,
  permissive,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'pix_receipts';

-- 7. Testar uma query simples (sem RLS)
SET row_security = off;
SELECT COUNT(*) AS total_without_rls FROM public.pix_receipts;
SET row_security = on;
