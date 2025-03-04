import { organizationPermissions } from "@/cs-shared";
import { organizationClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
export const authClient = createAuthClient({
	baseURL: process.env.NEXT_PUBLIC_URL, // the base url of your auth server
	plugins: [
		organizationClient({
			ac: organizationPermissions.accessControl,
			roles: {
				member: organizationPermissions.member,
				admin: organizationPermissions.admin,
				owner: organizationPermissions.owner,
			},
		}),
	],
});
