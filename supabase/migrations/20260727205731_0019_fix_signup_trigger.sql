CREATE OR REPLACE FUNCTION public.handle_new_user_signup_grant()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.token_ledgers (user_id, amount, transaction_type, entry_type, reference, description)
  VALUES (NEW.id, 60, 'bonus', 'bonus', 'WELCOME_3_DOLLAR_BONUS', 'Signup welcome bonus');

  RETURN NEW;
END;
$$;
