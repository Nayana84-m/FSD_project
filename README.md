# SmartShift

SmartShift helps cafes and small teams plan staff schedules using skills, availability, weekly hour limits, and leave requests. Managers create a cafe workspace, build and publish its roster, and review leave. Staff join their manager's cafe with an invite code and use their own staff portal.

## What it includes

- Responsive landing page, sign in, and role-based manager and staff screens
- Manager signup with a cafe or business name and a staff invite code
- Staff signup that joins the matching cafe workspace
- Per-cafe staff, shifts, availability, leave requests, and roster status
- Automatic workspace refresh about every four seconds while a user is signed in
- Shift assignment checks for skills and maximum weekly hours
- Profile updates saved through the authenticated API
- MongoDB Atlas persistence, with a local JSON demo mode when Atlas is not configured

## Run locally

Requirements: Node.js 18 or later and npm.

1. Open a terminal in the project folder and install dependencies:

   ```powershell
   npm install
   ```

2. If you do not already have a `.env` file, create one from the example:

   ```powershell
   Copy-Item .env.example .env
   ```

3. In `.env`, set `MONGODB_URI` to your Atlas connection string, set its database user password in the URI, and keep `MONGODB_DB_NAME=smartshift`. Keep `.env` private; it is ignored by Git.

4. In MongoDB Atlas, add your current public IP to the project's Network Access list for local development. Do not put the IP address in the app code.

5. Start the app:

   ```powershell
   npm start
   ```

6. Open the local address printed in the terminal (usually `http://localhost:3000`). If port 3000 is already in use, run `$env:PORT = "3001"` before `npm start`, then open `http://localhost:3001`.

When connected to Atlas, the terminal prints `DATABASE_MODE=atlas database=smartshift`. Without `MONGODB_URI`, the app uses local JSON demo data. Atlas account passwords and application account passwords are separate credentials.

## First-use flow

1. Create a Manager account and enter the cafe name.
2. In the Manager Profile, copy the staff invite code.
3. Add a staff member with their email and job details, then give them the invite code.
4. Staff select Staff, choose Create account, and enter the same email and invite code. Their account joins that cafe and claims the matching staff record.
5. Create shifts, assign staff, and publish the roster. Staff can then see their confirmed shifts and submit leave requests.

Each manager account has its own cafe workspace. Staff only receive their own schedule and leave details; the cafe manager can manage their workspace team and roster.

## View data in Atlas

In Atlas, open the cluster's **Browse Collections** view, then open the `smartshift` database and `application_state` collection. The application currently stores its state in the document with `_id: "smartshift"`; cafe workspaces are under `workspaces`.

## Project layout

```text
assets/              Images and other static assets
css/                 Page and component styles
js/                  UI, authentication, validation, and API client
server/              Node.js API and MongoDB/local data access
tests/               Existing automated checks
index.html           Single-page application
```

## Configuration

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | Atlas connection string; leave unset for local JSON mode |
| `MONGODB_DB_NAME` | Database name, defaults to `smartshift` |
| `MONGODB_DNS_SERVERS` | DNS resolver used for Atlas lookup; defaults to `8.8.8.8` |
| `PORT` | Local or hosting provider server port; defaults to `3000` |

Deployment is intentionally left for after the local Atlas-backed flows are confirmed. Never commit `.env` or publish database credentials.
