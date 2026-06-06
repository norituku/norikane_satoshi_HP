import { readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { config as loadEnv } from "dotenv"
import { Client } from "@notionhq/client"
import type {
  BlockObjectResponse,
  PageObjectResponse,
  PartialBlockObjectResponse,
  QueryDataSourceResponse,
  RichTextItemResponse,
} from "@notionhq/client"
import {
  IB_NOTE_DATA_SOURCE_ID,
  PUBLISHED_PROPERTY,
  SLUG_PROPERTY,
  TITLE_PROPERTY,
} from "@/lib/notion/server/client"
import type { BlockWithChildren } from "@/lib/notion/server/types"

loadEnv({ path: ".env.local", override: false })
loadEnv({ path: ".env", override: false })

type SnapshotNote = {
  id: string
  slug: string
  title: string
  sourceUrl: string
  lastEditedTime: string
  body: string
}

const fallbackNotes = [
  { slug: "correction", file: "article-correction.md", published: true },
  { slug: "grading", file: "article-grading.md", published: false },
  { slug: "filmlook", file: "article-filmlook.md", published: false },
] as const

function richTextPlain(rich: RichTextItemResponse[] | undefined): string {
  return rich?.map((item) => item.plain_text).join("").trim() ?? ""
}

function pageTitle(page: PageObjectResponse): string {
  const prop = page.properties[TITLE_PROPERTY]
  if (prop?.type !== "title") return ""
  return prop.title.map((item) => item.plain_text).join("").trim()
}

function pageSlug(page: PageObjectResponse): string {
  const prop = page.properties[SLUG_PROPERTY]
  if (prop?.type === "rich_text") {
    return prop.rich_text.map((item) => item.plain_text).join("").trim()
  }
  if (prop?.type === "title") {
    return prop.title.map((item) => item.plain_text).join("").trim()
  }
  return ""
}

function isFullPage(row: QueryDataSourceResponse["results"][number]): row is PageObjectResponse {
  return "properties" in row
}

function isFullBlock(block: BlockObjectResponse | PartialBlockObjectResponse): block is BlockObjectResponse {
  return "type" in block
}

function blockOwnText(block: BlockWithChildren): string | null {
  switch (block.type) {
    case "paragraph":
      return richTextPlain(block.paragraph.rich_text)
    case "heading_1":
      return richTextPlain(block.heading_1.rich_text)
    case "heading_2":
      return richTextPlain(block.heading_2.rich_text)
    case "heading_3":
      return richTextPlain(block.heading_3.rich_text)
    case "bulleted_list_item":
      return `- ${richTextPlain(block.bulleted_list_item.rich_text)}`
    case "numbered_list_item":
      return `- ${richTextPlain(block.numbered_list_item.rich_text)}`
    case "quote":
      return richTextPlain(block.quote.rich_text)
    case "callout":
      return richTextPlain(block.callout.rich_text)
    case "toggle":
      return richTextPlain(block.toggle.rich_text)
    case "to_do":
      return richTextPlain(block.to_do.rich_text)
    case "code":
      return richTextPlain(block.code.rich_text)
    case "bookmark":
      return block.bookmark.url
    case "embed":
      return block.embed.url
    case "link_preview":
      return block.link_preview.url
    case "video":
      return "external" in block.video ? block.video.external.url : null
    case "image":
      return "external" in block.image ? block.image.external.url : null
    case "divider":
      return null
    default:
      return null
  }
}

function blocksPlainText(blocks: readonly BlockWithChildren[]): string {
  const lines: string[] = []

  const visit = (block: BlockWithChildren) => {
    const text = blockOwnText(block)
    if (text) lines.push(text)
    for (const child of block.children ?? []) {
      visit(child)
    }
  }

  for (const block of blocks) {
    visit(block)
  }

  return lines.join("\n\n").replace(/\n{3,}/g, "\n\n").trim()
}

async function listBlockChildren(
  notion: Client,
  blockId: string,
  depth = 0,
): Promise<BlockWithChildren[]> {
  const out: BlockWithChildren[] = []
  let cursor: string | undefined

  for (let i = 0; i < 50; i += 1) {
    const response = await notion.blocks.children.list({
      block_id: blockId,
      page_size: 100,
      start_cursor: cursor,
    })
    for (const block of response.results) {
      if (!isFullBlock(block)) continue
      if (block.has_children && depth < 4) {
        out.push({
          ...block,
          children: await listBlockChildren(notion, block.id, depth + 1),
        })
      } else {
        out.push(block)
      }
    }
    if (!response.has_more || !response.next_cursor) break
    cursor = response.next_cursor
  }

  return out
}

async function queryPublishedNotionNotes(): Promise<SnapshotNote[]> {
  const auth = process.env.NOTION_TOKEN
  if (!auth) return []

  const notion = new Client({ auth })
  const pages: PageObjectResponse[] = []
  let cursor: string | undefined

  for (let i = 0; i < 10; i += 1) {
    const response: QueryDataSourceResponse = await notion.dataSources.query({
      data_source_id: IB_NOTE_DATA_SOURCE_ID,
      filter: {
        and: [
          { property: PUBLISHED_PROPERTY, checkbox: { equals: true } },
          { property: SLUG_PROPERTY, rich_text: { is_not_empty: true } },
        ],
      },
      sorts: [{ timestamp: "created_time", direction: "ascending" }],
      page_size: 100,
      start_cursor: cursor,
    })
    for (const row of response.results) {
      if (isFullPage(row)) pages.push(row)
    }
    if (!response.has_more || !response.next_cursor) break
    cursor = response.next_cursor
  }

  const notes: SnapshotNote[] = []
  for (const page of pages) {
    const slug = pageSlug(page)
    const title = pageTitle(page)
    if (!slug || !title) continue
    const blocks = await listBlockChildren(notion, page.id)
    notes.push({
      id: page.id,
      slug,
      title,
      sourceUrl: `/notes/${slug}`,
      lastEditedTime: page.last_edited_time,
      body: blocksPlainText(blocks),
    })
  }
  return notes
}

function markdownTitle(markdown: string): string {
  return markdown
    .split(/\r?\n/)
    .find((line) => line.startsWith("# "))
    ?.replace(/^#\s+/, "")
    .trim() ?? ""
}

function markdownBody(markdown: string): string {
  return markdown
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("# "))
    .map((line) => line.replace(/^#{2,6}\s+/, "").replace(/\*\*/g, "").replace(/`([^`]+)`/g, "$1"))
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

async function listFallbackPublishedNotes(): Promise<SnapshotNote[]> {
  const notes: SnapshotNote[] = []

  for (const note of fallbackNotes) {
    if (!note.published) continue
    const markdown = await readFile(join(process.cwd(), note.file), "utf8")
    const title = markdownTitle(markdown)
    if (!title) continue
    notes.push({
      id: `fallback-${note.slug}`,
      slug: note.slug,
      title,
      sourceUrl: `/notes/${note.slug}`,
      lastEditedTime: "2026-04-24T00:00:00.000Z",
      body: markdownBody(markdown),
    })
  }

  return notes
}

function moduleSource(notes: readonly SnapshotNote[]): string {
  return [
    "export const publishedNotesSnapshot = ",
    JSON.stringify(notes, null, 2),
    " as const\n",
  ].join("")
}

async function main() {
  const notes = await queryPublishedNotionNotes()
  const snapshot = notes.length > 0 ? notes : await listFallbackPublishedNotes()

  await writeFile(
    join(process.cwd(), "src/lib/chatbot/knowledge/published-notes-snapshot.ts"),
    moduleSource(snapshot),
  )
  console.log(`Wrote ${snapshot.length} published note snapshot(s).`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
