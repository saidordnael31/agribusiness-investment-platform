-- Script para corrigir e melhorar a tabela de transações
-- Adicionar campos necessários para melhor controle de resgates

-- Adicionar campo metadata para armazenar informações adicionais do resgate
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Adicionar campo processed_at para rastrear quando a transação foi processada
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS processed_at TIMESTAMP WITH TIME ZONE;

-- Adicionar campo withdrawal_type para especificar o tipo de resgate
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS withdrawal_type TEXT CHECK (withdrawal_type IN ('partial', 'total', 'dividends_by_period', 'monthly_return'));

-- Adicionar campo investment_id para vincular transações aos investimentos específicos
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS investment_id UUID REFERENCES investments(id) ON DELETE CASCADE;

-- Adicionar campo penalty_amount para rastrear multas aplicadas
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS penalty_amount DECIMAL(15,2) DEFAULT 0;

-- Adicionar campo original_amount para rastrear valor original antes das multas
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS original_amount DECIMAL(15,2);

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_requires_approval ON transactions(requires_approval);

-- Atualizar políticas RLS para incluir novos campos
DROP POLICY IF EXISTS "transactions_select_own" ON transactions;
DROP POLICY IF EXISTS "transactions_insert_own" ON transactions;

CREATE POLICY "transactions_select_own" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "transactions_insert_own" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "transactions_update_own" ON transactions FOR UPDATE USING (auth.uid() = user_id);

-- Adicionar política para admins verem todas as transações
CREATE POLICY "transactions_admin_all" ON transactions FOR ALL USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- Comentários para documentar a estrutura
COMMENT ON COLUMN transactions.metadata IS 'Metadados adicionais da transação (tipo de resgate, percentual de multa, etc.)';
COMMENT ON COLUMN transactions.withdrawal_type IS 'Tipo específico de resgate (parcial, total, dividendos, retorno mensal)';
COMMENT ON COLUMN transactions.penalty_amount IS 'Valor da multa aplicada no resgate';
COMMENT ON COLUMN transactions.original_amount IS 'Valor original antes da aplicação de multas';
COMMENT ON COLUMN transactions.processed_at IS 'Data e hora em que a transação foi processada';
