-- Corrigir associação dos comprovantes

-- 1. Verificar status antes da correção
SELECT 
  'Antes da correção' AS status,
  transaction_id,
  COUNT(*) AS count
FROM public.pix_receipts
WHERE user_id = '074fbab8-4646-415e-8e7b-51b33d2ae5c4'
GROUP BY transaction_id;

-- 2. Mover TODOS os comprovantes para o investimento que está sendo exibido
UPDATE public.pix_receipts
SET transaction_id = 'cf1f74f6-ca37-4f05-b0ee-ec7d3f5f9363'
WHERE user_id = '074fbab8-4646-415e-8e7b-51b33d2ae5c4'
  AND transaction_id IS NOT NULL;

-- 3. Verificar status após a correção
SELECT 
  'Após a correção' AS status,
  transaction_id,
  COUNT(*) AS count
FROM public.pix_receipts
WHERE user_id = '074fbab8-4646-415e-8e7b-51b33d2ae5c4'
GROUP BY transaction_id;

-- 4. Verificar comprovantes finais
SELECT 
  'Comprovantes finais' AS status,
  id,
  transaction_id,
  file_name,
  status,
  created_at
FROM public.pix_receipts
WHERE transaction_id = 'cf1f74f6-ca37-4f05-b0ee-ec7d3f5f9363'
ORDER BY created_at DESC;
