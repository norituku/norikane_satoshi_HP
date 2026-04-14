"""NHK lecture transcription via Gemini File API — 20-min chunks, no thinking."""

import subprocess
import sys
import time
from pathlib import Path
from google import genai
from google.genai import types

API_KEY = sys.argv[1]
client = genai.Client(api_key=API_KEY)

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
   - 人名（出てくる可能性あり）: Steve Yedlin, Charles Poynton, Cullen Kelly, Nick Shaw
5. 「えー」「あのー」等のフィラーは除去して構わない
6. 句読点を適切に入れ、読みやすい日本語にすること
7. 同じフレーズを繰り返さないこと。一度書いた文は二度書かない"""

BASE_DIR = Path(__file__).parent
CHUNK_DIR = BASE_DIR / "chunks"
CHUNK_DIR.mkdir(exist_ok=True)

FILES = [
    BASE_DIR / "20260323_grading_seminar_v01_norikane_i.mp3",
    BASE_DIR / "20260323_grading_seminar_v02_norikane_i.mp3",
]

CHUNK_DURATION = 1200  # 20 minutes


def get_duration(path: Path) -> float:
    result = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True,
    )
    return float(result.stdout.strip())


def split_audio(path: Path) -> list[Path]:
    """Split audio into 20-min chunks. Returns list of chunk paths."""
    duration = get_duration(path)
    n_chunks = int(duration // CHUNK_DURATION) + (1 if duration % CHUNK_DURATION > 0 else 0)

    if n_chunks == 1:
        return [path]

    chunks = []
    for i in range(n_chunks):
        start = i * CHUNK_DURATION
        chunk_path = CHUNK_DIR / f"{path.stem}_chunk{i:02d}.mp3"
        if chunk_path.exists():
            print(f"  [SKIP] {chunk_path.name} already exists")
            chunks.append(chunk_path)
            continue
        print(f"  [SPLIT] chunk {i+1}/{n_chunks} (start={start}s)...")
        subprocess.run(
            ["ffmpeg", "-y", "-i", str(path), "-ss", str(start),
             "-t", str(CHUNK_DURATION), "-c", "copy", str(chunk_path)],
            capture_output=True,
        )
        chunks.append(chunk_path)
    return chunks


def has_repetition(text: str, threshold: int = 5) -> bool:
    """Detect if text has degenerate repetition loops."""
    lines = [l.strip() for l in text.split('\n') if l.strip()]
    if len(lines) < threshold:
        return False
    for i in range(len(lines) - threshold):
        if all(lines[i] == lines[i + j] for j in range(1, threshold)):
            return True
    return False


def transcribe_with_retry(audio_path: Path, max_retries: int = 3) -> str | None:
    """Upload and transcribe, retrying on rate limits."""
    print(f"  [UPLOAD] {audio_path.name} ({audio_path.stat().st_size / 1e6:.0f} MB)...")
    myfile = client.files.upload(file=str(audio_path))
    print(f"  [UPLOADED] name={myfile.name}, state={myfile.state}")

    # Wait for processing
    while myfile.state.name == "PROCESSING":
        print(f"    waiting... state={myfile.state.name}")
        time.sleep(10)
        myfile = client.files.get(name=myfile.name)

    if myfile.state.name == "FAILED":
        print(f"  [ERROR] Upload failed: {myfile.state}")
        return None

    for attempt in range(max_retries):
        try:
            print(f"  [TRANSCRIBE] attempt {attempt+1}...")
            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[PROMPT, myfile],
                config=types.GenerateContentConfig(
                    temperature=0,
                    max_output_tokens=65536,
                    thinking_config=types.ThinkingConfig(
                        thinking_budget=0,
                    ),
                ),
            )
            text = response.text
            finish = response.candidates[0].finish_reason.name
            print(f"  [RESULT] {len(text)} chars, finish={finish}")

            if has_repetition(text):
                print(f"  [WARN] Repetition detected, trimming...")
                # Trim to before repetition starts
                lines = text.split('\n')
                clean_lines = []
                seen_count = 0
                prev_line = None
                for line in lines:
                    stripped = line.strip()
                    if stripped and stripped == prev_line:
                        seen_count += 1
                        if seen_count >= 3:
                            break
                    else:
                        seen_count = 0
                        # Remove the duplicates we already added
                    prev_line = stripped
                    if seen_count < 3:
                        clean_lines.append(line)
                text = '\n'.join(clean_lines)
                print(f"  [TRIMMED] {len(text)} chars")

            if finish != "STOP":
                print(f"  [WARN] finish_reason={finish}")

            print(f"  [OK] {len(text)} chars")
            return text

        except Exception as e:
            if "429" in str(e) or "RESOURCE_EXHAUSTED" in str(e):
                wait = 65 * (attempt + 1)
                print(f"  [RATE_LIMIT] waiting {wait}s before retry...")
                time.sleep(wait)
            else:
                print(f"  [ERROR] {e}")
                if attempt < max_retries - 1:
                    time.sleep(10)
                else:
                    return None

    print("  [FAIL] Max retries exceeded")
    return None


for audio_path in FILES:
    stem = audio_path.stem
    final_out = BASE_DIR / f"{stem}_transcript.txt"

    if final_out.exists():
        print(f"[SKIP] {final_out.name} already exists")
        continue

    print(f"\n{'='*60}")
    print(f"[START] {audio_path.name}")
    print(f"{'='*60}")

    chunks = split_audio(audio_path)
    all_text = []

    for i, chunk in enumerate(chunks):
        chunk_out = CHUNK_DIR / f"{chunk.stem}_transcript.txt"
        if chunk_out.exists():
            print(f"[SKIP] {chunk_out.name} already exists, loading...")
            all_text.append(chunk_out.read_text(encoding="utf-8"))
            continue

        print(f"\n[CHUNK {i+1}/{len(chunks)}] {chunk.name}")

        # Rate limit guard: wait between chunks
        if i > 0:
            print("  [COOLDOWN] waiting 30s for rate limit reset...")
            time.sleep(30)

        text = transcribe_with_retry(chunk)
        if text:
            chunk_out.write_text(text, encoding="utf-8")
            all_text.append(text)
        else:
            all_text.append(f"\n\n[ERROR: chunk {i+1} transcription failed]\n\n")

    combined = "\n\n---\n\n".join(all_text)
    final_out.write_text(combined, encoding="utf-8")
    print(f"\n[DONE] {final_out.name} ({len(combined)} chars)")

print("\n=== All done ===")
