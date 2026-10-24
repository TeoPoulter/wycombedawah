# Juz 1–7 research snapshot — 24 October 2026

Frozen candidate file: `juz-01-07.json`. These are research candidates for the central importer, not an assertion that every entry is a unique performance after global cross-source deduplication.

| Juz | Candidates | Official audio | YouTube | Explicit AH≤1445 | Recent/undated | Passage-anchor entries |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 70 | 35 | 35 | 56 | 14 | 47 |
| 2 | 64 | 45 | 19 | 60 | 4 | 38 |
| 3 | 150 | 92 | 58 | 145 | 5 | 116 |
| 4 | 152 | 96 | 56 | 147 | 5 | 113 |
| 5 | 74 | 54 | 20 | 71 | 3 | 42 |
| 6 | 63 | 29 | 34 | 58 | 5 | 46 |
| 7 | 111 | 57 | 54 | 99 | 12 | 86 |

## Sources and verification

- Official reciter archive: https://yaldosry.com/prayers and https://yaldosry.com/taraweeh . Recursively crawled all pre-1446 year categories and nested tarawih categories, collecting 4,635 official entry records in `shared-official-index.json`. Every admitted audio URL was extracted from its individual public archive page, not inferred from a filename or thumbnail. Dates are explicit archive category labels, retained with evidence URLs.
- Public YouTube search metadata: Arabic queries covering prayer names, chapter names, explicit verse ranges, opening/ending passages, Qur’an phrases and older Hijri years. Metadata was collected with yt-dlp flat search; no media downloads, cookies, authentication changes or playback workarounds were used. Metadata duration is retained only when available. Title/channel evidence identifies Yasser Al-Dosari; title evidence must additionally establish prayer/tarawih/venue context.
- Passage mapping: canonical Juz boundaries in `yasser/juz-map.json`, sourced by the parent from https://api.quran.com/api/v4/juzs . Exact Arabic Qur’an-phrase comparison used https://api.alquran.cloud/v1/quran/quran-simple . Harakat and orthographic alif variants were normalised; only unique exact phrase matches were accepted, with no fuzzy verse guessing.

## Passage evidence

`verseStart` / `verseEnd` are publisher-stated numeric ranges that lie within the assigned Juz. Triple-number Hijri dates immediately following a chapter name are explicitly excluded from range parsing.

`verifiedAnchorVerse`, `anchorEvidence` and `classification: documented-passage` mean the source documents a passage from this Juz; they do **not** claim the entire prayer is contained within it. This covers a unique Qur’an quotation, explicitly labelled opening/ending passages, or a source-stated prayer range continuing into the next Juz. No complete endpoints were invented for quote/ending/opening labels. Whole long chapters were not assigned blindly to all their Juz. Universal Fatiha was not used as padding.

Source-described ending anchors use canonical representative ending passages: Baqarah285, AlImran190, Nisa148, Maidah111. Their caveat remains in each entry. Opening labels map to verse1. Where a prayer continues into another chapter or Juz, the recording remains an honest documented-passage candidate rather than an exclusive-Juz claim.

## Media availability

`early-audio-availability.json` records HEAD checks of all411 official direct-audio sources considered in this pass: **410 returned HTTP200; one returned HTTP404**. The failed record **audio-prayers-5046** at https://yaldosry.com/prayers/5046 was excluded from the final candidate file. Its failed media URL was https://tilawatalharamain1.com/uploads/makki/1430/1/yaldosry/2025-10-19-15-47-58-5406810.mp3 . Two additional records ceased to qualify after the stricter date-versus-verse check, leaving408 official-audio candidates in the final snapshot.

HTTP200 verifies source availability at the check time, not a guarantee of future hosting, Safari playback or a full listening audit. Official audio duration remains null because the page does not expose it; the player obtains real duration from the media element. YouTube embeddability may vary and was not falsely reported as universally verified.

## Deduplication and quota

Duplicate IDs, identical media URLs and exact normalised YouTube title reposts were removed. Known official iframe-ID overlaps can be matched against `early-official-all-details.json`; central import should additionally merge dated prayer performances across audio and YouTube. Different excerpts of one prayer may still appear among the research candidates; final distinct-performance counts belong to the central consolidation and must not be inflated by reposts.

Undated YouTube clips were never assigned an old year based on a search query, upload date or aesthetic. Explicit AH1446 and later plus all undated entries belong to the capped pool. Each Juz in this frozen snapshot is already below30% recent/undated, and final import must preserve this after deduplication. No new filters or user-facing text were added by this research pass.

## Files to retain

Retain the frozen candidate JSON and this methodology note for integration/audit. `early-audio-availability.json`, `early-official-all-details.json` and `shared-official-index.json` provide additional audit evidence. Search JSON, raw HTML, Qur’an cache and one-off scripts under `early-cache` / `official-html` are reproducible intermediate research data and should be excluded from production publishing and ordinary commits.
