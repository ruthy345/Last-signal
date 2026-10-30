# LAST SIGNAL ONLINE — Alien Survival Co-op

A browser-based, real-time cooperative sci-fi survival game. Players connect to the same Node.js server, move around a shared arena, fight waves of fictional alien creatures with a fantasy pulse blaster, earn points and chat with teammates.

## Run it locally

1. Install Node.js 18 or newer.
2. Unzip this project.
3. Open a terminal in the project folder.
4. Run `npm install`
5. Run `npm start`
6. Visit `http://localhost:3000`

To test multiplayer locally, open the same address in two browser tabs.

## Publish it for players around the world

Deploy the whole project folder (not just `index.html`) to a Node.js host that supports persistent WebSocket connections, such as Render or Railway.

Typical host settings:
- Build command: `npm install`
- Start command: `npm start`

The host will provide a public HTTPS address. Share that address with players. The server must remain running for multiplayer to work.

## Controls

- WASD or arrow keys: move
- Mouse: aim
- Click or Space: fire the fictional pulse blaster
- Chat box: message everyone in the current server

## Notes

- This is a starter multiplayer game. Everyone who opens the same deployed server joins the same shared arena.
- Scores and the live match are held in server memory; they reset when the server restarts. The high-level foundation is ready for future upgrades such as persistent accounts, matchmaking regions, teams, mobile touch controls and more maps.
- Keep the server on a trusted host and add moderation, rate limits and persistent storage before operating at large public scale.
- All combat is fictional and stylized; no real-world weapon details are represented.
