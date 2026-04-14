<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# HP Design Skill — ニューモーフィズム品質3層定義

フリーランスカラリスト Satoshi Norikane のHP（NCS Grading）の全画面・全コンポーネントに適用するデザインルール。
このスキルは「品質3層」で構成され、Layer 1 を破ると即座にデザイン破綻、Layer 2 を外すと統一感喪失、Layer 3 は判断の指針となる。

## Layer 1: 絶対ルール（破ったら即破綻）

### 1-1. カラーパレット — 4色だけ

| トークン | 値 | 用途 |
|---|---|---|
| --neu-bg | #e8f1f2 | 背景・カード・ボタンの地色 |
| --neu-shadow-dark | #c4d2d6 | 影（暗い側） |
| --neu-shadow-light | #f8fdff | 影（明るい側） |
| --neu-accent | #79c7c7 | アクセント（CTA・アクティブ状態・装飾） |

- **それ以外の色を新規追加しない。** テキストは --neu-text: #213136 と --neu-text-muted: #60757a の2段階のみ。
- グラデーションは既存の body 背景パターンのみ。新しいグラデーション背景を作らない。
- ダークモードは存在しない。ライトニューモーフィズム一本。

### 1-2. 影の文法 — 3パターンのみ

| クラス | 状態 | shadow |
|---|---|---|
| .neu-raised | 浮き出し（カード・ナビ） | 8px 8px 16px dark, -8px -8px 16px light |
| .neu-raised-sm | 小さい浮き出し（ボタン・タグ） | 4px 4px 8px dark, -4px -4px 8px light |
| .neu-inset | 凹み（入力・アクティブ状態） | inset 4px 4px 8px dark, inset -4px -4px 8px light |

- **新しいbox-shadow値を発明しない。** 上記3パターン＋ .neu-btn の hover/active 遷移だけで全UIを構成する。
- drop-shadow, filter: shadow, 半透明オーバーレイなどの代替影は使わない。

### 1-3. 角丸 — 3段階のみ

| トークン | 値 | 用途 |
|---|---|---|
| --neu-radius-sm | 12px | ボタン・入力・小カード |
| --neu-radius | 16px | 標準カード・セクション |
| --neu-radius-lg | 20px | 大きいカード・モーダル |

- 例外: ヒーロー画像エリアの 32px と badge の full。それ以外で新しい角丸を作らない。

### 1-4. タイポグラフィ — 固定

- 和文: **Noto Sans JP**（変更不可）
- 欧文: **Inter**（変更不可）
- 本文: 400 weight, 16px 基準
- 見出し: 600〜700 weight
- 字間: 見出しは tracking-tight、ラベルは tracking-widest or tracking-[0.22em]
- **他のフォントを導入しない。**

### 1-5. レイアウト制約

- 最大幅: max-w-[1440px] + mx-auto
- 外側パディング: px-4 md:px-8 xl:px-12
- セクション間余白: py-12 md:py-16
- **全ページでこの幅とパディングを統一する。** ページごとに独自のmax-widthを設定しない。

## Layer 2: 標準パターン（外すと統一感喪失）

### 2-1. コンポーネント構成ルール

**カード（情報ブロック）:**
neu-raised → 内側 p-8 md:p-10 → コンテンツ

**入力フィールド:**
neu-input → px-4 py-3 → placeholder は text-neu-muted

**ボタン:**
neu-btn → px-6 py-3 → hover で影が大きくなる → active で neu-inset に反転

**アクティブ状態（ナビ等）:**
通常: neu-flat + text-neu-muted
選択中: neu-inset + text-neu

### 2-2. セクション構成パターン

各ページは以下の骨格に従う:

```tsx
<section className="mx-auto w-full max-w-[1440px] px-4 md:px-8 xl:px-12">
  <div className="neu-raised p-8 md:p-10 xl:p-14">
    {/* コンテンツ */}
  </div>
</section>
```

- 1セクション = 1つの neu-raised カード。
- カード内の小区分には neu-inset を使う。
- カードの中にカードをネストしない（影が喧嘩する）。

### 2-3. レスポンシブ戦略

