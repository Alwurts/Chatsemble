import { AuthProvider } from "@/components/providers/auth-provider";
import { authClient } from "@/lib/auth-client";
import { Navigate, Outlet, createFileRoute } from "@tanstack/react-router";
import { SidebarProvider } from "@/components/ui/sidebar";

export const Route = createFileRoute("/(app)")({
	component: Root,
});

function Root() {
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return <div>Loading...</div>;
	}

	if (!session) {
		return <Navigate to="/auth/signin" />;
	}

	return (
		<AuthProvider>
			<SidebarProvider>
				<Outlet />
			</SidebarProvider>
		</AuthProvider>
	);
}
