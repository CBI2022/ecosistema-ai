export default function ContractsPage() {
  return (
    <div className="h-[calc(100vh-140px)]">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-[#F5F0E8]">Contracts</h1>
        <p className="mt-1 text-sm text-[#9A9080]">Powered by CBIDocs</p>
      </div>
      <iframe
        src="https://cbidocs.com"
        className="h-full w-full rounded-2xl border border-white/8 bg-[#131313]"
        allow="fullscreen"
        title="CBIDocs Contracts"
      />
    </div>
  )
}
