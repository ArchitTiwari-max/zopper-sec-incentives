import zSymbol from '@/assets/zopper-z.svg'

export function ZopperLogo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 align-middle ${className}`} aria-label="Zopper">
      <img src={zSymbol} alt="" className="h-4 w-auto inline-block" />
      <span className="text-[#0B2C5F] font-semibold tracking-wide leading-none">zopper</span>
    </span>
  )
}
