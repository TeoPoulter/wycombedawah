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
