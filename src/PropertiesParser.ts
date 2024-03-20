import {
  PageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";


export const parseProperties = (pageinfo: PageObjectResponse) => {
  let markdown_result = '---\n';

  // Title Section
  if (pageinfo.properties['Title'] !== undefined
    && pageinfo.properties['Title'].type === "title"
  ) {
    markdown_result += `title: "${pageinfo.properties['Title'].title[0].plain_text}"\n`;
  } else {
    throw new Error("No title found");
  }

  // Emoji Section
  if (pageinfo.properties['emoji']
    && pageinfo.properties['emoji'].type === "rich_text"
    && pageinfo.properties['emoji'].rich_text.length > 0
  ) {
    markdown_result += `emoji: "${pageinfo.properties['emoji'].rich_text[0].plain_text}"\n`;
  } else {
    throw new Error("No emoji found");
  }

  // type Section
  if (pageinfo.properties['type']
    && pageinfo.properties['type'].type === "select"
    && pageinfo.properties['type'].select
    && pageinfo.properties['type'].select.name
  ) {
    markdown_result += `type: "${pageinfo.properties['type'].select.name}"\n`;
  } else {
    throw new Error("No type found");
  }

  // topic Section
  if (pageinfo.properties['topics']
    && pageinfo.properties['topics'].type === "multi_select"
    && pageinfo.properties['topics'].multi_select
  ) {
    markdown_result += `topics: [`;
    pageinfo.properties['topics'].multi_select.forEach((topic) => {
      markdown_result += `"${topic.name}", `;
    })
    markdown_result += `]\n`;
  } else {
    throw new Error("No topic found");
  }

  // published Section
  if (pageinfo.properties['published']
    && pageinfo.properties['published'].type === "checkbox"
  ) {
    markdown_result += `published: ${pageinfo.properties['published'].checkbox}\n`;
  } else {
    throw new Error("No published found");
  }

  markdown_result += '---\n\n';
  return markdown_result;
}
