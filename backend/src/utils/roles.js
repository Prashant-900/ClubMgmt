/**
 * Role hierarchy: ADMIN > COORDINATOR > MEMBER
 *
 * Invitation rules:
 *   - ADMIN can invite COORDINATOR and MEMBER
 *   - COORDINATOR can invite MEMBER only
 *   - MEMBER cannot invite anyone
 *   - COORDINATOR can ONLY be invited by ADMIN
 *
 * Removal rules:
 *   - A user can remove anyone strictly below their hierarchy level
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
 * Special rule: COORDINATOR can only be invited by ADMIN.
 *
 * @param {string} inviterRole - The role of the person sending the invite
 * @param {string} targetRole  - The role being assigned to the invitee
 * @returns {boolean}
 */
function canInvite(inviterRole, targetRole) {
  const inviterLevel = ROLE_HIERARCHY[inviterRole];
  const targetLevel = ROLE_HIERARCHY[targetRole];

  if (inviterLevel === undefined || targetLevel === undefined) {
    return false;
  }

  // COORDINATOR can only be invited by ADMIN
  if (targetRole === "COORDINATOR" && inviterRole !== "ADMIN") {
    return false;
  }

  return inviterLevel > targetLevel;
}

/**
 * Get the list of roles that a given role can invite.
 * @param {string} role
 * @returns {string[]}
 */
function getInvitableRoles(role) {
  const level = ROLE_HIERARCHY[role];
  if (level === undefined) return [];

  return Object.entries(ROLE_HIERARCHY)
    .filter(([roleName, lvl]) => {
      if (lvl >= level) return false;
      // COORDINATOR can only be invited by ADMIN
      if (roleName === "COORDINATOR" && role !== "ADMIN") return false;
      return true;
    })
    .map(([roleName]) => roleName);
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
