-- Políticas simples para storage - permitir tudo para admins

-- 1. Deletar todas as políticas existentes para pix_receipts
DROP POLICY IF EXISTS "pix_receipts_select" ON storage.objects;
DROP POLICY IF EXISTS "pix_receipts_insert" ON storage.objects;
DROP POLICY IF EXISTS "pix_receipts_update" ON storage.objects;
DROP POLICY IF EXISTS "pix_receipts_delete" ON storage.objects;

-- 2. Criar política simples: admins podem fazer tudo
CREATE POLICY "pix_receipts_admin_all" ON storage.objects
FOR ALL USING (
  bucket_id = 'pix_receipts' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- 3. Política para usuários: podem gerenciar seus próprios arquivos
CREATE POLICY "pix_receipts_user_own" ON storage.objects
FOR ALL USING (
  bucket_id = 'pix_receipts' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- 4. Verificar as políticas criadas
SELECT 
  'Políticas criadas' AS status,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE '%pix_receipts%'
ORDER BY policyname;
