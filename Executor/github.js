import dotenv from 'dotenv';
dotenv.config();
import { Octokit } from '@octokit/rest';

// Initialize Octokit
// For authenticated access (optional, recommended for higher rate limits):
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN, // Remove this line for unauthenticated access
});

// For unauthenticated access (limited to 60 requests/hour):
// const octokit = new Octokit();

// Repository details (public repo example)
const owner = 'twbs';
const repo = 'bootstrap';

// Function to fetch limited data from the public repo
async function fetchLimitedPublicRepoData() {
  try {
    // 1. Fetch First 5 Issues (Open and Closed)
    const issues = await octokit.issues.listForRepo({
      owner,
      repo,
      state: 'all', // 'open', 'closed', or 'all'
      per_page: 5,  // Limit to 5 items
      page: 1,      // First page only
    });
    console.log('First 5 Issues:', issues.data);

    // 2. Fetch First 5 Comments for a Specific Issue
    const issueNumber = 1; // Replace with a valid issue number
    const issueComments = await octokit.issues.listComments({
      owner,
      repo,
      issue_number: issueNumber,
      per_page: 5,
      page: 1,
    });
    console.log(`First 5 Comments for Issue #${issueNumber}:`, issueComments.data);

    // 3. Fetch First 5 Issue Comments Across the Repo
    const allIssueComments = await octokit.issues.listCommentsForRepo({
      owner,
      repo,
      per_page: 5,
      page: 1,
    });
    console.log('First 5 Issue Comments:', allIssueComments.data);

    // 4. Fetch First 5 Pull Requests (Open and Closed)
    const pullRequests = await octokit.pulls.list({
      owner,
      repo,
      state: 'all',
      per_page: 5,
      page: 1,
    });
    console.log('First 5 Pull Requests:', pullRequests.data);

    // 5. Fetch First 5 Comments for a Specific Pull Request
    const prNumber = 1; // Replace with a valid PR number
    const prComments = await octokit.pulls.listReviewComments({
      owner,
      repo,
      pull_number: prNumber,
      per_page: 5,
      page: 1,
    });
    console.log(`First 5 Review Comments for PR #${prNumber}:`, prComments.data);

    // 6. Fetch First 5 Releases
    const releases = await octokit.repos.listReleases({
      owner,
      repo,
      per_page: 5,
      page: 1,
    });
    console.log('First 5 Releases:', releases.data);

    // 7. Fetch README Content (no limit needed, only one README)
    const readme = await octokit.repos.getReadme({
      owner,
      repo,
    });
    const readmeContent = Buffer.from(readme.data.content, 'base64').toString('utf8');
    console.log('README Content:', readmeContent);

  } catch (error) {
    console.error('Error fetching limited public repo data:', error);
  }
}



// Run the function
fetchLimitedPublicRepoData();