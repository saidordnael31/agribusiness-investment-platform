-- Script para limpar arquivos de teste do storage
-- Execute este script no SQL Editor do Supabase Dashboard

-- 1. Listar arquivos no bucket pix_receipts
SELECT name, size, created_at 
FROM storage.objects 
WHERE bucket_id = 'pix_receipts' 
ORDER BY created_at DESC;

-- 2. Remover arquivos de teste (substitua pelos nomes reais dos arquivos de teste)
-- DELETE FROM storage.objects 
-- WHERE bucket_id = 'pix_receipts' 
-- AND name LIKE '%teste%';

-- 3. Verificar arquivos restantes
SELECT name, size, created_at 
FROM storage.objects 
WHERE bucket_id = 'pix_receipts' 
ORDER BY created_at DESC;
