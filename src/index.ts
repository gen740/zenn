import * as fs from "node:fs";
import { Client } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

import { parseBlock } from "./BlockParser";
import { parseProperties, createHeader } from "./PropertiesParser";
import * as cliProgress from "cli-progress";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

import stringWidth from "string-width";

const OUTPUT_DIR = "articles";

const normalizeTitle = async (
  title: string,
  maxLength = 30,
): Promise<string> => {
  let result = title.substring(0, 4);
  let width = stringWidth(result);

  for (let idx = 4; idx < title.length; idx++) {
    width += stringWidth(title[idx]);
    result += title[idx];
    if (width > maxLength - 2) {
      break;
    }
  }
  result += " ".repeat(maxLength - width);
  return result;
};

const main = async () => {
  const pages = (
    await notion.search({
      query: "",
      filter: {
        property: "object",
        value: "page",
      },
      sort: {
        direction: "ascending",
        timestamp: "last_edited_time",
      },
    })
  ).results;

  // TODO(gen740): Make this parallel
  for (const page of pages) {
    if (page.object !== "page") {
      throw new Error("It's not a page object");
    }
    const properties = parseProperties(page as PageObjectResponse);
    if (properties.freeze) {
      continue;
    }
    let zenn_markdown: string[] = createHeader(properties);
    const pageId = page.id;
    const blocks = await notion.blocks.children.list({
      block_id: pageId,
    });
    const bar = new cliProgress.SingleBar(
      {
        format: `${await normalizeTitle(
          properties.emoji + properties.title,
        )} |{bar}| {percentage}% | {value}/{total} => ${
          properties.slug ?? pageId
        }.md`,
        noTTYOutput: true,
        notTTYSchedule: 500,
      },
      cliProgress.Presets.shades_classic,
    );
    bar.start(blocks.results.length, 0);
    zenn_markdown = zenn_markdown.concat(
      await parseBlock(notion, blocks, null, {
        progressBar: bar,
        calloutLevel: 0,
      }),
    );
    fs.writeFileSync(
      `${OUTPUT_DIR}/${properties.slug ?? pageId}.md`,
      zenn_markdown.join("\n"),
    );
    console.log(`Processed ${properties.title}`);
  }
};

main();
