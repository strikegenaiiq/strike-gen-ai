import { supabase } from "./supabase";

export async function estimateGenerationCost(input: {
  modelId: string;
  durationSeconds: number;
  resolution: string;
}): Promise<number> {
  const { data, error } = await supabase.functions.invoke("estimate-generation-cost", {
    body: input,
  });

  if (error) throw error;
  if (!data || typeof data.tokensToCharge !== "number") {
    throw new Error("Invalid generation cost response");
  }

  return data.tokensToCharge;
}
