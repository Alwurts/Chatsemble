import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import {
	DialogHeader,
	DialogTitle,
	DialogFooter,
} from "@/components/ui/dialog";
import {
	Form,
	FormLabel,
	FormField,
	FormItem,
	FormControl,
	FormMessage,
} from "@/components/ui/form";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { client } from "@/lib/api-client";
import { SelectMember } from "./select-member";

const formSchema = z.object({
	memberId: z.string().min(1, "Member is required"),
	type: z.enum(["user", "agent"]),
	role: z.enum(["admin", "member"]),
});

export type FormValues = z.infer<typeof formSchema>;

interface AddMemberFormProps {
	roomId: string;
	onBack: () => void;
	onSuccess: () => void;
}

export function AddMemberForm({
	roomId,
	onBack,
	onSuccess,
}: AddMemberFormProps) {
	const queryClient = useQueryClient();
	const form = useForm<FormValues>({
		resolver: zodResolver(formSchema),
		defaultValues: {
			type: "user",
			role: "member",
		},
	});

	const addMemberMutation = useMutation({
		mutationFn: async (values: FormValues) => {
			const response = await client.protected["chat-room"].members.$post({
				json: {
					roomId,
					...values,
				},
			});
			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["chat-room", roomId] });
			onSuccess();
			form.reset();
		},
	});

	const onSubmit = (values: FormValues) => {
		addMemberMutation.mutate(values);
	};

	return (
		<>
			<DialogHeader>
				<div className="flex items-center gap-2">
					<Button
						variant="ghost"
						size="sm"
						className="h-8 w-8 p-0"
						onClick={onBack}
					>
						<ArrowLeft className="h-4 w-4" />
					</Button>
					<DialogTitle>Add Member</DialogTitle>
				</div>
			</DialogHeader>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
					<FormField
						control={form.control}
						name="type"
						render={({ field }) => (
							<FormItem className="space-y-4">
								<FormLabel>Member Type</FormLabel>
								<FormControl>
									<RadioGroup
										onValueChange={field.onChange}
										defaultValue={field.value}
										className="flex flex-col space-y-1"
									>
										<div className="flex items-center space-x-2">
											<RadioGroupItem value="user" id="user" />
											<FormLabel htmlFor="user" className="cursor-pointer">
												User
											</FormLabel>
										</div>
										<div className="flex items-center space-x-2">
											<RadioGroupItem value="agent" id="agent" />
											<FormLabel htmlFor="agent" className="cursor-pointer">
												Agent
											</FormLabel>
										</div>
									</RadioGroup>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<SelectMember form={form} />

					<FormField
						control={form.control}
						name="role"
						render={({ field }) => (
							<FormItem>
								<FormLabel>Role</FormLabel>
								<Select
									onValueChange={field.onChange}
									defaultValue={field.value}
								>
									<FormControl>
										<SelectTrigger>
											<SelectValue placeholder="Select role" />
										</SelectTrigger>
									</FormControl>
									<SelectContent>
										<SelectItem value="admin">Admin</SelectItem>
										<SelectItem value="member">Member</SelectItem>
									</SelectContent>
								</Select>
								<FormMessage />
							</FormItem>
						)}
					/>

					<DialogFooter>
						<Button type="submit" disabled={addMemberMutation.isPending}>
							{addMemberMutation.isPending ? "Adding member..." : "Add member"}
						</Button>
					</DialogFooter>
				</form>
			</Form>
		</>
	);
}
