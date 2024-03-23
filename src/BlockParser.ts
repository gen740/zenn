import type { Client } from "@notionhq/client";

import type {
  RichTextItemResponse,
  BlockObjectResponse,
  ListBlockChildrenResponse,
} from "@notionhq/client/build/src/api-endpoints";

import { convertCodeblockLanguage } from "./CodeblockLanguageConverter";
import * as https from "node:https";
import * as fs from "node:fs";
import type * as cliProgress from "cli-progress";

const INDENT_CHAR = "    ";
const MAX_CALLOUT_LEVEL = 5 + 3;
const IMAGE_DIR = "images";

export const parseRichText = (richText: RichTextItemResponse[]): string[] => {
  let res = "";
  for (const text of richText) {
    if (text.type === "text") {
      const surrounder: string[] = [];
      if (text.annotations.bold) {
        surrounder.push("**");
      }
      if (text.annotations.italic) {
        surrounder.push("*");
      }
      if (text.annotations.strikethrough) {
        surrounder.push("~~");
      }
      if (text.annotations.code) {
        surrounder.push("`");
      }
      if (text.href !== null) {
        res += `[${
          surrounder.join("") + text.plain_text + surrounder.reverse().join("")
        }](${text.href})`;
      } else {
        res +=
          surrounder.join("") + text.plain_text + surrounder.reverse().join("");
      }
    } else if (text.type === "equation") {
      res += `$${text.equation.expression}$`;
    }
  }
  return res.split("\n");
};

