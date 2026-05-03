import Link from 'next/link'

interface NavProps {
  active?: 'discover' | 'browse'
}

export default function Nav({ active }: NavProps) {
  return (
    <header className="border-b border-border">
      <div className="max-w-4xl mx-auto px-4 h-12 flex items-center justify-between">
        <Link
          href="/"
          className="text-xs font-bold tracking-widest hover:text-green transition-colors"
        >
          NIN SETLIST RECOMMENDER
        </Link>
        <nav className="flex gap-6 text-xs">
          <Link
            href="/"
            className={`transition-colors hover:text-foreground ${active === 'discover' ? 'text-foreground' : 'text-dim'}`}
          >
            DISCOVER
          </Link>
          <Link
            href="/browse"
            className={`transition-colors hover:text-foreground ${active === 'browse' ? 'text-foreground' : 'text-dim'}`}
          >
            BROWSE
          </Link>
        </nav>
      </div>
    </header>
  )
}
