# Birthday invite + RSVP

A full-stack invite: a styled invitation page with a live countdown, an RSVP form,
a public "who's coming" list, and a host dashboard (remove guests, download CSV).
No dependencies and no `npm install`. It needs only **Node.js 18 or newer** (https://nodejs.org).

## Run it
1. Open `config.json` and edit your name, date, venue, message and `adminPin`.
2. In a terminal inside this folder: `node server.js`
3. Invite page: http://localhost:3000   Host dashboard: http://localhost:3000/admin.html

RSVPs are saved to `data/rsvps.json`. Stop with Ctrl+C. Restart after editing `config.json`.

## In VS Code
Open the folder, then Terminal > New Terminal and run `node server.js`.

## Let guests on your Wi-Fi open it
Find your PC's local IP (`ipconfig` on Windows, `ifconfig` on Mac/Linux) and share
`http://YOUR-IP:3000`. To invite people anywhere, use a tunnel such as
`cloudflared tunnel --url http://localhost:3000` or deploy to Render, Railway or Fly.io.

## Notes
- A guest who RSVPs again with the same name updates their answer.
- Set `"showGuestList": false` to keep the guest list private to you.
- Change `adminPin` before sharing the link with anyone.
