# Scripts SQL - Plataforma de Investimentos Agronegócio

Esta pasta contém todos os scripts SQL necessários para configurar e manter o banco de dados da plataforma.

## 📁 Estrutura Organizada

### `01-setup/` - Scripts de Configuração Inicial
Scripts essenciais para configuração inicial do banco de dados:
- `001_create_tables.sql` - Estrutura básica das tabelas
- `002_create_triggers.sql` - Triggers automáticos
- `003_add_hierarchy.sql` - Sistema hierárquico
- `004_akintec_structure.sql` - Estrutura Akintec completa

### `02-migrations/` - Migrações e Atualizações
Scripts de migração e atualizações do banco:
- Scripts numerados 005-069 (migrações sequenciais)
- Novas funcionalidades e melhorias

### `03-fixes/` - Correções e Ajustes
Scripts para corrigir problemas específicos:
- Correções de RLS (Row Level Security)
- Ajustes de políticas de storage
- Correções de triggers

### `04-debug/` - Scripts de Debug
Scripts para diagnóstico e verificação:
- Verificação de estrutura
- Debug de políticas
- Testes de permissões

### `05-archive/` - Scripts Arquivados
Scripts antigos ou obsoletos:
- Versões antigas de correções
- Scripts de teste não utilizados

### `06-utilities/` - Utilitários
Scripts auxiliares e utilitários:
- Scripts de limpeza
- Scripts de backup
- Ferramentas de manutenção

## 🚀 Como Usar

### Configuração Inicial (Nova Instalação)
Execute os scripts na pasta `01-setup/` na seguinte ordem:
1. `001_create_tables.sql`
2. `002_create_triggers.sql`
3. `003_add_hierarchy.sql`
4. `004_akintec_structure.sql`

### Atualizações (Instalação Existente)
Execute os scripts de `02-migrations/` conforme necessário, seguindo a numeração sequencial.

## ⚠️ Importante

- **SEMPRE faça backup** antes de executar scripts
- Execute scripts em ambiente de teste primeiro
- Verifique as dependências entre scripts
- Scripts numerados devem ser executados em ordem sequencial

## 📋 Status dos Scripts

- ✅ **01-setup**: Scripts essenciais para configuração inicial
- 🔄 **02-migrations**: Scripts de migração ativos
- 🔧 **03-fixes**: Correções aplicadas
- 🐛 **04-debug**: Scripts de diagnóstico
- 📦 **05-archive**: Scripts arquivados
- 🛠️ **06-utilities**: Utilitários disponíveis

