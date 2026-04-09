import type { Metadata } from "next"
import { SITE_BRAND_NAME } from "@/lib/site-brand"

export const metadata: Metadata = {
  title: `About | ${SITE_BRAND_NAME}`,
  description: "バイオグラフィーと作品リスト。",
  openGraph: {
    title: `About | ${SITE_BRAND_NAME}`,
    description: "バイオグラフィーと作品リスト。",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
}

const timeline = [
  { year: "2020", event: "株式会社イマジカ入社", detail: "カラリストとしてキャリアをスタート" },
  { year: "2026", event: "フリーランスとして独立", detail: "映画・CM・MVのカラーグレーディングを中心に活動" },
]

const tools = [
  "DaVinci Resolve",
  "Baselight",
  "Premiere Pro",
  "After Effects",
]

const works = [
  { title: "（公開準備中）", category: "映画", year: "—", role: "カラリスト" },
]

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 space-y-12">
      {/* Bio */}
      <section>
        <h1 className="text-3xl font-bold text-neu mb-8">About</h1>

        <div className="neu-raised p-8 md:p-12 space-y-8">
          <div>
            <h2 className="text-xl font-bold text-neu mb-4">Biography</h2>
            <div className="space-y-4">
              {timeline.map((item) => (
                <div key={item.year} className="flex gap-4 items-start">
                  <div className="shrink-0 w-16 text-right">
                    <span className="font-[var(--font-inter)] font-bold text-lg text-neu">{item.year}</span>
                  </div>
                  <div className="neu-raised-sm flex-1 p-4">
                    <p className="font-bold text-neu">{item.event}</p>
                    <p className="text-sm text-neu-muted mt-1">{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-bold text-neu mb-3">使用ツール</h3>
            <div className="flex flex-wrap gap-2">
              {tools.map((tool) => (
                <span
                  key={tool}
                  className="neu-raised-sm px-4 py-2 text-sm font-medium text-neu"
                >
                  {tool}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-base text-neu-muted leading-relaxed">
              リモートグレーディングにも対応しています。
              DaVinci Resolve と Baselight を中心に、プロジェクトの要件に合わせた柔軟なワークフローで対応します。
            </p>
          </div>
        </div>
      </section>

      {/* Works */}
      <section>
        <div className="neu-raised p-8 md:p-12">
          <h2 className="text-xl font-bold text-neu mb-6">Works</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-neu-muted">
                  <th className="pb-3 font-medium">作品名</th>
                  <th className="pb-3 font-medium">種別</th>
                  <th className="pb-3 font-medium">年</th>
                  <th className="pb-3 font-medium">役割</th>
                </tr>
              </thead>
              <tbody>
                {works.map((work, i) => (
                  <tr key={i} className="border-t border-[var(--neu-shadow-dark)]/20">
                    <td className="py-3 text-neu font-medium">{work.title}</td>
                    <td className="py-3 text-neu-muted">{work.category}</td>
                    <td className="py-3 text-neu-muted font-[var(--font-inter)]">{work.year}</td>
                    <td className="py-3 text-neu-muted">{work.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-neu-muted mt-4">
            ※ 許諾確認が取れた作品から順次公開予定です。
          </p>
        </div>
      </section>
    </div>
  )
}
