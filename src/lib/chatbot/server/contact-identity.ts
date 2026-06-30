import type { ConversationState } from "@/lib/chatbot/domain"

export function mergeContactIdentityFromUserText(
  state: ConversationState,
  text: string,
): ConversationState {
  const identity = extractContactIdentityFromUserText(text)
  if (!identity.customerName && !identity.companyName && !identity.contactEmail) return state
  const customerName = state.customerName ?? identity.customerName
  const companyName = state.companyName ?? identity.companyName
  const contactEmail = state.hasContactEmail && state.contactEmail ? state.contactEmail : identity.contactEmail
  const hasCustomerIdentity = state.hasCustomerIdentity === true || Boolean(identity.customerName || identity.companyName)

  return {
    ...state,
    ...(customerName ? { customerName } : {}),
    ...(companyName ? { companyName } : {}),
    ...(hasCustomerIdentity ? { hasCustomerIdentity: true } : {}),
    ...(contactEmail ? { contactEmail, hasContactEmail: true } : {}),
  }
}

export function extractContactIdentityFromUserText(text: string): Pick<
  ConversationState,
  "customerName" | "companyName" | "contactEmail"
> {
  const normalized = text.normalize("NFKC")
  const email = findValidContactEmail(normalized)
  const labeledCompany = findLabeledValue(normalized, ["会社名", "法人名", "社名", "所属"])
  const labeledName = findLabeledValue(normalized, ["担当者名", "ご担当者名", "担当者", "ご担当", "氏名", "お名前", "名前"])
  const relation = findCompanyNameRelation(normalized)
  const companyName = normalizeCompanyName(labeledCompany) ?? relation?.companyName
  const customerName = normalizeCustomerName(labeledName) ?? relation?.customerName

  return {
    ...(customerName ? { customerName } : {}),
    ...(companyName ? { companyName } : {}),
    ...(email ? { contactEmail: email } : {}),
  }
}

function findLabeledValue(text: string, labels: string[]): string | undefined {
  for (const label of labels) {
    const escapedLabel = escapeRegExp(label)
    const match = new RegExp(
      `${escapedLabel}\\s*(?:は|です|:|：)?\\s*([^\\n。.!！?？、,，]{1,100})`,
      "u",
    ).exec(text)
    if (match?.[1]) return match[1]
  }
  return undefined
}

function findCompanyNameRelation(text: string): { companyName?: string; customerName?: string } | undefined {
  const prefixLegal =
    /((?:株式会社|有限会社|合同会社|一般社団法人|NPO法人)[\p{L}\p{N}ー・&＆.\s]{1,40}?)の([\p{L}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー・\s]{2,30})(?:です|でございます|と申します|といいます)?/u.exec(text)
  if (prefixLegal) {
    return {
      companyName: normalizeCompanyName(prefixLegal[1]),
      customerName: normalizeCustomerName(prefixLegal[2]),
    }
  }

  const suffixLegal =
    /([\p{L}\p{N}ー・&＆.\s]{1,40}?(?:株式会社|有限会社|合同会社|Inc\.?|LLC|Studio|スタジオ))の([\p{L}\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー・\s]{2,30})(?:です|でございます|と申します|といいます)?/iu.exec(text)
  if (!suffixLegal) return undefined
  return {
    companyName: normalizeCompanyName(suffixLegal[1]),
    customerName: normalizeCustomerName(suffixLegal[2]),
  }
}

function findValidContactEmail(text: string): string | undefined {
  const email = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/iu.exec(text)?.[0]
  if (!email || !isValidContactEmail(email)) return undefined
  return email
}

function normalizeCompanyName(value: string | undefined): string | undefined {
  const normalized = normalizeContactText(value, 120)
  if (!normalized) return undefined
  if (containsUnsafeContactToken(normalized)) return undefined
  return normalized
}

function normalizeCustomerName(value: string | undefined): string | undefined {
  const normalized = normalizeContactText(value, 80)
    ?.replace(/^(?:担当(?:者)?|ご担当|氏名|名前|お名前)\s*(?:は|:|：)?\s*/u, "")
    .replace(/(?:です|でございます|と申します|といいます|になります)$/u, "")
    .trim()
  if (!normalized) return undefined
  if (containsUnsafeContactToken(normalized)) return undefined
  if (/(会社|法人|社名|メール|mail|email|電話|案件|相談|予約|納品|カラー|DaVinci|Resolve)/iu.test(normalized)) {
    return undefined
  }
  if (/(株式会社|有限会社|合同会社|一般社団法人|NPO法人|Inc\.?|LLC|Studio|スタジオ)/iu.test(normalized)) {
    return undefined
  }
  if (normalized.length < 2 || normalized.length > 40) return undefined
  return normalized
}

function normalizeContactText(value: string | undefined, maxLength: number): string | undefined {
  const normalized = value
    ?.normalize("NFKC")
    .replace(/\s+/gu, " ")
    .trim()
    .replace(/[。.!！?？]+$/u, "")
    .replace(/(?:です|でございます|になります)$/u, "")
    .trim()
  return normalized ? normalized.slice(0, maxLength) : undefined
}

function containsUnsafeContactToken(value: string): boolean {
  return /@|https?:\/\/|\d{2,4}[-ー]\d{2,4}[-ー]\d{3,4}/iu.test(value)
}

function isValidContactEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
