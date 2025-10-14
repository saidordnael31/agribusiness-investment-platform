-- Script completo para corrigir o upload de contratos
-- Execute este script no Supabase SQL Editor

-- 1. Criar o bucket investor_contracts se não existir
DO $$
BEGIN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
        'investor_contracts', 
        'investor_contracts', 
        false, 
        10485760, -- 10MB em bytes
        ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    );
    RAISE NOTICE 'Bucket investor_contracts criado com sucesso!';
EXCEPTION
    WHEN unique_violation THEN
        RAISE NOTICE 'Bucket investor_contracts já existe.';
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao criar bucket: %', SQLERRM;
END $$;

-- 2. Remover políticas antigas se existirem (para evitar conflitos)
DROP POLICY IF EXISTS "Admins can upload contracts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their contracts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete contracts" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update contracts" ON storage.objects;

-- 3. Criar políticas de storage para o bucket investor_contracts

-- Política para permitir upload apenas para administradores
CREATE POLICY "Admins can upload contracts" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'investor_contracts' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- Política para permitir visualização para investidores e admins
CREATE POLICY "Users can view their contracts" ON storage.objects
FOR SELECT USING (
  bucket_id = 'investor_contracts' AND (
    -- Admins podem ver todos
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    ) OR
    -- Investidores podem ver apenas os seus
    EXISTS (
      SELECT 1 FROM public.investor_contracts 
      WHERE investor_id = auth.uid() 
      AND file_url LIKE '%' || name || '%'
    )
  )
);

-- Política para permitir exclusão apenas para administradores
CREATE POLICY "Admins can delete contracts" ON storage.objects
FOR DELETE USING (
  bucket_id = 'investor_contracts' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- Política para permitir atualização apenas para administradores
CREATE POLICY "Admins can update contracts" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'investor_contracts' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- 4. Verificar se as políticas foram criadas
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
AND policyname LIKE '%contracts%';

-- 5. Verificar se o bucket foi criado
SELECT * FROM storage.buckets WHERE id = 'investor_contracts';
