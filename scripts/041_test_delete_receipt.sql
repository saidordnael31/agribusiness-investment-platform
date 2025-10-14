-- scripts/041_test_delete_receipt.sql

-- Verificar comprovantes existentes
SELECT 
    id,
    user_id,
    transaction_id,
    file_name,
    file_path,
    status,
    created_at
FROM public.pix_receipts 
ORDER BY created_at DESC
LIMIT 10;

-- Testar exclusão de um comprovante específico (substitua o ID)
-- SELECT id, file_name FROM public.pix_receipts WHERE file_name LIKE '%WhatsApp%' LIMIT 1;

-- Para testar, descomente a linha abaixo e substitua o ID:
-- DELETE FROM public.pix_receipts WHERE id = 'SUBSTITUA_PELO_ID_AQUI';

-- Verificar se o comprovante foi deletado
-- SELECT COUNT(*) as total_receipts FROM public.pix_receipts;
