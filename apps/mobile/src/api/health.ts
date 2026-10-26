import { healthResponseSchema, type HealthResponse } from '@smartnomic/api';
import { API_URL } from '../config';

/** Comprueba que el servidor responde. Lanza un error si no está disponible. */
export async function fetchHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_URL}/health`);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return healthResponseSchema.parse(await response.json());
}
