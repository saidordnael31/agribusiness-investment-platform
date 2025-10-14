-- Verificação rápida dos itens essenciais
-- Execute este script no Supabase SQL Editor

-- 1. Tabela existe?
SELECT 'Tabela investor_contracts' as item, 
       CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'investor_contracts' AND table_schema = 'public') 
            THEN '✅ EXISTE' ELSE '❌ NÃO EXISTE' END as status;

-- 2. Bucket existe?
SELECT 'Bucket investor_contracts' as item,
       CASE WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'investor_contracts') 
            THEN '✅ EXISTE' ELSE '❌ NÃO EXISTE' END as status;

-- 3. Políticas de storage?
SELECT 'Políticas de Storage' as item,
       CASE WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*)::text || ' políticas' ELSE '❌ NENHUMA' END as status
FROM pg_policies WHERE tablename = 'objects' AND policyname LIKE '%contract%';

-- 4. Políticas RLS da tabela?
SELECT 'Políticas RLS' as item,
       CASE WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*)::text || ' políticas' ELSE '❌ NENHUMA' END as status
FROM pg_policies WHERE tablename = 'investor_contracts';

-- 5. Usuários admin?
SELECT 'Usuários Admin' as item,
       CASE WHEN COUNT(*) > 0 THEN '✅ ' || COUNT(*)::text || ' usuários' ELSE '❌ NENHUM' END as status
FROM public.profiles WHERE user_type = 'admin';
