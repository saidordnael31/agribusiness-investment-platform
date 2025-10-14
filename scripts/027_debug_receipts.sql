-- Debug para verificar comprovantes PIX

-- 1. Verificar se há comprovantes na tabela
SELECT 
    'Comprovantes na tabela' as info,
    COUNT(*) as total,
    COUNT(CASE WHEN transaction_id IS NOT NULL THEN 1 END) as com_transaction_id,
    COUNT(CASE WHEN transaction_id IS NULL THEN 1 END) as sem_transaction_id
FROM pix_receipts;

-- 2. Listar comprovantes com detalhes
SELECT 
    id,
    user_id,
    transaction_id,
    file_name,
    file_size,
    file_type,
    status,
    created_at,
    profiles.full_name as usuario
FROM pix_receipts 
LEFT JOIN profiles ON pix_receipts.user_id = profiles.id
ORDER BY created_at DESC
LIMIT 10;

-- 3. Verificar se há investimentos
SELECT 
    'Investimentos na tabela' as info,
    COUNT(*) as total,
    COUNT(CASE WHEN status = 'active' THEN 1 END) as ativos,
    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pendentes
FROM investments;

-- 4. Listar alguns investimentos
SELECT 
    id,
    user_id,
    amount,
    quota_type,
    status,
    created_at
FROM investments 
ORDER BY created_at DESC
LIMIT 5;

-- 5. Verificar relacionamento entre comprovantes e investimentos
SELECT 
    'Relacionamento' as info,
    pr.id as receipt_id,
    pr.transaction_id,
    pr.file_name,
    i.id as investment_id,
    i.amount,
    i.status as investment_status
FROM pix_receipts pr
LEFT JOIN investments i ON pr.transaction_id = i.id
ORDER BY pr.created_at DESC
LIMIT 10;

-- 6. Verificar se o bucket storage tem arquivos
SELECT 
    'Arquivos no Storage' as info,
    COUNT(*) as total_arquivos,
    SUM((metadata->>'size')::bigint) as tamanho_total_bytes
FROM storage.objects 
WHERE bucket_id = 'pix_receipts';
