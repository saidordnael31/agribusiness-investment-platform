-- Script para debugar problemas de storage de contratos
-- Execute este script no Supabase SQL Editor

-- ========================================
-- VERIFICAÇÃO DO STORAGE DE CONTRATOS
-- ========================================

-- 1. Verificar se o bucket investor_contracts existe
SELECT 
    'Bucket investor_contracts' as item,
    CASE 
        WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'investor_contracts') 
        THEN '✅ EXISTE' 
        ELSE '❌ NÃO EXISTE' 
    END as status;

-- 2. Verificar configurações do bucket
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at
FROM storage.buckets 
WHERE id = 'investor_contracts';

-- 3. Verificar políticas de storage
SELECT 
    'Políticas de Storage' as item,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*)::text || ' políticas' 
        ELSE '❌ NENHUMA POLÍTICA' 
    END as status
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%contract%';

-- 4. Listar todas as políticas de storage relacionadas a contratos
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%contract%'
ORDER BY policyname;

-- 5. Verificar se há arquivos no bucket (se possível)
-- Nota: Esta consulta pode não funcionar dependendo das permissões
SELECT 
    'Arquivos no bucket' as item,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*)::text || ' arquivos' 
        ELSE '❌ NENHUM ARQUIVO' 
    END as status
FROM storage.objects 
WHERE bucket_id = 'investor_contracts';

-- 6. Listar alguns arquivos do bucket (se houver)
SELECT 
    name,
    bucket_id,
    path_tokens,
    created_at,
    updated_at
FROM storage.objects 
WHERE bucket_id = 'investor_contracts'
ORDER BY created_at DESC
LIMIT 10;

-- 7. Verificar contratos na tabela
SELECT 
    'Contratos na tabela' as item,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*)::text || ' contratos' 
        ELSE '❌ NENHUM CONTRATO' 
    END as status
FROM public.investor_contracts;

-- 8. Listar alguns contratos da tabela
SELECT 
    id,
    investor_id,
    contract_name,
    file_name,
    file_url,
    file_size,
    file_type,
    status,
    created_at
FROM public.investor_contracts
ORDER BY created_at DESC
LIMIT 5;
