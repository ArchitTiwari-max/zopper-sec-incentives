import { ZopperLogo } from '@/components/ZopperLogo'

export function Footer() {
  return (
    <div className="fixed bottom-3 right-3 text-xs text-gray-500 flex items-center gap-1 opacity-80 hover:opacity-100 select-none">
      <span>Powered by</span>
      <ZopperLogo />
    </div>
  )
}
