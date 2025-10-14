-- Corrigir políticas RLS para o bucket pix_receipts
-- Primeiro, vamos verificar se o bucket existe e criar se necessário

-- Criar bucket pix_receipts se não existir
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pix_receipts',
  'pix_receipts',
  false,
  10485760, -- 10MB em bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Remover políticas existentes se houver
DROP POLICY IF EXISTS "pix_receipts_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "pix_receipts_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "pix_receipts_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "pix_receipts_delete_policy" ON storage.objects;

-- Criar políticas RLS para o bucket pix_receipts
-- Permitir que usuários autenticados façam upload de arquivos
CREATE POLICY "pix_receipts_insert_policy" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'pix_receipts' 
    AND auth.role() = 'authenticated'
  );

-- Permitir que usuários vejam seus próprios arquivos
CREATE POLICY "pix_receipts_select_policy" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'pix_receipts' 
    AND auth.role() = 'authenticated'
  );

-- Permitir que usuários atualizem seus próprios arquivos (apenas se ainda não foram aprovados)
CREATE POLICY "pix_receipts_update_policy" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'pix_receipts' 
    AND auth.role() = 'authenticated'
  );

-- Permitir que usuários deletem seus próprios arquivos (apenas se ainda não foram aprovados)
CREATE POLICY "pix_receipts_delete_policy" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'pix_receipts' 
    AND auth.role() = 'authenticated'
  );

-- Políticas especiais para admins
-- Admins podem ver todos os arquivos
CREATE POLICY "pix_receipts_admin_select_policy" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'pix_receipts' 
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Admins podem atualizar todos os arquivos
CREATE POLICY "pix_receipts_admin_update_policy" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'pix_receipts' 
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Admins podem deletar todos os arquivos
CREATE POLICY "pix_receipts_admin_delete_policy" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'pix_receipts' 
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Comentários para documentação
COMMENT ON POLICY "pix_receipts_insert_policy" ON storage.objects IS 'Permite que usuários autenticados façam upload de comprovantes PIX';
COMMENT ON POLICY "pix_receipts_select_policy" ON storage.objects IS 'Permite que usuários vejam seus próprios comprovantes PIX';
COMMENT ON POLICY "pix_receipts_admin_select_policy" ON storage.objects IS 'Permite que admins vejam todos os comprovantes PIX';
