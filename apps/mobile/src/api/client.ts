import {
  calendarResponseSchema,
  categoriesResponseSchema,
  categorySchema,
  householdExportSchema,
  householdSchema,
  invitationPreviewSchema,
  invitationSchema,
  invitationsResponseSchema,
  membersResponseSchema,
  healthResponseSchema,
  memberSchema,
  meResponseSchema,
  periodResponseSchema,
  recurringListSchema,
  savingsGoalSchema,
  savingsListSchema,
  recurringRuleSchema,
  resolvedOccurrenceSchema,
  transactionSchema,
  upcomingResponseSchema,
  type PayOccurrenceInput,
  type RecurringInput,
  type SavingsGoalInput,
  type TransactionInput,
  type CreateCategoryInput,
  type UpdateCategoryInput,
  type UpdateHouseholdInput,
  type UpdateMyMemberInput,
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
  calendar: (householdId: string, month: string) =>
    request(`${household(householdId)}/calendar/${month}`, { schema: calendarResponseSchema }),
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
  updateMyMember: (householdId: string, input: UpdateMyMemberInput) =>
    request(`${household(householdId)}/members/me`, {
      method: 'PATCH',
      body: input,
      schema: memberSchema,
    }),
  updateHousehold: (householdId: string, input: UpdateHouseholdInput) =>
    request(household(householdId), { method: 'PATCH', body: input, schema: householdSchema }),
  createCategory: (householdId: string, input: CreateCategoryInput) =>
    request(`${household(householdId)}/categories`, {
      method: 'POST',
      body: input,
      schema: categorySchema,
    }),
  updateCategory: (householdId: string, categoryId: string, input: UpdateCategoryInput) =>
    request(`${household(householdId)}/categories/${categoryId}`, {
      method: 'PATCH',
      body: input,
      schema: categorySchema,
    }),
  exportHousehold: (householdId: string) =>
    request(`${household(householdId)}/export`, { schema: householdExportSchema }),
  deleteAccount: (password: string) =>
    request('/api/account', { method: 'DELETE', body: { password }, schema: z.null() }),
  members: (householdId: string) =>
    request(`${household(householdId)}/members`, { schema: membersResponseSchema }),
  changeRole: (householdId: string, memberId: string, role: 'editor' | 'viewer') =>
    request(`${household(householdId)}/members/${memberId}`, {
      method: 'PATCH',
      body: { role },
      schema: memberSchema,
    }),
  removeMember: (householdId: string, memberId: string) =>
    request(`${household(householdId)}/members/${memberId}`, {
      method: 'DELETE',
      schema: z.null(),
    }),
  leaveHousehold: (householdId: string) =>
    request(`${household(householdId)}/leave`, { method: 'POST', schema: meResponseSchema }),
  transferOwnership: (householdId: string, memberId: string) =>
    request(`${household(householdId)}/transfer-ownership`, {
      method: 'POST',
      body: { memberId },
      schema: meResponseSchema,
    }),
  invitations: (householdId: string) =>
    request(`${household(householdId)}/invitations`, { schema: invitationsResponseSchema }),
  createInvitation: (householdId: string, role: 'editor' | 'viewer') =>
    request(`${household(householdId)}/invitations`, {
      method: 'POST',
      body: { role },
      schema: invitationSchema,
    }),
  revokeInvitation: (householdId: string, invitationId: string) =>
    request(`${household(householdId)}/invitations/${invitationId}`, {
      method: 'DELETE',
      schema: z.null(),
    }),
  previewInvitation: (code: string) =>
    request(`/api/invitations/${encodeURIComponent(code)}`, { schema: invitationPreviewSchema }),
  acceptInvitation: (code: string, confirmLoseData: boolean) =>
    request(`/api/invitations/${encodeURIComponent(code)}/accept`, {
      method: 'POST',
      body: { confirmLoseData },
      schema: meResponseSchema,
    }),
  savings: (householdId: string) =>
    request(`${household(householdId)}/savings`, { schema: savingsListSchema }),
  saveSavingsGoal: (householdId: string, id: string, input: SavingsGoalInput) =>
    request(`${household(householdId)}/savings/${id}`, {
      method: 'PUT',
      body: input,
      schema: savingsGoalSchema,
    }),
  deleteSavingsGoal: (householdId: string, id: string) =>
    request(`${household(householdId)}/savings/${id}`, { method: 'DELETE', schema: z.null() }),
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
  /** Todos los meses del calendario, para invalidarlos juntos. */
  calendars: (householdId: string) => ['calendar', householdId] as const,
  calendar: (householdId: string, month: string) => ['calendar', householdId, month] as const,
  period: (householdId: string, start: string) => ['periods', householdId, start] as const,
  recurring: (householdId: string) => ['recurring', householdId] as const,
  savings: (householdId: string) => ['savings', householdId] as const,
  members: (householdId: string) => ['members', householdId] as const,
  invitations: (householdId: string) => ['invitations', householdId] as const,
  upcoming: (householdId: string, days?: number) =>
    (days === undefined
      ? ['upcoming', householdId]
      : ['upcoming', householdId, days]) as readonly unknown[],
};
