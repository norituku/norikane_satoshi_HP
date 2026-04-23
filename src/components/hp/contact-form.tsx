"use client"

import { useState } from "react"
import { Send, CheckCircle } from "lucide-react"

export function ContactForm() {
  const [formState, setFormState] = useState<"idle" | "submitting" | "success" | "error">("idle")
  const [errorMsg, setErrorMsg] = useState("")

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setFormState("submitting")
    setErrorMsg("")

    const form = e.currentTarget
    const formData = new FormData(form)

    if (formData.get("website")) {
      setFormState("success")
      return
    }

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          body: formData.get("body"),
          website: formData.get("website"),
        }),
      })

      if (res.ok) {
        setFormState("success")
        form.reset()
      } else {
        const data = await res.json().catch(() => ({}))
        setErrorMsg(data.error || "送信に失敗しました。しばらく経ってからお試しください。")
        setFormState("error")
      }
    } catch {
      setErrorMsg("通信エラーが発生しました。")
      setFormState("error")
    }
  }

  if (formState === "success") {
    return (
      <div className="glass-card p-8 md:p-12 text-center">
        <div className="glass-inset w-16 h-16 mx-auto mb-4 flex items-center justify-center rounded-full">
          <CheckCircle className="h-7 w-7" style={{ color: "var(--accent-primary)" }} />
        </div>
        <h3 className="text-lg font-bold text-hp mb-2">送信完了</h3>
        <p className="text-sm text-hp-muted">
          お問い合わせを受け付けました。確認後ご連絡いたします。
        </p>
      </div>
    )
  }

  return (
    <div className="glass-card p-8 md:p-12">
      <h2 className="text-xl font-bold text-hp mb-6">お問い合わせ</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Honeypot */}
        <div className="absolute -left-[9999px]" aria-hidden="true">
          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-hp mb-2">
            お名前 <span className="text-red-400">*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            className="glass-input w-full px-4 py-3 text-sm"
            placeholder="山田 太郎"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-hp mb-2">
            メールアドレス <span className="text-red-400">*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="glass-input w-full px-4 py-3 text-sm"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label htmlFor="body" className="block text-sm font-medium text-hp mb-2">
            お問い合わせ内容 <span className="text-red-400">*</span>
          </label>
          <textarea
            id="body"
            name="body"
            required
            rows={5}
            minLength={10}
            className="glass-input w-full px-4 py-3 text-sm resize-none"
            placeholder="お問い合わせ内容をご記入ください"
          />
        </div>

        {errorMsg && (
          <p className="text-sm text-red-500">{errorMsg}</p>
        )}

        <button
          type="submit"
          disabled={formState === "submitting"}
          className="glass-btn w-full px-6 py-3 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
          {formState === "submitting" ? "送信中..." : "送信する"}
        </button>
      </form>
    </div>
  )
}
