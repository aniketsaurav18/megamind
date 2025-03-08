import { QdrantClient } from "@qdrant/js-client-rest";
import { GenerativeModel } from "@google/generative-ai";
import { logger } from "./logger";

const GITHUB_DBUri = process.env.GITHUB_DBUri;
const GITHUB_DBkey = process.env.GITHUB_DBkey;
const DOCS_DBURI = process.env.DOCS_DBURI;
const DOCS_DBKEY = process.env.DOCS_DBKEY;

const githubClient = new QdrantClient({
  url: GITHUB_DBUri,
  apiKey: GITHUB_DBkey,
});

const docClient = new QdrantClient({
  url: DOCS_DBURI,
  apiKey: DOCS_DBKEY,
});

const promptTemplate = `{context}
  you are a helpful chatbot. There are context provided above with their source. based on the question porvided below you have to answer the question. Include all the sources at bottom of your answer. Answer only if relevent answer to the question are present in the context above. otherwise say "I could not find Relevent answers in the docs. Here are some relevent sources that may help", 
  
  provide all the relevent sources in a list accrodingly. do not provide the complete content of the source, if you find answer in the context then provie 
  all source that could be consided source. like URLs, some jira issue name some jira comment, some github issue link, github issue comment link etc.
  
  Also do not act like you are given info in this message. Act like you already knew the answer.
  
  SUPER IMPORTANT: DO NOT MENTION ABOUT THAT YOU WERE PROVIDED CONTEXT. JUST USE IT.

  user_question: {user_query}
`;

export const fetchDocuments = async (
  query: string,
  embeddingModel: GenerativeModel
) => {
  const result = await embeddingModel.embedContent(query);
  const embedding = result.embedding.values;

  const res1 = await githubClient.search("megamind", {
    vector: embedding,
    limit: 5,
  });

  const res2 = await docClient.search("hexnode-ai-clean-500size", {
    vector: embedding,
    limit: 5,
  });

  const template1 = buildQueryforDoc(res2, query, promptTemplate);
  const template2 = buildQuery(res1, query, template1);

  return template2;
};

export const buildQueryforDoc = (
  documents: any,
  query: string,
  template: string
) => {
  const context = documents.map((d: any) => {
    // console.log(d.payload);
    return `content: \n ${d.payload.original_content} \n Source: ${d.payload.source}`;
  });
  const systemQuery = template
    .replace(`{context}`, context + " {context}")
    .replace(`{user_query}`, query);
  // console.log(
  //   "buildQueryforDoc",
  //   systemQuery,
  //   "\n -----------------------------------------------------"
  // );
  return systemQuery;
};

export const buildQuery = (documents: any, query: string, template: string) => {
  const context = documents.map((d: any) => {
    return JSON.stringify(d.payload);
  });

  const systemQuery = template
    .replace(`{context}`, context + " {context}")
    .replace(`{user_query}`, query);
  // console.log("buildQuery", systemQuery);
  return systemQuery;
};
