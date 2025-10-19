HC Stock Exchange - Discord Bot (Render-ready)
===========================================

Files included:
 - index.js       : main bot code (token embedded as requested)
 - package.json   : npm metadata
 - db.json        : JSON storage (players, fantasy) - persisted in container filesystem
 - config.json    : editable configuration (owners etc)
 - README.md      : this file

Important notes:
 - You requested the token to be embedded directly in the code. This is insecure. Prefer using environment variable process.env.TOKEN and setting it in Render dashboard.
 - The bot uses a simple JSON file (db.json) to store player data. This is fine for a starter, but consider migrating to Firebase or another DB for production and guaranteed 2-year retention.
 - To deploy to Render:
    * Create a new Web Service, link to this repository (or upload ZIP), set start command: npm start
    * If you want to use env var instead of embedded token, replace TOKEN in index.js with process.env.TOKEN and set the TOKEN env var in Render settings.

Commands (prefix '!'):
 - !ping                       -> pong
 - !addplayer <name> [runs] [wickets] [balls] [overs] [economy] [strikeRate] [fantasy]
 - !editplayer <name> <field> <value>
 - !value <name>               -> shows computed market value
 - !listplayers                -> lists players and values
 - !owner                      -> owner panel (requires Manage Server permission) with interactive buttons

Security reminder:
 - Anyone with access to this ZIP or the running server can read the embedded token. Treat it like a password.
 - If your token is leaked, immediately go to Discord Developer Portal and Reset Token.
