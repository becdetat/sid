import { Link } from "react-router-dom";

export default function PageLink({ to, children }: { to: string; children: React.ReactNode }) {
    return (
        <p className={"pb-4"}>
            <Link to={to} className="text-[var(--teak-dark)]">
                {children}
            </Link>
        </p>
    );
}
