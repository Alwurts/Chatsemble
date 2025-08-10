"use client";

import { CopyButton } from "@client/components/common/copy-button";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@client/components/ui/avatar";
import { Button } from "@client/components/ui/button";
import { Separator } from "@client/components/ui/separator";
import { authClient } from "@client/lib/auth-client";
import type { ActiveOrganization } from "@client/types/auth";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { InviteMemberDialog } from "./invite-member-dialog";

export function OrganizationForm() {
	const [optimisticOrg, setOptimisticOrg] = useState<ActiveOrganization | null>(
		null,
	);

	const [isRevoking, setIsRevoking] = useState<string[]>([]);

	const session = authClient.useSession();
	const activeOrganization = authClient.useActiveOrganization();

	useEffect(() => {
		if (activeOrganization.data) {
			// @ts-expect-error
			setOptimisticOrg(activeOrganization.data);
		}
	}, [activeOrganization.data]);

	const currentMember = optimisticOrg?.members.find(
		(member) => member.userId === session?.data?.user.id,
	);

	const pendingInvitations = useMemo(() => {
		return optimisticOrg?.invitations.filter(
			(invitation) => invitation.status === "pending",
		);
	}, [optimisticOrg]);

	const revokeInvite = (
		invitation: ActiveOrganization["invitations"][number],
	) => {
		authClient.organization.cancelInvitation(
			{
				invitationId: invitation.id,
			},
			{
				onRequest: () => {
					setIsRevoking([...isRevoking, invitation.id]);
				},
				onSuccess: () => {
					toast.success("Invitation revoked successfully");
					setIsRevoking(isRevoking.filter((id) => id !== invitation.id));
					if (optimisticOrg) {
						const invitations = optimisticOrg.invitations.filter(
							(inv) => inv.id !== invitation.id,
						);
						setOptimisticOrg({
							...optimisticOrg,
							invitations: invitations,
						});
					}
				},
				onError: (ctx: { error: { message: string } }) => {
					toast.error(ctx.error.message);
					setIsRevoking(isRevoking.filter((id) => id !== invitation.id));
				},
			},
		);
	};

	return (
		<div>
			<div className="flex flex-col space-y-1.5 p-6 gap-2">
				<h3 className="font-semibold leading-none tracking-tight">
					Your current organization
				</h3>
				<div className="flex items-center gap-2">
					<Avatar>
						<AvatarImage
							className="object-cover w-full h-full"
							src={optimisticOrg?.logo || ""}
						/>
						<AvatarFallback>
							{optimisticOrg?.name?.charAt(0) || "P"}
						</AvatarFallback>
					</Avatar>
					<div>
						<p>{optimisticOrg?.name || "Personal"}</p>
						<p className="text-xs text-muted-foreground">
							{optimisticOrg?.members.length || 1} members
						</p>
					</div>
				</div>
			</div>
			<div className="p-6 pt-0">
				<div className="flex flex-col xl:flex-row gap-8">
					<div className="flex flex-col gap-2 flex-grow">
						<p className="font-medium py-1">Members</p>
						<Separator />
						<div className="flex flex-col gap-2">
							{optimisticOrg?.members.map((member) => (
								<div
									key={member.id}
									className="flex justify-between items-center"
								>
									<div className="flex items-center gap-2">
										<Avatar className="sm:flex w-9 h-9">
											<AvatarImage
												src={member.user.image || ""}
												className="object-cover"
											/>
											<AvatarFallback>
												{member.user.name?.charAt(0)}
											</AvatarFallback>
										</Avatar>
										<div>
											<p className="text-sm">{member.user.name}</p>
											<p className="text-xs text-muted-foreground">
												{member.role}
											</p>
										</div>
									</div>
									{member.role !== "owner" &&
										(currentMember?.role === "owner" ||
											currentMember?.role === "admin") &&
										currentMember?.id !== member.id && (
											<Button
												size="sm"
												variant="destructive"
												onClick={() => {
													authClient.organization.removeMember({
														memberIdOrEmail: member.id,
													});
												}}
											>
												Remove
											</Button>
										)}
								</div>
							))}
							{!optimisticOrg?.id && session && (
								<div>
									<div className="flex items-center gap-2">
										<Avatar>
											<AvatarImage src={session?.data?.user.image || ""} />
											<AvatarFallback>
												{session?.data?.user.name?.charAt(0)}
											</AvatarFallback>
										</Avatar>
										<div>
											<p className="text-sm">{session?.data?.user.name}</p>
											<p className="text-xs text-muted-foreground">Owner</p>
										</div>
									</div>
								</div>
							)}
						</div>
					</div>
					<div className="flex flex-col gap-2 flex-grow">
						<div className="flex items-center justify-between">
							<p className="font-medium">Invites</p>
							{optimisticOrg?.id && (
								<InviteMemberDialog
									setOptimisticOrg={setOptimisticOrg}
									optimisticOrg={optimisticOrg}
								/>
							)}
						</div>
						<Separator />
						<div className="flex flex-col gap-2">
							{pendingInvitations && pendingInvitations.length > 0 ? (
								pendingInvitations.map((invitation) => (
									<div
										key={invitation.id}
										className="flex items-center justify-between"
									>
										<div>
											<p className="text-sm">{invitation.email}</p>
											<p className="text-xs text-muted-foreground">
												{invitation.role}
											</p>
										</div>
										<div className="flex items-center gap-2">
											<Button
												disabled={isRevoking.includes(invitation.id)}
												size="sm"
												variant="destructive"
												onClick={() => revokeInvite(invitation)}
											>
												{isRevoking.includes(invitation.id) ? (
													<Loader2 className="animate-spin" size={16} />
												) : (
													"Revoke"
												)}
											</Button>
											<div>
												<CopyButton
													textToCopy={`${typeof window !== "undefined" ? window.location.origin : ""}/accept-invitation/${invitation.id}`}
												/>
											</div>
										</div>
									</div>
								))
							) : (
								<p className="text-sm text-muted-foreground">
									No Active Invitations
								</p>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
