-- Verificar se o investimento específico existe

-- 1. Verificar se o investimento com ID cf1f74f6-ca37-4f05-b0ee-ec7d3f5f9363 existe
SELECT 
  'Investimento existe' AS status,
  id,
  amount,
  status,
  created_at
FROM public.investments
WHERE id = 'cf1f74f6-ca37-4f05-b0ee-ec7d3f5f9363';

-- 2. Se não existir, verificar todos os investimentos do usuário
SELECT 
  'Todos os investimentos do usuário' AS status,
  id,
  amount,
  status,
  created_at
FROM public.investments
WHERE user_id = '074fbab8-4646-415e-8e7b-51b33d2ae5c4'
ORDER BY created_at DESC;

-- 3. Verificar se há comprovantes órfãos (sem investimento correspondente)
SELECT 
  'Comprovantes órfãos' AS status,
  pr.id,
  pr.transaction_id,
  pr.file_name,
  pr.created_at
FROM public.pix_receipts pr
LEFT JOIN public.investments i ON pr.transaction_id = i.id
WHERE pr.transaction_id = 'cf1f74f6-ca37-4f05-b0ee-ec7d3f5f9363'
  AND i.id IS NULL;
