#!/usr/bin/env python3
"""Verify specific suspicious passages by re-transcribing with Gemini."""

import os
import json
import time
from pathlib import Path
from google import genai
from google.genai import types

API_KEY = open(os.path.expanduser("~/.config/gemini/.api_key")).read().strip()
client = genai.Client(api_key=API_KEY, http_options={"timeout": 600_000})
MODEL = "gemini-2.5-flash"

CHUNKS_DIR = Path("/Users/norikene_satoshi/projects/norikane_satoshi_HP/NHK講義動画/chunks")

# Each entry: (chunk_file, context_before, suspicious_text, context_after, question)
PASSAGES = [
    {
        "id": "v01c01_cst_file",
        "chunk": "20260323_grading_seminar_v01_norikane_i_chunk01.mp3",
        "context": "ここで2.4とかラベル書いてるんですけど、これも【???】って言って、ここでいじる空間を決めてるっていう感じですね",
        "current": "カラースペース変換ファイル",
        "question": "「これも」の後に続く言葉を正確に聞き取ってください。「カラースペース変換ファイル」と聞こえますか？それとも別の言葉ですか？"
    },
    {
        "id": "v01c01_dekoto",
        "chunk": "20260323_grading_seminar_v01_norikane_i_chunk01.mp3",
        "context": "デフリッカー。フリッカー除去。で、【???】とかで、ちょっと重くなるんで",
        "current": "デコト",
        "question": "「フリッカー除去。で、」の後に続く言葉を正確に聞き取ってください。「デコト」ですか？「それと」ですか？別の言葉ですか？"
    },
    {
        "id": "v02c02_nodo_futosa",
        "chunk": "20260323_grading_seminar_v02_norikane_i_chunk02.mp3",
        "context": "そんな感じで頭の中で、特に【???1】と色の転がり広がり、【???2】広がり、っていうところが分かれてると非常にアプローチしやすい",
        "current": "???1=ノード、???2=太さ",
        "question": "この文の中で「特に」の直後の言葉は「ノード」ですか「濃度」ですか？また「色の転がり広がり」の後の「太さ広がり」の「太さ」は正しいですか？「強さ」や「濃さ」ではありませんか？4要素分解（色の広がり・転がり、濃度、カーブ、RGBカラーバランス）の文脈です。"
    },
    {
        "id": "v02c03_ope",
        "chunk": "20260323_grading_seminar_v02_norikane_i_chunk03.mp3",
        "context": "DaVinci Resolveに入れて、【???】とかその辺まで使ったり",
        "current": "オペの解析",
        "question": "「DaVinci Resolveに入れて」の後の言葉を正確に聞き取ってください。「オペの解析」ですか？別の言葉ですか？NHK技研の技術や3Dカラーモデルの文脈です。"
    },
    {
        "id": "v02c04_radio",
        "chunk": "20260323_grading_seminar_v02_norikane_i_chunk04.mp3",
        "context": "これが数分で出てきたんですけど。そういうのが時短になりますし、【???】します",
        "current": "ラジオ番組としてくれたり",
        "question": "「時短になりますし」の後の言葉を正確に聞き取ってください。「ラジオ番組としてくれたり」ですか？AI活用の文脈で、別の言葉の可能性はありますか？"
    },
    {
        "id": "v01c05_tano",
        "chunk": "20260323_grading_seminar_v01_norikane_i_chunk05.mp3",
        "context": "分かりづらいですね。【???】が来たらダメ。言っとかないと。日本語モードに結構情熱を。",
        "current": "他野さん",
        "question": "「分かりづらいですね」の後の人名を正確に聞き取ってください。「他野さん」ですか？「田野さん」ですか？「多野さん」ですか？DaVinci Resolveの日本語ローカライズ担当者の文脈です。"
    },
    {
        "id": "v02c05_hashinaka",
        "chunk": "20260323_grading_seminar_v02_norikane_i_chunk05.mp3",
        "context": "3色分解。これは本当に便利。タイミング的には、【???】のタイミングとかと",
        "current": "橋中さん",
        "question": "人名を正確に聞き取ってください。「橋中さん」ですか？「橋本さん」ですか？「端中さん」ですか？映像技術者の文脈です。"
    },
    {
        "id": "v02c06_hashimoto",
        "chunk": "20260323_grading_seminar_v02_norikane_i_chunk06.mp3",
        "context": "ブラックマジックでもたまに講師してます。【???】。FlameエディターでFusionでもやってる",
        "current": "橋本さん",
        "question": "人名を正確に聞き取ってください。「橋本さん」ですか？別の名前ですか？Blackmagic DesignとFlameに関連する人物です。"
    },
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


def verify_passage(uploaded_file, passage: dict) -> str:
    prompt = f"""この音声の中から、以下の文脈に該当する箇所を探して、正確に聞き取ってください。

## 前後の文脈
{passage['context']}

## 現在の文字起こし（疑わしい箇所）
「{passage['current']}」

## 質問
{passage['question']}

## 回答形式
1. 該当箇所の正確な文字起こし（前後含む1-2文）
2. 疑わしい箇所の正確な単語
3. 確信度（高/中/低）
4. 補足（聞き取りの根拠）

講師は映像カラリストの則兼智志。NHKでのカラーグレーディング講義です。
専門用語: DaVinci Resolve, DCTL, LUT, 濃度(デンシティ), ACEScct, カラースペーストランスフォーム"""

    response = client.models.generate_content(
        model=MODEL,
        contents=[prompt, uploaded_file],
        config=types.GenerateContentConfig(temperature=0, max_output_tokens=2048),
    )
    return response.text


def main():
    results = []
    # Group passages by chunk to avoid re-uploading
    from collections import defaultdict
    by_chunk = defaultdict(list)
    for p in PASSAGES:
        by_chunk[p["chunk"]].append(p)

    for chunk_name, passages in by_chunk.items():
        chunk_path = CHUNKS_DIR / chunk_name
        if not chunk_path.exists():
            print(f"SKIP (not found): {chunk_name}")
            continue

        print(f"\n{'='*60}")
        print(f"Chunk: {chunk_name} ({len(passages)} passages)")
        print(f"{'='*60}")

        uploaded = None
        for attempt in range(3):
            try:
                uploaded = upload_and_wait(chunk_path)
                break
            except Exception as e:
                wait = 30 * (attempt + 1)
                print(f"  Upload error (attempt {attempt+1}): {e}, waiting {wait}s")
                time.sleep(wait)

        if uploaded is None:
            print(f"  FAILED to upload {chunk_name}")
            continue

        for p in passages:
            print(f"\n  --- Verifying: {p['id']} ---")
            print(f"  Current: {p['current']}")
            try:
                result = verify_passage(uploaded, p)
                print(f"  Result:\n{result}")
                results.append({"id": p["id"], "current": p["current"], "result": result})
            except Exception as e:
                print(f"  ERROR: {e}")
                results.append({"id": p["id"], "current": p["current"], "result": f"ERROR: {e}"})
            time.sleep(5)  # cooldown between requests

        time.sleep(10)  # cooldown between chunks

    # Save results
    out_path = Path("/Users/norikene_satoshi/projects/norikane_satoshi_HP/NHK講義動画/verification_results.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"\nResults saved to {out_path}")


if __name__ == "__main__":
    main()
