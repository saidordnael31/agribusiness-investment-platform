-- Adicionar hierarquia entre escritórios e assessores
ALTER TABLE profiles ADD COLUMN office_id UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN hierarchy_level TEXT CHECK (hierarchy_level IN ('office', 'advisor')) DEFAULT 'advisor';

-- Tabela para aprovações de transações
CREATE TABLE transaction_approvals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal')),
  advisor_id UUID NOT NULL REFERENCES profiles(id),
  office_id UUID NOT NULL REFERENCES profiles(id),
  amount DECIMAL(15,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by UUID REFERENCES profiles(id),
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para aprovações
ALTER TABLE transaction_approvals ENABLE ROW LEVEL SECURITY;

-- Política para assessores verem suas próprias solicitações
CREATE POLICY "Advisors can view their own approval requests" ON transaction_approvals
  FOR SELECT USING (advisor_id = auth.uid());

-- Política para escritórios verem solicitações de seus assessores
CREATE POLICY "Offices can view their advisors approval requests" ON transaction_approvals
  FOR ALL USING (
    office_id = auth.uid() OR 
    (advisor_id = auth.uid() AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND hierarchy_level = 'advisor'
    ))
  );

-- Atualizar tabela de transações para incluir status de aprovação
ALTER TABLE transactions ADD COLUMN approval_status TEXT DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected'));
ALTER TABLE transactions ADD COLUMN requires_approval BOOLEAN DEFAULT FALSE;
