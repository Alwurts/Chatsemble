"use client";

import { AvatarPicker } from "@client/components/common/avatar-picker";
import { Button } from "@client/components/ui/button";
import {
	Form,
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@client/components/ui/form";
import { Input } from "@client/components/ui/input";
import { authClient } from "@client/lib/auth-client";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";
import type { SettingsPage } from "./settings-dialog";
import { SettingsHeader } from "./settings-header";

const profileFormSchema = z.object({
	username: z
		.string()
		.min(2, {
			message: "Username must be at least 2 characters.",
		})
		.max(30, {
			message: "Username must not be longer than 30 characters.",
		}),
	email: z.email({
		message: "Please enter a valid email address.",
	}),
	avatar: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const defaultValues: Partial<ProfileFormValues> = {
	username: "",
	email: "",
	avatar: "",
};

interface ProfileFormProps {
	openedSettings: SettingsPage;
}

export function ProfileForm({ openedSettings }: ProfileFormProps) {
	const { data } = authClient.useSession();
	const queryClient = useQueryClient();

	const form = useForm<ProfileFormValues>({
		resolver: zodResolver(profileFormSchema),
		defaultValues,
		mode: "onChange",
	});

	async function onSubmit(values: ProfileFormValues) {
		const updateData: { name: string; image?: string } = {
			name: values.username,
		};

		if (values.avatar) {
			updateData.image = values.avatar;
		}

		const r = await authClient.updateUser(updateData);
		if (r.error) {
			toast.error(r.error.message);
			return;
		}
		if (r.data) {
			toast.success("Profile updated successfully");
			queryClient.invalidateQueries({ queryKey: ["session"] });
		}
	}

	useEffect(() => {
		if (data?.user) {
			form.reset({
				username: data.user.name,
				email: data.user.email,
				avatar: data.user.image || "",
			});
		}
	}, [data, form]);

	return (
		<div className="flex flex-col h-full">
			<SettingsHeader openedSettings={openedSettings} />
			<div className="flex-1 overflow-y-auto p-4">
				<h3 className="text-lg font-medium">Profile Settings</h3>
				<p className="text-sm text-muted-foreground">
					This is where you would manage your profile settings.
				</p>
				<Form {...form}>
					<form
						onSubmit={form.handleSubmit(onSubmit)}
						className="space-y-4 p-6"
					>
						<FormField
							control={form.control}
							name="avatar"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Avatar</FormLabel>
									<FormControl>
										<AvatarPicker
											value={field.value || ""}
											onChange={field.onChange}
										/>
									</FormControl>
									<FormDescription>
										Choose an avatar from the available options.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="username"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Username</FormLabel>
									<FormControl>
										<Input placeholder="shadcn" {...field} />
									</FormControl>
									<FormDescription>
										This is your public display name. It can be your real name
										or a pseudonym.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="email"
							disabled={true}
							render={({ field }) => (
								<FormItem>
									<FormLabel>Email</FormLabel>
									<FormControl>
										<Input placeholder="m@example.com" {...field} />
									</FormControl>
									<FormDescription>
										You can manage verified email addresses in your email
										settings.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Button type="submit">Update profile</Button>
					</form>
				</Form>
			</div>
		</div>
	);
}
