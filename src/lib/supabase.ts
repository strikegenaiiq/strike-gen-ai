import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase env vars. Expected VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY."
  );
}

const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

// Cost calculation is intentionally kept behind the authenticated Edge Function.
// The underlying SECURITY DEFINER RPC is service-role-only; the browser must not
// call it directly through PostgREST.
const originalRpc = supabaseClient.rpc.bind(supabaseClient);
supabaseClient.rpc = (async (fn: string, args?: Record<string, unknown>, options?: unknown) => {
  if (fn !== "calculate_generation_cost") {
    return originalRpc(fn, args, options as never);
  }

  const { data, error } = await supabaseClient.functions.invoke("estimate-generation-cost", {
    body: {
      modelId: args?.p_model_id,
      durationSeconds: args?.p_duration_seconds,
      resolution: args?.p_resolution,
    },
  });

  if (error) return { data: null, error };
  if (!data || typeof data.tokensToCharge !== "number") {
    return { data: null, error: new Error("Invalid generation cost response") };
  }

  return { data: [{ tokens_to_charge: data.tokensToCharge }], error: null };
}) as typeof supabaseClient.rpc;

export const supabase = supabaseClient;
