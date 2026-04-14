#!/usr/bin/env python3
"""
Systematic transcript correction for NHK color grading lecture.
Applies domain-specific term corrections and removes AI artifacts.
"""

import re
import shutil
from pathlib import Path

BASE = Path("/Users/norikene_satoshi/clawd/projects/norikane_satoshi_HP/NHK講義動画")

# ===== CORRECTION RULES =====

# 1. ACES nomenclature standardization
ACES_FIXES = [
    ("ACSCCT", "ACEScct"),
    ("ACSCG", "ACEScg"),
    ("ACSCCTの", "ACEScctの"),
    ("ACSCGっていう", "ACEScgっていう"),
]

# 2. Technical term corrections (high confidence)
TERM_FIXES = [
    # LUT misrecognitions
    ("1Dラット", "1D LUT"),
    ("ラットで言うと", "LUTで言うと"),
    ("ラット化", "LUT化"),
    ("ラットもバッチリ", "LUTもバッチリ"),
    # DaVinci Resolve operation terms
    ("ロードメインフリップ", "ノード右クリックからリニアに"),  # garbled menu operation
    # Film/show title consistency
    ("火星の図", "火星の女王"),
    # デンシティ (already mostly fixed, catch any remaining)
    ("デンスティ", "デンシティ"),
]

# 3. Domain-specific homophone corrections (high confidence)
HOMOPHONE_FIXES = [
    # 暗部 (already mostly fixed, catch remaining)
    ("アンブが", "暗部が"),
    ("アンブの", "暗部の"),
    ("アンブは", "暗部は"),
    # イン点・アウト点 (already mostly fixed)
    ("インテンアウトテン", "イン点アウト点"),
    ("インテン、アウトテン", "イン点、アウト点"),
    # レックラン
    ("レックラム", "レックラン"),
]

# 4. AI artifact removal patterns
AI_ARTIFACTS = [
    # Gemini self-referential text
    r"映像カラリストの則兼智志氏による[^。]*書き起こし[^。]*。\s*",
    r"ご指定いただいた[^。]*書き起こし[^。]*。\s*",
    r"ご指定いただいた通り[^。]*。\s*",
    r"この音声はNHKで行われた[^。]*。\n?",
    r"講師は映像カラリストの[^。]*。\n?",
    r"受講者はNHKの[^。]*。\n?",
]

# 5. Formatting cleanup
FORMAT_FIXES = [
    # Double spaces to single
    ("  ", " "),
    # Orphan section separators
    ("\n\n\n\n", "\n\n"),
    ("\n\n\n", "\n\n"),
]


def apply_corrections(text: str) -> tuple[str, list[str]]:
    """Apply all corrections and return (corrected_text, change_log)."""
    changes = []

    # Step 1: Remove AI artifacts (regex)
    for pattern in AI_ARTIFACTS:
        matches = re.findall(pattern, text)
        if matches:
            for m in matches:
                changes.append(f"[AI除去] '{m.strip()[:60]}...'")
            text = re.sub(pattern, "", text)

    # Step 2: Apply term corrections
    for wrong, correct in ACES_FIXES + TERM_FIXES + HOMOPHONE_FIXES:
        count = text.count(wrong)
        if count > 0:
            changes.append(f"[用語修正] '{wrong}' → '{correct}' ({count}箇所)")
            text = text.replace(wrong, correct)

    # Step 3: Format cleanup
    for wrong, correct in FORMAT_FIXES:
        while wrong in text:
            text = text.replace(wrong, correct)

    return text, changes


def process_file(filepath: Path) -> list[str]:
    """Process a single transcript file."""
    original = filepath.read_text(encoding="utf-8")
    corrected, changes = apply_corrections(original)

    if changes:
        # Backup
        bak = filepath.with_suffix(filepath.suffix + ".bak2")
        if not bak.exists():
            shutil.copy2(filepath, bak)

        filepath.write_text(corrected, encoding="utf-8")
        size_diff = len(original) - len(corrected)
        changes.append(f"[保存] {filepath.name} (差分: {size_diff:+d} bytes)")

    return changes


def main():
    files = [
        BASE / "v01_full_transcript.txt",
        BASE / "v02_full_transcript.txt",
    ]

    total_changes = 0
    for f in files:
        if not f.exists():
            print(f"SKIP: {f.name} not found")
            continue

        print(f"\n{'='*60}")
        print(f"Processing: {f.name}")
        print(f"{'='*60}")

        changes = process_file(f)
        if changes:
            for c in changes:
                print(f"  {c}")
            total_changes += len(changes) - 1  # -1 for the save line
        else:
            print("  No changes needed.")

    print(f"\n{'='*60}")
    print(f"Total corrections: {total_changes}")
    print(f"{'='*60}")


if __name__ == "__main__":
    main()
