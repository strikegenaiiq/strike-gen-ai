// src/lib/replicateService.ts
// High-level service scaffolding for submitting jobs to Replicate and handling lifecycle.
// This file contains TODOs and placeholder logic for initial wiring.

import { ReplicateClient } from './replicateClient';

const replicate = new ReplicateClient();

export interface SubmitJobOptions {
  userId: string;
  model: string; // model identifier (e.g., "stability-ai/stable-diffusion")
  params: Record<string, any>;
  isLongRunning?: boolean;
}

/**
 * submitJob: create a generation job record (DB migration must exist) and submit to Replicate.
 * Current implementation is a stub that returns a placeholder job object.
 */
export async function submitJob(opts: SubmitJobOptions): Promise<{ jobId: string; replicateId?: string }>{
  // TODO: persist generation_jobs row via Supabase client / DB migration
  // TODO: call replicate.submitPrediction and record replicate_job_id
  const placeholderJobId = `job-placeholder-${Date.now()}`;
  const replicateResp = await replicate.submitPrediction({ model: opts.model, input: opts.params });

  return { jobId: placeholderJobId, replicateId: replicateResp.id };
}

/**
 * pollJobStatus: check the provider for status updates and return a normalized status
 */
export async function pollJobStatus(replicateJobId: string): Promise<{ status: string; output?: any }>{
  // TODO: integrate with Replicate polling or webhook handler and map status to local enum
  return replicate.pollPrediction(replicateJobId);
}
