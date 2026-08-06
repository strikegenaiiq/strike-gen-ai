ALTER TABLE public.ai_models DROP CONSTRAINT IF EXISTS ai_models_pricing_unit_check;
ALTER TABLE public.ai_models ADD CONSTRAINT ai_models_pricing_unit_check CHECK (pricing_unit = ANY (ARRAY['per_second'::text, 'per_video'::text, 'per_image'::text, 'per_character'::text]));

INSERT INTO public.ai_models (
  model_id, display_name, provider, model_type, provider_cost_usd, pricing_unit,
  pricing_tier, supported_resolutions, pricing_params, supports_duration, description, active
) VALUES (
  'wan-2.2-5b-fast', 'Wan 2.2 Fast', 'replicate', 'video', 0.025, 'per_video',
  'budget', ARRAY['480p','720p'],
  '{"kind":"video","pricingUnit":"per_video","costPerVideo":{"480p":0.0125,"720p":0.025},"defaultResolution":"720p","minDurationSeconds":5,"maxDurationSeconds":7,"defaultAspectRatio":"16:9","replicateModel":"wan-video/wan-2.2-5b-fast","framesPerSecond":16,"minFrames":81,"maxFrames":121}'::jsonb,
  true, 'Fast, cost-controlled Wan 2.2 video generation for Strike Studio Standard.', true
)
ON CONFLICT (model_id) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  provider = EXCLUDED.provider,
  provider_cost_usd = EXCLUDED.provider_cost_usd,
  pricing_unit = EXCLUDED.pricing_unit,
  pricing_tier = EXCLUDED.pricing_tier,
  supported_resolutions = EXCLUDED.supported_resolutions,
  pricing_params = EXCLUDED.pricing_params,
  supports_duration = EXCLUDED.supports_duration,
  supports_duration = EXCLUDED.supports_duration,
  description = EXCLUDED.description,
  active = EXCLUDED.active,
  updated_at = now();

UPDATE public.ai_models
SET pricing_params = jsonb_build_object(
  'kind','video',
  'costPerSecond', jsonb_build_object('720p',0.24),
  'defaultResolution','720p',
  'minDurationSeconds',5,
  'maxDurationSeconds',6,
  'defaultAspectRatio','16:9',
  'framesPerSecond',16,
  'minFrames',80,
  'maxFrames',100,
  'replicateModel','wavespeedai/wan-2.1-t2v-720p'
),
updated_at = now()
WHERE model_id = 'wan-2.1-t2v-720p';

CREATE OR REPLACE FUNCTION public.calculate_generation_cost(
  p_model_id text,
  p_duration_seconds numeric,
  p_resolution text DEFAULT NULL::text
)
RETURNS TABLE(provider_cost_usd numeric, tokens_to_charge integer, estimated_profit_usd numeric)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
declare
  v_pricing_params jsonb;
  v_pricing_unit text;
  v_resolution text;
  v_cost numeric;
  v_markup_percent numeric;
  v_token_value_usd numeric := 0.035;
  v_calculated_tokens int;
begin
  select pricing_params, pricing_unit into v_pricing_params, v_pricing_unit
  from public.ai_models where model_id = p_model_id and active = true;
  if not found then raise exception 'Model % not found or inactive.', p_model_id; end if;

  v_resolution := coalesce(p_resolution, v_pricing_params->>'defaultResolution');
  if p_duration_seconds is null then raise exception 'Duration is required for model %.', p_model_id; end if;
  if p_duration_seconds < (v_pricing_params->>'minDurationSeconds')::numeric
     or p_duration_seconds > (v_pricing_params->>'maxDurationSeconds')::numeric then
    raise exception 'Duration % is outside the supported range for model %.', p_duration_seconds, p_model_id;
  end if;

  if v_pricing_unit = 'per_video' then
    v_cost := (v_pricing_params->'costPerVideo'->>v_resolution)::numeric;
  else
    v_cost := (v_pricing_params->'costPerSecond'->>v_resolution)::numeric * p_duration_seconds;
  end if;
  if v_cost is null then raise exception 'No pricing defined for model % at resolution %.', p_model_id, v_resolution; end if;

  provider_cost_usd := v_cost;
  select platform_markup_percent into v_markup_percent from public.app_settings where id = 1;
  v_markup_percent := coalesce(v_markup_percent, 30);
  v_calculated_tokens := ceil((provider_cost_usd * (1 + v_markup_percent / 100.0)) / v_token_value_usd);
  tokens_to_charge := greatest(v_calculated_tokens, 1);
  estimated_profit_usd := (tokens_to_charge * v_token_value_usd) - provider_cost_usd;
  return next;
end;
$$;

REVOKE ALL ON FUNCTION public.calculate_generation_cost(text, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.calculate_generation_cost(text, numeric, text) TO service_role;
