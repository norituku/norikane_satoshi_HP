#!/usr/bin/env python3
"""Re-transcribe specific garbled chunks with enhanced prompt context."""

import os
import time
from pathlib import Path
from google import genai
from google.genai import types

API_KEY = open(os.path.expanduser("~/.config/gemini/.api_key")).read().strip()
client = genai.Client(
    api_key=API_KEY,
    http_options={"timeout": 600_000},
)
MODEL = "gemini-3-flash-preview"

ENHANCED_PROMPT = """この音声を一字一句漏らさず全文書き起こしてください。
要約・省略禁止。話者の言葉を全てそのまま書き起こすこと。
フィラー（えー、あのー）のみ除去可。
言い直しや途中で変えた言葉もそのまま残すこと。
適切な位置で改行し、トピックが変わったら「---」と見出しで区切ること。
質疑応答では [講師] [受講者] のラベルを付けること。

講師：映像カラリストの則兼智志（のりかね さとし）
受講者：NHKのカメラマン・技術者
内容：カラーグレーディング講義

## 重要な指示
- テンプレート文や説明文を本文に混入させないこと（「映像カラリストの則兼智志氏による…」のような文を出力しない）
- 「ご指定いただいた通り…」のようなメタ文を出力しない
- 音声に含まれる言葉のみを書き起こすこと

## 前回の文字起こしで誤認識が疑われる箇所
以下の箇所は特に注意深く聞き取ってください：
- 「パシないですか」→ おそらく「映らないですか」「映してないですか」等
- 「高瀬揃いました」→ おそらく「皆さん揃いました」等
- 「現そうなんです」→ おそらく「現職なんです」
- 「全ターが上がってます」→ おそらく「全体が上がってます」
- 「ちょっとMですよね」→ 正確に聞き取ること
- 「ロードメインフリップ」→ DaVinci Resolveの操作用語として正確に聞き取ること
- 「オペの解析」→ DaVinci ResolveまたはNHK技研の技術用語として正確に聞き取ること
- 「ノードモアレ」→ おそらく「輝度モアレ」か別の用語
- 「数ヶ月で出てきた」→ AI処理時間の文脈で確認（「数分」の可能性）
- 「ラジオ番組としてくれたり」→ AI活用の文脈で正確に聞き取ること

## 専門用語リスト
DaVinci Resolve, Baselight, Flame, Fusion, After Effects, Neat Video
ACES, ACEScg, ACEScct, Log-C, Log-C3, S-Log3, V-Log, D-Log, D-Gamut
Rec.709, Rec.2020, BT.2020, P3, P3D65, HDR10, HLG, PQ, Dolby Cinema
LUT, CDL, DCTL, OFX, AP0
リフト・ガンマ・ゲイン, オフセット
カラーコレクション, カラーグレーディング, プライマリ, セカンダリ
パワーウィンドウ, クオリファイア, ノード, シリアルノード, パラレルノード
レイヤーミキサー, キーミキサー, エクスターナルマット
フィルムエミュレーション, フィルムグレイン, ハレーション, ショルダー, トゥ
Cineon, FilmLookEmulator, Tetra, OpenColor
色域, 色温度, ホワイトバランス, ガマット, ガマットマッピング
デンシティ（Density/濃度）, サチュレーション, ルミナンス
カラーワーパー, カラースライス, カラーブースト
リモートグレード, ローカルグレード, リップル
ノードキャッシュ, レンダーキャッシュ, レンダリングして置き換え
マジックマスク, ポストフィルター, デフリッカー, デノイズ, デグレイン
イン点, アウト点, タイムコード, レックラン, フリーラン
NHK技研, ブラックマジック（Blackmagic Design）, IMAGICA/イマジカ
"""

CHUNKS_DIR = Path("/Users/norikene_satoshi/clawd/projects/norikane_satoshi_HP/NHK講義動画/chunks")

# Only re-transcribe the chunks with garbled content
TARGET_CHUNKS = [
    "20260323_grading_seminar_v01_norikane_i_chunk00.mp3",
    "20260323_grading_seminar_v01_norikane_i_chunk02.mp3",
    "20260323_grading_seminar_v02_norikane_i_chunk03.mp3",
    "20260323_grading_seminar_v02_norikane_i_chunk04.mp3",
]


def upload_and_wait(filepath: Path):
    print(f"  Uploading {filepath.name} ...", flush=True)
    uploaded = client.files.upload(file=str(filepath))
    while uploaded.state.name == "PROCESSING":
        time.sleep(5)
        uploaded = client.files.get(name=uploaded.name)
    if uploaded.state.name != "ACTIVE":
        raise RuntimeError(f"File processing failed: {uploaded.state.name}")
    return uploaded


def transcribe_chunk(uploaded_file, label: str) -> str:
    print(f"  Transcribing {label} ...", flush=True)
    response = client.models.generate_content(
        model=MODEL,
        contents=[ENHANCED_PROMPT, uploaded_file],
        config=types.GenerateContentConfig(
            temperature=0,
            max_output_tokens=65536,
        ),
    )
    text = response.text
    finish = response.candidates[0].finish_reason.name
    u = response.usage_metadata
    out_tokens = getattr(u, 'candidates_token_count', None)
    print(f"  Done: {len(text)} chars, {out_tokens} tokens, finish={finish}", flush=True)
    return text


def main():
    print(f"\n=== Re-transcribing {len(TARGET_CHUNKS)} garbled chunks with {MODEL} ===\n", flush=True)

    for i, chunk_name in enumerate(TARGET_CHUNKS):
        chunk_path = CHUNKS_DIR / chunk_name
        if not chunk_path.exists():
            print(f"  SKIP (not found): {chunk_name}", flush=True)
            continue

        label = f"[{i+1}/{len(TARGET_CHUNKS)}] {chunk_name}"
        print(f"\n{'='*60}", flush=True)
        print(label, flush=True)
        print(f"{'='*60}", flush=True)

        text = None
        for attempt in range(3):
            try:
                uploaded = upload_and_wait(chunk_path)
                text = transcribe_chunk(uploaded, label)
                break
            except Exception as e:
                if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                    wait = 60 * (attempt + 1)
                    print(f"  RATE LIMITED (attempt {attempt+1}/3), waiting {wait}s...", flush=True)
                    time.sleep(wait)
                elif "504" in str(e) or "DEADLINE" in str(e):
                    wait = 30
                    print(f"  TIMEOUT (attempt {attempt+1}/3), retrying in {wait}s...", flush=True)
                    time.sleep(wait)
                else:
                    print(f"  ERROR: {e}", flush=True)
                    time.sleep(30)

        if text is None:
            print(f"  FAILED: all retries exhausted for {chunk_name}", flush=True)
            continue

        # Save with _retranscript suffix
        out_path = chunk_path.with_name(chunk_path.stem + "_retranscript.txt")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(text)
        size_kb = out_path.stat().st_size / 1024
        print(f"  Saved: {out_path.name} ({size_kb:.1f} KB)", flush=True)

        # Cooldown between chunks
        if i < len(TARGET_CHUNKS) - 1:
            print("  Cooling down 15s...", flush=True)
            time.sleep(15)

    print(f"\n{'='*60}", flush=True)
    print("Re-transcription complete.", flush=True)


if __name__ == "__main__":
    main()
