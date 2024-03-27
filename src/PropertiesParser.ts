import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

type PageProperties = {
  title: string;
  emoji: string;
  type: string;
  topics: string[];
  published: boolean;
  freeze: boolean;
  slug?: string;
};

export const parseProperties = (
  pageinfo: PageObjectResponse,
): PageProperties => {
  const result: PageProperties = {
    title: "Title",
    emoji: "emoji",
    type: "tech",
    topics: [] as string[],
    published: false,
    freeze: false,
    slug: undefined,
  };

  // Emoji
  if (pageinfo.icon !== null && pageinfo.icon.type === "emoji") {
    result.emoji = pageinfo.icon.emoji;
  } else {
    throw new Error("No emoji found");
  }

  // Title
  if (
    pageinfo.properties.Title !== undefined &&
    pageinfo.properties.Title.type === "title"
  ) {
    result.title = pageinfo.properties.Title.title[0].plain_text;
  } else {
    throw new Error("No title found");
  }

  // type Section
  if (
    pageinfo.properties.type &&
    pageinfo.properties.type.type === "select" &&
    pageinfo.properties.type.select &&
    pageinfo.properties.type.select.name
  ) {
    result.type = pageinfo.properties.type.select.name;
  } else {
    throw new Error("No type found");
  }

  // topic Section
  if (
    pageinfo.properties.topics &&
    pageinfo.properties.topics.type === "multi_select" &&
    pageinfo.properties.topics.multi_select
  ) {
    const topics: string[] = [];
    for (const topic of pageinfo.properties.topics.multi_select) {
      topics.push(topic.name);
    }
    result.topics = topics;
  } else {
    throw new Error("No topic found");
  }

  // published Section
  if (
    pageinfo.properties.published &&
    pageinfo.properties.published.type === "checkbox"
  ) {
    result.published = pageinfo.properties.published.checkbox;
  } else {
    throw new Error("No published found");
  }

  // Slug Section
  if (
    pageinfo.properties.slug &&
    pageinfo.properties.slug.type === "rich_text"
  ) {
    let slug = pageinfo.properties.slug.rich_text[0]?.plain_text;
    if (slug === undefined || slug === "") {
      slug = pageinfo.id;
    }
    result.slug = slug;
  } else {
    throw new Error("No slug found");
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
