export * from './client';

// Namespaced API groups. Written as `import * as` + `export {}` rather than
// `export * as ns from` because the latter requires
// @babel/plugin-transform-export-namespace-from, which Metro's preset does not
// enable by default. This form is semantically identical and needs no plugin.
import * as authApi from './auth.api';
import * as clubApi from './club.api';
import * as memberApi from './member.api';
import * as contributionApi from './contribution.api';
import * as inviteLinkApi from './invite-link.api';

export { authApi, clubApi, memberApi, contributionApi, inviteLinkApi };
