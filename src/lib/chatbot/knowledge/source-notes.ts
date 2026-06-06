import { publishedNotesSnapshot } from "@/lib/chatbot/knowledge/published-notes-snapshot"

export type ChatbotApprovedSourceNote = {
  id: string
  sourceUrl: string
  title: string
  body: string
}

export const approvedSourceNotes = publishedNotesSnapshot.map((note) => ({
  id: note.id,
  sourceUrl: note.sourceUrl,
  title: note.title,
  body: note.body,
})) satisfies readonly ChatbotApprovedSourceNote[]

export const approvedSourceNotesKnowledge = approvedSourceNotes
  .map((note) => `- ${note.title} (${note.sourceUrl}, ${note.id})\n本文:\n${note.body}`)
  .join("\n\n")
