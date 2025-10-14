-- Abordagem alternativa para configurar storage
-- Este script tenta diferentes métodos baseados nas permissões disponíveis

-- Método 1: Tentar criar bucket diretamente
DO $$
BEGIN
    -- Verificar se já existe
    IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'pix_receipts') THEN
        -- Tentar inserir bucket
        INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
        VALUES (
            'pix_receipts',
            'pix_receipts',
            false,
            10485760,
            ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
        );
        RAISE NOTICE 'Bucket pix_receipts criado com sucesso';
    ELSE
        RAISE NOTICE 'Bucket pix_receipts já existe';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao criar bucket: %', SQLERRM;
        RAISE NOTICE 'Execute manualmente via Dashboard do Supabase';
END $$;

-- Método 2: Verificar permissões e tentar criar políticas
DO $$
DECLARE
    has_permission boolean := false;
BEGIN
    -- Verificar se temos permissão para criar políticas
    BEGIN
        -- Tentar uma operação simples para testar permissões
        PERFORM 1 FROM pg_policies WHERE schemaname = 'storage' LIMIT 1;
        has_permission := true;
    EXCEPTION
        WHEN insufficient_privilege THEN
            has_permission := false;
    END;

    IF has_permission THEN
        RAISE NOTICE 'Tentando criar políticas RLS...';
        
        -- Tentar criar políticas uma por uma
        BEGIN
            EXECUTE 'CREATE POLICY IF NOT EXISTS "pix_receipts_insert_policy" ON storage.objects
                FOR INSERT WITH CHECK (
                    bucket_id = ''pix_receipts'' 
                    AND auth.role() = ''authenticated''
                )';
            RAISE NOTICE 'Política de insert criada';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Erro ao criar política de insert: %', SQLERRM;
        END;

        BEGIN
            EXECUTE 'CREATE POLICY IF NOT EXISTS "pix_receipts_select_policy" ON storage.objects
                FOR SELECT USING (
                    bucket_id = ''pix_receipts'' 
                    AND auth.role() = ''authenticated''
                )';
            RAISE NOTICE 'Política de select criada';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Erro ao criar política de select: %', SQLERRM;
        END;

        BEGIN
            EXECUTE 'CREATE POLICY IF NOT EXISTS "pix_receipts_admin_select_policy" ON storage.objects
                FOR SELECT USING (
                    bucket_id = ''pix_receipts'' 
                    AND EXISTS (
                        SELECT 1 FROM public.profiles 
                        WHERE id = auth.uid() AND user_type = ''admin''
                    )
                )';
            RAISE NOTICE 'Política de select para admin criada';
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Erro ao criar política de select para admin: %', SQLERRM;
        END;

    ELSE
        RAISE NOTICE 'Sem permissões para criar políticas RLS';
        RAISE NOTICE 'Configure manualmente via Dashboard do Supabase';
        RAISE NOTICE 'Veja o arquivo: scripts/024_manual_storage_setup.md';
    END IF;
END $$;

-- Verificar status final
SELECT 
    'Configuração do Storage' as status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'pix_receipts') 
        THEN '✅ Bucket pix_receipts configurado'
        ELSE '❌ Bucket pix_receipts NÃO configurado'
    END as bucket_status;

SELECT 
    'Políticas RLS' as status,
    COUNT(*) as total_policies,
    STRING_AGG(policyname, ', ') as policies
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects' 
AND policyname LIKE 'pix_receipts%';

-- Instruções finais
SELECT 
    'Próximos Passos' as info,
    CASE 
        WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'pix_receipts') 
        AND EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE 'pix_receipts%')
        THEN '✅ Configuração completa! Teste o upload de arquivos.'
        ELSE '⚠️ Configure manualmente via Dashboard do Supabase. Veja: scripts/024_manual_storage_setup.md'
    END as next_steps;
