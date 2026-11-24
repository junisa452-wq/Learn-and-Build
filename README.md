# LearnBuild

LearnBuild is a responsive learning platform with a same-origin JSON API and a MySQL-backed data store.

## Run locally

1. Install Node.js 22.13 or newer and MySQL 8 or newer.
2. Copy `.env.example` to `.env` and set `LEARNBUILD_DB_PASSWORD` to the password for the MySQL account.
3. Ensure that account can create the `learnbuild` database and its tables.
4. Run `npm install`, then `npm start`.
5. Open `http://127.0.0.1:3000` and create an account with a password of at least 12 characters.

The app creates the configured database, tables, indexes, and starter learning content on startup. Set `LEARNBUILD_DB_HOST`, `LEARNBUILD_DB_PORT`, `LEARNBUILD_DB_USER`, or `LEARNBUILD_DB_NAME` to use a different MySQL connection. `HOST` and `PORT` configure the web server. Keep `.env` private; it is ignored by git.

Run the API journey tests with `npm test`. The tests use isolated temporary SQLite databases and do not require a MySQL server.

## Deploy to Railway

GitHub stores the source; Railway runs the Node.js app and MySQL database.

1. Push this project to a GitHub repository. `.env`, the local database, and `node_modules` are excluded from git.
2. In Railway, create a project from that GitHub repository and add a MySQL service.
3. In the app service, set `HOST=0.0.0.0` and `NODE_ENV=production`.
4. Add Railway variable references for the MySQL service:
   - `LEARNBUILD_DB_HOST=${{MySQL.MYSQLHOST}}`
   - `LEARNBUILD_DB_PORT=${{MySQL.MYSQLPORT}}`
   - `LEARNBUILD_DB_USER=${{MySQL.MYSQLUSER}}`
   - `LEARNBUILD_DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}`
   - `LEARNBUILD_DB_NAME=${{MySQL.MYSQLDATABASE}}`
5. Generate a public domain for the app service in Railway.

Change `MySQL` in the variable references if the database service has a different name. The app creates its schema and seeded courses on first startup.

## Included

- Sign-up, sign-in, sign-out, private sessions, profile settings, account export and deletion.
- Searchable course catalog, learning paths, course modules and lessons.
- Enrollment, quiz attempts, resumable lesson position, completion and bookmarks.
- Project briefs, milestones, private/public submissions and opt-in portfolios.
- MySQL schema constraints, indexes, foreign keys, seeded learning content and audit events for important account and learning actions.

The seeded exercises are multiple-choice checks. This app deliberately does not execute learner-submitted source code. Add a separately operated, disposable execution service before offering code execution.

## Security notes

- Passwords use salted scrypt hashes; raw passwords are never stored.
- Session identifiers are random, stored only as hashes in MySQL, and sent in `HttpOnly`, `SameSite=Strict` cookies.
- Mutating API requests require a CSRF token and same-origin requests are checked.
- Responses set a restrictive Content Security Policy and common browser security headers.
- Inputs are validated server-side; API responses do not include stack traces.
- Sign-in and sign-up attempts are rate limited in memory.
- Profiles and project submissions are private by default. A learner must opt in to public visibility.

For production, serve only over HTTPS, set `NODE_ENV=production` so cookies use `Secure`, place the app behind a maintained reverse proxy, protect and back up the MySQL database, and replace the in-memory rate limiter with a shared store if running multiple app instances. This starter is not a substitute for a deployment-specific security review. Email verification, password recovery, staff authoring/publishing workflows, moderation tools, and isolated code execution are not included.
