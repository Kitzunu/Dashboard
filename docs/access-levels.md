# Access Levels

The dashboard uses AzerothCore's `account_access` GM levels for role-based access.

| Level | Role          | Access                                                                                                                                                                                                                                                                                                                                                                       |
| ----- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1     | Moderator     | Overview, Console, Players (view), Tickets (view), Lag Reports, Bug Reports, Spam Reports (view), Channels (view), Calendar (view), Guilds (view), Arena Teams (view), Characters (view), Analytics, Changelog                                                                                                                                                              |
| 2     | Game Master   | + Kick/ban players, manage bans, mutes, announcements, send mail, accounts (view/lock/ban/mute), autobroadcast (add/edit), mail server (view), dismiss reports, delete spam reports, unban channel players, name filters (view/add/remove), export/import character dumps, remove arena team members, create/edit/delete calendar events                                     |
| 3     | Administrator | + Start/stop servers, scheduled restart, MOTD, DB Query, Config editor, scheduled tasks, backups (create/restore/download/delete), batch operations, character transfer, autobroadcast (delete), accounts (GM level/email/password/flags/create/delete), mail server (create/edit/delete), alert thresholds, clear all lag/spam reports, delete channels, Audit Log, Health Check, Sessions, Settings (including .env editor), Dashboard Management (restart backend/agent/frontend), create/edit/delete arena teams |

To grant GM level 3 (Administrator):

```sql
INSERT INTO account_access (id, gmlevel, RealmID)
SELECT id, 3, -1 FROM account WHERE username = 'YOUR_ACCOUNT';
```
