import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

type PageProperties = {
  title: string;
  emoji: string;
  type: string;
  topics: string[];
  published: boolean;
  slug: string;
};

const DEFAULT_EMOJI = "📝";
const DEFAULT_TYPE = "tech";

export const parseProperties = (
  pageinfo: PageObjectResponse,
): PageProperties => {
  const result: PageProperties = {
    title: "Title",
    emoji: DEFAULT_EMOJI,
    type: DEFAULT_TYPE,
    topics: [],
    published: false,
    slug: pageinfo.id,
  };

  // Emoji
  if (pageinfo.icon !== null && pageinfo.icon.type === "emoji") {
    result.emoji = pageinfo.icon.emoji;
  }

  // Title: locate by property type, not by name (the database column may be
  // renamed freely on the Notion side)
  const titleProperty = Object.values(pageinfo.properties).find(
    (property) => property.type === "title",
  );
  if (titleProperty?.type !== "title" || titleProperty.title.length === 0) {
    throw new Error("No title found");
  }
  result.title = titleProperty.title.map((text) => text.plain_text).join("");

  // type Section
  if (
    pageinfo.properties.type &&
    pageinfo.properties.type.type === "select" &&
    pageinfo.properties.type.select
  ) {
    result.type = pageinfo.properties.type.select.name;
  } else {
    throw new Error(`No type found: ${result.title}`);
  }

  // topics Section
  if (
    pageinfo.properties.topics &&
    pageinfo.properties.topics.type === "multi_select" &&
    pageinfo.properties.topics.multi_select.length > 0
  ) {
    result.topics = pageinfo.properties.topics.multi_select.map(
      (topic) => topic.name,
    );
  } else {
    throw new Error(`No topics found: ${result.title}`);
  }

  // published Section
  if (
    pageinfo.properties.publicated &&
    pageinfo.properties.publicated.type === "checkbox"
  ) {
    result.published = pageinfo.properties.publicated.checkbox;
  } else {
    throw new Error("No publicated found");
  }

  return result;
};

export const createHeader = (properties: PageProperties): string[] => {
  const header: string[] = [];
  header.push("---");
  header.push(`title: "${properties.title}"`);
  header.push(`emoji: "${properties.emoji}"`);
  header.push(`type: "${properties.type}"`);
  header.push(
    `topics: [${properties.topics.map((topic) => `"${topic}"`).join(", ")}]`,
  );
  header.push(`published: ${properties.published}`);
  header.push("---");
  return header;
};
