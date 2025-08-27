-- Criando nova estrutura hierárquica Akintec com 5 níveis
-- Estrutura: Escritório → Gestor → Líder → Assessor → Investidor

-- Atualizar tabela de perfis para nova hierarquia
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role VARCHAR(20) CHECK (role IN ('escritorio', 'gestor', 'lider', 'assessor', 'investidor'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Tabela de produtos Akintec
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'safra_fixa', 'turbinada', 'premium'
  min_investment DECIMAL(15,2) NOT NULL,
  max_investment DECIMAL(15,2),
  base_rate DECIMAL(5,4) NOT NULL, -- Taxa base mensal
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de estrutura de comissões por produto
CREATE TABLE IF NOT EXISTS commission_structure (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  investment_range_min DECIMAL(15,2) NOT NULL,
  investment_range_max DECIMAL(15,2),
  lock_period INTEGER NOT NULL, -- em dias
  escritorio_rate DECIMAL(5,4) NOT NULL,
  gestor_rate DECIMAL(5,4) NOT NULL,
  lider_rate DECIMAL(5,4) NOT NULL,
  assessor_rate DECIMAL(5,4) NOT NULL,
  investidor_rate DECIMAL(5,4) NOT NULL,
  indicacao_rate DECIMAL(5,4) NOT NULL,
  total_rate DECIMAL(5,4) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de campanhas promocionais
CREATE TABLE IF NOT EXISTS promotional_campaigns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'mensal', 'trimestral', 'semestral', 'anual', 'alongamento'
  target_role VARCHAR(20) NOT NULL,
  target_amount DECIMAL(15,2),
  target_period INTEGER, -- em dias
  bonus_rate DECIMAL(5,4) NOT NULL,
  bonus_duration INTEGER, -- em meses
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  conditions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de redistribuição de taxas por escritório
CREATE TABLE IF NOT EXISTS rate_redistributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  escritorio_id UUID REFERENCES profiles(id),
  product_id UUID REFERENCES products(id),
  investment_range_min DECIMAL(15,2) NOT NULL,
  investment_range_max DECIMAL(15,2),
  lock_period INTEGER NOT NULL,
  custom_escritorio_rate DECIMAL(5,4),
  custom_gestor_rate DECIMAL(5,4),
  custom_lider_rate DECIMAL(5,4),
  custom_assessor_rate DECIMAL(5,4),
  custom_investidor_rate DECIMAL(5,4),
  custom_indicacao_rate DECIMAL(5,4),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de contratos com renovação
CREATE TABLE IF NOT EXISTS contracts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  investment_id UUID REFERENCES investments(id),
  contract_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  is_renewed BOOLEAN DEFAULT false,
  renewal_date DATE,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'renewed', 'cancelled')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir produtos padrão Akintec
INSERT INTO products (name, type, min_investment, max_investment, base_rate) VALUES
('Safra Turbinada 5k-100k', 'turbinada', 5000, 100000, 0.029),
('Safra Turbinada 101k-500k', 'turbinada', 101000, 500000, 0.033),
('Safra Turbinada >500k', 'turbinada', 500001, NULL, 0.037);

-- Inserir estrutura de comissões padrão
INSERT INTO commission_structure (product_id, investment_range_min, investment_range_max, lock_period, escritorio_rate, gestor_rate, lider_rate, assessor_rate, investidor_rate, indicacao_rate, total_rate) 
SELECT 
  p.id,
  CASE 
    WHEN p.name LIKE '%5k-100k%' THEN 5000
    WHEN p.name LIKE '%101k-500k%' THEN 101000
    ELSE 500001
  END,
  CASE 
    WHEN p.name LIKE '%5k-100k%' THEN 100000
    WHEN p.name LIKE '%101k-500k%' THEN 500000
    ELSE NULL
  END,
  2, -- D+2
  0.003, 0.001, 0.001, 0.005, 0.018, 0.001, 0.029
FROM products p WHERE p.type = 'turbinada';

-- Inserir campanhas promocionais padrão
INSERT INTO promotional_campaigns (name, type, target_role, target_amount, target_period, bonus_rate, bonus_duration, start_date, end_date, conditions) VALUES
('Fôlego Curto - 100k', 'mensal', 'assessor', 100000, 30, 0.0025, 3, CURRENT_DATE, CURRENT_DATE + INTERVAL '12 months', '{"description": "Meta Individual do Assessor - R$ 100 mil captados no mês"}'),
('Fôlego Curto - 250k', 'mensal', 'assessor', 250000, 30, 0.005, 3, CURRENT_DATE, CURRENT_DATE + INTERVAL '12 months', '{"description": "Meta Individual do Assessor - R$ 250 mil captados no mês"}'),
('Meta de Equipe - 1M', 'trimestral', 'escritorio', 1000000, 90, 0.01, 6, CURRENT_DATE, CURRENT_DATE + INTERVAL '12 months', '{"description": "Escritório que captar R$ 1 milhão em 3 meses"}'),
('Meta de Equipe - 3M', 'trimestral', 'escritorio', 3000000, 90, 0.015, 6, CURRENT_DATE, CURRENT_DATE + INTERVAL '12 months', '{"description": "Escritório que captar R$ 3 milhões em 3 meses"}'),
('Recorrência e Fidelização', 'semestral', 'escritorio', NULL, 180, 0.015, 6, CURRENT_DATE, CURRENT_DATE + INTERVAL '12 months', '{"description": "Manter mínimo de 80% da base sem resgates por 6 meses"}'),
('Super Bônus - 10M', 'anual', 'escritorio', 10000000, 365, 0.02, 12, CURRENT_DATE, CURRENT_DATE + INTERVAL '12 months', '{"description": "Escritórios que baterem R$ 10 milhões no ano"}'),
('Super Bônus - 25M', 'anual', 'escritorio', 25000000, 365, 0.03, 12, CURRENT_DATE, CURRENT_DATE + INTERVAL '12 months', '{"description": "Escritórios que baterem R$ 25 milhões no ano"}'
);

-- Habilitar RLS nas novas tabelas
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE commission_structure ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotional_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE rate_redistributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para as novas tabelas
CREATE POLICY "Public read access for products" ON products FOR SELECT USING (true);
CREATE POLICY "Public read access for commission_structure" ON commission_structure FOR SELECT USING (true);
CREATE POLICY "Admin full access for promotional_campaigns" ON promotional_campaigns FOR ALL USING (auth.jwt() ->> 'user_type' = 'admin');
CREATE POLICY "Escritorio read access for rate_redistributions" ON rate_redistributions FOR SELECT USING (escritorio_id = auth.uid() OR auth.jwt() ->> 'user_type' = 'admin');
CREATE POLICY "User read access for contracts" ON contracts FOR SELECT USING (EXISTS (SELECT 1 FROM investments i WHERE i.id = investment_id AND i.user_id = auth.uid()));
