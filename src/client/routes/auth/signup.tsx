import { LogoIcon } from "@client/components/icons/logo-icon";
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@client/components/ui/alert";
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
	FormLabel,
	FormMessage,
} from "@client/components/ui/form";
import { Input } from "@client/components/ui/input";
import { authClient } from "@client/lib/auth-client";
import { cn } from "@client/lib/utils";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

export const Route = createFileRoute("/auth/signup")({
	component: SignupForm,
});

const signupFormSchema = z.object({
	email: z.string().email("Please enter a valid email address"),
	password: z.string().min(8, "Password must be at least 8 characters"),
	name: z.string().min(2, "Name must be at least 2 characters"),
	image: z.string().min(1, "Please select an avatar"),
});

function SignupForm() {
	const [isSignupSuccess, setIsSignupSuccess] = useState(false);
	const [userEmail, setUserEmail] = useState("");

	const form = useForm<z.infer<typeof signupFormSchema>>({
		resolver: zodResolver(signupFormSchema),
		defaultValues: {
			email: "",
			password: "",
			name: "",
			image: "/notion-avatars/avatar-01.svg",
		},
	});

	const { mutate, isPending, error } = useMutation({
		mutationFn: async (values: z.infer<typeof signupFormSchema>) => {
			const { data, error } = await authClient.signUp.email({
				email: values.email,
				password: values.password,
				name: values.name,
				image: values.image,
			});

			if (error) {
				throw error;
			}
			return data;
		},
		onSuccess: (data) => {
			console.log("signup success", data);
			toast.success("Account created successfully");
			setUserEmail(form.getValues().email);
			setIsSignupSuccess(true);
		},
		onError: (error) => {
			toast.error("Failed to sign up");
			console.error("[SignupForm] onError", error);
		},
	});

	const onSubmit = (values: z.infer<typeof signupFormSchema>) => {
		mutate(values);
	};

	if (isSignupSuccess) {
		return (
			<div className="container mx-auto flex min-h-screen w-full flex-col items-center justify-center py-8">
				<Card className="w-full max-w-md">
					<CardHeader className="flex flex-row items-center justify-start gap-4">
						<LogoIcon className="size-14" />
						<CardTitle className="text-2xl font-bold">
							Verification Email Sent
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-6">
						<Alert variant="default" className="flex items-start gap-3">
							<CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-50" />
							<div>
								<AlertTitle>Account created successfully!</AlertTitle>
								<AlertDescription>
									We've sent a verification email to{" "}
									<strong>{userEmail}</strong>. Please check your inbox and
									click the verification link to activate your account.
								</AlertDescription>
							</div>
						</Alert>

						<div className="text-center">
							<p className="text-sm text-muted-foreground">
								If you don't see the email in your inbox, please check your spam
								folder. The verification link will expire in 24 hours.
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="container mx-auto flex min-h-screen w-full flex-col items-center justify-center py-8">
			<Card className="w-full">
				<CardHeader className="flex flex-row items-center justify-start gap-4">
					<LogoIcon className="size-14" />
					<CardTitle className="text-2xl font-bold">
						Create your account
					</CardTitle>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
							<div className="space-y-4">
								<h3 className="text-lg font-medium">Profile Information</h3>
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Full Name</FormLabel>
											<FormControl>
												<Input
													placeholder="Your Name"
													type="text"
													autoComplete="name"
													{...field}
												/>
											</FormControl>
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
											<FormLabel>Password</FormLabel>
											<FormControl>
												<Input
													placeholder="Create a secure password"
													type="password"
													autoComplete="new-password"
													{...field}
												/>
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>

							{error && (
								<Alert variant="destructive">
									<AlertDescription>
										There was an error creating your account. Please try again.
									</AlertDescription>
								</Alert>
							)}

							<div className="flex flex-col items-center gap-4">
								<Button
									type="submit"
									className="w-full max-w-[400px]"
									disabled={isPending}
								>
									{isPending ? "Creating account..." : "Create Account"}
								</Button>

								<div className="text-center text-sm text-muted-foreground">
									Already have an account?{" "}
									<Link
										to="/auth/signin"
										className={cn(
											buttonVariants({ variant: "link" }),
											"p-0 text-primary",
										)}
									>
										Sign in
									</Link>
								</div>
							</div>
						</form>
					</Form>
				</CardContent>
			</Card>
		</div>
	);
}
