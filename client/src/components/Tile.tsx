import { Link } from "react-router-dom";

export interface TileProps {
    accountName: string;
    accountId: number;
    children: React.ReactNode;
}

export function Tile({ accountName, accountId, children }: TileProps ) {
    return (
        <div className="bg-[var(--white)] rounded-[var(--radius-card)] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)] [border:1.5px_solid_var(--border)] overflow-hidden transition-[box-shadow,transform] duration-200 hover:-translate-y-0.5 flex flex-col">
            <div className="wood-stripe h-6 shrink-0" />
            <div className="px-5 py-[18px] flex-1 flex flex-col">
                <div className="mb-2.5">
                    <Link
                        to={`/accounts/${accountId}`}
                        className="font-body font-bold text-[15px] text-[var(--text-primary)] no-underline leading-[1.3]"
                    >
                        {accountName}
                    </Link>
                </div>
                    {children}
            </div>
        </div>
    );
}
