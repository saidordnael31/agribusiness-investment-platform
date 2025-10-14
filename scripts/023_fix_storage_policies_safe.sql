-- Script seguro para configurar políticas RLS do storage
-- Este script usa uma abordagem que não requer permissões de proprietário

-- Primeiro, vamos verificar se o bucket existe e criar se necessário
-- Usando uma abordagem mais segura

-- Verificar se o bucket pix_receipts existe
DO $$
BEGIN
    -- Tentar criar o bucket se não existir
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
        'pix_receipts',
        'pix_receipts',
        false,
        10485760, -- 10MB
        ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
    )
    ON CONFLICT (id) DO UPDATE SET
        file_size_limit = 10485760,
        allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    
    RAISE NOTICE 'Bucket pix_receipts configurado com sucesso';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao configurar bucket: %', SQLERRM;
END $$;

-- Verificar se as políticas existem antes de tentar criá-las
DO $$
DECLARE
    policy_exists boolean;
BEGIN
    -- Verificar política de insert
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'pix_receipts_insert_policy'
    ) INTO policy_exists;
    
    IF NOT policy_exists THEN
        BEGIN
            EXECUTE 'CREATE POLICY "pix_receipts_insert_policy" ON storage.objects
                FOR INSERT WITH CHECK (
                    bucket_id = ''pix_receipts'' 
                    AND auth.role() = ''authenticated''
                )';
            RAISE NOTICE 'Política de insert criada';
        EXCEPTION
            WHEN insufficient_privilege THEN
                RAISE NOTICE 'Sem permissão para criar política de insert. Execute como superuser.';
            WHEN OTHERS THEN
                RAISE NOTICE 'Erro ao criar política de insert: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'Política de insert já existe';
    END IF;

    -- Verificar política de select
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'pix_receipts_select_policy'
    ) INTO policy_exists;
    
    IF NOT policy_exists THEN
        BEGIN
            EXECUTE 'CREATE POLICY "pix_receipts_select_policy" ON storage.objects
                FOR SELECT USING (
                    bucket_id = ''pix_receipts'' 
                    AND auth.role() = ''authenticated''
                )';
            RAISE NOTICE 'Política de select criada';
        EXCEPTION
            WHEN insufficient_privilege THEN
                RAISE NOTICE 'Sem permissão para criar política de select. Execute como superuser.';
            WHEN OTHERS THEN
                RAISE NOTICE 'Erro ao criar política de select: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'Política de select já existe';
    END IF;

    -- Verificar política de select para admin
    SELECT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'pix_receipts_admin_select_policy'
    ) INTO policy_exists;
    
    IF NOT policy_exists THEN
        BEGIN
            EXECUTE 'CREATE POLICY "pix_receipts_admin_select_policy" ON storage.objects
                FOR SELECT USING (
                    bucket_id = ''pix_receipts'' 
                    AND EXISTS (
                        SELECT 1 FROM public.profiles 
                        WHERE id = auth.uid() AND user_type = ''admin''
                    )
                )';
            RAISE NOTICE 'Política de select para admin criada';
        EXCEPTION
            WHEN insufficient_privilege THEN
                RAISE NOTICE 'Sem permissão para criar política de select para admin. Execute como superuser.';
            WHEN OTHERS THEN
                RAISE NOTICE 'Erro ao criar política de select para admin: %', SQLERRM;
        END;
    ELSE
        RAISE NOTICE 'Política de select para admin já existe';
    END IF;

END $$;

-- Verificar configuração atual
SELECT 
    'Bucket Status' as check_type,
    CASE 
        WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'pix_receipts') 
        THEN 'Bucket pix_receipts existe'
        ELSE 'Bucket pix_receipts NÃO existe'
    END as status;

SELECT 
    'Policies Status' as check_type,
    COUNT(*) as policy_count,
    STRING_AGG(policyname, ', ') as policies
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects' 
AND policyname LIKE 'pix_receipts%';
