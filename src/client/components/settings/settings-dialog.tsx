"use client";

import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from "@client/components/ui/dialog";
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
import { Home, Server, User } from "lucide-react";
import type * as React from "react";
import type { Dispatch, SetStateAction } from "react";
import { MCPServerManagement } from "./mcp/mcp-server-management";
import { OrganizationForm } from "./organization-form";
import { ProfileForm } from "./profile-form";

export type SettingType = "profile" | "organization" | "mcp";

export type SettingsPage =
	| { type: "profile" }
	| { type: "organization" }
	| { type: "mcp"; view: "list" }
	| { type: "mcp"; view: "create" }
	| { type: "mcp"; view: "edit"; id: string };

export const settingsLinks: Record<
	SettingType,
	{
		view: SettingType;
		title: string;
		icon: React.ElementType;
	}
> = {
	profile: { view: "profile", title: "Profile", icon: User },
	organization: { view: "organization", title: "Organization", icon: Home },
	mcp: { view: "mcp", title: "MCP Servers", icon: Server },
};

export function SettingsDialog({
	openedSettings,
	setOpenedSettings,
}: {
	openedSettings: SettingsPage | null;
	setOpenedSettings: Dispatch<SetStateAction<SettingsPage | null>>;
}) {
	return (
		<Dialog
			open={openedSettings !== null}
			onOpenChange={(isOpen) => {
				if (!isOpen) {
					setOpenedSettings(null);
				}
			}}
		>
			<DialogContent className="max-w-[94vw] max-h-[95vh] rounded-lg sm:max-w-3xl 2xl:max-w-4xl h-full sm:max-h-[70vh] flex flex-col p-0">
				{openedSettings && (
					<SettingsContent
						openedSettings={openedSettings}
						setOpenedSettings={setOpenedSettings}
					/>
				)}
			</DialogContent>
		</Dialog>
	);
}

function SettingsContent({
	openedSettings,
	setOpenedSettings,
}: {
	openedSettings: SettingsPage;
	setOpenedSettings: Dispatch<SetStateAction<SettingsPage | null>>;
}) {
	return (
		<>
			<DialogTitle className="sr-only">Settings</DialogTitle>
			<DialogDescription className="sr-only">
				Customize your settings here.
			</DialogDescription>
			<div className="flex-1 overflow-y-auto rounded-lg">
				<SidebarProvider className="min-h-0 h-full">
					<SettingsSidebar
						openedSettings={openedSettings}
						setOpenedSettings={setOpenedSettings}
					/>
					<div className="flex-1">
						{openedSettings.type === "profile" && (
							<ProfileForm openedSettings={openedSettings} />
						)}
						{openedSettings.type === "organization" && (
							<OrganizationForm openedSettings={openedSettings} />
						)}

						{openedSettings.type === "mcp" && (
							<MCPServerManagement
								openedSettings={openedSettings}
								setOpenedSettings={setOpenedSettings}
							/>
						)}
					</div>
				</SidebarProvider>
			</div>
		</>
	);
}

function SettingsSidebar({
	openedSettings,
	setOpenedSettings,
}: {
	openedSettings: SettingsPage;
	setOpenedSettings: Dispatch<SetStateAction<SettingsPage | null>>;
}) {
	return (
		<Sidebar collapsible="none" className="hidden md:flex border-r w-48">
			<SidebarContent>
				<SidebarGroup>
					<SidebarGroupContent>
						<SidebarMenu>
							{Object.values(settingsLinks).map((item) => (
								<SidebarMenuItem key={item.view}>
									<SidebarMenuButton
										isActive={openedSettings.type === item.view}
										onClick={() => {
											if (item.view === "mcp") {
												setOpenedSettings({ type: "mcp", view: "list" });
											} else {
												setOpenedSettings({
													type: item.view as "profile" | "organization",
												});
											}
										}}
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
