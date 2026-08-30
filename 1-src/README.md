# WMC Presents: The 1% Club

This folder contains the WMC-branded live gameshow at `/1/`.

## Run it

```bash
npm install
npm run dev
```

Then open the address shown in Terminal.

- Host: `/1/`
- Player: `/1/join/`
- Question admin: `/1/admin/`

## Current stage

V1 is implemented and connected to Supabase. Separate devices can join through a PIN-prefilled QR link, names are unique per room, submissions are final, each player gets one pass except at 1%, and eliminated players stay connected as spectators.

The PNG bank is indexed at `../1/question-bank/manifest.json`: 57 complete, reviewed question/answer pairs across the 90%, 80%, 70%, 60%, 50%, 45%, 40%, 35%, 30%, 25%, 20%, 15%, 10%, 5% and 1% levels. The imported images are byte-for-byte copies. All answer types and exact accepted answers are explicit, and the same 57 records are enabled in Supabase.

The host chooses the timer length when creating a game. A question appears first, then the host starts the timer manually; reveal and next-question actions also remain manual. The host renders the question PNG and swaps to its answer PNG on reveal.

The administrator signs in at `/1/admin/` and can upload individual PNGs with metadata or safely re-import the reviewed bundled bank. The host-only How It Works video is available from the lobby.

Source lives in `/1-src/`. A production build writes only deployable files into `/1/`, which lets GitHub Pages serve the game without affecting the existing site routes.

## Re-index the local PNG folder

```bash
npm run index:questions -- "/Users/your-name/Downloads/WMC 1% Club"
```

This copies named pairs plus the three valid `download.png` questions that match otherwise-unpaired A4 answer slides. Unmatched files and samples are excluded.

## Verified V1 behavior

- host and player reconnect on refresh
- timer remains closed until manually started by the host
- duplicate names and repeat submissions are rejected
- no submission causes elimination on reveal
- pass can be used once and is unavailable at 1%
- eliminated players remain connected as spectators
- question and answer PNGs are host-only and reveal is manual
- past question usage reduces repeats across games
