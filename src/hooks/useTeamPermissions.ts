/**
 * useTeamPermissions — gate write per Team Condiviso
 * viewer: read-only, editor: CRUD tranne deleteAutomation/manageTeam, admin: full
 */
import { useMemo } from 'react';

export type TeamRole = 'admin' | 'editor' | 'viewer';
type Action = 'createProduct'|'updateProduct'|'deleteProduct'|'moveProduct'|'sellProduct'|'deleteAutomation'|'manageTeam'|'chatSend';

const MATRIX: Record<TeamRole, Set<Action>> = {
  admin: new Set(['createProduct','updateProduct','deleteProduct','moveProduct','sellProduct','deleteAutomation','manageTeam','chatSend']),
  editor: new Set(['createProduct','updateProduct','moveProduct','sellProduct','chatSend']),
  viewer: new Set([]),
};

// placeholder: legge da meshSync/team_members — ora default viewer finché non connesso; quando Host, admin.
export function useTeamPermissions(role: TeamRole = 'viewer') {
  return useMemo(() => ({
    role,
    can: (a: Action) => MATRIX[role].has(a),
    assert: (a: Action) => { if (!MATRIX[role].has(a)) throw new Error(`Permesso negato: ${role} non può ${a}`); },
  }), [role]);
}
