> Update, 24 October 2026: removed 168 newly added AH1445/1446 recordings at the user's request. Current total: 3,355, with at least60 per Juz. The original expansion statistics below describe the pre-removal snapshot. Exclusions persist through future imports; the personal playlist is unchanged. Removal uses explicit recording years, not measured recitation tempo.

# Yasser Archives

Live: https://wycombedawah.com/yasser/

## Full Mushaf update — 24 October 2026

- Juz1–30 with 3,523 sourced recordings; every Juz has at least50.
- 1,253 original audio streams alongside YouTube, using the existing controls.
- Multi-select and random playback retained; no new filters. Teo’s Playlist remains157 videos.
- Selected ajza and listening position persist locally. Refresh restores paused; press Play to continue. Storage is per browser/device and may be unavailable in private/restricted modes.
- Thirty-card chooser adapts to compact screens. No navigation or other Wycombe Dawah pages changed.
- AH1446+ and undated sources together remain at most30% in every Juz and selection union.

See `RESEARCH.md` for counts, source methodology, classification limits and test commands. New controller/audio/session tests pass; no fresh physical-iPad or browser layout QA is claimed. YouTube may still show its provider-controlled Safari verification challenge. Original audio sources do not depend on YouTube authentication.


### Full-screen portal (18 October 2026)

The chooser and listening view now occupy separate viewport screens. A brief logo intro respects reduced-motion settings. Selection actions animate into view only when the draft includes ajza; returning to the chooser pauses playback and retains the draft. Personal-playlist playback uses Teo’s playlist branding, without attributing other reciters to Yasser. Inline SVG transport controls replace platform-dependent text glyphs. Loop recording repeats the current video; switching it off restores continuous shuffled playback. The seek bar interpolates the YouTube clock between samples and supports touch, pointer cancellation, and keyboard jumps of ten seconds.

Responsive checks covered 320×568 and 375×812 phone sizes, 768×1024, 1024×768, 820×1180 and 1180×820 tablet sizes, plus phone landscape. Visible player controls and the selection action fit within the viewport, with no document overflow. YouTube’s native control bar is hidden using the supported controls=0 embed setting; YouTube may still display its own title, branding and overlays. These are browser viewport checks, not tests on physical iPad hardware.

### Opening and Home Screen refinement

The opening now uses a large two-line Inter wordmark, Arabic typography, illuminated emblem, animated geometric rings and a circular reveal inspired by Study in Madinah. It can be skipped and is omitted for reduced-motion users. Apple touch icon and standalone web manifest use the archive emblem. Space toggles playback and left/right arrows seek ten seconds when the archive page has keyboard focus; editable fields are excluded. The seek slider retains accessible keyboard control. Personal playlist headings use Teo’s Playlist. Undated recordings no longer show a redundant YouTube label.

### Playback recovery (20 October 2026)

The player now uses the standard youtube.com embed instead of the privacy-enhanced host. YouTube may still require verification: a Safari sign-in does not guarantee that an embedded or installed web app shares that session. Provider restrictions (101/150) now preserve the selected recording and show Retry, Next recording, and an exact-video external link; only a confirmed missing video (100) triggers bounded automatic skips. Retry rebuilds the iframe without resetting the shuffle queue and retains the playback position. A stalled load also exposes recovery actions. No credentials, browser privacy settings or YouTube verification checks are modified.

Validation: embed URL/error-policy regression tests, full catalogue checks, and browser playback plus a simulated provider connection failure followed by successful retry of the same recording. An additional live check in the user's signed-in Safari session still showed YouTube's bot-verification screen; the new recovery buttons were present with the correct recording URL. The update does not clear or bypass that provider challenge.

### Motion refinement — 24 October 2026

Finite staggered ajza entrances, chooser/player and title reveals, tactile transport states, smoother selection-action expansion and seek-thumb feedback. Media commands remain synchronous; animations never replace the provider iframe. Web Animations are feature-detected, interrupted reveals are cancelled, and Reduce Motion disables effects including when changed during the session. Existing controller/session/audio/catalogue tests pass. Fresh browser visual QA was unavailable for this update.

