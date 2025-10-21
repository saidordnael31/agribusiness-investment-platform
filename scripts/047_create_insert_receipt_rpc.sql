-- Criar função RPC para inserir comprovante PIX
-- Esta função contorna as políticas RLS para permitir que assessores insiram comprovantes

CREATE OR REPLACE FUNCTION public.insert_pix_receipt(
  p_user_id UUID,
  p_transaction_id UUID,
  p_file_name TEXT,
  p_file_path TEXT,
  p_file_size INTEGER,
  p_file_type TEXT,
  p_mime_type TEXT,
  p_status TEXT,
  p_uploaded_by UUID,
  p_approved_by UUID,
  p_approved_at TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  transaction_id UUID,
  file_name TEXT,
  file_path TEXT,
  file_size INTEGER,
  file_type TEXT,
  mime_type TEXT,
  status TEXT,
  uploaded_by UUID,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result RECORD;
BEGIN
  -- Verificar se o usuário que está fazendo a inserção é admin ou assessor
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND (user_type = 'admin' OR (user_type = 'distributor' AND role = 'assessor'))
  ) THEN
    RAISE EXCEPTION 'Acesso negado. Apenas administradores e assessores podem inserir comprovantes';
  END IF;

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
  ) RETURNING * INTO v_result;

  -- Retornar o resultado
  RETURN QUERY SELECT 
    v_result.id,
    v_result.user_id,
    v_result.transaction_id,
    v_result.file_name,
    v_result.file_path,
    v_result.file_size,
    v_result.file_type,
    v_result.mime_type,
    v_result.status,
    v_result.uploaded_by,
    v_result.approved_by,
    v_result.approved_at,
    v_result.created_at,
    v_result.updated_at;
END;
$$;

-- Comentário da função
COMMENT ON FUNCTION public.insert_pix_receipt IS 'Função para inserir comprovantes PIX, contornando políticas RLS para assessores';
