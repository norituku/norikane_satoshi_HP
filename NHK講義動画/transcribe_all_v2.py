#!/usr/bin/env python3
"""全チャンクを一括で文字起こし v2 — thinking_budget=0, rate limit対応"""

import os
import sys
import time
from pathlib import Path
from google import genai
from google.genai import types

API_KEY = open(os.path.expanduser("~/.config/gemini/.api_key")).read().strip()
client = genai.Client(
    api_key=API_KEY,
    http_options={"timeout": 600_000},
)
MODEL = "gemini-2.5-flash"

PROMPT = """この音声を一字一句漏らさず全文書き起こしてください。
要約・省略禁止。話者の言葉を全てそのまま書き起こすこと。
フィラー（えー、あのー）のみ除去可。
言い直しや途中で変えた言葉もそのまま残すこと。
適切な位置で改行し、トピックが変わったら「---」と見出しで区切ること。
質疑応答では [講師] [質問者] のラベルを付けること。

講師：映像カラリストの則兼智志（のりかね さとし）
受講者：NHKのカメラマン・技術者
内容：カラーグレーディング講義

専門用語：DaVinci Resolve, Baselight, ACES, ACEScg, ACEScct, Log-C, S-Log3, V-Log, Rec.709, Rec.2020, HDR10, HLG, LUT, CDL, DCTL, OFX, リフト・ガンマ・ゲイン, カラーコレクション, カラーグレーディング, プライマリ, セカンダリ, パワーウィンドウ, クオリファイア, ノード, シリアルノード, パラレルノード, フィルムエミュレーション, フィルムグレイン, ハレーション, ショルダー, トゥ, Cineon, FilmLookEmulator, 色域, 色温度, ホワイトバランス"""

CHUNKS_DIR = Path("/Users/norikene_satoshi/clawd/projects/norikane_satoshi_HP/NHK講義動画/chunks")

# chunk00 も再処理 (旧transcriptは繰り返しループ含み)
SKIP = set()

# 正常な出力サイズの下限 (bytes) — 24分音声で ~10KB が正常
MIN_SIZE = 5_000


def get_chunks_to_process():
    chunks = []
    for f in sorted(CHUNKS_DIR.glob("*.mp3")):
        stem = f.stem
        if stem in SKIP:
            continue
        out = f.with_name(stem + "_transcript.txt")
        if out.exists() and out.stat().st_size >= MIN_SIZE:
            print(f"  SKIP (exists {out.stat().st_size/1024:.0f}KB): {f.name}", flush=True)
            continue
        chunks.append(f)
    return chunks


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
        contents=[PROMPT, uploaded_file],
        config=types.GenerateContentConfig(
            temperature=0,
            max_output_tokens=65536,
            thinking_config=types.ThinkingConfig(thinking_budget=0),
        ),
    )
    text = response.text
    finish = response.candidates[0].finish_reason.name
    u = response.usage_metadata
    out_tokens = getattr(u, 'candidates_token_count', None)
    print(f"  Done: {len(text)} chars, {out_tokens} tokens, finish={finish}", flush=True)
    return text


def main():
    chunks = get_chunks_to_process()
    print(f"\n=== {len(chunks)} chunks to process ===\n", flush=True)
    if not chunks:
        print("Nothing to do.", flush=True)
        return

    results = {}
    for i, chunk_path in enumerate(chunks):
        label = f"[{i+1}/{len(chunks)}] {chunk_path.name}"
        print(f"\n{'='*60}", flush=True)
        print(label, flush=True)
        print(f"{'='*60}", flush=True)

        text = None
        for attempt in range(5):
            try:
                uploaded = upload_and_wait(chunk_path)
                text = transcribe_chunk(uploaded, label)
                break
            except Exception as e:
                if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                    wait = 180 * (attempt + 1)  # 180, 360, 540, 720, 900
                    print(f"  RATE LIMITED (attempt {attempt+1}/5), waiting {wait}s...", flush=True)
                    time.sleep(wait)
                else:
                    print(f"  ERROR: {e}", flush=True)
                    time.sleep(30)

        if text is None:
            text = f"[ERROR: transcription failed after 5 attempts for {chunk_path.name}]"
            print(f"  FAILED: all retries exhausted", flush=True)

        out_path = chunk_path.with_name(chunk_path.stem + "_transcript.txt")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(text)
        size_kb = out_path.stat().st_size / 1024
        print(f"  Saved: {out_path.name} ({size_kb:.1f} KB)", flush=True)
        results[chunk_path.name] = size_kb

        # Rate limit: 120s cooldown between chunks to avoid free tier limits
        if i < len(chunks) - 1:
            print("  Cooling down 120s...", flush=True)
            time.sleep(120)

    print(f"\n{'='*60}", flush=True)
    print("SUMMARY", flush=True)
    print(f"{'='*60}", flush=True)
    for name, size_kb in results.items():
        print(f"  {name}: {size_kb:.1f} KB", flush=True)
    print("\nAll done.", flush=True)


if __name__ == "__main__":
    main()
