# Task Completion Tracker

React + Vite application for tracking task completion by weightage.

## Features

- Add task name and weightage out of 100.
- Mark tasks completed using checkbox.
- Auto-calculate completion percentage.
- Show tick marks for completed tasks.
- Generate report.
- Copy Outlook-friendly mail body with rich HTML table.
- Save data automatically in browser localStorage.
- Export and import task data as JSON.
- GitHub Pages workflow included.

## Example

Project: Create GitHub Repo

| Task | Weightage |
| --- | ---: |
| Create repository | 20% |
| Add remote repo to local | 10% |
| Commit code | 20% |
| Push code to repo | 20% |
| Add workflow file | 10% |
| Add branch protection rule | 20% |

If first 3 tasks are completed, completion is 50%.

## Run locally

```bash
# Install dependencies
npm install

# Start local dev server
npm run dev
```

## Build locally

```bash
# Create production build in dist folder
npm run build
```

## Deploy to GitHub Pages

1. Push this project to GitHub.
2. Go to repository **Settings > Pages**.
3. Under **Build and deployment**, select **GitHub Actions**.
4. Push to `main` or `master` branch.
5. Open the **Actions** tab and wait for the workflow to finish.
6. Your site URL will be shown in the deployment output.

## Important

Do not store passwords, API keys, production data, or client confidential data in this app because GitHub Pages is a static public website when published publicly.
