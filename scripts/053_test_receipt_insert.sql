-- Script para testar inserção de comprovante na tabela pix_receipts
-- Este script ajuda a identificar se há problemas de RLS ou estrutura

-- 1. Verificar se a tabela pix_receipts existe e tem as colunas corretas
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'pix_receipts'
ORDER BY ordinal_position;

-- 2. Verificar políticas RLS da tabela pix_receipts
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

-- 3. Verificar se há dados na tabela
SELECT COUNT(*) as total_receipts FROM pix_receipts;

-- 4. Tentar inserir um comprovante de teste (substitua os valores pelos corretos)
-- ATENÇÃO: Este comando pode falhar se houver problemas de RLS
-- Substitua os UUIDs pelos valores corretos do seu sistema

/*
INSERT INTO pix_receipts (
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
  '00000000-0000-0000-0000-000000000000', -- Substitua pelo user_id correto
  '00000000-0000-0000-0000-000000000000', -- Substitua pelo transaction_id correto
  'teste-comprovante.jpg',
  'teste/teste-comprovante.jpg',
  1024,
  'image/jpeg',
  'image/jpeg',
  'approved',
  '00000000-0000-0000-0000-000000000000', -- Substitua pelo uploaded_by correto
  '00000000-0000-0000-0000-000000000000', -- Substitua pelo approved_by correto
  NOW()
);
*/

-- 5. Verificar se a inserção funcionou
-- SELECT * FROM pix_receipts WHERE file_name = 'teste-comprovante.jpg';

-- 6. Verificar permissões do usuário atual
SELECT current_user, session_user;

-- 7. Verificar se o usuário tem permissão para inserir na tabela
SELECT 
  table_name,
  privilege_type
FROM information_schema.table_privileges 
WHERE table_name = 'pix_receipts' 
AND grantee = current_user;
