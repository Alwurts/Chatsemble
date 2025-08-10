import { AppLayoutSkeleton } from "@client/components/layout/app-layout-skeleton";
import { AuthProvider } from "@client/components/providers/auth-provider";
import { OrganizationConnectionProvider } from "@client/components/providers/organization-connection-provider";
import { SidebarProvider } from "@client/components/ui/sidebar";
import { authClient } from "@client/lib/auth-client";
import {
	createFileRoute,
	Navigate,
	Outlet,
	useSearch,
} from "@tanstack/react-router";

export const Route = createFileRoute("/(app)")({
	component: Root,
});

function Root() {
	const { data, isPending } = authClient.useSession();

	const searchParams = useSearch({ strict: false });

	if (isPending) {
		return <AppLayoutSkeleton />;
	}

	if (!data || !data.session) {
		return <Navigate to="/auth/signin" />;
	}

	if (!data.session.activeOrganizationId) {
		console.log("!data.session.activeOrganizationId");
		// TODO: Redirect to the organization selection page
		return <Navigate to="/auth/signin" />;
	}

	// TODO: Add organization routes to select an organization

	return (
		<AuthProvider>
			<OrganizationConnectionProvider
				organizationId={data.session.activeOrganizationId}
				roomId={searchParams.roomId ?? null}
				threadId={searchParams.threadId ?? null}
				user={data.user}
			>
				<SidebarProvider>
					<Outlet />
				</SidebarProvider>
			</OrganizationConnectionProvider>
		</AuthProvider>
	);
}