export const parseBlock = async (
  notion: Client,
  blocks: ListBlockChildrenResponse,
  parentType: BlockObjectResponse["type"] | null = null,
  opts: {
    progressBar?: cliProgress.SingleBar;
    calloutLevel: number;
  } = { progressBar: undefined, calloutLevel: 0 },
): Promise<string[]> => {
  let result: string[] = [];
  let lastType: BlockObjectResponse["type"] | null = null;
  let thisCalloutLevel = opts.calloutLevel;
  for (const block of blocks.results) {
    opts.progressBar?.increment();
    const b = block as BlockObjectResponse;
    switch (b.type) {
      case "paragraph": {
        const rich_text = parseRichText(b.paragraph.rich_text);
        if (lastType !== "paragraph" && parentType !== "toggle") {
          result.push("");
        }
        result = [...result, ...rich_text];
        break;
      }
      case "heading_1": {
        const rich_text = parseRichText(b.heading_1.rich_text);
        result.push("");
        result.push(`# ${rich_text[0]}`);
        break;
      }
      case "heading_2": {
        const rich_text = parseRichText(b.heading_2.rich_text);
        result.push("");
        result.push(`## ${rich_text[0]}`);
        break;
      }
      case "heading_3": {
        const rich_text = parseRichText(b.heading_3.rich_text);
        result.push("");
        result.push(`### ${rich_text[0]}`);
        break;
      }
      case "bulleted_list_item": {
        const rich_text = parseRichText(b.bulleted_list_item.rich_text);
        if (
          lastType !== "bulleted_list_item" &&
          parentType !== "bulleted_list_item"
        ) {
          result.push("");
        }
        result.push(`* ${rich_text}`);
        break;
      }
      case "numbered_list_item": {
        const rich_text = parseRichText(b.numbered_list_item.rich_text);
        if (
          lastType !== "numbered_list_item" &&
          parentType !== "numbered_list_item"
        ) {
          result.push("");
        }
        result.push(`1. ${rich_text}`);
        break;
      }
      case "quote": {
        let rich_text = parseRichText(b.quote.rich_text);
        if (lastType !== "quote") {
          result.push("");
        }
        rich_text = rich_text.map((line) => {
          return `>${line}`;
        });
        result = [...result, ...rich_text];
        break;
      }
      case "to_do": {
        const rich_text = parseRichText(b.to_do.rich_text);
        if (lastType !== "to_do" && parentType !== "to_do") {
          result.push("");
        }
        result.push(`- [ ] ${rich_text}`);
        break;
      }
      case "toggle": {
        const rich_text = parseRichText(b.toggle.rich_text);
        if (parentType !== "toggle") {
          result.push("");
        }
        result.push(
          `${":".repeat(
            MAX_CALLOUT_LEVEL - thisCalloutLevel,
          )}details ${rich_text}`,
        );
        thisCalloutLevel++;
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
        result.push("");
        result.push(`$$${b.equation.expression}$$`);
        break;
      case "code": {
        const rich_text = parseRichText(b.code.rich_text);
        if (lastType !== "code") {
          result.push("");
        }
        const fileName =
          b.code.caption[0]?.plain_text !== undefined
            ? `:${b.code.caption[0]?.plain_text}`
            : "";
        result.push(
          `\`\`\`${convertCodeblockLanguage(b.code.language)}${fileName}`,
        );
        result = [...result, ...rich_text];
        result.push("```");
        break;
      }
      case "callout": {
        const rich_text = parseRichText(b.callout.rich_text);
        if (lastType !== "callout") {
          result.push("");
        }
        result.push(
          `${":".repeat(MAX_CALLOUT_LEVEL - thisCalloutLevel)}message`,
        );
        result = [...result, ...rich_text];
        thisCalloutLevel++;
        break;
      }
      case "divider": {
        if (lastType !== "divider") {
          result.push("");
        }
        result.push(`${"-".repeat(10)}`);
        break;
      }
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
        result.push("");
        break;
      case "table_row": {
        const cellsElements: string[] = [];
        for (const cellText of b.table_row.cells) {
          const richText = parseRichText(cellText);
          cellsElements.push(richText.join("<br>"));
        }
        result.push(`| ${cellsElements.join(" | ")} |`);
        break;
      }
      case "embed": {
        result.push("");
        result.push(`${b.embed.url}`);
        break;
      }
      case "bookmark": {
        result.push("");
        result.push(`${b.bookmark.url}`);
        break;
      }
      case "image": {
        if (b.image.type === "file") {
          const fileName = b.image.file.url
            .match(/([^\/]+)/g)?.[4]
            .split("?")[0];
          if (fileName === undefined) {
            console.error("Could not get file name");
            break;
          }
          const fileDir = `${IMAGE_DIR}/${b.id}`;
          fs.mkdirSync(fileDir, { recursive: true });
          const filePath = `${fileDir}/${fileName}`;
          result.push("");
          const rawCaption = b.image.caption[0]?.plain_text;
          const imageSize = rawCaption?.match(/size:( =[0-9]*x)/)?.[1];
          result.push(`![](/${filePath}${imageSize ?? ""})`);
          const caption = rawCaption?.replace(/size: =[0-9]*x/g, "").trim();
          if (caption !== undefined) {
            result.push(`*${caption}*`);
          }
          https
            .get(b.image.file.url, (res) => {
              if (b.image.type !== "file") {
                throw new Error(
                  "Image type is not file: This should not happen",
                );
              }
              const fileStream = fs.createWriteStream(filePath);
              res.pipe(fileStream);
              fileStream.on("finish", () => {
                fileStream.close();
                console.log(`Image downloaded and saved to ${filePath}`);
              });
            })
            .on("error", (e) => {
              console.error(e);
            });
        } else {
          result.push("");
          result.push("[");
          const rawCaption = b.image.caption[0]?.plain_text;
          const imageSize = rawCaption?.match(/size:( =[0-9]*x)/)?.[1];
          result.push(`![](${b.image.external.url} ${imageSize ?? ""})`);
          const caption = rawCaption.replace(/size: =[0-9]*x/g, "").trim();
          if (caption !== undefined) {
            result.push(`*${caption}*`);
          }

          result.push("](${b.image.external.url})");
        }
        break;
      }
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
        block_id: b.id,
      });
      switch (b.type) {
        case "quote": {
          const child = await parseBlock(notion, c, b.type, {
            calloutLevel: thisCalloutLevel,
          });
          result = [...result, ...child.map((line) => `>${line}`)];
          break;
        }
        case "table": {
          const child = await parseBlock(notion, c, b.type, {
            calloutLevel: thisCalloutLevel,
          });
          if (child.length < 2) {
            throw new Error("Table row size is less than 2");
          }
          child.splice(
            1,
            0,
            new Array(b.table.table_width + 1).fill("|").join("---"),
          );
          result = [...result, ...child];
          break;
        }
        case "toggle":
        case "callout": {
          result = [
            ...result,
            ...(await parseBlock(notion, c, b.type, {
              calloutLevel: thisCalloutLevel,
            })),
          ];
          break;
        }
        default: {
          let children = await parseBlock(notion, c, b.type, {
            calloutLevel: thisCalloutLevel,
          });
          children = children.map((line) => {
            if (line === "") {
              return "";
            }
            return `${INDENT_CHAR}${line}`;
          });
          result = [...result, ...children];
          break;
        }
      }
    }
    if (b.type === "toggle" || b.type === "callout") {
      thisCalloutLevel--;
      result.push(`${":".repeat(MAX_CALLOUT_LEVEL - thisCalloutLevel)}`);
    }

    lastType = b.type;
  }
  opts.progressBar?.stop();
  return result;
};
