-- Criar tabela para comprovantes de transação PIX
CREATE TABLE IF NOT EXISTS public.pix_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id UUID, -- Referência opcional para transação específica
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Caminho no bucket pix_receipts
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL, -- 'image/jpeg', 'image/png', 'application/pdf', etc.
  mime_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  uploaded_by UUID REFERENCES auth.users(id), -- Quem fez o upload
  approved_by UUID REFERENCES auth.users(id), -- Quem aprovou (admin)
  approved_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT, -- Motivo da rejeição se aplicável
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS na tabela pix_receipts
ALTER TABLE public.pix_receipts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para pix_receipts
-- Usuários podem ver apenas seus próprios comprovantes
CREATE POLICY "pix_receipts_select_own" ON public.pix_receipts 
  FOR SELECT USING (auth.uid() = user_id);

-- Usuários podem inserir seus próprios comprovantes
CREATE POLICY "pix_receipts_insert_own" ON public.pix_receipts 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar seus próprios comprovantes (apenas status pending)
CREATE POLICY "pix_receipts_update_own" ON public.pix_receipts 
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- Admins podem ver todos os comprovantes
CREATE POLICY "pix_receipts_select_admin" ON public.pix_receipts 
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Admins podem atualizar todos os comprovantes (aprovar/rejeitar)
CREATE POLICY "pix_receipts_update_admin" ON public.pix_receipts 
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    )
  );

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_pix_receipts_user_id ON public.pix_receipts(user_id);
CREATE INDEX IF NOT EXISTS idx_pix_receipts_status ON public.pix_receipts(status);
CREATE INDEX IF NOT EXISTS idx_pix_receipts_created_at ON public.pix_receipts(created_at);
CREATE INDEX IF NOT EXISTS idx_pix_receipts_transaction_id ON public.pix_receipts(transaction_id);

-- Comentários para documentação
COMMENT ON TABLE public.pix_receipts IS 'Tabela para armazenar comprovantes de transações PIX';
COMMENT ON COLUMN public.pix_receipts.file_path IS 'Caminho completo do arquivo no bucket pix_receipts';
COMMENT ON COLUMN public.pix_receipts.status IS 'Status do comprovante: pending, approved, rejected';
COMMENT ON COLUMN public.pix_receipts.rejection_reason IS 'Motivo da rejeição quando status = rejected';