### Admin curation and listening library — 26 October 2026

Open **Library → Admin sign in**. Password validation is server-side; the client contains no password. A random revocable bearer session is saved on this browser for90days (unless storage is cleared/blocked). The requested short password is not strong authentication: anyone who knows or guesses it can administer the archive. Login is limited to8 attempts per15-minute window per IP. Sign out revokes that device's session.

Signed-in admins see **Remove recording** in the player and **Remove/Restore** in History/Removed. Successful removal is global, applies to both curated selections and Teo’s Playlist, skips the current recording and offers Undo. Other open players refresh exclusions every45seconds. New loads use the last cached exclusions while fetching current state. Offline writes fail visibly and never pretend to be saved. Admin decisions can intentionally take a Juz below the original minimum; no automatic filler restores unwanted tracks.

Shared curation lives in D1 at https://yasser-archive-curation.teopoulter.chatgpt.site/api/curation . Sites project `appgprj_6adf148c05b481919a3d821ba95e5599`; separate source checkout `../yasser-admin-service` is synced to its Sites repository. Runtime secret name: `ADMIN_PASSWORD`. CORS is restricted to the two Wycombe Dawah origins; every mutation requires a server-validated token. Database stores hashed sessions and recording exclusion IDs, not listening history or plaintext passwords. History stays in local storage, limited to200 listening visits, and starts only on actual provider playback. It retains progress, dates, completion and resume actions. Storage denial is graceful; saved history/sign-in requires available browser storage.

Surah headings derive from verified chapter metadata. Prayer/year detail is displayed only when supported; the publisher's original title remains visible. Playlist entries without passage evidence retain their own titles without invented surah/reciter attribution.

Teo’s original YouTube playlist was refreshed on26October2026:167 distinct available metadata entries from176 entries. All reciters retained. `scripts/refresh-playlist.mjs` safely imports a fresh full yt-dlp metadata snapshot and records `playlist-snapshot.json`; it does not silently filter by reciter, overwrite curated provenance, or assume new playlist clips belong to a Juz. This is a refreshed snapshot, not automatic daily synchronization.

Validation: catalogue/queue/session/audio/controller tests, new history/exclusion/title tests, and live API authorization/removal/restore checks. Browser visual and physical iPad verification remain unavailable in this session.

### Admin favourites — 26 October 2026

Signed-in admins can toggle the heart beside the player controls or Favourite/Unfavourite a row in the library. The third Favourites tab offers Play, Unfavourite and Remove/Restore. Favourites are stored in the shared D1 service and read/write endpoints require a valid admin session; anonymous visitors cannot list or edit them. Saving favourites does not change public shuffle weighting. Removed favourites remain saved but cannot play until restored. Lists refresh on opening and during the existing45-second refresh interval. Failed saves leave the previous state intact.

### Cross-device admin listening — 26 October 2026

Admin history, selected ajza, repeat preference, current recording and timestamp now persist in the shared D1 service. Existing device history is merged when signing in; latest200 listening visits are retained. Favourites and exclusions already share that service. Returning devices restore paused at the saved position, unless playback or a new user interaction has already started locally. Background sync merges history without taking over an active player. An idle device does not write unchanged state.

Changed progress is saved locally immediately and queued for sync (normally within a few seconds while listening); the Library footer reports sync/pending status. A private local outbox retries interrupted writes on reconnect/reload. Session headers authorize all history/state reads and writes; public catalogue/exclusion responses contain no admin history. Visits merge by unique key and edit timestamp, so stale retries do not overwrite newer progress; newer backward seeks remain valid. Device clocks should be set automatically. Browser/device-private history remains local for signed-out visitors; admin cache and outbox use separate storage keys. Sign-out switches back to visitor history and revokes that device's token.

Verification: two-client sync/idle/offline/reload unit tests, real SQLite tests of the D1 merge SQL and validation, existing playback tests, and live protected read/no-op-sync endpoint checks. No physical-device/browser visual QA is claimed.
