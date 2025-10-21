-- Versão simplificada da função RPC sem parâmetros padrão
-- Execute este script no SQL Editor do Supabase Dashboard

-- 1. Remover função existente se houver
DROP FUNCTION IF EXISTS public.insert_pix_receipt;

-- 2. Criar função simplificada sem parâmetros padrão
CREATE OR REPLACE FUNCTION public.insert_pix_receipt(
  p_user_id UUID,
  p_transaction_id UUID,
  p_file_name TEXT,
  p_file_path TEXT,
  p_file_size INTEGER,
  p_file_type TEXT,
  p_mime_type TEXT,
  p_uploaded_by UUID,
  p_approved_by UUID,
  p_status TEXT,
  p_approved_at TIMESTAMP WITH TIME ZONE
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- Executa com privilégios do criador da função
AS $$
DECLARE
  receipt_id UUID;
BEGIN
  -- Inserir o comprovante
  INSERT INTO public.pix_receipts (
    user_id,
    transaction_id,
    file_name,
    file_path,
    file_size,
    file_type,
    mime_type,
    status,
    uploaded_by,
    approved_by,
    approved_at
  ) VALUES (
    p_user_id,
    p_transaction_id,
    p_file_name,
    p_file_path,
    p_file_size,
    p_file_type,
    p_mime_type,
    p_status,
    p_uploaded_by,
    p_approved_by,
    p_approved_at
  ) RETURNING id INTO receipt_id;
  
  RETURN receipt_id;
END;
$$;

-- 3. Conceder permissões para a função
GRANT EXECUTE ON FUNCTION public.insert_pix_receipt TO authenticated;
GRANT EXECUTE ON FUNCTION public.insert_pix_receipt TO anon;

-- 4. Verificar se a função foi criada
SELECT 
  routine_name,
  routine_type,
  security_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name = 'insert_pix_receipt';
