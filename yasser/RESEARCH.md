# Yasser Archives — source audit, 18 October 2026

Public sources were inspected before implementation. Media stays with YouTube; nothing is downloaded or rehosted.

- Supplied playlist: https://www.youtube.com/playlist?list=PLL6--64EqjIS0igVCak_YmaZntIc6G18H
- Public YouTube playlist metadata contained 161 entries: 3 deleted entries and 1 repeated video were excluded, leaving 157 distinct videos in Randomize. All other reciters remain included as requested. This is a snapshot, not an automatically updating playlist.
- Arabic YouTube searches for each full juz 20–30 and for Saba, Fatir, Sad, As-Saffat, Ghafir and Al-Mulk supplied additional candidates. Only explicitly attributed Yasser uploads were admitted. The combined As-Saffat/Sad/Az-Zumar results were excluded because their final verse range was not established.
- The 66 Juz selections combine publisher-labelled complete-juz videos and recordings of chapters wholly within their assigned juz. They are 66 video uploads, not necessarily 66 distinct performances. Short recordings are identified as such in the interface. Every source URL is https://www.youtube.com/watch?v= followed by its catalog ID. Catalog preserves publisher titles, channels and durations; sourceTitle preserves the original title when English name spelling is normalized.
- Juz boundaries: https://api.quran.com/api/v4/juzs . The canonical verse mappings are retained in catalog.json. Full Ya-Sin, Az-Zumar, Fussilat and combined As-Sajdah/Al-Insan uploads were deliberately excluded from single-juz classification because they cross boundaries. They remain in the playlist where applicable.
- Player implementation: https://developers.google.com/youtube/iframe_api_reference and https://developers.google.com/youtube/player_parameters . Native video and controls remain visible; API transport supplements them. Autoplay depends on the browser. Removed or embedding-disabled videos are skipped with a bounded retry and a direct YouTube link.
- Visual reference: https://www.rahmaniyyah.com/ . Navy, aqua, amber, Inter and generous spacing follow the existing Wise Recordings direction. The archive emblem was newly generated for this project.

Run `node yasser/test.mjs` from the repository root. This validates queue behavior and catalog integrity; source labels do not constitute a verse-by-verse audit of every recording. Availability changes after publication require a new catalog snapshot.
