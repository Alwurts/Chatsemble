import {
	SidebarGroup,
	SidebarGroupAction,
	SidebarGroupLabel,
	SidebarMenu,
	SidebarMenuItem,
	SidebarMenuSkeleton,
} from "@client/components/ui/sidebar";
import { Skeleton } from "@client/components/ui/skeleton";

export function AppSidebarGroupSkeleton({
	listLength,
}: {
	listLength: number;
}) {
	return (
		<SidebarGroup className="group-data-[collapsible=icon]:hidden">
			<SidebarGroupLabel>
				<Skeleton className="h-4 w-32" />
			</SidebarGroupLabel>
			<SidebarGroupAction>
				<Skeleton className="size-4" />
			</SidebarGroupAction>
			<SidebarMenu>
				{Array.from({ length: listLength }).map((_, index) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: static skeleton items
					<SidebarMenuItem key={index}>
						<SidebarMenuSkeleton />
					</SidebarMenuItem>
				))}
			</SidebarMenu>
		</SidebarGroup>
	);
}
