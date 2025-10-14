-- Script para criar o bucket investor_contracts no Supabase Storage
-- Execute este script no Supabase SQL Editor

-- Verificar se o bucket já existe
DO $$
BEGIN
    -- Tentar inserir o bucket (irá falhar se já existir)
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
        'investor_contracts', 
        'investor_contracts', 
        false, 
        10485760, -- 10MB em bytes
        ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
    );
    
    RAISE NOTICE 'Bucket investor_contracts criado com sucesso!';
EXCEPTION
    WHEN unique_violation THEN
        RAISE NOTICE 'Bucket investor_contracts já existe.';
    WHEN OTHERS THEN
        RAISE NOTICE 'Erro ao criar bucket: %', SQLERRM;
END $$;
