import * as fs from "node:fs";
import { Client, isFullPage } from "@notionhq/client";

import { parseBlock } from "./BlockParser";
import { parseProperties, createHeader } from "./PropertiesParser";
import * as cliProgress from "cli-progress";

import stringWidth from "string-width";

// Local development reads .env at the repository root; on CI the variables
// are injected by the workflow instead.
try {
  process.loadEnvFile(".env");
} catch {}

const notion = new Client({ auth: process.env.NOTION_API_TOKEN });

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
  const databaseId = process.env.NOTION_ARTICLE_DATABASE_ID;
  if (databaseId === undefined) {
    throw new Error("NOTION_ARTICLE_DATABASE_ID is not set");
  }

  const pages = (
    await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: "to be updated",
        checkbox: {
          equals: true,
        },
      },
      sorts: [
        {
          property: "Create Date",
          direction: "ascending",
        },
      ],
    })
  ).results;

  // TODO(gen740): Make this parallel
  for (const page of pages) {
    if (!isFullPage(page)) {
      throw new Error("It's not a full page object");
    }
    const properties = parseProperties(page);
    let zenn_markdown: string[] = createHeader(properties);
    const blocks = await notion.blocks.children.list({
      block_id: page.id,
    });
    const bar = new cliProgress.SingleBar(
      {
        format: `${await normalizeTitle(
          properties.emoji + properties.title,
        )} |{bar}| {percentage}% | {value}/{total} => ${properties.slug}.md`,
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
      `${OUTPUT_DIR}/${properties.slug}.md`,
      zenn_markdown.join("\n"),
    );
    console.log(`Processed ${properties.title}`);
  }
};

main();
