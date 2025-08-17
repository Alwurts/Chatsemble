"use client";

import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@client/components/ui/breadcrumb";
import type React from "react";
import type { SettingsPage } from "./settings-dialog";
import { settingsLinks } from "./settings-dialog";

export function SettingsHeader({
	openedSettings,
	children,
}: {
	openedSettings: SettingsPage;
	children?: React.ReactNode;
}) {
	return (
		<header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b px-4 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
			<div className="flex items-center gap-2">
				<Breadcrumb>
					<BreadcrumbList>
						<BreadcrumbItem>
							<BreadcrumbLink href="#">Settings</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
						<BreadcrumbItem>
							<BreadcrumbPage>
								{settingsLinks[openedSettings.type]?.title ??
									openedSettings.type}
							</BreadcrumbPage>
						</BreadcrumbItem>
						{"view" in openedSettings && openedSettings.view && (
							<>
								<BreadcrumbSeparator />
								<BreadcrumbItem>
									<BreadcrumbPage className="capitalize">
										{openedSettings.view}
									</BreadcrumbPage>
								</BreadcrumbItem>
							</>
						)}
					</BreadcrumbList>
				</Breadcrumb>
			</div>
			{children && (
				<div className="flex items-center gap-2 mr-8">
					{/* Optional: Add a separator if needed, e.g., <Separator orientation="vertical" className="h-6" /> */}
					{children}
				</div>
			)}
		</header>
	);
}
