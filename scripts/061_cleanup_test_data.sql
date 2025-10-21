-- Script para limpar dados de teste
-- Execute este script no SQL Editor do Supabase Dashboard

-- 1. Remover comprovantes de teste
DELETE FROM public.pix_receipts 
WHERE file_name = 'teste-manual.png' 
OR file_path LIKE '%teste%'
OR file_size = 12345;

-- 2. Verificar se foram removidos
SELECT COUNT(*) as total_receipts FROM pix_receipts;

-- 3. Listar comprovantes restantes (apenas os reais)
SELECT 
  id,
  file_name,
  file_path,
  file_size,
  status,
  created_at
FROM pix_receipts 
ORDER BY created_at DESC;
