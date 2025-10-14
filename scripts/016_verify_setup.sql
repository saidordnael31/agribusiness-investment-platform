-- Script para verificar se tudo foi configurado corretamente
-- Execute este script no Supabase SQL Editor

-- ========================================
-- VERIFICAÇÃO COMPLETA DO SETUP
-- ========================================

-- 1. Verificar se a tabela investor_contracts existe
SELECT 
    'Tabela investor_contracts' as item,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'investor_contracts' AND table_schema = 'public') 
        THEN '✅ EXISTE' 
        ELSE '❌ NÃO EXISTE' 
    END as status;

-- 2. Verificar se o bucket investor_contracts existe
SELECT 
    'Bucket investor_contracts' as item,
    CASE 
        WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'investor_contracts') 
        THEN '✅ EXISTE' 
        ELSE '❌ NÃO EXISTE' 
    END as status;

-- 3. Verificar políticas de storage
SELECT 
    'Políticas de Storage' as item,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*)::text || ' políticas criadas'
        ELSE '❌ NENHUMA POLÍTICA'
    END as status
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%contract%';

-- 4. Verificar políticas RLS da tabela
SELECT 
    'Políticas RLS da Tabela' as item,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*)::text || ' políticas criadas'
        ELSE '❌ NENHUMA POLÍTICA'
    END as status
FROM pg_policies 
WHERE tablename = 'investor_contracts';

-- 5. Verificar usuários admin
SELECT 
    'Usuários Admin' as item,
    CASE 
        WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*)::text || ' usuários admin encontrados'
        ELSE '❌ NENHUM USUÁRIO ADMIN'
    END as status
FROM public.profiles 
WHERE user_type = 'admin';

-- 6. Verificar se RLS está habilitado na tabela
SELECT 
    'RLS Habilitado' as item,
    CASE 
        WHEN rowsecurity = true THEN '✅ HABILITADO'
        ELSE '❌ DESABILITADO'
    END as status
FROM pg_tables 
WHERE tablename = 'investor_contracts' 
AND schemaname = 'public';

-- 7. Listar usuários admin (se existirem)
SELECT 
    'Usuários Admin Disponíveis:' as info,
    '' as details
UNION ALL
SELECT 
    'ID: ' || id::text as info,
    'Nome: ' || COALESCE(full_name, 'Sem nome') || ' | Email: ' || COALESCE(email, 'Sem email') as details
FROM public.profiles 
WHERE user_type = 'admin'
ORDER BY info;

-- 8. Listar políticas de storage criadas
SELECT 
    'Políticas de Storage:' as info,
    '' as details
UNION ALL
SELECT 
    'Política: ' || policyname as info,
    'Comando: ' || cmd as details
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%contract%'
ORDER BY info;

-- 9. Listar políticas RLS da tabela
SELECT 
    'Políticas RLS da Tabela:' as info,
    '' as details
UNION ALL
SELECT 
    'Política: ' || policyname as info,
    'Comando: ' || cmd as details
FROM pg_policies 
WHERE tablename = 'investor_contracts'
ORDER BY info;

-- 10. Verificar configurações do bucket
SELECT 
    'Configurações do Bucket:' as info,
    '' as details
UNION ALL
SELECT 
    'Bucket: ' || id as info,
    'Público: ' || public::text || ' | Limite: ' || COALESCE(file_size_limit::text, 'Sem limite') as details
FROM storage.buckets 
WHERE id = 'investor_contracts'
ORDER BY info;
