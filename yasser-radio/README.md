The one-button radio is isolated under /yasser-radio/. station.json lists the 26 approved source IDs in order, with public metadata.

The active schedule uses the 26 measured MP3s served directly under /yasser-radio/audio/.

Future releases: obtain permission for standalone audio distribution and the corresponding masters. Label each file VIDEO_ID.mp3 or VIDEO_ID.m4a. Listen to the beginning/end and check levels and identity against the selected recording. Use versioned HTTPS media storage with correct MIME types, byte ranges and sufficient bandwidth. Run prepare.py DIRECTORY HTTPS_BASE UTC_EPOCH --rights-confirmed; it decodes every file, measures duration and reports exact decoded duplicates. Review station.next.json, verify seeking on the actual host, then replace station.json. Retain older audio URLs during updates. Activate a new epoch and manifest together; clients recheck each minute. No secret is required. Run node timeline.test.mjs.

The server's uncached HTTP Date and a monotonic elapsed clock determine the current offset, including after a pause. AAC/MP3 delivery requires no continuously running encoder. Background playback depends on Safari, network and OS audio focus.
