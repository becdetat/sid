import { Link } from "react-router-dom";
import { WaveIcon } from "./WaveIcon";
import { GearIcon } from "./GearIcon";
import { balanceColor, formatCents } from "../utils/format";

export function Page({ 
    children,
    pageTitle,
    balance = undefined
}: { 
    children: React.ReactNode,
    pageTitle?: string,
    balance?: number | undefined
}) {
    return (
        <div className="min-h-screen">
            {/* Nav */}
            <header className="bg-[var(--white)] [border-bottom:1.5px_solid_var(--border)] shadow-[0_1px_0_var(--cream-dark)] sticky top-0 z-[100]">
                <div className="max-w-[1100px] mx-auto px-4 sm:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                        <h1 className="font-display text-[22px] sm:text-[26px] font-bold text-[var(--teak-dark)] tracking-[-0.02em] leading-none shrink-0">
                            <a href="/">Sid</a>
                        </h1>
                        <WaveIcon />
                        {pageTitle && (
                            <h2 className="font-display text-lg sm:text-xl font-bold text-[var(--teak-dark)] m-0 truncate">
                                {pageTitle}
                            </h2>
                        )}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                        {balance !== undefined && (
                            <span 
                                className="font-display text-base sm:text-xl font-bold" 
                                style={{ color: balanceColor(balance) }}
                            >
                                {formatCents(balance)}
                            </span>
                        )}
                        <Link to="/settings" aria-label="Settings" className="sid-icon-btn">
                            <GearIcon />
                        </Link>
                    </div>
                </div>
                <div className="sid-header-stripe" />
            </header>
            <main className="max-w-[1100px] mx-auto px-4 sm:px-8 py-5 sm:py-[36px]">
                {children}
            </main>
        </div>
    );
}