import { describe, expect, it, vi } from "vitest"

import {
  createStaticChatbotKnowledgeSnapshot,
  syncChatbotNotionKnowledge,
  type ChatbotKnowledgeRepository,
} from "@/lib/chatbot/server/notion-knowledge-sync"

type Block = {
  id: string
  type: string
  [key: string]: unknown
}

function richText(content: string, href?: string) {
  return [
    {
      type: "text",
      plain_text: content,
      href,
      text: { content, link: href ? { url: href } : null },
    },
  ]
}

function heading(id: string, text: string): Block {
  return {
    id,
    type: "heading_2",
    heading_2: { rich_text: richText(text) },
  }
}

function paragraph(id: string, text: string, href?: string): Block {
  return {
    id,
    type: "paragraph",
    paragraph: { rich_text: richText(text, href) },
  }
}

function tableRow(id: string, cells: string[]): Block {
  return {
    id,
    type: "table_row",
    table_row: { cells: cells.map((cell) => richText(cell)) },
  }
}

function child(block: Block, parentId: string): Block {
  return {
    ...block,
    parent: { type: "block_id", block_id: parentId },
  }
}

function repository(): ChatbotKnowledgeRepository & {
  saved: unknown[]
  errors: unknown[]
} {
  return {
    saved: [],
    errors: [],
    async loadLatest() {
      return createStaticChatbotKnowledgeSnapshot("2026-06-19T00:00:00.000Z")
    },
    async saveSuccess(snapshot) {
      this.saved.push(snapshot)
    },
    async saveError(error) {
      this.errors.push(error)
    },
  }
}

describe("Notion chatbot knowledge sync", () => {
  it("syncs workflow durations from the approved Notion section on a page-update trigger", async () => {
    const repo = repository()
    const manifestPageId = "eb950c43e1a042199c1bbce74ae616a1"
    const sourcePageId = "3088971f957b481baff8499ff911051b"
    const client = {
      blocks: {
        children: {
          list: vi.fn(async ({ block_id }: { block_id: string }) => {
            if (block_id === manifestPageId) {
              return {
                results: [
                  heading("manifest-heading", "ナレッジ正本リスト"),
                  paragraph(
                    "manifest-row",
                    "ページ=AIチャットボット 相談窓口の設計 / 用途=workflow-duration / 参照範囲=工程別日数テーブル（実測値ベース） / 優先度=1 / 反映タイミング=page-update",
                    `https://www.notion.so/${sourcePageId}`,
                  ),
                ],
                has_more: false,
              }
            }
            if (block_id === sourcePageId) {
              return {
                results: [
                  heading("duration-heading", "工程別日数テーブル（実測値ベース）"),
                  tableRow("header", ["案件種別", "所定日数"]),
                  tableRow("live", ["ライブ 60分", "8〜9日"]),
                ],
                has_more: false,
              }
            }
            return { results: [], has_more: false }
          }),
        },
      },
    }

    const result = await syncChatbotNotionKnowledge({
      client,
      repository: repo,
      manifestPageId,
      changedPageId: sourcePageId,
      now: new Date("2026-06-19T01:00:00.000Z"),
    })

    expect(result.ok).toBe(true)
    expect(result.snapshot.workflowDurations.presets.find((preset) => preset.id === "live-60m")).toMatchObject({
      minDays: 8,
      maxDays: 9,
      source: "notion-sync",
    })
    expect(repo.saved).toHaveLength(1)
    expect(repo.errors).toHaveLength(0)
  })

  it("syncs workflow durations from the current nested manifest list shape", async () => {
    const repo = repository()
    const manifestPageId = "3088971f957b481baff8499ff911051b"
    const sourcePageId = "830dd59bc735483fae4feea1d6f4fbc7"
    const manifestRowId = "manifest-row"
    const durationTableId = "duration-table"
    const client = {
      blocks: {
        children: {
          list: vi.fn(async ({ block_id }: { block_id: string }) => {
            if (block_id === manifestPageId) {
              return {
                results: [
                  heading("manifest-heading", "ナレッジ正本リスト"),
                  {
                    ...paragraph(
                      manifestRowId,
                      "工程日数・所定日数：AIチャットボット 相談窓口の設計",
                      `https://www.notion.so/${sourcePageId}`,
                    ),
                    has_children: true,
                  },
                  heading("next-heading", "挙動仕様：Notionナレッジ自動同期"),
                ],
                has_more: false,
              }
            }
            if (block_id === manifestRowId) {
              return {
                results: [
                  child(paragraph("usage", "用途：案件種別ごとの工程日数・日程見積もり"), manifestRowId),
                  child(
                    paragraph("range", "参照範囲：「工程別日数テーブル（実測値ベース）」と、それに直接関係する補足説明"),
                    manifestRowId,
                  ),
                  child(paragraph("timing", "反映タイミング：ページ更新トリガー同期"), manifestRowId),
                  child(paragraph("priority", "優先度：高"), manifestRowId),
                ],
                has_more: false,
              }
            }
            if (block_id === sourcePageId) {
              return {
                results: [
                  heading("duration-heading", "工程別日数テーブル（実測値ベース）"),
                  { ...({ id: durationTableId, type: "table", table: {}, has_children: true }) },
                  heading("next-source-heading", "会話フローとルーティング"),
                ],
                has_more: false,
              }
            }
            if (block_id === durationTableId) {
              return {
                results: [
                  tableRow("header", ["案件種別", "所定日数"]),
                  tableRow("live", ["ライブ 60分", "8〜9日"]),
                ],
                has_more: false,
              }
            }
            return { results: [], has_more: false }
          }),
        },
      },
    }

    const result = await syncChatbotNotionKnowledge({
      client,
      repository: repo,
      manifestPageId,
      changedPageId: sourcePageId,
      now: new Date("2026-06-19T01:00:00.000Z"),
    })

    expect(result.ok).toBe(true)
    expect(result.snapshot.entries).toHaveLength(1)
    expect(result.snapshot.entries[0]).toMatchObject({
      pageId: sourcePageId,
      usage: "workflow-duration",
      referenceRange: "工程別日数テーブル（実測値ベース）",
      priority: 1,
      status: "synced",
    })
    expect(result.snapshot.workflowDurations.presets.find((preset) => preset.id === "live-60m")).toMatchObject({
      minDays: 8,
      maxDays: 9,
      source: "notion-sync",
    })
  })

  it("records a sync error and returns the last successful snapshot when Notion fetching fails", async () => {
    const repo = repository()
    const client = {
      blocks: {
        children: {
          list: vi.fn(async () => {
            throw new Error("notion_timeout")
          }),
        },
      },
    }

    const result = await syncChatbotNotionKnowledge({
      client,
      repository: repo,
      manifestPageId: "eb950c43e1a042199c1bbce74ae616a1",
      now: new Date("2026-06-19T01:00:00.000Z"),
    })

    expect(result.ok).toBe(false)
    expect(result.usedFallback).toBe(true)
    expect(result.snapshot.workflowDurations.presets.find((preset) => preset.id === "live-60m")).toMatchObject({
      minDays: 7,
      maxDays: 8,
    })
    expect(repo.errors).toHaveLength(1)
  })
})
