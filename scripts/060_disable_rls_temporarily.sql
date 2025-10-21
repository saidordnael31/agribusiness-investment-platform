-- Desabilitar RLS temporariamente para resolver o problema
-- Execute este script no SQL Editor do Supabase Dashboard

-- 1. Desabilitar RLS na tabela pix_receipts
ALTER TABLE public.pix_receipts DISABLE ROW LEVEL SECURITY;

-- 2. Verificar se RLS foi desabilitado
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'pix_receipts';

-- 3. Testar inserção manual
INSERT INTO public.pix_receipts (
  user_id,
  transaction_id,
  file_name,
  file_path,
  file_size,
  file_type,
  mime_type,
  status,
  uploaded_by,
  approved_by,
  approved_at
) VALUES (
  '5870c3fd-3305-4359-9b91-0b6c67e4fac2'::UUID,
  '464c712a-d2e2-4c96-b671-a00c531a0a59'::UUID,
  'teste-manual.png',
  'admin-receipts/teste-manual.png',
  12345,
  'image/png',
  'image/png',
  'approved',
  '2c7ac5c6-470c-41d4-a445-ecd9e0bbcfbc'::UUID,
  '2c7ac5c6-470c-41d4-a445-ecd9e0bbcfbc'::UUID,
  NOW()
);

-- 4. Verificar se foi inserido
SELECT * FROM pix_receipts 
WHERE transaction_id = '464c712a-d2e2-4c96-b671-a00c531a0a59'
ORDER BY created_at DESC;
