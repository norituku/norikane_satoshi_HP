export type ConflictCandidate = unknown

export type PreflightVerdict =
  | { kind: "ok" }
  | { kind: "block"; code: "slot_taken" }

export function evaluateConflicts(conflicts: ConflictCandidate[]): PreflightVerdict {
  if (conflicts.length > 0) {
    return { kind: "block", code: "slot_taken" }
  }
  return { kind: "ok" }
}

export function resolveConflictForFinalSubmit(
  conflicts: ConflictCandidate[],
): "slot_taken" | null {
  if (conflicts.length > 0) return "slot_taken"
  return null
}
