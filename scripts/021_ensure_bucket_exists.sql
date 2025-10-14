-- Garantir que o bucket pix_receipts existe e está configurado corretamente

-- Verificar se o bucket existe
DO $$
BEGIN
    -- Tentar inserir o bucket, se já existir, não fará nada
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
        'pix_receipts',
        'pix_receipts',
        false,
        10485760, -- 10MB em bytes
        ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
    );
    
    -- Se chegou aqui, o bucket foi criado com sucesso
    RAISE NOTICE 'Bucket pix_receipts criado com sucesso';
    
EXCEPTION
    WHEN unique_violation THEN
        -- Bucket já existe, apenas atualizar configurações se necessário
        UPDATE storage.buckets 
        SET 
            file_size_limit = 10485760,
            allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
        WHERE id = 'pix_receipts';
        
        RAISE NOTICE 'Bucket pix_receipts já existe, configurações atualizadas';
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao criar/atualizar bucket pix_receipts: %', SQLERRM;
END $$;

-- Verificar se as políticas RLS existem e criar se necessário
DO $$
BEGIN
    -- Verificar se a política de insert existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'pix_receipts_insert_policy'
    ) THEN
        CREATE POLICY "pix_receipts_insert_policy" ON storage.objects
        FOR INSERT WITH CHECK (
            bucket_id = 'pix_receipts' 
            AND auth.role() = 'authenticated'
        );
        RAISE NOTICE 'Política de insert criada';
    END IF;

    -- Verificar se a política de select existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'pix_receipts_select_policy'
    ) THEN
        CREATE POLICY "pix_receipts_select_policy" ON storage.objects
        FOR SELECT USING (
            bucket_id = 'pix_receipts' 
            AND auth.role() = 'authenticated'
        );
        RAISE NOTICE 'Política de select criada';
    END IF;

    -- Verificar se a política de select para admin existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname = 'pix_receipts_admin_select_policy'
    ) THEN
        CREATE POLICY "pix_receipts_admin_select_policy" ON storage.objects
        FOR SELECT USING (
            bucket_id = 'pix_receipts' 
            AND EXISTS (
                SELECT 1 FROM public.profiles 
                WHERE id = auth.uid() AND user_type = 'admin'
            )
        );
        RAISE NOTICE 'Política de select para admin criada';
    END IF;

    RAISE NOTICE 'Verificação de políticas concluída';
END $$;
