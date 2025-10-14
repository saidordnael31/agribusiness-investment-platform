-- Verificar status atual dos comprovantes

-- 1. Verificar onde estão os comprovantes agora
SELECT 
  'Status atual dos comprovantes' AS info,
  transaction_id,
  COUNT(*) AS count,
  STRING_AGG(file_name, ', ') AS files
FROM public.pix_receipts
WHERE user_id = '074fbab8-4646-415e-8e7b-51b33d2ae5c4'
GROUP BY transaction_id
ORDER BY count DESC;

-- 2. Verificar todos os investimentos do usuário
SELECT 
  'Investimentos do usuário' AS info,
  id,
  amount,
  status,
  created_at
FROM public.investments
WHERE user_id = '074fbab8-4646-415e-8e7b-51b33d2ae5c4'
ORDER BY created_at DESC;

-- 3. Verificar se há comprovantes para o investimento que está sendo exibido
SELECT 
  'Comprovantes para cf1f74f6' AS info,
  id,
  transaction_id,
  file_name,
  status,
  created_at
FROM public.pix_receipts
WHERE transaction_id = 'cf1f74f6-ca37-4f05-b0ee-ec7d3f5f9363';

-- 4. Verificar se há comprovantes para o investimento 958779c2
SELECT 
  'Comprovantes para 958779c2' AS info,
  id,
  transaction_id,
  file_name,
  status,
  created_at
FROM public.pix_receipts
WHERE transaction_id = '958779c2-5a08-4974-8ce7-0cd92f5474c6';
