import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
    return (
        <div className={cn("animate-pulse rounded-md bg-gray-200", className)} />
    );
}

export function TransactionSkeleton() {
    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between mb-8">
                <div className="space-y-2">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-12 w-32 rounded-2xl" />
                    <Skeleton className="h-12 w-32 rounded-2xl" />
                    <Skeleton className="h-12 w-32 rounded-2xl" />
                </div>
            </div>

            <div className="bg-white rounded-3xl p-8 border border-gray-100 mb-8 space-y-6">
                <Skeleton className="h-14 w-full rounded-2xl" />
                <div className="grid grid-cols-5 gap-4">
                    <Skeleton className="h-16 rounded-xl" />
                    <Skeleton className="h-16 rounded-xl" />
                    <Skeleton className="h-16 rounded-xl" />
                    <Skeleton className="h-16 rounded-xl" />
                    <Skeleton className="h-16 rounded-xl" />
                </div>
            </div>

            <div className="bg-white rounded-[32px] border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-50 flex justify-between">
                    <Skeleton className="h-4 w-full max-w-7xl" />
                </div>
                {[...Array(10)].map((_, i) => (
                    <div key={i} className="px-6 py-5 border-b border-gray-50 flex items-center justify-between gap-4">
                        <Skeleton className="h-4 w-4" />
                        <Skeleton className="h-10 w-24" />
                        <Skeleton className="h-10 flex-1 max-w-xs" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-6 w-24 ml-auto" />
                        <Skeleton className="h-8 w-20 rounded-full" />
                        <Skeleton className="h-4 w-5" />
                    </div>
                ))}
            </div>
        </div>
    );
}
