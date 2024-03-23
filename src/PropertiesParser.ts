import type { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";

export const parseProperties = (pageinfo: PageObjectResponse) => {
  const result: string[] = ["---"];

  // Title Section
  if (
    pageinfo.properties.Title !== undefined &&
    pageinfo.properties.Title.type === "title"
  ) {
    const title = pageinfo.properties.Title.title[0].plain_text;
    result.push(`title: "${title}"`);
  } else {
    throw new Error("No title found");
  }

  // Emoji Section
  if (pageinfo.icon !== null && pageinfo.icon.type === "emoji") {
    result.push(`emoji: "${pageinfo.icon.emoji}"`);
  } else {
    throw new Error("No emoji found");
  }

  // type Section
  if (
    pageinfo.properties.type &&
    pageinfo.properties.type.type === "select" &&
    pageinfo.properties.type.select &&
    pageinfo.properties.type.select.name
  ) {
    result.push(`type: "${pageinfo.properties.type.select.name}"`);
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
    result.push(`topics: [${topics.join(", ")}]`);
  } else {
    throw new Error("No topic found");
  }

  // published Section
  if (
    pageinfo.properties.published &&
    pageinfo.properties.published.type === "checkbox"
  ) {
    result.push(`published: ${pageinfo.properties.published.checkbox}`);
  } else {
    throw new Error("No published found");
  }

  result.push("---");
  return result;
};
