<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# HP Design Skill — グラスニューモフィズム品質3層定義

フリーランスカラリスト Satoshi Norikane のHP（NCS Grading）の全画面・全コンポーネントに適用するデザインルール。
このスキルは「品質3層」で構成され、Layer 1 を破ると即座にデザイン破綻、Layer 2 を外すと統一感喪失、Layer 3 は判断の指針となる。

## Layer 1: 絶対ルール（破ったら即破綻）

### 1-1. カラーパレット — Glass tokens のみ

| トークン | 値 | 用途 |
|---|---|---|
| --bg-base | #F8F6FF | body の基準背景 |
| --accent-primary | #8B7FFF | 予約可・予約確定・CTA・アクティブ状態 |
| --accent-secondary | #C4B5FD | 補助アクセント |
| --aurora-purple | rgba(139, 127, 255, 0.28) | Aurora 背景 |
| --aurora-pink | rgba(255, 143, 171, 0.20) | Aurora 背景 |
| --aurora-sky | rgba(125, 211, 252, 0.20) | Aurora 背景 |
| --glass-bg | rgba(255, 255, 255, 0.55) | ガラス面 |
| --glass-border | rgba(139, 127, 255, 0.22) | ガラス境界線 |
| --glass-shadow | 0 8px 32px rgba(139, 127, 255, 0.15) | ガラス影 |
| --text-primary | #1C0F6E | メインテキスト |
| --text-muted | #6B5FA8 | ミュートテキスト |

- **新色を追加しない。** 予約不可は `--text-primary` 由来の濃いめグレー半透明、予約可・予約確定は `--accent-primary` で意味分けする。
- body は `--bg-base` + `--aurora-purple` / `--aurora-pink` / `--aurora-sky` の3色 Aurora 固定背景にする。
- Aurora 背景を画面・セクション・カードの全面塗りで隠さない。
- ダークモードは存在しない。ライトのグラスニューモフィズム一本。

### 1-2. 影の文法 — ガラス影 + 境界線 + blur

| 要素 | CSS | 用途 |
|---|---|---|
| ガラス影 | `box-shadow: var(--glass-shadow)` | 浮いているガラス面 |
| 淡い境界線 | `border: 1px solid var(--glass-border)` | Aurora 背景との分離 |
| 背景ブラー | `backdrop-filter: blur(20px)` | ガラス質感 |

- **新しいbox-shadow値を発明しない。** ガラス面は上記3要素で表現する。
- Tailwind デフォルト影（`shadow-lg`, `shadow-xl`）、`drop-shadow`、`filter: shadow` の直書きは禁止。
- 凹み状態は `glass-inset`、フラット状態は `glass-flat` を使う。

### 1-3. 角丸 — 3段階のみ

| トークン | 値 | 用途 |
|---|---|---|
| --hp-radius-sm | 12px | ボタン・入力・小カード |
| --hp-radius | 16px | 標準カード・セクション |
| --hp-radius-lg | 20px | 大きいカード・モーダル |

- 例外: badge の full。それ以外で新しい角丸を作らない。

### 1-4. タイポグラフィ — 固定

- 和文: **Noto Sans JP**（変更不可）
- 欧文: **Inter**（変更不可）
- 本文: 400 weight, 16px 基準
- 見出し: 600〜700 weight
- 字間: 見出しは tracking-tight、ラベルは tracking-widest or tracking-[0.22em]
- **他のフォントを導入しない。**

### 1-5. レイアウト制約

- 最大幅: `max-w-[1440px]` + `mx-auto`
- 外側パディング: `px-4 md:px-8 xl:px-12`
- セクション間余白: `py-12 md:py-16`
- **全ページでこの幅とパディングを統一する。** ページごとに独自の max-width を設定しない。

## Layer 2: 標準パターン（外すと統一感喪失）

### 2-1. コンポーネント構成ルール

**カード（情報ブロック）:**
`glass-card` → 内側 `p-8 md:p-10` → コンテンツ

**小カード・タイル:**
`glass-card-sm` → 内側 `p-4 md:p-5`

**入力フィールド:**
`glass-input` → `px-4 py-3` → placeholder は `text-hp-muted`

**ボタン:**
`glass-btn` → `px-6 py-3` → hover でガラス濃度と影を上げる

**アクティブ状態（ナビ・タブ等）:**
通常: `glass-flat + text-hp-muted`
選択中: `glass-inset + text-hp`

### 2-2. セクション構成パターン

各ページは以下の骨格に従う:

```tsx
<section className="mx-auto w-full max-w-[1440px] px-4 md:px-8 xl:px-12">
  <div className="glass-card p-8 md:p-10 xl:p-14">
    {/* コンテンツ */}
  </div>
</section>
```

- 1セクション = 1つの `glass-card`。
- カード内の小区分には `glass-inset` / `glass-card-sm` / `glass-flat` を使う。
- **カードの中に `glass-card` をネストしない。** ガラス層が重なりすぎる場合は `glass-card-sm` か unframed layout にする。

### 2-3. レスポンシブ戦略

| ブレークポイント | 挙動 |
|---|---|
| ~767px | 1カラム、ハンバーガーメニュー、p-8 |
| 768px~1279px | 2カラムグリッド開始、p-10 |
| 1280px~ | フルレイアウト、p-14 |

