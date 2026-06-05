import { ExternalLink } from "lucide-react"

type PressLink = {
  label: string
  href: string
}

type PressItem = {
  period: string
  title: string
  description: string
  links: PressLink[]
}

type PressCategory = {
  title: string
  items: PressItem[]
}

export const PRESS_CATEGORIES: PressCategory[] = [
  {
    title: "登壇・セミナー",
    items: [
      {
        period: "2024年11月",
        title: "Inter BEE 2024 / Imagica EMS スペシャルデイ（幕張メッセ）",
        description:
          "Blackmagic Design DaVinci Resolve シアターに登壇。「The Creative Color Grading：DRAMA — カラーグレーディングの分解とリライティング」として、ドラマ作品のカラーグレーディングを構成要素に分解し、リライティングの手法を実演解説した。",
        links: [
          {
            label: "https://bmduser.jp/eve_detail.php?id=95",
            href: "https://bmduser.jp/eve_detail.php?id=95",
          },
        ],
      },
      {
        period: "2024年9月",
        title:
          "Color by IMAGICA「HBO CAS Screening / In-Camera VFX / Grading Demo」（竹芝メディアスタジオ）",
        description:
          "ZEISS・日本映画撮影監督協会との共催イベントで、インカメラVFXのプレゼンテーションと、ARRI AMIRA 撮影作品のカラーグレーディングデモンストレーションを担当した。",
        links: [
          {
            label: "https://www.imagica-ems.co.jp/event/cbi_event_hbo-cas_240927/",
            href: "https://www.imagica-ems.co.jp/event/cbi_event_hbo-cas_240927/",
          },
        ],
      },
      {
        period: "2024年11月",
        title: "バーチャルプロダクション撮影体験イベント（FACTORY ANZEN STUDIO）",
        description:
          "Imagica EMS・日本映画撮影監督協会・日本映画テレビ照明協会の共催イベントに VP カラークリエイターとして参加。リアルタイムカラーマネジメントを担当し、メディア合同取材会にも登壇した。",
        links: [
          {
            label: "https://videosalon.jp/report/imagicaems_vp_event/",
            href: "https://videosalon.jp/report/imagicaems_vp_event/",
          },
        ],
      },
      {
        period: "2025年5月",
        title: "DaVinci Resolve カラーグレーディング トレーニング講師（ブラックマジックデザイン）",
        description:
          "DaVinci Resolve 認定トレーナーとして、他ソフトからのコンフォーム・ショットマッチング・クリエイティブグレーディングなど実務テクニックを少人数セミナーで指導した（満席）。",
        links: [
          {
            label: "https://bmduser.jp/eve_detail.php?id=127",
            href: "https://bmduser.jp/eve_detail.php?id=127",
          },
        ],
      },
    ],
  },
  {
    title: "メディア掲載・事例紹介",
    items: [
      {
        period: "2024年",
        title: "Huluドラマ『十角館の殺人』— インカメラVFXによるルック作り",
        description:
          "実写化不可能と言われた綾辻行人原作のドラマ化作品で、DIカラリストとして撮影現場に立ち会い、照明部と連携した現場カラコレ／オンセットグレーディング（黒浮き対策・LED 調整など）を担当した。",
        links: [
          {
            label: "VIDEO SALON 記事",
            href: "https://videosalon.jp/report/jukkakukannosatsujin/",
          },
          {
            label: "Imagica EMS 事例紹介",
            href: "https://www.imagica-ems.co.jp/case-study/jukkakukannosatsujin_20240515/",
          },
        ],
      },
      {
        period: "2024年",
        title: "ゲキ×シネ『吉原御免状』— Dolby Cinema 版カラー",
        description:
          "ゲキ×シネ20周年記念の Dolby Cinema 作品で、監督と通常版のカラーをディスカッションし、高コントラストを活かした劇場版のルックを制作した（プロデューサーの製作記で紹介）。",
        links: [
          {
            label: "https://gxcblog.exblog.jp/36845321/",
            href: "https://gxcblog.exblog.jp/36845321/",
          },
        ],
      },
      {
        period: "2023年",
        title: "ゲキ×シネ『薔薇とサムライ2 -海賊女王の帰還-』— Dolby Vision グレーディング",
        description:
          "劇団☆新感線の舞台映像作品で Dolby Vision のカラーグレーディングを担当。LUT を要素分解し、舞台の没入感を高めるルックを構築した（事例記事を執筆）。",
        links: [
          {
            label: "https://www.imagica-ems.co.jp/case-study/barasamu2_231005/",
            href: "https://www.imagica-ems.co.jp/case-study/barasamu2_231005/",
          },
        ],
      },
      {
        period: "2025年",
        title: "NHK 放送100年特集ドラマ『火星の女王』— VFX制作ドキュメント",
        description:
          "「100年後の火星」を描くドラマの VFX／ポストプロダクション工程に参加し、各部署と連携して世界観を映像化した（公式ブログで制作の舞台裏が紹介）。",
        links: [
          {
            label: "https://www.nhk.jp/g/ts/54KJPL1QGM/blog/bl/p987Er5pz4/bp/pz9aJoZRyz/",
            href: "https://www.nhk.jp/g/ts/54KJPL1QGM/blog/bl/p987Er5pz4/bp/pz9aJoZRyz/",
          },
        ],
      },
    ],
  },
  {
    title: "紹介動画制作",
    items: [
      {
        period: "2023年",
        title: "クラウドワークフロー紹介映像『Next Generation Workflow』— ディレクター",
        description:
          "撮影から仕上げまでを全面クラウド化した新ワークフローの紹介映像で、ディレクターを担当した。",
        links: [
          {
            label: "https://www.imagica-ems.co.jp/case-study/next-generation-workflow-230810/",
            href: "https://www.imagica-ems.co.jp/case-study/next-generation-workflow-230810/",
          },
        ],
      },
    ],
  },
]

