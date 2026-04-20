export default function Footer() {
    return (
        <footer className="mt-auto py-4 text-center text-[12px] font-body text-[var(--text-muted)]">
            <div className="flex items-center justify-center gap-4">
                <a
                    href="https://sid.becdetat.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[var(--text-secondary)] transition-colors"
                >
                    sid.becdetat.com
                </a>
                <span className="text-[var(--cream-dark)]">·</span>
                <a
                    href="https://github.com/becdetat/sid"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-[var(--text-secondary)] transition-colors"
                >
                    GitHub
                </a>
                <span className="text-[var(--cream-dark)]">·</span>
                <span>{__APP_VERSION__}</span>
            </div>
        </footer>
    );
}
