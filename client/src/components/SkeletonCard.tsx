export default function SkeletonCard() {
    return (
        <div className="bg-[var(--white)] rounded-[var(--radius-card)] [border:1.5px_solid_var(--border)] shadow-[var(--shadow-sm)] overflow-hidden flex flex-col">
            <div className="wood-stripe h-6 opacity-40" />
            <div className="px-5 py-[18px] animate-pulse">
                <div className="flex justify-between mb-2.5">
                    <div className="h-4 w-[120px] bg-[var(--cream-mid)] rounded-[6px]" />
                    <div className="flex gap-1">
                        <div className="h-6 w-6 bg-[var(--cream-mid)] rounded-[6px]" />
                        <div className="h-6 w-6 bg-[var(--cream-mid)] rounded-[6px]" />
                    </div>
                </div>
                <div className="h-8 w-[100px] bg-[var(--cream-mid)] rounded-[8px] mb-[14px]" />
                <div className="flex flex-col gap-1.5 mb-[14px]">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-3 w-full bg-[var(--cream)] rounded" />
                    ))}
                </div>
            </div>
        </div>
    );
}
