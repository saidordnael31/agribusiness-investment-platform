-- Script definitivo para corrigir políticas de storage
-- Execute este script no Supabase SQL Editor

-- 1. Verificar se o bucket existe
SELECT * FROM storage.buckets WHERE id = 'investor_contracts';

-- 2. Se o bucket não existir, criar
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'investor_contracts', 
    'investor_contracts', 
    false, 
    10485760, -- 10MB
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
)
ON CONFLICT (id) DO NOTHING;

-- 3. Remover TODAS as políticas existentes para o bucket investor_contracts
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    -- Buscar todas as políticas relacionadas ao bucket investor_contracts
    FOR policy_record IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'objects' 
        AND policyname LIKE '%contract%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', policy_record.policyname);
        RAISE NOTICE 'Política removida: %', policy_record.policyname;
    END LOOP;
END $$;

-- 4. Criar políticas de storage mais simples e robustas

-- Política para INSERT (upload) - apenas admins
CREATE POLICY "contracts_upload_admin_only" ON storage.objects
FOR INSERT WITH CHECK (
    bucket_id = 'investor_contracts' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND user_type = 'admin'
    )
);

-- Política para SELECT (visualização) - admins e investidores
CREATE POLICY "contracts_view_admin_and_owner" ON storage.objects
FOR SELECT USING (
    bucket_id = 'investor_contracts' AND
    auth.uid() IS NOT NULL AND (
        -- Admins podem ver todos
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND user_type = 'admin'
        ) OR
        -- Investidores podem ver apenas os seus (verificação via tabela investor_contracts)
        EXISTS (
            SELECT 1 FROM public.investor_contracts ic
            WHERE ic.investor_id = auth.uid() 
            AND ic.file_url LIKE '%' || name || '%'
        )
    )
);

-- Política para DELETE - apenas admins
CREATE POLICY "contracts_delete_admin_only" ON storage.objects
FOR DELETE USING (
    bucket_id = 'investor_contracts' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND user_type = 'admin'
    )
);

-- Política para UPDATE - apenas admins
CREATE POLICY "contracts_update_admin_only" ON storage.objects
FOR UPDATE USING (
    bucket_id = 'investor_contracts' AND
    auth.uid() IS NOT NULL AND
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND user_type = 'admin'
    )
);

-- 5. Verificar se as políticas foram criadas
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

-- 6. Verificar se o bucket foi criado corretamente
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at
FROM storage.buckets 
WHERE id = 'investor_contracts';

-- 7. Testar se um admin pode fazer upload (substitua pelo ID de um admin real)
-- SELECT 
--     p.id,
--     p.user_type,
--     p.full_name
-- FROM public.profiles p
-- WHERE p.user_type = 'admin'
-- LIMIT 1;
