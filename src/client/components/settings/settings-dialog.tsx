"use client";

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@client/components/ui/breadcrumb";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@client/components/ui/dialog";
import { ScrollArea } from "@client/components/ui/scroll-area";
import {
	Sidebar,
	SidebarContent,
	SidebarGroup,
	SidebarGroupContent,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem,
	SidebarProvider,
} from "@client/components/ui/sidebar";
import { Home, User } from "lucide-react";
import type * as React from "react";
import type { Dispatch, SetStateAction } from "react";
import { OrganizationForm } from "./organization-form";
import { ProfileForm } from "./profile-form";

export type SettingIds = "profile" | "organization";

const settingsLinks: Record<
	SettingIds,
	{
		id: SettingIds;
		title: string;
		icon: React.ElementType;
	}
> = {
	profile: { id: "profile", title: "Profile", icon: User },
	organization: { id: "organization", title: "Organization", icon: Home },
};

export function SettingsDialog({
	openedSettingsId,
	setOpenedSettingsId,
}: {
	openedSettingsId: SettingIds | null;
	setOpenedSettingsId: Dispatch<SetStateAction<SettingIds | null>>;
}) {
	return (
		<Dialog
			open={openedSettingsId !== null}
			onOpenChange={() => setOpenedSettingsId(null)}
		>
			<DialogContent className="overflow-hidden p-0 md:max-h-[500px] md:max-w-[700px] lg:max-w-[800px]">
				{openedSettingsId && (
					<SettingsContent
						openedSettingsId={openedSettingsId}
						setOpenedSettingsId={setOpenedSettingsId}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

function SettingsContent({
	openedSettingsId,
	setOpenedSettingsId,
}: {
	openedSettingsId: SettingIds;
	setOpenedSettingsId: Dispatch<SetStateAction<SettingIds | null>>;
}) {
	return (
		<>
			<DialogTitle className="sr-only">Settings</DialogTitle>
			<DialogDescription className="sr-only">
				Customize your settings here.
			</DialogDescription>
			<SidebarProvider className="items-start">
				<SettingsSidebar
					openedSettingsId={openedSettingsId}
					setOpenedSettingsId={setOpenedSettingsId}
				/>
				<main className="flex h-[480px] flex-1 flex-col overflow-hidden">
					<SettingsHeader openedSettingsId={openedSettingsId} />
					<ScrollArea className="flex flex-1 flex-col overflow-y-auto">
						<div className="flex flex-col gap-4">
							{openedSettingsId === "profile" && <ProfileForm />}
							{openedSettingsId === "organization" && <OrganizationForm />}
						</div>
					</ScrollArea>
				</main>
			</SidebarProvider>
		</>
	);
}

function SettingsSidebar({
	openedSettingsId,
	setOpenedSettingsId,
}: {
	openedSettingsId: SettingIds;
	setOpenedSettingsId: Dispatch<SetStateAction<SettingIds | null>>;
}) {
	return (
		<Sidebar collapsible="none" className="hidden md:flex border-r">
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							{Object.entries(settingsLinks).map(([id, item]) => (
								<SidebarMenuItem key={id}>
									<SidebarMenuButton
										isActive={id === openedSettingsId}
										onClick={() => setOpenedSettingsId(item.id)}
									>
										<item.icon />
										<span>{item.title}</span>
									</SidebarMenuButton>
								</SidebarMenuItem>
							))}
						</SidebarMenu>
					</SidebarGroupContent>
				</SidebarGroup>
			</SidebarContent>
		</Sidebar>
	);
}

function SettingsHeader({
	openedSettingsId,
}: {
	openedSettingsId: SettingIds;
}) {
	return (
		<header className="flex h-12 shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
			<div className="flex items-center gap-2 px-4">
				<Breadcrumb>
					<BreadcrumbList>
						<BreadcrumbItem className="hidden md:block">
							<BreadcrumbLink href="#">Settings</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator className="hidden md:block" />
						<BreadcrumbItem>
							<BreadcrumbPage>
								{settingsLinks[openedSettingsId].title}
							</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
			</div>
		</header>
	);
}
