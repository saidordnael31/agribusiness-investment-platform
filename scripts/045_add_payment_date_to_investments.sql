-- scripts/045_add_payment_date_to_investments.sql
-- Adicionar campo payment_date na tabela investments

-- Adicionar coluna payment_date na tabela investments
ALTER TABLE public.investments 
ADD COLUMN payment_date TIMESTAMP WITH TIME ZONE;

-- Adicionar comentário para documentação
COMMENT ON COLUMN public.investments.payment_date IS 'Data exata de quando o pagamento foi feito. Usado para calcular comissões e rentabilidades. Deve ser preenchida apenas quando o investimento for aprovado pelo administrador.';

-- Verificar se a coluna foi adicionada corretamente
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'investments' 
  AND column_name = 'payment_date';