| ブレークポイント | 挙動 |
|---|---|
| ~767px | 1カラム、ハンバーガーメニュー、p-8 |
| 768px~1279px | 2カラムグリッド開始、p-10 |
| 1280px~ | フルレイアウト、p-14 |

- グリッドは lg:grid-cols-[...] で比率指定。均等分割ではなくコンテンツに合わせた比率を使う。
- モバイルではカード内パディングを縮小するが、影のサイズは変えない。

### 2-4. テキスト階層

| 役割 | スタイル |
|---|---|
| ページ見出し | text-4xl md:text-5xl xl:text-6xl font-bold text-neu |
| セクション見出し | text-2xl md:text-3xl font-semibold text-neu |
| ラベル（上部） | text-xs uppercase tracking-[0.22em] text-neu-muted |
| 本文 | text-base md:text-lg text-neu-muted leading-relaxed |
| 強調テキスト | font-semibold text-neu |

### 2-5. アクセントカラーの使用制限

--neu-accent (#79c7c7) は以下にのみ使う:
- ステータスドット（h-2 w-2 rounded-full bg-[var(--neu-accent)]）
- ホバー時のテキストカラー変化（控えめに）
- 背景のぼかし装飾（blur-3xl で薄く）
- リンクの下線やアイコン

**ボタンの背景色にアクセントを使わない。** ボタンはニューモーフィズムの影で存在を示す。

## Layer 3: 判断基準（新しい画面・要素を作るとき）

### 3-1. 新コンポーネントのチェックリスト

新しいUIを作る前に確認:
1. **既存クラスで表現できないか？** → neu-raised, neu-inset, neu-btn, neu-input の組み合わせで足りることが多い
2. **影は3パターンのどれか？** → 新しい影を作る衝動を抑える
3. **色は既存トークンか？** → 新色を追加する前にLayer 1を再読する
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
| bg-gradient-to-r from-teal-400 to-cyan-500 | ニューモーフィズムの平面感が壊れる |
| shadow-lg shadow-xl | Tailwindデフォルト影はneu影と喧嘩する |
| border-2 border-teal-500 | 太いボーダーはニューモーフィズムの柔らかさを殺す |
| rounded-none or 角丸なし | 全要素に角丸がある世界観 |
| backdrop-blur-xl の多用 | 1箇所（badgeのみ）に留める |
| ダークセクション挿入 | ライトニューモーフィズム一貫 |
| animate-bounce, animate-pulse | 過剰なアニメーション。transition のみ許可 |
| Inter/Noto以外のフォント追加 | タイポグラフィの一貫性破綻 |

### 3-4. 将来拡張時のルール

- **ポートフォリオ追加時**: サムネイルは neu-raised カード内に配置。ホバーで neu-inset に遷移。新しいカードスタイルを作らない。
- **カレンダー機能**: 日付セルは neu-raised-sm、選択状態は neu-inset。カレンダー全体は1つの neu-raised でラップ。
- **ツール販売導線**: 商品カードも同じ neu-raised + 内部テキスト階層。購入ボタンは neu-btn。特別なスタイルを作らない。
- **多言語対応**: フォント変更なし。英語ページでも Noto Sans JP + Inter のまま。

### 実装チートシート

```tsx
// セクションの骨格
<section className="mx-auto w-full max-w-[1440px] px-4 md:px-8 xl:px-12">
  <div className="neu-raised p-8 md:p-10 xl:p-14">
    <p className="text-xs uppercase tracking-[0.22em] text-neu-muted">Label</p>
    <h2 className="mt-2 text-2xl font-semibold text-neu md:text-3xl">見出し</h2>
    <p className="mt-4 text-base leading-relaxed text-neu-muted md:text-lg">本文</p>
  </div>
</section>

// 情報カード（カード内の小ブロック）
<div className="neu-inset px-5 py-4">
  <p className="text-xs uppercase tracking-[0.22em] text-neu-muted">Label</p>
  <p className="mt-2 text-sm font-semibold text-neu">Value</p>
</div>

// ボタン
<button className="neu-btn px-6 py-3 text-sm font-medium text-neu">
  送信する
</button>

// 入力
<input className="neu-input w-full px-4 py-3" placeholder="お名前" />
```
