import { Octokit } from '@octokit/rest';
import { graphql } from '@octokit/graphql';
import dotenv from 'dotenv';
dotenv.config();
import prisma from './db.js';
import { storeChunkedTextEmbeddings } from './embedder.js';

const owner = process.env.GITHUB_USERNAME || 'twbs'; // GitHub repository owner
const repo = process.env.GITHUB_REPO || 'bootstrap'; // GitHub repository name
const githubToken = process.env.GITHUB_TOKEN; // GitHub Token (Required for GraphQL API)

const octokit = new Octokit({ auth: githubToken });

async function fetchIssueComments(issueNumber) {
  try {
    const response = await octokit.issues.listComments({ owner, repo, issue_number: issueNumber });
    return response.data;
  } catch (error) {
    console.error(`Error fetching comments for issue #${issueNumber}:`, error);
    return [];
  }
}

async function fetchIssues() {
  try {
    const response = await octokit.issues.listForRepo({ owner, repo, state: 'all' });
    return response.data;
  } catch (error) {
    console.error('Error fetching issues:', error);
    return [];
  }
}

async function fetchDiscussions() {
  try {
    const response = await graphql(
      `
        query getDiscussions($owner: String!, $repo: String!) {
          repository(owner: $owner, name: $repo) {
            discussions(first: 100) {
              nodes {
                id
                title
                body
                url
                comments(first: 100) {
                  nodes {
                    id
                    body
                    url
                  }
                }
              }
            }
          }
        }
      `,
      {
        owner: owner,
        repo: repo,
        headers: {
          authorization: `Bearer ${githubToken}`,
        },
      }
    );
    return response.repository.discussions.nodes;
  } catch (error) {
    console.error('Error fetching discussions:', error);
    return [];
  }
}

export async function processGitHubData() {
  const issues = await fetchIssues();
  const discussions = await fetchDiscussions();

  const results = [];

  for (const issue of issues) {
    const issueData = {
      type: 'issue',
      id: issue.id,
      title: issue.title,
      body: issue.body || "No description",
      url: issue.html_url,
      comments: [],
    };
    let existingIssue = await prisma.issue.findFirst({
      where: {
        githubId: issue.id,
      },
    });

    if (!existingIssue) {
      if(issueData.body == null || issueData.body == "" || issueData.body == undefined){
        issueData.body = "No description";
      }
      console.log(`Storing embeddings for issue: ${issue.id}`);
      await storeChunkedTextEmbeddings(issueData.body, issueData);
      console.log(`Creating new issue in the database: ${issue.id}`);
      existingIssue = await prisma.issue.create({
        data: {
          githubId: issue.id,
        },
      });
    } else {
      console.log(`Issue already exists in the database: ${issue.id}`);
    }

    const comments = await fetchIssueComments(issue.number);
    for (const comment of comments) {
      const existingComment = await prisma.comment.findFirst({
        where: {
          githubId: comment.id,
        },
      });
      const newComment = {
        type: 'comment',
        id: comment.id,
        body: comment.body || "No comment body",
        url: comment.html_url,
      };
      if (!existingComment) {
        if(newComment.body == null || newComment.body == "" || newComment.body == undefined){
          newComment.body = "No comment body";
        }
        console.log(`Storing embeddings for comment: ${comment.id}`);
        await storeChunkedTextEmbeddings(newComment.body, newComment);
        console.log(`Creating new comment in the database: ${comment.id}`);
        await prisma.comment.create({
          data: {
            issueId: existingIssue.id,
            githubId: comment.id,
          },
        });
      } else {
        console.log(`Comment already exists in the database: ${comment.id}`);
      }
    }
  }

  for (const discussion of discussions) {
    const discussionData = {
      type: 'discussion',
      id: discussion.id,
      title: discussion.title || "NO title",
      body: discussion.body || "no discussion body",
      url: discussion.url,
      comments: discussion.comments.nodes.map(comment => ({ id: comment.id, body: comment.body, url: comment.url })),
    };
    let existingDiscussion = await prisma.discussion.findFirst({
      where: {
        githubId: toString(discussion.id),
      },
    });

    if (!existingDiscussion) {
      
      console.log(`Storing embeddings for discussion: ${discussion.id}`);
      await storeChunkedTextEmbeddings(discussionData.body, discussionData);
      console.log(`Creating new discussion in the database: ${discussion.id}`);
      existingDiscussion = await prisma.discussion.create({
        data: {
          githubId: toString(discussion.id),
        },
      });
    } else {
      console.log(`Discussion already exists in the database: ${discussion.id}`);
    }

    for (const comment of discussion.comments.nodes) {
      let existingComment = await prisma.discussionComment.findFirst({
        where: {
          githubId: toString(comment.id),
        },
      });
      const newComment = {
        type: 'discussionComment',
        id: comment.id,
        body: comment.body,
        url: comment.url,
      };
      if (!existingComment) {
        console.log(`Storing embeddings for discussion comment: ${comment.id}`);
        await storeChunkedTextEmbeddings(comment.body, newComment);
        console.log(`Creating new discussion comment in the database: ${comment.id}`);
        await prisma.discussionComment.create({
          data: {
            githubId: toString(comment.id),
            discussionId: existingDiscussion.id,
          },
        });
      } else {
        console.log(`Discussion comment already exists in the database: ${comment.id}`);
      }
    }
    results.push(discussionData);
  }

  return results;
}

// async function main() {
//   try {
//     const processedData = await processGitHubData();
//     console.log(JSON.stringify(processedData, null, 2));
//   } catch (error) {
//     console.error('An error occurred:', error);
//   }
// }

// main();