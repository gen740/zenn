import { Client } from "@notionhq/client";

import {
  RichTextItemResponse,
  BlockObjectResponse,
  ListBlockChildrenResponse,
} from "@notionhq/client/build/src/api-endpoints";

import { convertCodeblockLanguage } from "./CodeblockLanguageConverter";

const INDENT_CHAR = '    ';
const MAX_CALLOUT_LEVEL = 5 + 3;

export const parseRichText = (
  richText: RichTextItemResponse[],
  quoteLevel: number = 0
) => {
  let res = '';
  richText.forEach((text) => {
    if (text.type === 'text') {
      let surrounder: string[] = [];
      if (text.annotations.bold) {
        surrounder.push('**');
      }
      if (text.annotations.italic) {
        surrounder.push('*');
      }
      if (text.annotations.strikethrough) {
        surrounder.push('~~');
      }
      if (text.annotations.code) {
        surrounder.push('`');
      }
      if (text.href !== null) {
        res += `[${surrounder.join('') + text.plain_text + surrounder.reverse().join('')}](${text.href})`;
      } else {
        res += surrounder.join('') + text.plain_text + surrounder.reverse().join('');
      }
    } else if (text.type === 'equation') {
      res += `$${text.equation.expression}$`;
    }
  });
  return res.split('\n').join(`\n${'>'.repeat(quoteLevel)}`);
}