export function PressSection() {
  return (
    <section
      id="press"
      className="mx-auto w-full max-w-[1440px] px-6 md:px-10 xl:px-14 scroll-mt-24 md:scroll-mt-28"
    >
      <div className="glass-card p-8 md:p-10 xl:p-12">
        <h2 className="hp-heading text-2xl font-semibold text-hp md:text-3xl">
          登壇・メディア掲載 / 実績
        </h2>

        <div className="mt-8 space-y-9 md:space-y-10">
          {PRESS_CATEGORIES.map((category) => (
            <section key={category.title} aria-labelledby={`press-${category.title}`}>
              <h3
                id={`press-${category.title}`}
                className="hp-compact-text text-base font-semibold text-hp md:text-lg"
              >
                {category.title}
              </h3>
              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
                {category.items.map((item) => (
                  <article
                    key={`${item.period}-${item.title}`}
                    className="flex min-h-full flex-col rounded-[12px] border border-white/55 bg-white/35 p-5 md:p-6"
                  >
                    <p
                      className="font-[var(--font-inter)] text-xs font-semibold"
                      style={{ color: "var(--accent-primary)" }}
                    >
                      {item.period}
                    </p>
                    <h4 className="hp-heading mt-2 text-base font-semibold text-hp">
                      {item.title}
                    </h4>
                    <p className="hp-body mt-3 text-sm text-hp-muted">
                      {item.description}
                    </p>
                    <div className="mt-auto flex flex-wrap gap-2 pt-5">
                      {item.links.map((link) => (
                        <a
                          key={link.href}
                          href={link.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="glass-badge hp-technical-break inline-flex max-w-full items-center gap-2 px-3 py-1.5 text-xs"
                          aria-label={`${item.title} ${link.label}を新しいタブで開く`}
                        >
                          <span className="truncate">{link.label}</span>
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                        </a>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </section>
  )
}
