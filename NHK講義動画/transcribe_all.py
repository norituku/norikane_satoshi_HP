#!/usr/bin/env python3
"""全チャンクを一括で文字起こしする。品質検証付き。"""

import os
import sys
import time
import re
from pathlib import Path
from google import genai

API_KEY = open(os.path.expanduser("~/.config/gemini/.api_key")).read().strip()
client = genai.Client(
    api_key=API_KEY,
    http_options={"timeout": 600_000},
)
MODEL = "gemini-2.5-flash"

PROMPT = """この音声はNHKで行われたカラーグレーディング講義の録音の一部です。
講師は映像カラリストの則兼智志（のりかね さとし）です。
受講者はNHKのドラマ・一般番組担当のカメラマン・技術者です。

以下のルールで日本語の全文文字起こしを行ってください：

1. 発言を省略せず、全文を書き起こすこと
2. トピックが変わったら「---」で区切り、見出しをつけること
3. 質疑応答パートでは [講師] [質問者] のラベルをつけること
4. 以下の専門用語は正確に表記すること：
   - ソフトウェア: DaVinci Resolve, Baselight, Premiere Pro, After Effects, Nuke
   - 色空間・規格: ACES, ACEScg, ACEScct, Log-C, S-Log3, V-Log, REDWideGamutRGB, Rec.709, Rec.2020, DCI-P3, BT.2100, HDR10, Dolby Vision, HLG
   - 技術用語: LUT (Look-Up Table), CDL (Color Decision List), DCTL, OFX, ガモットマッピング, トーンマッピング, トーンカーブ, カラーホイール, リフト・ガンマ・ゲイン, オフセット, ログ, リニア, シーンリファード, ディスプレイリファード
   - カラーグレーディング用語: カラーコレクション, カラーグレーディング, プライマリ, セカンダリ, パワーウィンドウ, クオリファイア, ノード, レイヤー, シリアルノード, パラレルノード
   - フィルムルック関連: フィルムエミュレーション, フィルムグレイン, ハレーション, ショルダー, トゥ, Cineon, フィルムプリント, ネガティブフィルム, プリントフィルム, クロスプロセス, ブリーチバイパス, FilmLookEmulator
   - 色科学: 色域 (gamut), 色温度, ホワイトバランス, CIE, CIELab, xy色度図, 色域リング (Gamut Rings), スペクトラル, メタメリズム
   - 人名: Steve Yedlin, Charles Poynton, Cullen Kelly, Nick Shaw
5. 「えー」「あのー」等のフィラーは除去して構わない
6. 句読点を適切に入れ、読みやすい日本語にすること
7. 適切な位置で改行を入れ、段落を分けること"""

CHUNKS_DIR = Path("/Users/norikene_satoshi/clawd/projects/norikane_satoshi_HP/NHK講義動画/chunks")

# v01 chunk00 は品質OK済み、スキップ
SKIP = {"20260323_grading_seminar_v01_norikane_i_chunk00"}


def get_chunks_to_process():
    """処理すべきチャンクを取得"""
    chunks = []
    for f in sorted(CHUNKS_DIR.glob("*.mp3")):
        stem = f.stem
        if stem in SKIP:
            continue
        out = f.with_name(stem + "_transcript.txt")
        # 既存のtranscriptが小さすぎる or 存在しない場合は再処理
        if out.exists() and out.stat().st_size > 50_000:
            print(f"  SKIP (already good): {f.name}")
            continue
        chunks.append(f)
    return chunks


def upload_and_wait(filepath: Path):
    """File API でアップロードし、ACTIVE になるまで待つ"""
    print(f"  Uploading {filepath.name} ...")
    uploaded = client.files.upload(file=str(filepath))
    print(f"  Upload done: {uploaded.name}, state={uploaded.state}")
    while uploaded.state.name == "PROCESSING":
        time.sleep(5)
        uploaded = client.files.get(name=uploaded.name)
    if uploaded.state.name != "ACTIVE":
        raise RuntimeError(f"File processing failed: {uploaded.state.name}")
    return uploaded


def validate_transcript(text: str) -> tuple[bool, str]:
    """文字起こし品質を検証。(ok, reason)"""
    if len(text) < 500:
        return False, f"too short ({len(text)} chars)"
    # 繰り返しループ検出
    lines = text.strip().split("\n")
    if len(lines) > 20:
        last_20 = lines[-20:]
        if len(set(last_20)) <= 3:
            return False, f"repetition loop detected (last 20 lines have only {len(set(last_20))} unique)"
    # 同一フレーズが全体の30%以上を占める場合
    from collections import Counter
    counter = Counter(lines)
    if counter and counter.most_common(1)[0][1] > len(lines) * 0.3 and len(lines) > 50:
        phrase, count = counter.most_common(1)[0]
        return False, f"dominant phrase '{phrase[:30]}...' appears {count}/{len(lines)} times"
    return True, "ok"


def transcribe_chunk(uploaded_file, label: str, retry=0) -> str:
    """Gemini にファイルを渡して文字起こし"""
    print(f"  Transcribing {label} (attempt {retry+1}) ...")
    response = client.models.generate_content(
        model=MODEL,
        contents=[PROMPT, uploaded_file],
        config={
            "temperature": 0.0,
            "max_output_tokens": 65536,
        },
    )
    text = response.text
    finish = response.candidates[0].finish_reason if response.candidates else "UNKNOWN"
    print(f"  Done. finish_reason={finish}, {len(text)} chars, {len(text.split(chr(10)))} lines")
    if str(finish) not in ("STOP", "FinishReason.STOP"):
        print(f"  WARNING: finish_reason={finish}")
    return text


def main():
    chunks = get_chunks_to_process()
    print(f"\n=== {len(chunks)} chunks to process ===\n")
    if not chunks:
        print("Nothing to do.")
        return

    results = {}
    for i, chunk_path in enumerate(chunks):
        label = f"[{i+1}/{len(chunks)}] {chunk_path.name}"
        print(f"\n{'='*60}")
        print(label)
        print(f"{'='*60}")

        uploaded = upload_and_wait(chunk_path)

        max_retries = 2
        for attempt in range(max_retries):
            text = transcribe_chunk(uploaded, label, attempt)
            ok, reason = validate_transcript(text)
            if ok:
                break
            print(f"  VALIDATION FAILED: {reason}")
            if attempt < max_retries - 1:
                print("  Retrying with different temperature...")
                time.sleep(5)
        else:
            print(f"  WARNING: Saving despite validation failure: {reason}")

        out_path = chunk_path.with_name(chunk_path.stem + "_transcript.txt")
        with open(out_path, "w", encoding="utf-8") as f:
            f.write(text)
        size_kb = out_path.stat().st_size / 1024
        print(f"  Saved: {out_path.name} ({size_kb:.0f} KB)")
        results[chunk_path.name] = (ok, reason, size_kb)

        # Rate limit courtesy
        if i < len(chunks) - 1:
            time.sleep(3)

    print(f"\n{'='*60}")
    print("SUMMARY")
    print(f"{'='*60}")
    for name, (ok, reason, size_kb) in results.items():
        status = "OK" if ok else "WARN"
        print(f"  [{status}] {name}: {size_kb:.0f} KB - {reason}")
    print("\nAll done.")


if __name__ == "__main__":
    main()
