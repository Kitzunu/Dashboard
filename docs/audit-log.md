# Audit Log

## Setup

The Audit Log requires a separate `acore_dashboard` database. Create it once by running the included SQL file as a privileged user:

```bash
mysql -u root -p < sql/acore_dashboard.sql
```

This will:
1. Create the `acore_dashboard` database
2. Grant full access to the `acore@localhost` user
3. Create the `audit_logs` table with indexes

> If your MySQL user connects from a host other than `localhost` (e.g. `acore@%`), edit the `GRANT` line in `sql/acore_dashboard.sql` before running.

The dashboard will also auto-create the database and table on first startup if the configured user has `CREATE DATABASE` privileges — the SQL file is provided as a reliable, explicit alternative.

## What is logged

Every action that makes a change is recorded with the acting user, their IP address, a timestamp, and a details string describing what changed:

| Category        | Actions logged                                                                                                                                                                    |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Auth            | Login (success + reason for failure), logout                                                                                                                                      |
| Accounts        | Create, delete, set GM level, lock/unlock, set email, reset password, mute/unmute                                                                                                 |
| Bans            | Ban account/character/IP, unban all three types                                                                                                                                   |
| Servers         | Start, stop, scheduled restart, cancel restart                                                                                                                                    |
| MOTD            | Full new MOTD text recorded on every change                                                                                                                                       |
| Config          | File name + every changed `key: "old" → "new"` pair                                                                                                                               |
| Announcements   | Type and full message text                                                                                                                                                        |
| Console         | Every GM command executed                                                                                                                                                         |
| DB Query        | Database name and first 200 characters of the query                                                                                                                               |
| Autobroadcast   | Create (text + weight), update, delete                                                                                                                                            |
| Mail Server     | Template create, update (subject + active state), delete                                                                                                                          |
| Mail            | Recipient, subject, and type (text/items/money)                                                                                                                                   |
| Channels        | Unban player, delete channel                                                                                                                                                      |
| Bug Reports     | State change, assignee, comment updates                                                                                                                                           |
| Spam Reports    | Delete individual report, clear all                                                                                                                                               |
| Name Filters    | Add profanity name, remove profanity name, add reserved name, remove reserved name                                                                                                |
| Character Dumps | Export dump (`pdump.write` — character name, GUID, output path or download), import dump (`pdump.load` — character name, GUID, target account, source; failure logged with error) |
| Arena Teams     | Create team (name, type, captain), update team (rating, captain), delete team, remove member                                                                                      |
| Calendar        | Create event, update event, delete event                                                                                                                                          |
| Scheduled Tasks | Create, update, delete, run now                                                                                                                                                   |
| Backups         | Create (databases list), restore (filename + database), delete (filename)                                                                                                         |
| Batch Ops       | Batch kick, ban, mail, and GM level changes (per-target results)                                                                                                                  |
| Char Transfer   | Transfer character (GUID, from account, to account)                                                                                                                               |
| Sessions        | Revoke session, revoke all sessions                                                                                                                                               |
| Settings        | All setting changes (key=value pairs)                                                                                                                                             |
| Environment     | `.env` key changes with before→after values                                                                                                                                       |
| Dashboard       | Restart backend, restart agent, restart frontend                                                                                                                                  |
