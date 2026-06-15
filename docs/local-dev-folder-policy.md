# ローカル開発フォルダのルール

このホームページの正式な本体は、次の 1 つだけです。

```text
/Users/norikene_satoshi/projects/norikane_satoshi_HP
```

AI や一時作業で別の作業場所が必要なときは、本体の中にある `.codex-worktrees/` の下に作ります。

```text
/Users/norikene_satoshi/projects/norikane_satoshi_HP/.codex-worktrees/<branch-name>
```

`/Users/norikene_satoshi/projects` の直下に、次のような兄弟フォルダを増やさないでください。

```text
norikane_satoshi_HP-something
norikane_satoshi_HP_phase1
norikane_satoshi_HP_tmp
```

## 作業が終わったら消すもの

作業用 worktree は、作業が終わって commit と push が済んだら消します。

```sh
git -C /Users/norikene_satoshi/projects/norikane_satoshi_HP worktree remove .codex-worktrees/<branch-name>
```

消してよいか迷うときは、先に次を確認します。

```sh
git -C .codex-worktrees/<branch-name> status --short
```

何か表示されたら、まだ消しません。

## 残し続けないもの

次のものは再生成できるため、作業後に大きく残し続けないようにします。

- `node_modules/`
- `.next/`
- `dist/`
- `build/`
- cache フォルダ
- テストや Playwright の出力

## git に入れない大きい素材

画像、動画、音声などの大きい素材は、必要な公開素材だけを `public/` に置きます。検証用の大きな元素材や編集素材は git に入れません。

## 使う script

容量を見るだけなら、削除しない audit script を使います。

```sh
npm run dev:audit
```

消せる生成物を確認するだけなら dry-run を使います。

```sh
npm run dev:clean:dry
```

新しい作業用 worktree は、projects 直下ではなく `.codex-worktrees/` に作ります。

```sh
npm run dev:worktree -- <branch-name> [base-ref]
```
