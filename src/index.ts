import * as fs from "node:fs";
import { Client } from "@notionhq/client";
import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

import { parseBlock } from "./BlockParser";
import { parseProperties } from "./PropertiesParser";

const notion = new Client({ auth: process.env.NOTION_API_KEY });

const OUTPUT_DIR = "articles";

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
    const properties = (page as PageObjectResponse).properties;
    if (
      properties.freeze.type === "checkbox" &&
      properties.freeze.checkbox === true
    ) {
      continue;
    }
    let zenn_markdown = parseProperties(page as PageObjectResponse);
    zenn_markdown = zenn_markdown.concat(
      await parseBlock(
        notion,
        await notion.blocks.children.list({
          block_id: page.id,
        }),
      ),
    );
    fs.writeFileSync(`${OUTPUT_DIR}/${page.id}.md`, zenn_markdown.join("\n"));
    console.log(`File ${page.id}.md has been created`);
  }
};

main();
