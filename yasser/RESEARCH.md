> Update, 24 October 2026: removed 168 newly added AH1445/1446 recordings at the user's request. Current total: 3,355, with at least60 per Juz. The original expansion statistics below describe the pre-removal snapshot. Exclusions persist through future imports; the personal playlist is unchanged. Removal uses explicit recording years, not measured recitation tempo.

# Yasser Archives — full Mushaf expansion, 24 October 2026

3,523 active sourced recordings across Juz1–30, with at least50 in every Juz. 1,253 are original publisher audio streams and 2,270 are YouTube videos. 1,041 have explicit recording-date evidence within AH1426–1436. At least158 active titles or venue fields explicitly identify Masjid Ad-Dakhil; an old year alone is never treated as proof of venue. These are recordings by Yasser Al-Dosari, not another reciter named Ad-Dakhil.

| Juz | Recordings | Original audio |
|---|---:|---:|
| 1 | 70 | 35 |
| 2 | 64 | 45 |
| 3 | 143 | 92 |
| 4 | 150 | 96 |
| 5 | 73 | 54 |
| 6 | 63 | 29 |
| 7 | 107 | 57 |
| 8 | 77 | 55 |
| 9 | 89 | 56 |
| 10 | 61 | 36 |
| 11 | 134 | 84 |
| 12 | 90 | 44 |
| 13 | 164 | 125 |
| 14 | 165 | 96 |
| 15 | 120 | 75 |
| 16 | 112 | 68 |
| 17 | 156 | 96 |
| 18 | 95 | 58 |
| 19 | 88 | 52 |
| 20 | 61 | 0 |
| 21 | 148 | 0 |
| 22 | 110 | 0 |
| 23 | 74 | 0 |
| 24 | 68 | 0 |
| 25 | 145 | 0 |
| 26 | 110 | 0 |
| 27 | 132 | 0 |
| 28 | 124 | 0 |
| 29 | 195 | 0 |
| 30 | 335 | 0 |

## Sources and admission

Arabic research covers chapter names, prayer types, quoted passages and recording years. Primary archive: https://yaldosry.com/ . Individual prayer/taraweeh pages supply original media URLs; some also verify the matching YouTube iframe. Each `prayer-sources.json` item preserves publisher title, source URL, query, admission evidence, recording-date evidence and active/held status. Candidate snapshots and bounded methodology notes are in `research/expansion/`; raw search/HTML caches are excluded from publication.

Original publisher audio is streamed directly from the archive's linked HTTPS MP3 hosts. Media is neither downloaded nor rehosted. `duration:null` means unknown until the native audio player reports metadata. Audio uses the same transport controls as video. Archive thumbnail video IDs are not accepted as proof of a unique prayer; where a detail-page iframe verifies an alternate delivery, original audio is preferred. Exact repeated media URLs are excluded. Researchers removed obvious identical-title, dated-performance and recognised repost duplicates. Counts are distinct sourced clips, not a guarantee of unique performances; unrecognised excerpts of the same prayer may remain.

Studio mushaf recordings, whole-Juz compilations, imitators and uncertain chapter assignments are excluded. Metadata admission does not imply every complete recording was listened to verse by verse. Third-party sources can later disappear or restrict playback.

## Juz evidence

Canonical boundaries: https://api.quran.com/api/v4/juzs , retained as `juz-map.json`. A chapter wholly inside one Juz may be classified from its explicit publisher label. Split chapters require an explicitly documented range or a verified Quran verse anchor from the publisher's quoted passage/opening/ending label. Quote matching uses https://api.alquran.cloud/v1/quran/quran-simple . Anchor evidence is stored separately from complete verse ranges; an unknown passage endpoint is never invented.

Collections associate a complete recording with a documented passage in that Juz. A single continuous prayer may also contain companion verses or continue beyond that Juz; association does not claim exclusivity. Al-Fatihah does not inflate Juz1. Every source ID has one principal Juz assignment.

## Date policy and personal playlist

Every Juz permits at most30% combined confirmed AH1446+ and undated/ambiguous recordings. All combinations therefore obey the same composition cap. A random handful can still contain more recent clips. Explicit publisher recording dates take precedence; upload dates and query terms are not recording-date evidence. The recent-year floor includes AH1448 and future years.

Teo’s Playlist remains the original separate pool of157 distinct available videos, unchanged, including its other reciters: https://www.youtube.com/playlist?list=PLL6--64EqjIS0igVCak_YmaZntIc6G18H . This curation quota does not filter that playlist.

## Save/resume and validation

Local storage remembers draft ajza, active selection, current recording, playback position, shuffle history/bag, repeat state and chooser/player view. Refresh restores the recording paused at the saved position; Play resumes it. Progress saves every4seconds plus seek, pause, page hide and visibility changes. This is per browser/device, with no account or cloud sync. Denied/corrupt storage is handled without breaking playback.

Run `node yasser/test.mjs`, `node yasser/embed.test.mjs`, and `node --test yasser/session.test.mjs yasser/audio-player.test.mjs yasser/app.test.mjs`. Checks cover all30 minimum counts, source evidence, canonical range/anchor placement, unique principal IDs, all465 single/pair combinations plus2000 seeded selection subsets, quota invariants, preserved playlist, queue behaviour, provider switching and paused timestamp restoration. Disjoint IDs and per-Juz quotas mathematically imply the cap for every union.

All1,253 active original audio URLs returned HTTP200 with audio/mpeg on24October2026, using HEAD requests (no media downloads). This verifies source reachability, not complete decode/playback on every device.

Controller tests use DOM/provider fakes; they are not browser or physical iPad playback tests. This expansion has no fresh browser-session visual or end-to-end playback certification. YouTube's Safari bot/sign-in challenge remains provider-controlled; original audio does not require a YouTube session. Browser privacy settings are not modified.

Rebuild from the baseline plus candidate arrays using `node yasser/scripts/merge-curation.mjs <candidate-json> ...`. The importer validates provenance and passage proof, removes verified alternate deliveries, applies the quota and refuses to publish if any Juz has fewer than50 recordings.
