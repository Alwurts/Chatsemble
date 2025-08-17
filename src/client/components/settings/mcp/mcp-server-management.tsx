"use client";

import type { Dispatch, SetStateAction } from "react";
import type { SettingsPage } from "../settings-dialog";
import { MCPServerCreate } from "./mcp-server-create";
import { MCPServerEdit } from "./mcp-server-edit";
import { MCPServerList } from "./mcp-server-list";

interface MCPServerManagementProps {
	openedSettings: SettingsPage & { type: "mcp" };
	setOpenedSettings: Dispatch<SetStateAction<SettingsPage | null>>;
}

export function MCPServerManagement({
	openedSettings,
	setOpenedSettings,
}: MCPServerManagementProps) {
	if (openedSettings.view === "list") {
		return (
			<MCPServerList
				openedSettings={openedSettings}
				setOpenedSettings={setOpenedSettings}
			/>
		);
	}

	if (openedSettings.view === "create") {
		return (
			<MCPServerCreate
				openedSettings={openedSettings}
				setOpenedSettings={setOpenedSettings}
			/>
		);
	}

	if (openedSettings.view === "edit") {
		return (
			<MCPServerEdit
				serverId={openedSettings.id}
				openedSettings={openedSettings}
				setOpenedSettings={setOpenedSettings}
			/>
		);
	}

	return null;
}
