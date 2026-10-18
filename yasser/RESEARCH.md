# Yasser Archives — prayer recording curation, 18 October 2026

The Juz collections were rebuilt from Arabic YouTube searches for individual salah recitations. Studio mushaf recordings, whole-Juz compilations, imitators, obvious identical reposts and unrelated clips were rejected. Substantially different excerpts of one prayer may remain; counts are distinct video clips, not claims of unique prayer performances.

| Juz | Clips |
| --- | ---: |
| 20 | 56 |
| 21 | 107 |
| 22 | 78 |
| 23 | 65 |
| 24 | 61 |
| 25 | 93 |
| 26 | 87 |
| 27 | 88 |
| 28 | 77 |
| 29 | 79 |
| 30 | 86 |

877 active curated Juz selections. The original supplied playlist remains a separate, unchanged Randomize pool of 157 distinct available videos from 161 entries (3 deleted, 1 duplicate): https://www.youtube.com/playlist?list=PLL6--64EqjIS0igVCak_YmaZntIc6G18H . It may contain other reciters; no new videos were silently inserted into the supplied playlist.

## Evidence and classification

`prayer-sources.json` preserves every selected video ID, observed publisher title/channel/duration, Arabic search query and admission evidence. Original titles remain unchanged there. Display-name normalization preserves original wording in `sourceTitle` in the catalog. Each public source URL is https://www.youtube.com/watch?v= followed by its ID.

Chapter containment follows canonical verse mappings from https://api.quran.com/api/v4/juzs . Whole chapters lying inside a Juz can be classified from an explicit chapter label. Cross-boundary chapters such as An-Naml, Al-Ankabut and Fussilat require an explicit in-Juz verse range. Some generic prayer titles were corroborated using Arabic captions containing the actual passage.

Some recordings are continuous prayers with a principal passage in the indexed Juz and a brief companion passage in another Juz. They are indexed by the principal passage, preserving the complete prayer. Their companion chapters and exact ranges are recorded in `companionRanges` without treating the entire prayer as exclusive to its indexed Juz. These are single prayers, not compilations. As with other salah recordings, Al-Fatihah may be present.

Primary prayer archive corroboration includes https://yaldosry.com/prayers/4062 (Qasas1–28,Isha4-11-1434), https://yaldosry.com/prayers/4061 (Qasas29–50,Isha5-11-1434), https://yaldosry.com/prayers/4060 (Qasas71–88,Isha7-11-1434), https://yaldosry.com/prayers/4057 (Ankabut1–25,Isha10-11-1434), and https://yaldosry.com/prayers/4648 (Qasas14–28,Fajr14-1-1445).

Admission is based on public source metadata, archive evidence and captions where available. It is not a claim that every full recording was listened to and audited verse by verse. Availability and embed permissions may change after this snapshot.

## Player and validation

Videos stream in the visible native YouTube player; no media is downloaded or rehosted. Implementation follows https://developers.google.com/youtube/iframe_api_reference . Native controls and attribution stay visible. Autoplay depends on the browser; unavailable or embedding-disabled videos receive bounded retries and a direct YouTube fallback.

Run `node yasser/test.mjs` from the repository root. Checks enforce >=50 unique IDs per Juz, prayer provenance, primary range containment, documented companion passages, absence of compilation labels, complete source references, preserved playlist count and shuffle/history/repeat behavior. Browser checks cover responsive layout and representative playback; they do not certify every embedding policy.

Representative YouTube playback succeeded from all eleven Juz collections and Randomize. Phone layout at 375×812 had no horizontal overflow; removed notes/footer were absent.


## Older recordings and multi-select update

Added 99 further Salah recordings dated 1426–1436 AH, interpreted from the user's 1426–1336 typo. Date evidence is preserved per source; recording dates are never inferred from the Arabic search query or upload date. There are now 179 dated recordings from this preferred era across the active collections.

The Juz cards now toggle independently. Play selected starts a deduplicated union of the chosen ajza; Select all and Clear operate on that draft selection. Editing it does not interrupt the current prayer until Play selected is pressed. Personal-playlist Randomize remains separate and unchanged.

Every active Juz is capped at 30% for confirmed 1446–1447 AH recordings **plus undated or ambiguous-year recordings conservatively sharing that same quota**. Therefore every combination of ajza also obeys the cap. This is a collection-composition limit, not a guarantee about the first few random draws. One undated recording is retained in the source audit with `active:false` rather than counted as an older clip. The original user playlist is outside this curation policy.

`hijriYear` is displayed only when supported by source evidence. Explicit Gregorian 2025 dates are conservatively recognized as AH 1446–1447 without inventing a precise Hijri year; boundary dates and missing dates remain uncertain. Arabic and Persian numerals are normalized for the audit. All 2047 nonempty combinations are checked in `test.mjs` for membership, uniqueness and quota compliance.

To merge new dated research and reapply the quota: `node yasser/scripts/merge-curation.mjs <research-json> ...`. The importer preserves source provenance and original playlist membership. Canonical chapter lengths for companion passages come from the complete Quran.com Juz mappings in `chapter-lengths.json`.
