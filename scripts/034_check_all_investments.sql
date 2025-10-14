-- Verificar todos os investimentos do usuário e seus comprovantes

-- 1. Todos os investimentos do usuário
SELECT 
  'Investimentos do usuário' AS tipo,
  id,
  amount,
  status,
  created_at
FROM public.investments
WHERE user_id = '074fbab8-4646-415e-8e7b-51b33d2ae5c4'
ORDER BY created_at DESC;

-- 2. Todos os comprovantes do usuário
SELECT 
  'Comprovantes do usuário' AS tipo,
  id,
  transaction_id,
  file_name,
  file_size,
  status,
  created_at
FROM public.pix_receipts
WHERE user_id = '074fbab8-4646-415e-8e7b-51b33d2ae5c4'
ORDER BY created_at DESC;

-- 3. Verificar se há comprovantes para o investimento que está sendo exibido
SELECT 
  'Comprovantes para investimento 958779c2' AS tipo,
  id,
  transaction_id,
  file_name,
  status,
  created_at
FROM public.pix_receipts
WHERE transaction_id = '958779c2-5a08-4974-8ce7-0cd92f5474c6';

-- 4. Verificar se há comprovantes para o investimento com comprovantes
SELECT 
  'Comprovantes para investimento cf1f74f6' AS tipo,
  id,
  transaction_id,
  file_name,
  status,
  created_at
FROM public.pix_receipts
WHERE transaction_id = 'cf1f74f6-ca37-4f05-b0ee-ec7d3f5f9363';

-- 5. Verificar se há investimentos órfãos (sem comprovantes)
SELECT 
  'Investimentos sem comprovantes' AS tipo,
  i.id,
  i.amount,
  i.status,
  i.created_at
FROM public.investments i
LEFT JOIN public.pix_receipts pr ON i.id = pr.transaction_id
WHERE i.user_id = '074fbab8-4646-415e-8e7b-51b33d2ae5c4'
  AND pr.transaction_id IS NULL
ORDER BY i.created_at DESC;
