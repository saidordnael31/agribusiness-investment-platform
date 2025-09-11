-- Corrigindo trigger para atualizar perfis existentes em vez de ignorar conflitos
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, 
    email, 
    user_type, 
    full_name, 
    phone, 
    hierarchy_level, 
    role, 
    parent_id, 
    cnpj, 
    notes
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'user_type', 'investor'),
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', ''),
    NEW.raw_user_meta_data ->> 'phone',
    COALESCE(NEW.raw_user_meta_data ->> 'role', 'advisor'),
    NEW.raw_user_meta_data ->> 'role',
    NEW.raw_user_meta_data ->> 'parent_id',
    NEW.raw_user_meta_data ->> 'cpf_cnpj',
    NEW.raw_user_meta_data ->> 'notes'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    user_type = EXCLUDED.user_type,
    full_name = EXCLUDED.full_name,
    phone = EXCLUDED.phone,
    hierarchy_level = EXCLUDED.hierarchy_level,
    role = EXCLUDED.role,
    parent_id = EXCLUDED.parent_id,
    cnpj = EXCLUDED.cnpj,
    notes = EXCLUDED.notes,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$;

-- Recriar o trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
