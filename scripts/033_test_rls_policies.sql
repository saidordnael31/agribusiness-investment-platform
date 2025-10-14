-- Testar RLS policies para pix_receipts

-- 1. Verificar se as políticas RLS existem
SELECT 
  policyname,
  permissive,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'pix_receipts'
ORDER BY policyname;

-- 2. Testar query sem RLS (como admin)
SET row_security = off;
SELECT 
  COUNT(*) AS total_without_rls,
  COUNT(CASE WHEN transaction_id = 'cf1f74f6-ca37-4f05-b0ee-ec7d3f5f9363' THEN 1 END) AS with_correct_transaction_id
FROM public.pix_receipts;
SET row_security = on;

-- 3. Testar query com RLS (simulando usuário admin)
-- Nota: Este teste pode falhar se não estivermos logados como admin
SELECT 
  COUNT(*) AS total_with_rls,
  COUNT(CASE WHEN transaction_id = 'cf1f74f6-ca37-4f05-b0ee-ec7d3f5f9363' THEN 1 END) AS with_correct_transaction_id
FROM public.pix_receipts;

-- 4. Verificar se o usuário atual é admin
SELECT 
  id,
  user_type,
  full_name
FROM public.profiles
WHERE id = auth.uid();

-- 5. Testar query específica por transaction_id
SELECT 
  id,
  transaction_id,
  file_name,
  status,
  created_at
FROM public.pix_receipts
WHERE transaction_id = 'cf1f74f6-ca37-4f05-b0ee-ec7d3f5f9363'
ORDER BY created_at DESC;
