"use client";

import { AvatarPicker } from "@client/components/common/avatar-picker";
import { CardToggleGroup } from "@client/components/common/card-toggle-groups";
import {
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@client/components/ui/form";
import { Input } from "@client/components/ui/input";
import { Textarea } from "@client/components/ui/textarea";
import { cn } from "@client/lib/utils";
import {
	emojiUsageDescriptions,
	emojiUsageOptions,
	languageStyleDescriptions,
	languageStyleOptions,
	toneDescriptions,
	toneOptions,
	verbosityDescriptions,
	verbosityOptions,
} from "@shared/types";
import {
	AlignJustify,
	Ban,
	Binary,
	BookOpen,
	Briefcase,
	Building,
	FileText,
	MessageCircle,
	MessageSquare,
	PartyPopper,
	Smile,
	Sparkles,
	Users,
} from "lucide-react";

export function AgentForm({ className }: React.ComponentProps<"div">) {
	return (
		<div className={cn("space-y-8", className)}>
			{/* Identity Section */}
			<div>
				<h3 className="text-lg font-medium mb-4">Identity</h3>
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					<div className="md:col-span-1">
						<FormField
							name="image"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Agent Avatar</FormLabel>
									<FormControl>
										<AvatarPicker
											value={field.value}
											onChange={field.onChange}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<div className="md:col-span-1 lg:col-span-2">
						<FormField
							name="name"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Name</FormLabel>
									<FormControl>
										<Input placeholder="Enter agent name" {...field} />
									</FormControl>
									<FormDescription>
										This is the name that will be displayed for your agent.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>

					<div className="md:col-span-2 lg:col-span-3">
						<FormField
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Description</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Describe the purpose or role of this agent"
											className="min-h-20"
											{...field}
											value={field.value || ""}
										/>
									</FormControl>
									<FormDescription>
										Briefly describe what this agent does or what it's designed
										for.
									</FormDescription>
									<FormMessage />
								</FormItem>
							)}
						/>
					</div>
				</div>
			</div>

			{/* Personality Section */}
			<div>
				<h3 className="text-lg font-medium mb-4">Personality</h3>
				<div className="space-y-8">
					<FormField
						name="tone"
						render={({ field }) => (
							<FormItem className="space-y-4">
								<FormLabel>Tone</FormLabel>
								<FormControl>
									<CardToggleGroup
										value={field.value}
										onValueChange={field.onChange}
										options={toneOptions}
										descriptions={toneDescriptions}
										iconMap={{
											formal: MessageSquare,
											casual: MessageCircle,
											friendly: Smile,
											professional: Briefcase,
										}}
									/>
								</FormControl>
								<FormDescription>
									How should the agent communicate?
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						name="verbosity"
						render={({ field }) => (
							<FormItem className="space-y-4">
								<FormLabel>Verbosity</FormLabel>
								<FormControl>
									<CardToggleGroup
										value={field.value}
										onValueChange={field.onChange}
										options={verbosityOptions}
										descriptions={verbosityDescriptions}
										iconMap={{
											concise: AlignJustify,
											detailed: BookOpen,
											adaptive: Users,
										}}
									/>
								</FormControl>
								<FormDescription>
									How detailed should responses be?
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						name="emojiUsage"
						render={({ field }) => (
							<FormItem className="space-y-4">
								<FormLabel>Emoji Usage</FormLabel>
								<FormControl>
									<CardToggleGroup
										value={field.value}
										onValueChange={field.onChange}
										options={emojiUsageOptions}
										descriptions={emojiUsageDescriptions}
										iconMap={{
											none: Ban,
											occasional: Sparkles,
											frequent: PartyPopper,
										}}
									/>
								</FormControl>
								<FormDescription>
									How frequently should emojis be used?
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						name="languageStyle"
						render={({ field }) => (
							<FormItem className="space-y-4">
								<FormLabel>Language Style</FormLabel>
								<FormControl>
									<CardToggleGroup
										value={field.value}
										onValueChange={field.onChange}
										options={languageStyleOptions}
										descriptions={languageStyleDescriptions}
										iconMap={{
											simple: FileText,
											technical: Binary,
											// biome-ignore lint/complexity/useLiteralKeys: dynamic key needed for industry-specific
											["industry-specific"]: Building,
										}}
									/>
								</FormControl>
								<FormDescription>
									What type of language should be used?
								</FormDescription>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
			</div>
		</div>
	);
}
