export default function MainLoading() {
  return (
    <>
      {/* Top progress bar — se muestra durante navegación entre páginas */}
      <div className="fixed left-0 top-0 z-[200] h-0.5 w-full overflow-hidden bg-transparent">
        <div className="h-full animate-[cbi-progress_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent" />
      </div>

      {/* Contenido skeleton mínimo */}
      <div className="min-h-[60vh] animate-pulse space-y-5">
        <div className="h-8 w-48 rounded-lg bg-white/5" />
        <div className="grid gap-3 sm:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl border border-white/8 bg-[#131313]" />
          ))}
        </div>
        <div className="h-64 rounded-2xl border border-white/8 bg-[#131313]" />
      </div>

      <style>{`
        @keyframes cbi-progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </>
  )
}
