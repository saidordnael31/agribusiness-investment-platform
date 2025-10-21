-- Script para testar se a função RPC existe e funciona
-- Execute este script no SQL Editor do Supabase Dashboard

-- 1. Verificar se a função existe
SELECT 
  routine_name,
  routine_type,
  security_type,
  data_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'insert_pix_receipt';

-- 2. Testar a função com dados de exemplo
-- (Substitua os UUIDs pelos valores reais do seu sistema)
SELECT public.insert_pix_receipt(
  '5870c3fd-3305-4359-9b91-0b6c67e4fac2'::UUID, -- user_id do investidor
  '464c712a-d2e2-4c96-b671-a00c531a0a59'::UUID, -- transaction_id
  'teste.png'::TEXT,
  'admin-receipts/teste.png'::TEXT,
  12345::INTEGER,
  'image/png'::TEXT,
  'image/png'::TEXT,
  '2c7ac5c6-470c-41d4-a445-ecd9e0bbcfbc'::UUID, -- uploaded_by
  '2c7ac5c6-470c-41d4-a445-ecd9e0bbcfbc'::UUID, -- approved_by
  'approved'::TEXT,
  NOW()
);

-- 3. Verificar se o comprovante foi inserido
SELECT * FROM pix_receipts 
WHERE transaction_id = '464c712a-d2e2-4c96-b671-a00c531a0a59'
ORDER BY created_at DESC;
