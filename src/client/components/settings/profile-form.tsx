"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

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
import { toast } from "sonner";

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
		message: "Please select an email to display.",
	}),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

// TODO: Implement profile editing
const defaultValues: Partial<ProfileFormValues> = {
	username: "john-doe",
	email: "john@example.com",
};

export function ProfileForm() {
	const form = useForm<ProfileFormValues>({
		resolver: zodResolver(profileFormSchema),
		defaultValues,
		mode: "onChange",
	});

	function onSubmit() {
		toast.success("You submitted the following values:");
	}

	return (
		<Form {...form}>
			<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 p-6">
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
								This is your public display name. It can be your real name or a
								pseudonym.
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem>
							<FormLabel>Email</FormLabel>
							<FormControl>
								<Input placeholder="m@example.com" {...field} />
							</FormControl>
							<FormDescription>
								You can manage verified email addresses in your email settings.
							</FormDescription>
							<FormMessage />
						</FormItem>
					)}
				/>

				<Button type="submit">Update profile</Button>
			</form>
		</Form>
	);
}
