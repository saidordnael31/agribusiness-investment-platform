-- Script para debugar problemas de autenticação e permissões
-- Execute este script no Supabase SQL Editor

-- 1. Verificar usuários admin existentes
SELECT 
    id,
    user_type,
    full_name,
    email,
    created_at
FROM public.profiles 
WHERE user_type = 'admin'
ORDER BY created_at DESC;

-- 2. Verificar se a tabela profiles tem dados
SELECT COUNT(*) as total_profiles FROM public.profiles;
SELECT COUNT(*) as admin_profiles FROM public.profiles WHERE user_type = 'admin';

-- 3. Verificar estrutura da tabela profiles
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 4. Verificar se RLS está habilitado na tabela profiles
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'profiles' 
AND schemaname = 'public';

-- 5. Verificar políticas RLS da tabela profiles
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'profiles'
ORDER BY policyname;

-- 6. Verificar se o bucket investor_contracts existe e suas configurações
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at,
    updated_at
FROM storage.buckets 
WHERE id = 'investor_contracts';

-- 7. Verificar políticas de storage atuais
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%contract%'
ORDER BY policyname;

-- 8. Testar se a função auth.uid() funciona
SELECT auth.uid() as current_user_id;

-- 9. Verificar se existe algum usuário autenticado atualmente
SELECT 
    auth.uid() as user_id,
    CASE 
        WHEN auth.uid() IS NULL THEN 'Nenhum usuário autenticado'
        ELSE 'Usuário autenticado: ' || auth.uid()::text
    END as auth_status;
