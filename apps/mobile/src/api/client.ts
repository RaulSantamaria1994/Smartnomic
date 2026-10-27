import { healthResponseSchema, meResponseSchema } from '@smartnomic/api';
import { API_URL } from '../config';
import { sessionCredentials, sessionHeaders } from '../session/auth-client';
import { createHttpClient } from './http';

const request = createHttpClient({
  baseUrl: API_URL,
  headers: sessionHeaders,
  credentials: sessionCredentials,
});

export const api = {
  health: () => request('/health', { schema: healthResponseSchema }),
  me: () => request('/api/me', { schema: meResponseSchema }),
};
