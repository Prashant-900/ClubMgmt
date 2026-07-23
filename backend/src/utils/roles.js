/**
 * Role hierarchy: ADMIN > COORDINATOR > MEMBER
 *
 * Invitation rules:
 *   - ADMIN can invite COORDINATOR or MEMBER (must select a club)
 *   - COORDINATOR can invite MEMBER only (auto-assigned to their club)
 *   - MEMBER cannot invite anyone
 *
 * Removal rules:
 *   - ADMIN can remove COORDINATOR and MEMBER
 *   - COORDINATOR can remove MEMBER
 *   - MEMBER cannot remove anyone
 */

const ROLE_HIERARCHY = {
  ADMIN: 3,
  COORDINATOR: 2,
  MEMBER: 1,
};

/**
 * Check if the inviter's role can invite a user with the target role.
 *
 * Rules:
 *   - ADMIN      → can invite COORDINATOR or MEMBER (must provide clubId)
 *   - COORDINATOR → can only invite MEMBER
 *   - MEMBER     → cannot invite anyone
 *
 * @param {string} inviterRole
 * @param {string} targetRole
 * @returns {boolean}
 */
function canInvite(inviterRole, targetRole) {
  if (inviterRole === "ADMIN" && (targetRole === "COORDINATOR" || targetRole === "MEMBER")) return true;
  if (inviterRole === "COORDINATOR" && targetRole === "MEMBER") return true;
  return false;
}

/**
 * Get the list of roles that a given role can invite.
 * @param {string} role
 * @returns {string[]}
 */
function getInvitableRoles(role) {
  if (role === "ADMIN") return ["COORDINATOR", "MEMBER"];
  if (role === "COORDINATOR") return ["MEMBER"];
  return [];
}

/**
 * Check if a user can remove another user based on hierarchy.
 * A user can remove anyone strictly below their level.
 *
 * @param {string} removerRole - The role of the person performing the removal
 * @param {string} targetRole  - The role of the person being removed
 * @returns {boolean}
 */
function canRemove(removerRole, targetRole) {
  const removerLevel = ROLE_HIERARCHY[removerRole];
  const targetLevel = ROLE_HIERARCHY[targetRole];

  if (removerLevel === undefined || targetLevel === undefined) {
    return false;
  }

  return removerLevel > targetLevel;
}

/**
 * Get the list of roles that a given role can remove.
 * @param {string} role
 * @returns {string[]}
 */
function getRemovableRoles(role) {
  const level = ROLE_HIERARCHY[role];
  if (level === undefined) return [];

  return Object.entries(ROLE_HIERARCHY)
    .filter(([, lvl]) => lvl < level)
    .map(([roleName]) => roleName);
}

module.exports = {
  ROLE_HIERARCHY,
  canInvite,
  getInvitableRoles,
  canRemove,
  getRemovableRoles,
};
