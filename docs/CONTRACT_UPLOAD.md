# Sistema de Upload de Contratos dos Investidores

## Visão Geral

Este sistema permite que administradores façam upload de contratos e documentos dos investidores diretamente no perfil do usuário. Os arquivos são armazenados no bucket `investor_contracts` do Supabase Storage.

## Funcionalidades

### Para Administradores
- ✅ Upload de contratos no perfil de investidores
- ✅ Visualização de todos os contratos de um investidor
- ✅ Download de contratos
- ✅ Exclusão de contratos
- ✅ Validação de tipos de arquivo (PDF, JPEG, PNG)
- ✅ Limite de tamanho de arquivo (10MB)

### Para Investidores
- ✅ Visualização de seus próprios contratos
- ✅ Download de seus contratos

## Estrutura do Banco de Dados

### Tabela: `investor_contracts`

```sql
CREATE TABLE public.investor_contracts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  investor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contract_name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived', 'pending')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Políticas RLS (Row Level Security)

- **SELECT**: Investidores podem ver apenas seus próprios contratos
- **INSERT**: Apenas administradores podem inserir contratos
- **UPDATE**: Apenas administradores podem atualizar contratos
- **DELETE**: Apenas administradores podem deletar contratos

## APIs Disponíveis

### 1. Upload de Contrato
**POST** `/api/contracts/upload`

**Body (FormData):**
- `file`: Arquivo do contrato
- `investorId`: ID do investidor
- `contractName`: Nome do contrato

**Resposta:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "contract_name": "Contrato de Investimento",
    "file_url": "https://...",
    "created_at": "2024-01-01T00:00:00Z"
  },
  "message": "Contrato enviado com sucesso!"
}
```

### 2. Listar Contratos
**GET** `/api/contracts?investorId={id}`

**Resposta:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "contract_name": "Contrato de Investimento",
      "file_name": "contrato.pdf",
      "file_url": "https://...",
      "file_size": 1024000,
      "file_type": "application/pdf",
      "status": "active",
      "created_at": "2024-01-01T00:00:00Z",
      "uploaded_by_profile": {
        "full_name": "Admin User",
        "email": "admin@example.com"
      }
    }
  ]
}
```

### 3. Deletar Contrato
**DELETE** `/api/contracts?contractId={id}`

**Resposta:**
```json
{
  "success": true,
  "message": "Contrato deletado com sucesso!"
}
```

## Componentes React

### 1. ContractUpload
Componente para upload de contratos (apenas para administradores).

**Props:**
- `investorId`: string - ID do investidor
- `investorName`: string - Nome do investidor
- `onUploadSuccess?`: () => void - Callback após upload bem-sucedido

### 2. ContractList
Componente para listar e gerenciar contratos.

**Props:**
- `investorId`: string - ID do investidor
- `investorName`: string - Nome do investidor
- `onContractDeleted?`: () => void - Callback após exclusão

## Configuração do Supabase Storage

### 1. Criar o Bucket
```sql
-- O bucket 'investor_contracts' deve ser criado no Supabase Storage
-- Configurações recomendadas:
-- - Public: false (privado)
-- - File size limit: 10MB
-- - Allowed MIME types: application/pdf, image/jpeg, image/png
```

### 2. Políticas de Storage
```sql
-- Política para permitir upload apenas para administradores
CREATE POLICY "Admins can upload contracts" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'investor_contracts' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

-- Política para permitir visualização para investidores e admins
CREATE POLICY "Users can view their contracts" ON storage.objects
FOR SELECT USING (
  bucket_id = 'investor_contracts' AND (
    -- Admins podem ver todos
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND user_type = 'admin'
    ) OR
    -- Investidores podem ver apenas os seus
    EXISTS (
      SELECT 1 FROM public.investor_contracts 
      WHERE investor_id = auth.uid() AND name = (storage.foldername(name) || '/' || storage.filename(name))
    )
  )
);

-- Política para permitir exclusão apenas para administradores
CREATE POLICY "Admins can delete contracts" ON storage.objects
FOR DELETE USING (
  bucket_id = 'investor_contracts' AND
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);
```

## Como Usar

### 1. Para Administradores

1. Acesse o painel administrativo
2. Navegue até a lista de usuários
3. Clique em "Editar" no perfil de um investidor
4. Na seção "Contratos do Investidor", use o formulário de upload
5. Selecione o arquivo e informe o nome do contrato
6. Clique em "Enviar Contrato"

### 2. Para Investidores

1. Acesse seu perfil
2. Na seção "Contratos", visualize todos os seus contratos
3. Clique no botão de download para baixar um contrato

## Validações

### Tipos de Arquivo Permitidos
- PDF (application/pdf)
- JPEG (image/jpeg)
- PNG (image/png)

### Limites
- Tamanho máximo: 10MB por arquivo
- Nome do contrato: obrigatório
- Investidor deve existir e ser do tipo 'investor'

## Segurança

- Apenas administradores podem fazer upload de contratos
- Investidores só podem visualizar seus próprios contratos
- Validação de tipos de arquivo no frontend e backend
- Políticas RLS no banco de dados
- Políticas de storage no Supabase

## Troubleshooting

### Erro: "Usuário não autenticado"
- Verifique se o usuário está logado
- Verifique se o token de autenticação é válido

### Erro: "Apenas administradores podem fazer upload"
- Verifique se o usuário tem `user_type = 'admin'` na tabela profiles

### Erro: "Tipo de arquivo não permitido"
- Verifique se o arquivo é PDF, JPEG ou PNG
- Verifique se o MIME type está correto

### Erro: "Arquivo muito grande"
- Verifique se o arquivo tem menos de 10MB
- Comprima o arquivo se necessário

### Erro: "Investidor não encontrado"
- Verifique se o ID do investidor está correto
- Verifique se o usuário é do tipo 'investor'
