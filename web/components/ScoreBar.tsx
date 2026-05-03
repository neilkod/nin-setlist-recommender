const BLOCKS = 10

export default function ScoreBar({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined) {
    return <span className="text-dimmer text-xs">─</span>
  }
  const filled = Math.round(Math.min(1, Math.max(0, value)) * BLOCKS)
  return (
    <span className="text-xs font-mono tracking-tighter">
      <span className="text-green">{'█'.repeat(filled)}</span>
      <span className="text-faint">{'░'.repeat(BLOCKS - filled)}</span>
    </span>
  )
}
