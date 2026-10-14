# Wise Recordings

Buildless static player at /wise-recordings/. Run alongside the website, over HTTP. No framework, API key, login, or Drive token is shipped to visitors.

The collection intentionally starts empty while the user's upload finishes. Do not add mock recitations or guessed filenames. The private source folder is not polled by the public browser. Connecting/importing the recording files is a separate step once the upload is complete.

## Recording index

recordings.json is UTF-8: {"version":1,"recordings":[]}. Each record requires `id` (stable, unique string), `filename` (exact original Drive filename, including extension), and `url` (a publicly playable HTTPS audio URL or relative same-site audio path). Optional fields: `teacher`, `surah`, `ayahs`, `date` (verified ISO YYYY-MM-DD), `duration` (measured seconds). Metadata is additional; never replace, abbreviate or rewrite filename. Date sorting places unknown dates last. Original ordering is the manifest order.

Keep original filenames when copying media; encode path segments in URLs. A Google Drive preview page is not a playable audio URL. Choose the streaming host after inspecting the actual file sizes/formats and access; do not publish Drive credentials. This approximately 1GB collection should not be committed blindly to the Git repository. The player loads the manifest only; it fetches audio only after a user selects a recording. For seeking, the media host should support HTTP byte-range requests and correct audio content types.

Supported controls: play/pause, seeking, ±10 seconds, previous/next, speed, optional continuous play, saved recordings, per-recording resume, mobile mini-player and system Media Session controls where supported. Progress is stored locally in the browser and storage failure does not block listening. No service worker or bulk caching downloads the collection. Lock-screen/background behavior follows the browser and device.

The current empty player cannot verify real-source playback until the files are connected. UI and core logic can be checked separately.
