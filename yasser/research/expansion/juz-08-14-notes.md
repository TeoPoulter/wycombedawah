# Juz 8–14 research, 24 October 2026

Verified publisher metadata and original prayer archive media, prepared for integration.

| Juz | Recordings | AH1446+ or undated |
|---|---:|---:|
| 8 | 58 | 3 (5.2%) |
| 9 | 43 | 5 (11.6%) |
| 10 | 27 | 1 (3.7%) |
| 11 | 135 | 22 (16.3%) |
| 12 | 43 | 6 (14.0%) |
| 13 | 165 | 21 (12.7%) |
| 14 | 165 | 36 (21.8%) |

## Sources and method

- Original primary source: https://yaldosry.com prayer and taraweeh archive. Each retained audio entry was resolved from the actual individual item HTML MP3 `<source>`; thumbnail YouTube IDs were deliberately not used as evidence because the archive sometimes reuses thumbnails.
- Additional YouTube entries use observed flat-search metadata (title, channel, duration), rather than search-query words or upload dates. Arabic searches cover prayer type, chapter, older Hijri recording years, and passage openings/quotes.
- Quran mapping: https://api.alquran.cloud/v1/quran/quran-simple, cached in agent-08-14/quran-simple.json. Exact unique contiguous publisher quotes identify verse anchors. Full chapters wholly contained in one Juz require no guessed verse anchor.
- Explicit verse ranges are retained only when publisher metadata states them. Explicit opening/closing labels use documented-passage classification; closing-region anchors do not claim the whole clip starts or ends at a guessed verse. Single continuous prayers with explicit cross-boundary ranges retain documentedRecordingRange and an identified passage anchor.
- Studio mushaf, obvious compilation collections, imitations and identified repeated performances were excluded. Originals are preferred to same prayer/date/chapter reposts. 121 repeated dated performances plus eight manually identified uncertain/repeated YouTube entries were removed.
- Each Juz is capped at 30% combined AH1446+ and undated recordings. A year is a recording year explicitly stated in title or original archive category; title takes precedence and conflicts are noted.
- Null audio duration means unknown, not zero. Actual duration is supplied by the native player. Sample original MP3 URL responded HTTP200 audio/mpeg and Accept-Ranges:bytes; every official record has a verified media source in its original item page. No media files were downloaded.

## Integration limitations

- Juz9/10/12 require the separately researched supplementary global-quote sources in agent-09-10-12, plus their YouTube additions, to reach the requested minimum50. This file intentionally does not inflate those pools with unclassified full-surah titles.
- Metadata verifies publisher attribution and passage placement, not a listening audit of every second or an assurance that third-party media remains available forever.

## Reproducibility

- agent-08-14/classify.py: independent YouTube publisher-title classification.
- agent-08-14/official.py: exact official classification and original item media resolution.
- agent-08-14/merge.py: source preference, identity/date dedupe, quota enforcement.
- Raw search JSON and original official HTML caches are preserved alongside research outputs.
