-- Script para criar políticas de storage para o bucket investor_contracts
-- Execute este script no Supabase SQL Editor

-- Primeiro, certifique-se de que o bucket existe
-- (Execute manualmente no Supabase Dashboard se necessário)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('investor_contracts', 'investor_contracts', false);

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
