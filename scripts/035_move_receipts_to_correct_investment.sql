-- Mover comprovantes para o investimento correto

-- 1. Verificar os investimentos antes da mudança
SELECT 
  'Investimentos antes da mudança' AS status,
  i.id,
  i.amount,
  i.status,
  COUNT(pr.id) AS receipt_count
FROM public.investments i
LEFT JOIN public.pix_receipts pr ON i.id = pr.transaction_id
WHERE i.user_id = '074fbab8-4646-415e-8e7b-51b33d2ae5c4'
GROUP BY i.id, i.amount, i.status
ORDER BY i.created_at DESC;

-- 2. Atualizar os comprovantes para o investimento correto
UPDATE public.pix_receipts
SET transaction_id = '958779c2-5a08-4974-8ce7-0cd92f5474c6'
WHERE transaction_id = 'cf1f74f6-ca37-4f05-b0ee-ec7d3f5f9363'
  AND user_id = '074fbab8-4646-415e-8e7b-51b33d2ae5c4';

-- 3. Verificar os investimentos após a mudança
SELECT 
  'Investimentos após a mudança' AS status,
  i.id,
  i.amount,
  i.status,
  COUNT(pr.id) AS receipt_count
FROM public.investments i
LEFT JOIN public.pix_receipts pr ON i.id = pr.transaction_id
WHERE i.user_id = '074fbab8-4646-415e-8e7b-51b33d2ae5c4'
GROUP BY i.id, i.amount, i.status
ORDER BY i.created_at DESC;

-- 4. Verificar os comprovantes movidos
SELECT 
  'Comprovantes movidos' AS status,
  id,
  transaction_id,
  file_name,
  status,
  created_at
FROM public.pix_receipts
WHERE transaction_id = '958779c2-5a08-4974-8ce7-0cd92f5474c6'
ORDER BY created_at DESC;
