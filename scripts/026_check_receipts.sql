-- Verificar se os comprovantes PIX estão sendo salvos corretamente

-- 1. Verificar se a tabela pix_receipts existe e tem dados
SELECT 
    'Tabela pix_receipts' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'pix_receipts' AND table_schema = 'public')
        THEN '✅ Tabela existe'
        ELSE '❌ Tabela NÃO existe'
    END as status;

-- 2. Contar comprovantes por status
SELECT 
    'Comprovantes por Status' as info,
    status,
    COUNT(*) as quantidade,
    MIN(created_at) as primeiro_upload,
    MAX(created_at) as ultimo_upload
FROM pix_receipts 
GROUP BY status
ORDER BY status;

-- 3. Listar comprovantes recentes
SELECT 
    'Comprovantes Recentes' as info,
    id,
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

-- 4. Verificar se o bucket storage tem arquivos
SELECT 
    'Arquivos no Storage' as info,
    COUNT(*) as total_arquivos,
    SUM(metadata->>'size')::bigint as tamanho_total_bytes
FROM storage.objects 
WHERE bucket_id = 'pix_receipts';

-- 5. Verificar políticas RLS ativas
SELECT 
    'Políticas RLS Ativas' as info,
    policyname,
    cmd,
    CASE 
        WHEN qual IS NOT NULL THEN 'Condição: ' || qual
        ELSE 'Sem condição'
    END as condicao
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects' 
AND policyname LIKE 'pix_receipts%'
ORDER BY policyname;

-- 6. Verificar se há usuários admin
SELECT 
    'Usuários Admin' as info,
    COUNT(*) as total_admins,
    STRING_AGG(email, ', ') as emails_admin
FROM profiles 
WHERE user_type = 'admin';

-- 7. Estatísticas gerais
SELECT 
    'Estatísticas Gerais' as info,
    (SELECT COUNT(*) FROM pix_receipts) as total_comprovantes,
    (SELECT COUNT(*) FROM pix_receipts WHERE status = 'pending') as pendentes,
    (SELECT COUNT(*) FROM pix_receipts WHERE status = 'approved') as aprovados,
    (SELECT COUNT(*) FROM pix_receipts WHERE status = 'rejected') as rejeitados,
    (SELECT COUNT(DISTINCT user_id) FROM pix_receipts) as usuarios_com_upload;
