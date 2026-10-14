# Wise Recordings

Buildless static player at /wise-recordings/. Run alongside the website, over HTTP. No framework, API key, login, or Drive token is shipped to visitors.

The first forty recordings were connected with the user's approval. Original audio bytes are hosted as release assets in the existing Wycombe Dawah GitHub repository; the index uses returned public asset URLs. Do not add mock recitations or guessed filenames. The private source folder is not polled by the public browser. Additional recordings can be imported after the remaining upload is complete.

## Recording index

recordings.json is UTF-8: {"version":1,"recordings":[]}. Each record requires `id` (stable, unique string), `filename` (exact original Drive filename, including extension), and `url` (a publicly playable HTTPS audio URL or relative same-site audio path). Optional fields: `teacher`, `surah`, `ayahs`, `date` (verified ISO YYYY-MM-DD), `duration` (measured seconds). Metadata is additional; never replace, abbreviate or rewrite filename. Optional ramadanYear, ramadanDay and dateLabel retain explicit Ramadan dates; Ramadan ordering places undated files last. Original ordering is the manifest order.

Keep original filenames when copying media; encode path segments in URLs. A Google Drive preview page is not a playable audio URL. Choose the streaming host after inspecting the actual file sizes/formats and access; do not publish Drive credentials. This approximately 1GB collection should not be committed blindly to the Git repository. The player loads the manifest only; it fetches audio only after a user selects a recording. For seeking, the media host should support HTTP byte-range requests and correct audio content types.

Supported controls: play/pause, seeking, ±10 seconds, previous/next, speed, optional continuous play, saved recordings, per-recording resume, mobile mini-player and system Media Session controls where supported. Progress is stored locally in the browser and storage failure does not block listening. No service worker or bulk caching downloads the collection. Lock-screen/background behavior follows the browser and device.

Private local playback, seek, speed, saved view and resume were browser-tested. Public-source playback is checked before publication. Ramadan ordering uses the explicit Hijri year and night in filenames; no Gregorian dates are invented.
