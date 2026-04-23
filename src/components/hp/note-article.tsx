import type { ReactNode } from "react"

export type Section = { heading?: string; body: string[] }

const LINK_CLASS =
  "underline underline-offset-4 decoration-[rgba(139,127,255,0.5)] hover:text-[var(--accent-primary)] hover:decoration-[var(--accent-primary)] transition-colors"

const INLINE_RE =
  /\*\*([^*]+?)\*\*|\[([^\]]+?)\]\(([^)]+?)\)|`([^`]+?)`/g

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  let n = 0
  INLINE_RE.lastIndex = 0
  while ((match = INLINE_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      out.push(text.slice(lastIndex, match.index))
    }
    if (match[1] !== undefined) {
      out.push(
        <strong key={`${keyPrefix}-b${n++}`} className="font-semibold text-hp">
          {match[1]}
        </strong>
      )
    } else if (match[2] !== undefined && match[3] !== undefined) {
      out.push(
        <a
          key={`${keyPrefix}-l${n++}`}
          href={match[3]}
          target="_blank"
          rel="noopener noreferrer"
          className={LINK_CLASS}
        >
          {match[2]}
        </a>
      )
    } else if (match[4] !== undefined) {
      out.push(
        <code
          key={`${keyPrefix}-c${n++}`}
          className="rounded bg-[rgba(139,127,255,0.10)] px-1.5 py-0.5 font-[var(--font-geist-mono)] text-[0.9em] text-hp"
        >
          {match[4]}
        </code>
      )
    }
    lastIndex = match.index + match[0].length
  }
  if (lastIndex < text.length) out.push(text.slice(lastIndex))
  return out
}

export function NoteArticleBody({
  label,
  title,
  subtitle,
  sections,
}: {
  label: string
  title: string
  subtitle: string
  sections: Section[]
}) {
  return (
    <article className="glass-card p-8 md:p-10 xl:p-14">
      <p className="text-xs uppercase tracking-[0.22em] text-hp-muted">
        {label}
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-hp md:text-4xl xl:text-5xl">
        {title}
      </h1>
      <p className="mt-3 text-sm text-hp-muted md:text-base">{subtitle}</p>

      <div className="mt-8 space-y-10 md:space-y-12">
        {sections.map((section, i) => (
          <div key={i}>
            {i > 0 && (
              <hr
                className="mb-10 md:mb-12 border-0"
                style={{ borderTop: "1px solid rgba(139, 127, 255, 0.2)" }}
              />
            )}
            {section.heading && (
              <h2 className="mb-5 text-lg font-semibold text-hp md:text-xl">
                {section.heading}
              </h2>
            )}
            <div className="space-y-5 text-base leading-relaxed text-hp md:text-[1.05rem] md:leading-[1.9]">
              {section.body.map((p, j) => (
                <p key={j}>{renderInline(p, `${i}-${j}`)}</p>
              ))}
            </div>
          </div>
        ))}
      </div>
    </article>
  )
}
