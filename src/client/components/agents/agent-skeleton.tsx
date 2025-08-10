import { Skeleton } from "@client/components/ui/skeleton";

export function AgentSkeleton() {
	return (
		<div className="space-y-8">
			<Skeleton className="h-6 w-32" />

			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				<div className="md:col-span-1">
					<Skeleton className="size-20 rounded-full" />
				</div>

				<div className="md:col-span-1 lg:col-span-2 space-y-2">
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-4 w-64" />
				</div>

				<div className="md:col-span-2 lg:col-span-3 space-y-2">
					<Skeleton className="h-20 w-full" />
					<Skeleton className="h-4 w-72" />
				</div>
			</div>

			<div className="space-y-8">
				<h3 className="text-lg font-medium mb-4">
					<Skeleton className="h-5 w-24" />
				</h3>

				<div className="space-y-8">
					<div className="space-y-4">
						<Skeleton className="h-5 w-16" />
						<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
							{Array.from({ length: 4 }).map((_, i) => (
								// biome-ignore lint/suspicious/noArrayIndexKey: static list for skeleton items
								<Skeleton key={i} className="h-24 rounded-lg" />
							))}
						</div>
						<Skeleton className="h-4 w-48" />
					</div>
				</div>
			</div>
		</div>
	);
}
