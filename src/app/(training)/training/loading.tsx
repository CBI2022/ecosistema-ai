export default function TrainingLoading() {
  return (
    <>
      {/* Top progress bar */}
      <div className="fixed left-0 top-0 z-[200] h-0.5 w-full overflow-hidden bg-transparent">
        <div className="h-full animate-[cbi-progress_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-[#C9A84C] to-transparent" />
      </div>

      {/* Loader CENTRAL */}
      <div className="pointer-events-none fixed inset-0 z-[150] flex items-center justify-center opacity-0 [animation:cbi-fade-in_0.25s_ease-out_0.25s_forwards]">
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-[#0A0A0A]/80 px-7 py-6 backdrop-blur-md">
          <div className="relative h-10 w-10">
            <span className="absolute inset-0 rounded-full border-2 border-[#C9A84C]/15" />
            <span className="absolute inset-0 animate-[cbi-spin_0.9s_linear_infinite] rounded-full border-2 border-transparent border-t-[#C9A84C] border-r-[#C9A84C]" />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#C9A84C]">
            Cargando formación
          </span>
        </div>
      </div>

      <style>{`
        @keyframes cbi-progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes cbi-spin { to { transform: rotate(360deg); } }
        @keyframes cbi-fade-in {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  )
}
