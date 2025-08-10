"use client";

import { Button } from "@client/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@client/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@client/components/ui/form";
import { Input } from "@client/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@client/components/ui/select";
import { authClient } from "@client/lib/auth-client";
import type { ActiveOrganization } from "@client/types/auth";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { MailPlus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

const formSchema = z.object({
	email: z.string().email(),
	role: z.enum(["member", "admin", "owner"]),
});

export function InviteMemberDialog({
	setOptimisticOrg,
	optimisticOrg,
}: {
	setOptimisticOrg: (org: ActiveOrganization | null) => void;
	optimisticOrg: ActiveOrganization;
}) {
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
			role: "member",
		},
	});

	const handleInvite = useMutation({
		mutationFn: async (values: z.infer<typeof formSchema>) => {
			const { data } = await authClient.organization.inviteMember({
				email: values.email,
				role: values.role as "member" | "admin" | "owner",
			});
			if (!data) {
				throw new Error("Failed to invite member");
			}
			return data;
		},
		onSuccess: (data) => {
			setOptimisticOrg({
				...optimisticOrg,
				invitations: [...(optimisticOrg?.invitations || []), data],
			});
		},
		onError: (error) => {
			toast.error(error.message || "Failed to invite member");
		},
	});

	const onSubmit = (values: z.infer<typeof formSchema>) => {
		handleInvite.mutate(values);
	};

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button size="sm" className="gap-2" variant="default">
					<MailPlus size={16} />
					<p>Invite Member</p>
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px] w-11/12">
				<Form {...form}>
					<form onSubmit={form.handleSubmit(onSubmit)}>
						<DialogHeader>
							<DialogTitle>Invite Member</DialogTitle>
							<DialogDescription>
								Invite a member to your organization.
							</DialogDescription>
						</DialogHeader>
						<div className="flex flex-col gap-2">
							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Email</FormLabel>
										<FormControl>
											<Input placeholder="Email" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="role"
								render={({ field }) => (
									<FormItem>
										<FormLabel>Role</FormLabel>
										<FormControl>
											<Select
												value={field.value}
												onValueChange={field.onChange}
											>
												<SelectTrigger>
													<SelectValue placeholder="Select a role" />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="admin">Admin</SelectItem>
													<SelectItem value="member">Member</SelectItem>
												</SelectContent>
											</Select>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
						<DialogFooter className="mt-2">
							<DialogClose>
								<Button type="submit" disabled={handleInvite.isPending}>
									{handleInvite.isPending ? "Inviting..." : "Invite"}
								</Button>
							</DialogClose>
						</DialogFooter>
					</form>
				</Form>
			</DialogContent>
		</Dialog>
	);
}
