import cron from "node-cron";
import { processGitHubData } from "./github2.js"; 
import { getJiraIssuesAndComments } from "./jira-executor.js";


export async function runCronJob() {
    try {
        await Promise.all([
            processGitHubData(),
            getJiraIssuesAndComments()
        ]);
        console.log(`[${new Date().toISOString()}] Cron job completed successfully.`);
    } catch (error) {
        console.error(`[${new Date().toISOString()}] Error running cron job:`, error);
    }
}

// Schedule the job to run every hour
cron.schedule("0 * * * *", () => {
    console.log("Running scheduled cron job...");
    runCronJob();
});

// Keep the script running
console.log("Cron job scheduler started.");
