export default function SkeletonCard() {
    return (
        <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm animate-pulse">
            <div className="flex items-center justify-between mb-3">
                <div className="h-4 w-32 rounded bg-gray-200" />
                <div className="flex gap-2">
                    <div className="h-6 w-6 rounded bg-gray-200" />
                    <div className="h-6 w-6 rounded bg-gray-200" />
                </div>
            </div>
            <div className="h-8 w-24 rounded bg-gray-200 mb-4" />
            <div className="flex flex-col gap-2">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-3 w-full rounded bg-gray-100" />
                ))}
            </div>
        </div>
    );
}
