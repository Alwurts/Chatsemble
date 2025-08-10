"use client";

import { LogoIcon } from "@client/components/icons/logo-icon";
import { Alert, AlertDescription } from "@client/components/ui/alert";
import { Button, buttonVariants } from "@client/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@client/components/ui/card";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormMessage,
} from "@client/components/ui/form";
import { Input } from "@client/components/ui/input";
import { authClient } from "@client/lib/auth-client";
import { cn } from "@client/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

export const Route = createFileRoute("/auth/signin")({
	component: LoginForm,
});

const formSchema = z.object({
	email: z.string().email("Please enter a valid email address"),
	password: z.string().min(8, "Password must be at least 8 characters"),
});

function LoginForm() {
	const navigate = useNavigate();
	const form = useForm<z.infer<typeof formSchema>>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			email: "",
			password: "",
		},
	});

	const { mutate, isPending, error } = useMutation({
		mutationFn: async (values: z.infer<typeof formSchema>) => {
			const { data, error } = await authClient.signIn.email({
				email: values.email,
				password: values.password,
			});

			if (error) {
				throw error;
			}
			return data;
		},
		onSuccess: async ({ redirect, url }) => {
			toast.success("Signed in successfully");
			console.log("[LoginForm] onSuccess", { redirect, url });
			setTimeout(async () => {
				await navigate({ to: "/chat" });
			}, 500);
		},
		onError: (error) => {
			toast.error("Failed to sign in");
			console.error("[LoginForm] onError", error);
		},
	});

	const onSubmit = (values: z.infer<typeof formSchema>) => {
		mutate(values);
	};

	return (
		<div className="flex h-screen w-screen flex-col items-center justify-center">
			<Card className="w-full max-w-[400px]">
				<CardHeader className="flex flex-col items-center space-y-2">
					<LogoIcon className="size-28" />
					<CardTitle className="text-2xl font-bold">Sign in</CardTitle>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
							<FormField
								control={form.control}
								name="email"
								render={({ field }) => (
									<FormItem>
										<FormControl>
											<Input
												placeholder="name@example.com"
												type="email"
												autoComplete="email"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							<FormField
								control={form.control}
								name="password"
								render={({ field }) => (
									<FormItem>
										<FormControl>
											<Input
												placeholder="Password"
												type="password"
												autoComplete="current-password"
												{...field}
											/>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>

							{error && (
								<Alert variant="destructive">
									<AlertDescription>
										There was an error signing in. Please try again.
									</AlertDescription>
								</Alert>
							)}

							<Button type="submit" className="w-full" disabled={isPending}>
								{isPending ? "Signing in..." : "Sign in"}
							</Button>

							<div className="text-center text-sm text-muted-foreground">
								Don&apos;t have an account?{" "}
								<Link
									to="/auth/signup"
									className={cn(
										buttonVariants({ variant: "link" }),
										"p-0 text-primary",
									)}
								>
									Sign up
								</Link>
							</div>
						</form>
					</Form>
				</CardContent>
			</Card>
		</div>
	);
}
