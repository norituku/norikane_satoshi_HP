#!/usr/bin/env python3
"""Gemini API を使って NHK 講義音声を文字起こしする"""

import os
import sys
import time
from google import genai

API_KEY = os.environ["GEMINI_API_KEY"]
client = genai.Client(
    api_key=API_KEY,
    http_options={"timeout": 600_000},  # 10 min timeout for large uploads
)
MODEL = "gemini-2.5-flash"

PROMPT = """この音声はNHKで行われたカラーグレーディング講義（約6時間）の録音です。
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
   - 人名（出てくる可能性あり）: Steve Yedlin, Charles Poynton, Cullen Kelly, Nick Shaw
5. 「えー」「あのー」等のフィラーは除去して構わない
6. 句読点を適切に入れ、読みやすい日本語にすること"""

AUDIO_DIR = "/Users/norikene_satoshi/clawd/projects/norikane_satoshi_HP/NHK講義動画"
FILES = [
    "20260323_grading_seminar_v01_norikane_i.mp3",
    "20260323_grading_seminar_v02_norikane_i.mp3",
]


def upload_and_wait(filepath: str):
    """File API でアップロードし、ACTIVE になるまで待つ"""
    print(f"  Uploading {os.path.basename(filepath)} ...")
    uploaded = client.files.upload(file=filepath)
    print(f"  Upload complete: {uploaded.name}, state={uploaded.state}")

    while uploaded.state.name == "PROCESSING":
        print("  Waiting for processing...")
        time.sleep(10)
        uploaded = client.files.get(name=uploaded.name)

    if uploaded.state.name != "ACTIVE":
        raise RuntimeError(f"File processing failed: {uploaded.state.name}")

    print(f"  File ready: {uploaded.name}")
    return uploaded


def transcribe(uploaded_file, part_label: str) -> str:
    """Gemini にファイルを渡して文字起こし"""
    print(f"  Transcribing {part_label} ...")
    response = client.models.generate_content(
        model=MODEL,
        contents=[PROMPT, uploaded_file],
        config={
            "temperature": 0.1,
            "max_output_tokens": 65536,
        },
    )

    text = response.text
    finish = response.candidates[0].finish_reason if response.candidates else "UNKNOWN"
    print(f"  Done. finish_reason={finish}, length={len(text)} chars")

    if str(finish) not in ("STOP", "FinishReason.STOP"):
        print(f"  WARNING: finish_reason={finish} — output may be truncated!")

    return text


def main():
    for i, fname in enumerate(FILES):
        part = f"Part {i+1}"
        filepath = os.path.join(AUDIO_DIR, fname)
        out_path = os.path.join(
            AUDIO_DIR,
            fname.replace(".mp3", "_transcript.txt"),
        )

        print(f"\n{'='*60}")
        print(f"[{part}] {fname}")
        print(f"{'='*60}")

        uploaded = upload_and_wait(filepath)
        text = transcribe(uploaded, part)

        with open(out_path, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"  Saved: {out_path}")

    print("\nAll done.")


if __name__ == "__main__":
    main()