export const parseBlock = async (
  notion: Client,
  blocks: ListBlockChildrenResponse,
  level: number = 0,
  parentType: BlockObjectResponse['type'] | null = null,
  quoteLevel: number = 0,
  calloutLevel: number = 0
) => {
  let markdown_result = ''
  let lastType: BlockObjectResponse['type'] | null = null;
  for (const block of blocks.results) {
    const b = block as BlockObjectResponse;
    switch (b.type) {
      case 'paragraph': {
        let rich_text = parseRichText(b.paragraph.rich_text, quoteLevel);
        if (lastType !== 'paragraph' && parentType !== 'toggle') {
          markdown_result += `${'>'.repeat(quoteLevel)}\n`;
        }
        markdown_result += `${'>'.repeat(quoteLevel)}${rich_text}\n`;
        break;
      }
      case 'heading_1': {
        const rich_text = parseRichText(b.heading_1.rich_text, quoteLevel);
        markdown_result += `${'>'.repeat(quoteLevel)}\n${'>'.repeat(quoteLevel)}# ${rich_text}\n`;
        break;
      }
      case 'heading_2': {
        const rich_text = parseRichText(b.heading_2.rich_text, quoteLevel);
        markdown_result += `${'>'.repeat(quoteLevel)}\n${'>'.repeat(quoteLevel)}## ${rich_text}\n`;
        break;
      }
      case 'heading_3': {
        const rich_text = parseRichText(b.heading_3.rich_text, quoteLevel);
        markdown_result += `${'>'.repeat(quoteLevel)}\n${'>'.repeat(quoteLevel)}### ${rich_text}\n`;
        break;
      }
      case 'bulleted_list_item': {
        const rich_text = parseRichText(b.bulleted_list_item.rich_text, quoteLevel);
        if (lastType !== 'bulleted_list_item' && parentType !== 'bulleted_list_item') {
          markdown_result += `${'>'.repeat(quoteLevel)}\n`;
        }
        markdown_result += `${'>'.repeat(quoteLevel)}${INDENT_CHAR.repeat(level - quoteLevel)}* ${rich_text}\n`;
        break;
      }
      case 'numbered_list_item': {
        const rich_text = parseRichText(b.numbered_list_item.rich_text, quoteLevel);
        if (lastType !== 'numbered_list_item' && parentType !== 'numbered_list_item') {
          markdown_result += `${'>'.repeat(quoteLevel)}\n`;
        }
        markdown_result += `${'>'.repeat(quoteLevel)}${INDENT_CHAR.repeat(level - quoteLevel)}1. ${rich_text}\n`;
        break;
      }
      case "quote": {
        const rich_text = parseRichText(b.quote.rich_text, quoteLevel + 1);
        if (lastType !== 'quote') {
          markdown_result += `${'>'.repeat(quoteLevel)}\n`;
        }
        markdown_result += `${INDENT_CHAR.repeat(level - quoteLevel)}${'>'.repeat(quoteLevel + 1)}${rich_text}\n`;
        break;
      }
      case "to_do": {
        const rich_text = parseRichText(b.to_do.rich_text, quoteLevel);
        if (lastType !== 'to_do' && parentType !== 'to_do') {
          markdown_result += `${'>'.repeat(quoteLevel)}\n`;
        }
        markdown_result += `${'>'.repeat(quoteLevel)}${INDENT_CHAR.repeat(level - quoteLevel)}- [ ] ${rich_text}\n`;
        break;
      }
      case "toggle": {
        const rich_text = parseRichText(b.toggle.rich_text, quoteLevel);
        if (parentType !== 'toggle') {
          markdown_result += `${'>'.repeat(quoteLevel)}\n`;
        }
        markdown_result += `${'>'.repeat(quoteLevel)}${':'.repeat(MAX_CALLOUT_LEVEL - calloutLevel)}details ${rich_text}\n`;
        calloutLevel++;
        break;
      }
      case "template":
        break;
      case "synced_block":
        break;
      case "child_page":
        break;
      case "child_database":
        break;
      case "equation":
        markdown_result += `${'>'.repeat(quoteLevel)}\n`;
        markdown_result += `${'>'.repeat(quoteLevel)}$$\n${b.equation.expression}\n`;
        markdown_result += `$$\n`;
        break;
      case "code": {
        const rich_text = parseRichText(b.code.rich_text, quoteLevel);
        if (lastType !== 'code') {
          markdown_result += `${'>'.repeat(quoteLevel)}\n`;
        }
        markdown_result += `${'>'.repeat(quoteLevel)}\`\`\`${convertCodeblockLanguage(b.code.language)}\n${'>'.repeat(quoteLevel)}${rich_text}\n${'>'.repeat(quoteLevel)}\`\`\`\n`;
        break;
      }
      case "callout": {
        const rich_text = parseRichText(b.callout.rich_text, quoteLevel);
        if (lastType !== 'callout') {
          markdown_result += `${'>'.repeat(quoteLevel)}\n`;
        }
        markdown_result += `${'>'.repeat(quoteLevel)}${':'.repeat(MAX_CALLOUT_LEVEL - calloutLevel)}message\n${'>'.repeat(quoteLevel)}${rich_text}\n`;
        calloutLevel++;
        break;
      }
      case "divider":
        if (lastType !== 'divider') {
          markdown_result += `${'>'.repeat(quoteLevel)}\n`;
        }
        markdown_result += `${'>'.repeat(quoteLevel)}${'-'.repeat(10)}\n`;
        break;
      case "breadcrumb":
        break;
      case "table_of_contents":
        break;
      case "column_list":
        break;
      case "column":
        break;
      case "link_to_page":
        break;
      case "table":
        console.log(b);
        break;
      case "table_row":
        break;
      case "embed":
        break;
      case "bookmark":
        break;
      case "image":
        break;
      case "video":
        break;
      case "pdf":
        break;
      case "file":
        break;
      case "audio":
        break;
      case "link_preview":
        break;
      case "unsupported":
        break;
    }
    if (b.has_children) {
      const c = await notion.blocks.children.list({
        block_id: b.id
      })
      if (b.type === 'quote') {
        markdown_result += await parseBlock(notion, c, level + 1, b.type, quoteLevel + 1, calloutLevel);
      } else {
        markdown_result += await parseBlock(notion, c, level + 1, b.type, quoteLevel, calloutLevel);
      }
    }
    if (b.type === 'toggle' || b.type === 'callout') {
      calloutLevel--;
      markdown_result += `${'>'.repeat(quoteLevel)}${':'.repeat(MAX_CALLOUT_LEVEL - calloutLevel)}\n`;
    }

    lastType = b.type;
  }
  return markdown_result
}
