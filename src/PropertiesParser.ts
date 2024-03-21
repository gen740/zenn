import {
  PageObjectResponse,
} from "@notionhq/client/build/src/api-endpoints";


export const parseProperties = (pageinfo: PageObjectResponse) => {
  let result:string[] = ['---'];

  // Title Section
  if (pageinfo.properties['Title'] !== undefined
    && pageinfo.properties['Title'].type === "title"
  ) {
    result.push(`title: "${pageinfo.properties['Title'].title[0].plain_text}"`);
  } else {
    throw new Error("No title found");
  }

  // Emoji Section
  if (pageinfo.properties['emoji']
    && pageinfo.properties['emoji'].type === "rich_text"
    && pageinfo.properties['emoji'].rich_text.length > 0
  ) {
    result.push(`emoji: "${pageinfo.properties['emoji'].rich_text[0].plain_text}"`);
  } else {
    throw new Error("No emoji found");
  }

  // type Section
  if (pageinfo.properties['type']
    && pageinfo.properties['type'].type === "select"
    && pageinfo.properties['type'].select
    && pageinfo.properties['type'].select.name
  ) {
    result.push(`type: "${pageinfo.properties['type'].select.name}"`);
  } else {
    throw new Error("No type found");
  }

  // topic Section
  if (pageinfo.properties['topics']
    && pageinfo.properties['topics'].type === "multi_select"
    && pageinfo.properties['topics'].multi_select
  ) {
    let topics:string[] = [];
    pageinfo.properties['topics'].multi_select.forEach((topic) => {
      topics.push(topic.name);
    })
    result.push(`topics: [${topics.join(', ')}]`);
  } else {
    throw new Error("No topic found");
  }

  // published Section
  if (pageinfo.properties['published']
    && pageinfo.properties['published'].type === "checkbox"
  ) {
    result.push(`published: ${pageinfo.properties['published'].checkbox}`);
  } else {
    throw new Error("No published found");
  }

  result.push('---');
  return result;
}
