-- Script SQL para configuração inicial do banco de dados
-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  user_type VARCHAR(50) NOT NULL CHECK (user_type IN ('investor', 'distributor', 'admin')),
  cpf_cnpj VARCHAR(20),
  phone VARCHAR(20),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de investimentos
CREATE TABLE IF NOT EXISTS investments (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  quota_type VARCHAR(20) NOT NULL CHECK (quota_type IN ('senior', 'subordinate')),
  amount DECIMAL(15,2) NOT NULL,
  current_value DECIMAL(15,2) NOT NULL,
  monthly_return DECIMAL(15,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'pending', 'cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de depósitos
CREATE TABLE IF NOT EXISTS deposits (
  id SERIAL PRIMARY KEY,
  investment_id INTEGER REFERENCES investments(id),
  user_id INTEGER REFERENCES users(id),
  amount DECIMAL(15,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'cancelled')),
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de resgates
CREATE TABLE IF NOT EXISTS withdrawals (
  id SERIAL PRIMARY KEY,
  investment_id INTEGER REFERENCES investments(id),
  user_id INTEGER REFERENCES users(id),
  amount DECIMAL(15,2) NOT NULL,
  withdrawal_type VARCHAR(20) NOT NULL CHECK (withdrawal_type IN ('partial', 'total')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'cancelled')),
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de comissões
CREATE TABLE IF NOT EXISTS commissions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  investment_id INTEGER REFERENCES investments(id),
  commission_type VARCHAR(50) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  rate DECIMAL(5,4) NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de promoções
CREATE TABLE IF NOT EXISTS promotions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  bonus_rate DECIMAL(5,4) NOT NULL,
  min_value DECIMAL(15,2),
  target_audience VARCHAR(50) CHECK (target_audience IN ('investor', 'distributor', 'all')),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de documentos
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(50) NOT NULL,
  category VARCHAR(100) NOT NULL,
  target_audience VARCHAR(50) CHECK (target_audience IN ('investor', 'distributor', 'all')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de configurações do sistema
CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(100) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Inserir configurações padrão
INSERT INTO system_settings (setting_key, setting_value, description) VALUES
('senior_rate', '0.03', 'Taxa mensal da cota sênior'),
('subordinate_rate', '0.035', 'Taxa mensal da cota subordinada'),
('min_investment', '5000', 'Valor mínimo de investimento'),
('min_deposit', '1000', 'Valor mínimo de depósito adicional'),
('withdrawal_fee', '0', 'Taxa de resgate'),
('commission_rate', '0.03', 'Taxa de comissão para distribuidores')
ON CONFLICT (setting_key) DO NOTHING;

-- Criar usuário admin padrão (senha: admin123)
INSERT INTO users (name, email, password_hash, user_type) VALUES
('Administrador', 'admin@agroderi.com', '$2b$10$rQZ9QmjqjKW8WzK8nQZ9QO', 'admin')
ON CONFLICT (email) DO NOTHING;