- グリッドは `lg:grid-cols-[...]` で比率指定。均等分割ではなくコンテンツに合わせた比率を使う。
- モバイルではカード内パディングを縮小するが、Glass tokens は変えない。

### 2-4. テキスト階層

| 役割 | スタイル |
|---|---|
| ページ見出し | `text-4xl md:text-5xl xl:text-6xl font-bold text-hp` |
| セクション見出し | `text-2xl md:text-3xl font-semibold text-hp` |
| ラベル（上部） | `text-xs uppercase tracking-[0.22em] text-hp-muted` |
| 本文 | `text-base md:text-lg text-hp-muted leading-relaxed` |
| 強調テキスト | `font-semibold text-hp` |

### 2-5. アクセントカラーの使用制限

`--accent-primary` (#8B7FFF) は以下にのみ使う:
- CTA・リンク・ホバー時のテキストカラー変化
- アクティブ状態の薄い背景（不透明度 20% 以下）
- 予約可・予約確定を示す UI
- 今日の下線や小さなステータス表示

**アクセントを予約不可や全面背景に使わない。** 予約不可は `--text-primary` 由来の濃いめグレー半透明で示す。

## Layer 3: 判断基準（新しい画面・要素を作るとき）

### 3-1. 新コンポーネントのチェックリスト

新しいUIを作る前に確認:
1. **既存クラスで表現できないか？** → `glass-card`, `glass-card-sm`, `glass-inset`, `glass-btn`, `glass-input` を優先する
2. **ガラス面は3要素で成立しているか？** → 影・境界線・blur の組み合わせを確認する
3. **色は Glass tokens か？** → 新色を追加する前に Layer 1 を再読する
4. **テキスト階層は2-4のどれに該当するか？** → 該当しないサイズを作らない

### 3-2. トーン判断: nicolegoode.com 基準

迷ったとき、以下の参考サイトの精神に立ち返る:
- **テキストファースト**: 動画ヒーローや派手なアニメーションに頼らない
- **控えめなCTA**: 「お問い合わせはこちら！」のような押しの強さを排除
- **哲学 = 自己紹介に統合**: 別セクションに分けず、文章中に自然に織り込む
- **信頼は言葉で作る**: 経歴・実績は淡々と、しかし確実に置く

### 3-3. 禁止パターン

| やりがちなこと | なぜダメか |
|---|---|
| 新しいグラデーション背景 | Aurora 正典と衝突する |
| `shadow-lg` / `shadow-xl` / `drop-shadow` | Glass tokens の影文法が崩れる |
| `border-2` 以上の太いボーダー | ガラス境界線の軽さが壊れる |
| 角丸なし | 全要素に角丸がある世界観 |
| ガラス層 3 層以上のネスト | 背景がぼけすぎて崩れる |
| 色の不透明度 80% 超 | ガラスでなく全面塗りになる |
| Aurora 背景を上書きする全面塗り | HP全体の質感が消える |
| アクセントを予約不可・全面背景に使う | 意味色の分離が崩れる |
| animate-bounce, animate-pulse | 過剰なアニメーション。transition のみ許可 |
| Inter/Noto以外のフォント追加 | タイポグラフィの一貫性破綻 |

### 3-4. 将来拡張時のルール

- **ポートフォリオ追加時**: サムネイルは `glass-card-sm` 内に配置。ホバーはガラス濃度と境界線で表現する。
- **カレンダー機能**: 日付セルは `glass-card-sm` 相当、選択状態は `glass-inset`。カレンダー全体は1つの `glass-card` でラップする。
- **ツール販売導線**: 商品カードも同じ `glass-card` / `glass-card-sm` + 内部テキスト階層。購入ボタンは `glass-btn`。特別なスタイルを作らない。
- **多言語対応**: フォント変更なし。英語ページでも Noto Sans JP + Inter のまま。

## Deprecated: `.neu-*` 系クラス

- `.neu-*` 系クラスは互換のために残すが、新規実装では使わない。
- 既存箇所も UI 変更時に Glass Design System へ移行する。
- Booking ページや新規導線では `glass-*` / `text-hp*` を正典とする。

### 実装チートシート

```tsx
// セクションの骨格
<section className="mx-auto w-full max-w-[1440px] px-4 md:px-8 xl:px-12">
  <div className="glass-card p-8 md:p-10 xl:p-14">
    <p className="text-xs uppercase tracking-[0.22em] text-hp-muted">Label</p>
    <h2 className="mt-2 text-2xl font-semibold text-hp md:text-3xl">見出し</h2>
    <p className="mt-4 text-base leading-relaxed text-hp-muted md:text-lg">本文</p>
  </div>
</section>

// 情報カード（カード内の小ブロック）
<div className="glass-inset px-5 py-4">
  <p className="text-xs uppercase tracking-[0.22em] text-hp-muted">Label</p>
  <p className="mt-2 text-sm font-semibold text-hp">Value</p>
</div>

// ボタン
<button className="glass-btn px-6 py-3 text-sm font-medium text-hp">
  送信する
</button>

// 入力
<input className="glass-input w-full px-4 py-3" placeholder="お名前" />
```
