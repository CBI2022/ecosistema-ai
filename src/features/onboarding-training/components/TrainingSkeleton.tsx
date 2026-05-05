'use client'

/**
 * Skeleton de carga del módulo Training (DC + Agent).
 * Reemplaza el "Loading..." plano por un esqueleto que comunica progreso real.
 */
export function TrainingSkeleton({ accent = '#D4A853' }: { accent?: string }) {
  return (
    <div
      style={{
        background: '#09080A',
        minHeight: '100vh',
        color: '#DDD5C8',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
      }}
    >
      {/* Loader CENTRAL flotante */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            padding: '24px 28px',
            borderRadius: 16,
            background: 'rgba(10,9,13,0.85)',
            backdropFilter: 'blur(8px)',
            animation: 'cbi-fade-in 0.25s ease-out',
          }}
        >
          <div style={{ position: 'relative', width: 40, height: 40 }}>
            <span
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: `2px solid ${accent}25`,
              }}
            />
            <span
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                border: '2px solid transparent',
                borderTopColor: accent,
                borderRightColor: accent,
                animation: 'cbi-spin 0.9s linear infinite',
              }}
            />
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: accent,
            }}
          >
            Cargando formación
          </span>
        </div>
      </div>

      {/* Header skeleton */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1A1820', display: 'flex', gap: 10, alignItems: 'center' }}>
        <div style={{ height: 28, width: 100, borderRadius: 8, background: '#15131A' }} />
        <div style={{ height: 28, flex: 1, maxWidth: 160, borderRadius: 8, background: '#15131A' }} />
        <div style={{ height: 28, width: 60, borderRadius: 8, background: '#15131A', marginLeft: 'auto' }} />
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: '#15131A' }} />

      {/* Tabs */}
      <div style={{ padding: 12, display: 'flex', gap: 8, overflowX: 'hidden', borderBottom: '1px solid #1A1820' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} style={{ height: 24, width: 50, borderRadius: 6, background: '#15131A' }} />
        ))}
      </div>

      {/* Content cards */}
      <div style={{ padding: '22px 16px', flex: 1, display: 'flex', flexDirection: 'column', gap: 14, opacity: 0.5 }}>
        <div style={{ height: 110, borderRadius: 16, background: '#0E0D11', border: '1px solid #1A1820' }} />
        <div style={{ height: 60, borderRadius: 12, background: '#0E0D11', border: '1px solid #1A1820' }} />
        <div style={{ height: 60, borderRadius: 12, background: '#0E0D11', border: '1px solid #1A1820' }} />
        <div style={{ height: 60, borderRadius: 12, background: '#0E0D11', border: '1px solid #1A1820' }} />
      </div>

      <style>{`
        @keyframes cbi-spin { to { transform: rotate(360deg); } }
        @keyframes cbi-fade-in {
          from { opacity: 0; transform: scale(0.94); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
