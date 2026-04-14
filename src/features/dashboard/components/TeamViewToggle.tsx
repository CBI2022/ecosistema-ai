import Link from 'next/link'

interface TeamViewToggleProps {
  teamView: boolean
}

export function TeamViewToggle({ teamView }: TeamViewToggleProps) {
  const common =
    'flex-1 rounded-xl px-4 py-2.5 text-xs font-bold uppercase tracking-[0.06em] transition'

  return (
    <div className="mb-5 flex gap-2 rounded-2xl border border-white/8 bg-[#131313] p-1.5">
      <Link
        href="/dashboard"
        className={`${common} text-center ${!teamView ? 'bg-[#C9A84C] text-black' : 'text-[#9A9080] hover:text-[#F5F0E8]'}`}
      >
        👤 Mis datos
      </Link>
      <Link
        href="/dashboard?view=team"
        className={`${common} text-center ${teamView ? 'bg-[#C9A84C] text-black' : 'text-[#9A9080] hover:text-[#F5F0E8]'}`}
      >
        👥 Vista equipo
      </Link>
    </div>
  )
}
