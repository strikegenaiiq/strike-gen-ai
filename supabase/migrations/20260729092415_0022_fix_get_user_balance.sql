CREATE OR REPLACE FUNCTION public.get_user_balance(p_user_id uuid)
RETURNS integer
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT COALESCE((SELECT remaining_tokens FROM view_user_balances WHERE user_id = p_user_id), 0)::integer;
$$;
