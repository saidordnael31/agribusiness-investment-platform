-- Verificar se o transaction_id dos comprovantes corresponde a investimentos válidos

-- 1. Verificar se o transaction_id dos comprovantes existe na tabela investments
SELECT 
  pr.transaction_id,
  pr.file_name,
  pr.created_at,
  i.id AS investment_exists,
  i.amount,
  i.status AS investment_status
FROM public.pix_receipts pr
LEFT JOIN public.investments i ON pr.transaction_id = i.id
WHERE pr.transaction_id = 'cf1f74f6-ca37-4f05-b0ee-ec7d3f5f9363'
ORDER BY pr.created_at DESC;

-- 2. Verificar todos os investimentos do usuário
SELECT 
  id,
  amount,
  status,
  created_at
FROM public.investments
WHERE user_id = '074fbab8-4646-415e-8e7b-51b33d2ae5c4'
ORDER BY created_at DESC;

-- 3. Verificar se há investimentos com ID similar
SELECT 
  id,
  amount,
  status,
  created_at
FROM public.investments
WHERE id::text LIKE '%cf1f74f6%' OR id::text LIKE '%ca37%' OR id::text LIKE '%b0ee%'
ORDER BY created_at DESC;
