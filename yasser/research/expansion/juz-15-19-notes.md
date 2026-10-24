# Juz15–19 verified expansion

Research completed2026-10-24. Final import array: `juz-15-19.json`.

| Juz | Distinct recordings | Official direct audio | YouTube | Explicit AH1426–1436 | Explicit Ad-Dakhil title | Undated |
|---|---:|---:|---:|---:|---:|---:|
|15|120|75|45|40|5|9|
|16|112|68|44|41|10|12|
|17|156|96|60|47|4|13|
|18|95|58|37|25|3|6|
|19|88|52|36|18|2|10|
|Total|571|349|222|171|24|50|

## Sources and evidence

- Primary archive: https://yaldosry.com/ prayer/taraweeh categories and393 individual recording pages. Exact source page, explicit recording-year category, and original archive title are retained per item. Shared category crawl owned by agent1–7; no second full crawl performed.
- Individual pages yielded393 distinct HTTPS MP3 sources. Metadata-only HTTPS HEAD checks returned200 for392 and404 for one. The failed source (`https://yaldosry.com/taraweeh/3382`) is excluded from the direct-audio imports. Final349 audio recordings survive passage/multiple-chapter/duplicate checks. Original public URLs are retained, never temporary archive.org redirect URLs.
- Eighty Arabic YouTube metadata searches, up to100 results each: chapter names plus Yasser Al-Dosari and specific salah/Ad-Dakhil terms. Whole-chapter and split-chapter searches are cached with query/title/channel/duration metadata. Published titles must explicitly identify the reciter, chapter/passage and salah context; mosque context is accepted when explicitly Ad-Dakhil.
- No media downloaded, no authentication used or bypassed. Direct-audio checks verify HTTP availability and media content type, not end-to-end human listening. YouTube entries are publisher metadata verified; embedded availability can still change independently.

## Passage classification

Canonical map: `yasser/juz-map.json`.

-15: Al-Isra17; Al-Kahf18:1–74.
-16: Al-Kahf18:75–110; Maryam19; Taha20.
-17: Al-Anbiya21; Al-Hajj22.
-18: Al-Muminun23; An-Nur24; Al-Furqan25:1–20.
-19: Al-Furqan25:21–77; Ash-Shuara26; An-Naml27:1–55.

For chapters wholly within a Juz, publisher surah identification suffices. For split chapters, records carry contained exact verse endpoints, or documented opening/closing/quoted-passage evidence with `anchorVerse`, `anchorEvidence`, and `classification: documented-passage`. An anchor is a main-passage index, not an invented assertion that every verse in the full prayer stays within that Juz. The Ibad ar-Rahman label is anchored at25:63. No undifferentiated complete Al-Kahf/Al-Furqan/An-Naml recording was assigned arbitrarily across its Juz boundary.

## Quality and duplication

- No newly imported item has an explicit AH1446+ date. All undated items count toward the conservative recent/unknown budget, and each Juz remains below30%.
- No inferred years from uploads or search queries. Categories and publisher titles are date evidence. Ad-Dakhil venue is only claimed when explicitly named; older dates alone do not prove venue.
- Excluded studio mushaf, whole-Juz compilations, imitations, processed edits, named mixed reciters, mixed-venue/full-surah compilation titles, and multiple-chapter prayers requiring further companion-passage verification.
- Removed identical IDs, identical normalised titles, same chapter/date/prayer reposts, repeated media URLs, and YouTube IDs already represented by official direct audio. Distinct extracts were not manufactured by splitting recordings. Audio IDs are route-qualified (`audio-prayers-N`, `audio-taraweeh-N`) because numeric route IDs overlap.
- Same undated historical prayer can still be reposted under an unrelated title; metadata cannot prove acoustic uniqueness in every case. No deliberate repost padding was used.

Reproducible scripts/caches are in `agent-15-19/`. `finalize.py` performs final merge, deduplication, quota checks and minimum50 assertions. `audio-head.json` records all393 checks; `final-dedup-review.json` records dated/title/multi-chapter exclusions. Only research files changed; app, importer, personal playlist and existing catalogs remain untouched by this agent.
