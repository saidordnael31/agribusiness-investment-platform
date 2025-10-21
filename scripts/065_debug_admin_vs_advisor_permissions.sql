-- scripts/065_debug_admin_vs_advisor_permissions.sql

-- ========================================
-- DIAGNÓSTICO: ADMIN vs ASSESSOR - PERMISSÕES DE CONTRATOS
-- ========================================

-- 1. Verificar se o bucket existe
SELECT 
    'Bucket Status' as item,
    CASE 
        WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'investor_contracts')
        THEN '✅ EXISTE'
        ELSE '❌ NÃO EXISTE'
    END as status,
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
FROM storage.buckets 
WHERE id = 'investor_contracts';

-- 2. Verificar políticas RLS da tabela investor_contracts
SELECT 
    'RLS Policies - investor_contracts' as item,
    policyname,
    permissive,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'investor_contracts'
ORDER BY policyname;

-- 3. Verificar políticas de storage para o bucket investor_contracts
SELECT 
    'Storage Policies - investor_contracts' as item,
    policyname,
    tablename,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'objects'
AND policyname LIKE '%contracts%'
ORDER BY policyname;

-- 4. Verificar se RLS está habilitado na tabela investor_contracts
SELECT 
    'RLS Status - investor_contracts' as item,
    relname AS table_name,
    relrowsecurity AS rls_enabled
FROM pg_class
WHERE relname = 'investor_contracts';

-- 5. Verificar alguns contratos existentes
SELECT 
    'Contratos Existentes' as item,
    id,
    investor_id,
    contract_name,
    file_name,
    file_url,
    status,
    created_at
FROM public.investor_contracts
LIMIT 5;

-- 6. Verificar perfis de usuários (admin vs assessor)
SELECT 
    'Perfis de Usuários' as item,
    id,
    full_name,
    email,
    user_type,
    role,
    parent_id,
    office_id,
    is_active
FROM public.profiles
WHERE user_type IN ('admin', 'distributor')
ORDER BY user_type, role;

-- 7. Verificar relacionamentos parent_id/office_id
SELECT 
    'Relacionamentos' as item,
    p1.id as assessor_id,
    p1.full_name as assessor_name,
    p1.role as assessor_role,
    p2.id as investor_id,
    p2.full_name as investor_name,
    p2.parent_id,
    p2.office_id
FROM public.profiles p1
LEFT JOIN public.profiles p2 ON p2.parent_id = p1.id OR p2.office_id = p1.id
WHERE p1.user_type = 'distributor'
AND p2.user_type = 'investor'
LIMIT 10;

-- 8. Testar permissões específicas (substitua pelos IDs reais)
-- Substitua 'USER_ID_AQUI' pelo ID do assessor que está testando
/*
SELECT 
    'Teste de Permissão - Assessor' as item,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM public.profiles p1
            JOIN public.profiles p2 ON p2.parent_id = p1.id OR p2.office_id = p1.id
            WHERE p1.id = 'USER_ID_AQUI' 
            AND p1.user_type = 'distributor'
            AND p2.id = investor_id
        )
        THEN '✅ TEM PERMISSÃO'
        ELSE '❌ SEM PERMISSÃO'
    END as status
FROM public.investor_contracts
LIMIT 1;
*/

-- 9. Verificar se há arquivos no storage
SELECT 
    'Arquivos no Storage' as item,
    id,
    name,
    bucket_id,
    owner,
    created_at,
    metadata
FROM storage.objects
WHERE bucket_id = 'investor_contracts'
LIMIT 5;

-- 10. Verificar configurações do bucket
SELECT 
    'Configurações do Bucket' as item,
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at,
    updated_at
FROM storage.buckets
WHERE id = 'investor_contracts';

-- Diagnóstico completo executado. Verifique os resultados acima.
