-- app_settings had zero rows despite column defaults existing — nothing
-- could actually read platform_markup_percent. Seed the single settings row.
insert into public.app_settings (id)
values (1)
on conflict (id) do nothing;

-- calculate_generation_cost referenced columns that no longer exist on
-- ai_models (model_identifier, raw_cost_usd, markup_multiplier,
-- minimum_token_charge, is_active). Rewritten to match the live schema:
-- model_id, pricing_params (jsonb, resolution-keyed costPerSecond), active.
-- Minimum-token-charge enforcement is dropped since that column no longer
-- exists anywhere — flagged here, not silently reintroduced.
create or replace function public.calculate_generation_cost(
  p_model_id text,
  p_duration_seconds numeric,
  p_resolution text default null
)
returns table(provider_cost_usd numeric, tokens_to_charge integer, estimated_profit_usd numeric)
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_pricing_params jsonb;
  v_resolution text;
  v_rate numeric;
  v_markup_percent numeric;
  v_token_value_usd numeric := 0.035;
  v_calculated_tokens int;
begin
  select pricing_params into v_pricing_params
  from ai_models
  where model_id = p_model_id and active = true;

  if not found then
    raise exception 'Model % not found or inactive.', p_model_id;
  end if;

  v_resolution := coalesce(p_resolution, v_pricing_params->>'defaultResolution');
  v_rate := (v_pricing_params->'costPerSecond'->>v_resolution)::numeric;

  if v_rate is null then
    raise exception 'No pricing defined for model % at resolution %.', p_model_id, v_resolution;
  end if;

  provider_cost_usd := v_rate * p_duration_seconds;

  select platform_markup_percent into v_markup_percent from app_settings where id = 1;
  v_markup_percent := coalesce(v_markup_percent, 30);

  v_calculated_tokens := ceil((provider_cost_usd * (1 + v_markup_percent / 100.0)) / v_token_value_usd);
  tokens_to_charge := v_calculated_tokens;

  estimated_profit_usd := (tokens_to_charge * v_token_value_usd) - provider_cost_usd;

  return next;
end;
$function$;

REVOKE EXECUTE ON FUNCTION public.calculate_generation_cost(text, numeric, text) FROM anon;
