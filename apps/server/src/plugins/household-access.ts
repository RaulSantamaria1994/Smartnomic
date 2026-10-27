import { can, type Action } from '@smartnomic/domain';
import { fromNodeHeaders } from 'better-auth/node';
import type { FastifyReply, FastifyRequest, preHandlerAsyncHookHandler } from 'fastify';
import type { Auth } from '../auth';
import type { Database } from '../db/client';
import { findMembership, type Membership } from '../households';
import { ApiError } from './errors';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}

declare module 'fastify' {
  interface FastifyRequest {
    /** Usuario con sesión. Lo rellena `requireSession` o `requireMember`. */
    user?: SessionUser;
    /** Hogar y miembro del usuario. Lo rellena `requireMember`. */
    membership?: Membership;
  }
}

export interface HouseholdAccess {
  /** Exige sesión iniciada. */
  requireSession: preHandlerAsyncHookHandler;
  /**
   * Exige sesión, que el usuario sea miembro del hogar de la ruta (`:householdId`, si la
   * hay) y que su rol permita la acción (constitución, art. VI.1).
   */
  requireMember: (action: Action) => preHandlerAsyncHookHandler;
}

export function createHouseholdAccess(deps: { auth: Auth; db: Database }): HouseholdAccess {
  async function loadUser(request: FastifyRequest): Promise<SessionUser> {
    if (request.user) return request.user;
    const session = await deps.auth.api.getSession({ headers: fromNodeHeaders(request.headers) });
    if (!session) throw new ApiError('unauthenticated', 'Inicia sesión para continuar.');
    const { id, name, email } = session.user;
    request.user = { id, name, email };
    return request.user;
  }

  return {
    requireSession: async (request: FastifyRequest, _reply: FastifyReply) => {
      await loadUser(request);
    },
    requireMember: (action) => async (request: FastifyRequest, _reply: FastifyReply) => {
      const user = await loadUser(request);
      const membership = await findMembership(deps.db, user.id);
      const params = request.params as { householdId?: string } | undefined;
      // Un hogar ajeno responde igual que uno inexistente para el usuario: 403.
      if (!membership || (params?.householdId && params.householdId !== membership.household.id)) {
        throw new ApiError('forbidden', 'No eres miembro de este hogar.');
      }
      if (!can(membership.member.role, action)) {
        throw new ApiError('forbidden', 'Tu rol en el hogar no permite hacer esto.');
      }
      request.membership = membership;
    },
  };
}
