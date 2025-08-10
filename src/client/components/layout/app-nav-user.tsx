"use client";

import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@client/components/ui/avatar";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@client/components/ui/dropdown-menu";
import {
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	useSidebar,
} from "@client/components/ui/sidebar";
import { Skeleton } from "@client/components/ui/skeleton";
import { authClient } from "@client/lib/auth-client";
import { useRouter } from "@tanstack/react-router";
import { ChevronsUpDown, LogOut } from "lucide-react";

export function AppNavUser() {
	const { isMobile } = useSidebar();
	const router = useRouter();

	const { data: session, isPending: isSessionPending } =
		authClient.useSession();
	const { data: activeOrganization, isPending: isActiveOrganizationPending } =
		authClient.useActiveOrganization();

	const handleSignOut = async () => {
		await authClient.signOut({
			fetchOptions: {
				onSuccess: () => {
					router.navigate({ to: "/auth/signin" }); // redirect to login page
				},
			},
		});
	};

	if (isSessionPending || isActiveOrganizationPending || !session) {
		return (
			<SidebarMenu>
				<SidebarMenuItem>
					<SidebarMenuButton size="lg">
						<Skeleton className="h-full w-full rounded-lg" />
					</SidebarMenuButton>
				</SidebarMenuItem>
			</SidebarMenu>
		);
	}

	const { user } = session;

	return (
		<SidebarMenu>
			<SidebarMenuItem>
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<SidebarMenuButton
							size="lg"
							className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						>
							<Avatar className="h-8 w-8 rounded-lg">
								<AvatarImage src={user.image ?? undefined} alt={user.name} />
								<AvatarFallback className="rounded-lg">
									{user.name?.substring(0, 2).toUpperCase()}
								</AvatarFallback>
							</Avatar>
							<div className="grid flex-1 text-left text-sm leading-tight">
								<span className="truncate font-semibold">{user.name}</span>
								<span className="truncate text-xs">{user.email}</span>
							</div>
							<ChevronsUpDown className="ml-auto size-4" />
						</SidebarMenuButton>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
						side={isMobile ? "bottom" : "right"}
						align="end"
						sideOffset={4}
					>
						<DropdownMenuLabel className="p-0 font-normal">
							<div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
								<Avatar className="h-8 w-8 rounded-lg">
									<AvatarImage src={user.image ?? undefined} alt={user.name} />
									<AvatarFallback className="rounded-lg">
										{user.name?.substring(0, 2).toUpperCase()}
									</AvatarFallback>
								</Avatar>
								<div className="grid flex-1 text-left text-sm leading-tight">
									<span className="truncate font-semibold">{user.name}</span>
									<span className="truncate text-xs">{user.email}</span>
								</div>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<div className="px-2 py-2 flex items-center justify-start gap-2">
							<span className="text-sm font-medium text-muted-foreground">
								Organization:
							</span>
							<span className="truncate font-semibold text-sm">
								{activeOrganization?.name}
							</span>
						</div>
						<DropdownMenuSeparator />
						<DropdownMenuItem onClick={handleSignOut}>
							<LogOut className="mr-2 size-4" />
							Log out
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</SidebarMenuItem>
		</SidebarMenu>
	);
}
