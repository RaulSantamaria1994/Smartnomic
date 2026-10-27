import {
  categoriesResponseSchema,
  healthResponseSchema,
  meResponseSchema,
  periodResponseSchema,
  recurringListSchema,
  recurringRuleSchema,
  resolvedOccurrenceSchema,
  transactionSchema,
  upcomingResponseSchema,
  type PayOccurrenceInput,
  type RecurringInput,
  type TransactionInput,
} from '@smartnomic/api';
import { z } from 'zod';
import { API_URL } from '../config';
import { sessionCredentials, sessionHeaders } from '../session/auth-client';
import { createHttpClient } from './http';

const request = createHttpClient({
  baseUrl: API_URL,
  headers: sessionHeaders,
  credentials: sessionCredentials,
});

const household = (id: string) => `/api/households/${encodeURIComponent(id)}`;

export const api = {
  health: () => request('/health', { schema: healthResponseSchema }),
  me: () => request('/api/me', { schema: meResponseSchema }),
  categories: (householdId: string) =>
    request(`${household(householdId)}/categories`, { schema: categoriesResponseSchema }),
  period: (householdId: string, start: string) =>
    request(`${household(householdId)}/periods/${start}`, { schema: periodResponseSchema }),
  saveTransaction: (householdId: string, id: string, input: TransactionInput) =>
    request(`${household(householdId)}/transactions/${id}`, {
      method: 'PUT',
      body: input,
      schema: transactionSchema,
    }),
  deleteTransaction: (householdId: string, id: string) =>
    request(`${household(householdId)}/transactions/${id}`, {
      method: 'DELETE',
      schema: z.null(),
    }),
  recurring: (householdId: string) =>
    request(`${household(householdId)}/recurring`, { schema: recurringListSchema }),
  saveRule: (householdId: string, id: string, input: RecurringInput) =>
    request(`${household(householdId)}/recurring/${id}`, {
      method: 'PUT',
      body: input,
      schema: recurringRuleSchema,
    }),
  deleteRule: (householdId: string, id: string) =>
    request(`${household(householdId)}/recurring/${id}`, { method: 'DELETE', schema: z.null() }),
  upcoming: (householdId: string, days = 30) =>
    request(`${household(householdId)}/upcoming?days=${days}`, { schema: upcomingResponseSchema }),
  pay: (householdId: string, ruleId: string, dueDate: string, input: PayOccurrenceInput) =>
    request(`${household(householdId)}/recurring/${ruleId}/occurrences/${dueDate}/pay`, {
      method: 'POST',
      body: input,
      schema: resolvedOccurrenceSchema,
    }),
  skip: (householdId: string, ruleId: string, dueDate: string) =>
    request(`${household(householdId)}/recurring/${ruleId}/occurrences/${dueDate}/skip`, {
      method: 'POST',
      schema: resolvedOccurrenceSchema,
    }),
  restoreTransaction: (householdId: string, id: string) =>
    request(`${household(householdId)}/transactions/${id}/restore`, {
      method: 'POST',
      schema: transactionSchema,
    }),
};

/** Claves de la caché de TanStack Query. */
export const queryKeys = {
  me: ['me'] as const,
  categories: (householdId: string) => ['categories', householdId] as const,
  periods: (householdId: string) => ['periods', householdId] as const,
  period: (householdId: string, start: string) => ['periods', householdId, start] as const,
  recurring: (householdId: string) => ['recurring', householdId] as const,
  upcoming: (householdId: string) => ['upcoming', householdId] as const,
};
