export default function SkeletonCard() {
    return (
        <div style={{
            background: 'var(--white)',
            borderRadius: 'var(--radius-card)',
            border: '1.5px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
        }}>
            <div className="wood-stripe" style={{ height: '24px', opacity: 0.4 }} />
            <div style={{ padding: '18px 20px' }} className="animate-pulse">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <div style={{ height: '16px', width: '120px', background: 'var(--cream-mid)', borderRadius: '6px' }} />
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <div style={{ height: '24px', width: '24px', background: 'var(--cream-mid)', borderRadius: '6px' }} />
                        <div style={{ height: '24px', width: '24px', background: 'var(--cream-mid)', borderRadius: '6px' }} />
                    </div>
                </div>
                <div style={{ height: '32px', width: '100px', background: 'var(--cream-mid)', borderRadius: '8px', marginBottom: '14px' }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
                    {[1, 2, 3].map((i) => (
                        <div key={i} style={{ height: '12px', width: '100%', background: 'var(--cream)', borderRadius: '4px' }} />
                    ))}
                </div>
            </div>
        </div>
    );
}
