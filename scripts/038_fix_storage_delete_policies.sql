-- Corrigir políticas RLS para permitir exclusão de arquivos do storage

-- 1. Verificar se o bucket pix_receipts existe
SELECT 'Bucket pix_receipts existe' AS status
FROM storage.buckets
WHERE name = 'pix_receipts';

-- 2. Verificar políticas RLS atuais do storage.objects
SELECT 
  policyname,
  permissive,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
ORDER BY policyname;

-- 3. Deletar políticas existentes para pix_receipts (se houver)
DROP POLICY IF EXISTS "pix_receipts_select" ON storage.objects;
DROP POLICY IF EXISTS "pix_receipts_insert" ON storage.objects;
DROP POLICY IF EXISTS "pix_receipts_update" ON storage.objects;
DROP POLICY IF EXISTS "pix_receipts_delete" ON storage.objects;

-- 4. Criar políticas RLS corretas para o bucket pix_receipts
-- Política para SELECT (visualizar arquivos)
CREATE POLICY "pix_receipts_select" ON storage.objects
FOR SELECT USING (
  bucket_id = 'pix_receipts' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  )
);

-- Política para INSERT (upload de arquivos)
CREATE POLICY "pix_receipts_insert" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'pix_receipts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Política para UPDATE (atualizar arquivos)
CREATE POLICY "pix_receipts_update" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'pix_receipts' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  )
);

-- Política para DELETE (deletar arquivos)
CREATE POLICY "pix_receipts_delete" ON storage.objects
FOR DELETE USING (
  bucket_id = 'pix_receipts' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  )
);

-- 5. Verificar as novas políticas
SELECT 
  'Políticas criadas' AS status,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE '%pix_receipts%'
ORDER BY policyname;
