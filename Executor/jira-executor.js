import dotenv from "dotenv"
dotenv.config()
import axios from 'axios';
import prisma from './db.js';
import { storeChunkedTextEmbeddings } from './embedder.js';

// Configuration - replace these with your actual values
const JIRA_BASE_URL = process.env.JIRA_URL;
const PROJECT_KEY = process.env.JIRA_PROJECT;
const USERNAME = process.env.JIRA_USERNAME;
const API_TOKEN = process.env.JIRA_API_TOKEN;

const auth = {
  username: USERNAME,
  password: API_TOKEN
};

function extractText(content) {
  let result = "";

  if (Array.isArray(content)) {
    content.forEach(item => {
      result += extractText(item) + " ";
    });
  } else if (typeof content === "object" && content !== null) {
    if (content.type === "text" && content.text) {
      result += content.text;
    } else if (content.content) {
      result += extractText(content.content);
    }
  }

  return result.trim();
}

function extractCommentText(comment) {
  if (!comment || !comment.body || !comment.body.content || !Array.isArray(comment.body.content)) {
    return ""; // Return an empty string if the comment structure is invalid
  }

  let commentText = "";

  function processContent(content) {
    if (Array.isArray(content)) {
      for (const item of content) {
        processItem(item);
      }
    }
  }

  function processItem(item) {
    if (item.type === "paragraph" && item.content) {
      processContent(item.content);
    } else if (item.type === "text" && typeof item.text === "string") {
      commentText += item.text;
    } else if (item.content) {
      processContent(item.content);  // Recurse if there's nested content
    }
  }

  processContent(comment.body.content);

  return commentText.trim(); // Remove leading/trailing whitespace
}

export async function getJiraIssuesAndComments() {
  const baseUrl = JIRA_BASE_URL;
  const projectKey = PROJECT_KEY;
  const searchUrl = `${baseUrl}/rest/api/3/search`;

  // Initial parameters
  const params = {
    jql: `project = ${projectKey}`,
    fields: 'summary,description,comment',
    maxResults: 100,
    startAt: 0
  };

  let allIssues = [];

  try {
    while (true) {
      // Make the API request
      const response = await axios.get(searchUrl, {
        auth,
        params,
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      });

      const data = response.data;
      const issues = data.issues || [];
      // console.log(JSON.stringify(issues))
      allIssues = allIssues.concat(issues);

      const total = data.total || 0;
      const startAt = data.startAt || 0;
      const maxResults = data.maxResults || 0;

      console.log(`Fetched ${issues.length} issues. Total progress: ${allIssues.length}/${total}`);

      // Check if we've retrieved all issues
      if (startAt + maxResults >= total) {
        break;
      }

      // Update startAt for next page
      params.startAt = startAt + maxResults;
    }

    // Process and display the results
    for (const issue of allIssues) {  // Use a 'for...of' loop for async/await
      try {
        const issueKey = issue.key;
        const summary = issue.fields.summary || 'No summary';
        const description = issue.fields.description || 'No description';

        const plainDescription = extractText(description.content);

        const issueData = {
          type: "issue",
          id: issue.id,
          projectKey: projectKey,
          title: summary || "NO title.",
          description: plainDescription || "no description",
          url: `${JIRA_BASE_URL}/browse/${issueKey}`
        };

        //let existingIssue = await prisma.jiraIssues.findFirst({  // Await the promise
        let existingIssue = await prisma.jiraIssues.findFirst({
          where: {
            jiraId: toString(issue.id)
          }
        });

        if (!existingIssue) {
          await storeChunkedTextEmbeddings(issueData.description, issueData);
          existingIssue = await prisma.jiraIssues.create({
            data: {
              jiraId: toString(issueData.id),
              projectKey: projectKey,
              projectDescription: issueData.description,
              projectTitle: issueData.title,
            }
          });
          console.log(`Created new issue record: Jira ID ${issueData.id}, Key ${issueKey}`);  // Relevant log
        } else {
          console.log(`Issue already exists: Jira ID ${issueData.id}, Key ${issueKey}`); // Relevant Log
        }
        // console.log("desc \n", plainDescription);

        // Handle comments
        const comments = issue.fields.comment?.comments || [];
        if (comments.length > 0) {
          console.log(`Processing ${comments.length} comments for issue: ${issueKey}`);
          for (const comment of comments) {   
            try {
              let existingComment = await prisma.jiraComments.findFirst({
                where: {
                  jiraId: comment.id,
                }
              });

              if (existingComment) {
                console.log(`Comment already exists: Jira ID ${comment.id}`); // Relevant log
                continue;  // Skip to the next comment
              }

              const plainComment = extractCommentText(comment);
              const commentData = {
                jiraId: comment.id,
                projectKey: existingIssue.projectKey,
                commentBody: plainComment,
              };

              await storeChunkedTextEmbeddings(plainComment, commentData);
              await prisma.jiraComments.create({
                data: {
                  jiraId: commentData.jiraId,
                  projectKey: commentData.projectKey,
                  commentBody: commentData.commentBody,
                  issueId: existingIssue.id,
                }
              });
              console.log(`Created new comment record: Jira ID ${comment.id}, Issue Key: ${issueKey}`); // Relevant log
            } catch (commentError) {
              console.error(`Error processing comment ${comment.id} for issue ${issueKey}:`, commentError); // Specific Error
            }

          }
        } else {
          console.log(`No comments found for issue: ${issueKey}`);  // Relevant log
        }

      } catch (error) {
        console.error("Error processing issue:", issue.key, error); // Log the error
      }
    }
  } catch (error) {
    console.error('Error fetching Jira issues:', error.response?.data || error.message);
  }
}

// async function main() {
//   console.log(`Fetching issues and comments for project: ${PROJECT_KEY}`);
//   await getJiraIssuesAndComments(JIRA_BASE_URL, PROJECT_KEY);
// }

// // Run the script
// main().catch(console.error);