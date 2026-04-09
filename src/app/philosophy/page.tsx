import type { Metadata } from "next"
import { ArrowRight } from "lucide-react"
import { SITE_BRAND_NAME } from "@/lib/site-brand"

export const metadata: Metadata = {
  title: `Philosophy | ${SITE_BRAND_NAME}`,
  description: "カラーグレーディングの因数分解、その他。",
  openGraph: {
    title: `Philosophy | ${SITE_BRAND_NAME}`,
    description: "カラーグレーディングの因数分解、その他。",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
}

const articles = [
  {
    id: "grading",
    title: "カラーグレーディングの因数分解",
    description:
      "グレーディングという作業を構成要素に分解し、体系的に解説。「なんとなくLUTを当てる」ではない、論理的なアプローチを示す。",
  },
  {
    id: "correction",
    title: "カラーコレクションの因数分解",
    description:
      "コレクション（技術的な色補正）を要素分解。グレーディングとの違いを明確にし、両方の専門性を伝える。",
  },
  {
    id: "filmlook",
    title: "フィルムルックについてわかっていること",
    description:
      "フィルムルックの再現に関する知見・研究のまとめ。自社ツールの背景にある思想を自然に示す。",
  },
]

const tools = [
  {
    name: "FilmLookOFX",
    description: "DaVinci Resolve用フィルムルック再現プラグイン",
    status: "準備中",
  },
  {
    name: "LOOK Decomposer",
    description: "ルックの構成要素を分析・分解するツール",
    status: "準備中",
  },
]

export default function PhilosophyPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 space-y-12">
      {/* Philosophy header */}
      <section>
        <h1 className="text-3xl font-bold text-neu mb-4">Philosophy</h1>
        <div className="neu-raised p-8 md:p-10">
          <blockquote className="text-xl md:text-2xl font-bold text-neu leading-relaxed italic">
            &ldquo;映像の色は、感情の翻訳である&rdquo;
          </blockquote>
          <p className="mt-4 text-base text-neu-muted leading-relaxed">
            カラーグレーディングは単なる技術ではなく、物語の一部です。
            色を通じて感情を伝え、観客を物語の世界に引き込む。
            それが私のアプローチです。
          </p>
        </div>
      </section>

      {/* Articles */}
      <section className="space-y-6">
        {articles.map((article, i) => (
          <div key={article.id} className="neu-raised p-8 md:p-10">
            <div className="flex items-start gap-4">
              <div className="neu-inset w-10 h-10 shrink-0 flex items-center justify-center">
                <span className="font-[var(--font-inter)] font-bold text-neu">{i + 1}</span>
              </div>
              <div className="flex-1">
                <h2 className="text-lg font-bold text-neu mb-2">
                  {article.title}
                </h2>
                <p className="text-sm text-neu-muted leading-relaxed">
                  {article.description}
                </p>
                <p className="text-xs text-neu-muted mt-3 italic">
                  ※ 記事コンテンツは準備中です
                </p>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* Tools */}
      <section>
        <h2 className="text-2xl font-bold text-neu mb-6">Tools</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {tools.map((tool) => (
            <div key={tool.name} className="neu-raised p-6">
              <h3 className="text-lg font-bold text-neu mb-2">{tool.name}</h3>
              <p className="text-sm text-neu-muted mb-4">{tool.description}</p>
              <div className="flex items-center justify-between">
                <span className="neu-raised-sm px-3 py-1 text-xs text-neu-muted">
                  {tool.status}
                </span>
                <button
                  className="neu-btn px-4 py-2 text-sm font-medium text-neu-muted flex items-center gap-1 cursor-not-allowed opacity-50"
                  disabled
                >
                  詳細
                  <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
