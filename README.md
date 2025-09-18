# Agribusiness Investment Platform - Clube de Investimentos Privado do Agronegócio

Uma plataforma completa para gestão de investimentos no agronegócio brasileiro, desenvolvida com Next.js 15, Supabase e Tailwind CSS.

## 🚀 Funcionalidades

### Para Investidores
- Dashboard personalizado com visão geral dos investimentos
- Simulador de retornos para Cota Sênior (3% a.m.) e Subordinada (3,5% a.m.)
- Sistema de depósitos e resgates com liquidez D+2
- Histórico completo de transações
- Acesso a documentos de compliance

### Para Distribuidores (Hierarquia Akintec)
- **Escritório**: Gestão completa da rede, aprovação de transações
- **Gestor**: Supervisão de líderes e assessores
- **Líder**: Coordenação de equipes de assessores
- **Assessor**: Cadastro de investidores e gestão de carteira

### Funcionalidades de Distribuição
- Calculadora avançada de comissões (3% a.m. recorrente)
- Sistema de bonificações por performance
- Divisão automática 70% assessor / 30% escritório
- Metas escalonadas (R$ 500k e R$ 1M) com bônus adicionais
- Pool nacional para top performers
- Dashboard de vendas e analytics

### Para Administradores
- Gestão completa de usuários e hierarquia
- Configuração de taxas e campanhas promocionais
- Sistema de notificações e alertas
- Relatórios detalhados e analytics
- Gestão de documentos institucionais
- Controle de aprovações e transações

## 🛠 Tecnologias

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS v4, shadcn/ui
- **Backend**: Next.js API Routes, Supabase
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **Deploy**: Vercel

## 📋 Pré-requisitos

- Node.js 18+ 
- Conta Vercel
- Projeto Supabase configurado

## 🔧 Configuração Local

1. **Clone o repositório**
\`\`\`bash
git clone <repository-url>
cd agribusiness-platform
\`\`\`

2. **Instale as dependências**
\`\`\`bash
npm install
\`\`\`

3. **Configure as variáveis de ambiente**
\`\`\`env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL=http://localhost:3000/login
\`\`\`

4. **Execute os scripts SQL**
Execute os scripts na pasta `/scripts` no seu projeto Supabase:
- `001_create_tables.sql` - Estrutura básica do banco
- `002_create_triggers.sql` - Triggers automáticos
- `003_add_hierarchy.sql` - Sistema hierárquico
- `004_akintec_structure.sql` - Estrutura Akintec completa

5. **Inicie o servidor de desenvolvimento**
\`\`\`bash
npm run dev
\`\`\`

## 🚀 Deploy

### Deploy Automático (Recomendado)
1. Conecte o repositório ao Vercel
2. Configure as variáveis de ambiente no painel Vercel
3. O deploy será automático a cada push na branch main

### Deploy Manual
\`\`\`bash
npm run build
vercel --prod
\`\`\`

## 📊 Estrutura do Projeto

\`\`\`
├── app/                    # App Router (Next.js 15)
│   ├── api/               # API Routes
│   ├── admin/             # Área administrativa
│   ├── investor/          # Dashboard investidor
│   ├── distributor/       # Dashboard distribuidor
│   └── ...
├── components/            # Componentes React
│   ├── admin/            # Componentes admin
│   ├── auth/             # Autenticação
│   ├── investor/         # Componentes investidor
│   ├── distributor/      # Componentes distribuidor
│   └── ui/               # shadcn/ui components
├── lib/                  # Utilitários e configurações
│   ├── supabase/         # Cliente Supabase
│   └── utils.ts          # Funções utilitárias
└── scripts/              # Scripts SQL
\`\`\`

## 🔐 Segurança e Compliance

- **Não é um produto regulado pela CVM**
- Estrutura de Clube de Investimentos Privado
- Row Level Security (RLS) implementado
- Autenticação segura via Supabase
- Disclaimers obrigatórios em todas as telas
- Validação de email pessoal obrigatória

## 📈 Modelo de Negócio

### Estrutura de Cotas
- **Cota Sênior**: 3% a.m. (perfil conservador)
- **Cota Subordinada**: 3,5% a.m. (perfil arrojado)
- **Liquidez**: D+2 (2 dias úteis)
- **Aporte mínimo**: R$ 5.000

### Sistema de Comissões
- **Base**: 3% a.m. sobre valor investido
- **Divisão**: 70% assessor / 30% escritório
- **Bônus Meta 1**: +1% a.m. (R$ 500k captados)
- **Bônus Meta 2**: +2% a.m. (R$ 1M captados)
- **Pool Nacional**: 10% dividido entre top escritórios

## 🆘 Suporte

Para suporte técnico ou dúvidas sobre a plataforma:
- Abra um ticket em vercel.com/help
- Consulte a documentação do Supabase
- Verifique os logs de erro no painel Vercel

## 📄 Licença

Este projeto é propriedade da Agribusiness Investment Platform. Todos os direitos reservados.
