# Configuração Manual do Storage para PIX Receipts

Como você não tem permissões de proprietário na tabela `storage.objects`, siga estes passos manuais:

## 1. Via Supabase Dashboard

### A. Criar o Bucket
1. Acesse o Supabase Dashboard
2. Vá para **Storage** no menu lateral
3. Clique em **New bucket**
4. Configure:
   - **Name**: `pix_receipts`
   - **Public**: ❌ (não público)
   - **File size limit**: `10 MB`
   - **Allowed MIME types**: `image/jpeg, image/jpg, image/png, image/webp, application/pdf`

### B. Configurar Políticas RLS
1. Vá para **Authentication** > **Policies**
2. Selecione a tabela `storage.objects`
3. Adicione as seguintes políticas:

#### Política 1: Insert (Upload)
```sql
CREATE POLICY "pix_receipts_insert_policy" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'pix_receipts' 
  AND auth.role() = 'authenticated'
);
```

#### Política 2: Select (Visualizar)
```sql
CREATE POLICY "pix_receipts_select_policy" ON storage.objects
FOR SELECT USING (
  bucket_id = 'pix_receipts' 
  AND auth.role() = 'authenticated'
);
```

#### Política 3: Select para Admin
```sql
CREATE POLICY "pix_receipts_admin_select_policy" ON storage.objects
FOR SELECT USING (
  bucket_id = 'pix_receipts' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);
```

#### Política 4: Update (Atualizar)
```sql
CREATE POLICY "pix_receipts_update_policy" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'pix_receipts' 
  AND auth.role() = 'authenticated'
);
```

#### Política 5: Delete (Deletar)
```sql
CREATE POLICY "pix_receipts_delete_policy" ON storage.objects
FOR DELETE USING (
  bucket_id = 'pix_receipts' 
  AND auth.role() = 'authenticated'
);
```

## 2. Via SQL Editor (se tiver permissões)

Execute este script no SQL Editor do Supabase:

```sql
-- Criar bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pix_receipts',
  'pix_receipts',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Políticas RLS
CREATE POLICY "pix_receipts_insert_policy" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'pix_receipts' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "pix_receipts_select_policy" ON storage.objects
FOR SELECT USING (
  bucket_id = 'pix_receipts' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "pix_receipts_admin_select_policy" ON storage.objects
FOR SELECT USING (
  bucket_id = 'pix_receipts' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND user_type = 'admin'
  )
);

CREATE POLICY "pix_receipts_update_policy" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'pix_receipts' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "pix_receipts_delete_policy" ON storage.objects
FOR DELETE USING (
  bucket_id = 'pix_receipts' 
  AND auth.role() = 'authenticated'
);
```

## 3. Verificar Configuração

Após configurar, execute este script para verificar:

```sql
-- Verificar bucket
SELECT * FROM storage.buckets WHERE id = 'pix_receipts';

-- Verificar políticas
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'storage' 
AND tablename = 'objects' 
AND policyname LIKE 'pix_receipts%';
```

## 4. Testar Upload

Após configurar, teste o upload de um arquivo para verificar se as políticas estão funcionando corretamente.

---

**Nota**: Se você for o proprietário do projeto Supabase, pode executar os scripts SQL diretamente. Caso contrário, use o Dashboard para configurar manualmente.
