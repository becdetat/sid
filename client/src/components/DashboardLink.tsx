import { Link } from "react-router-dom";

export default function DashboardLink() {
    return (
        <p className={"pb-4"}>
            <Link to="/dashboard" className="text-[var(--teak-dark)]">
                &larr; Back to dashboard
            </Link>
        </p>
    );
}
