export const RECENT_YEARS=new Set([1446,1447,1448]);
export function normalizeDigits(text){return String(text||'').replace(/[٠-٩۰-۹]/g,c=>String(c.charCodeAt(0)-(c<='٩'?0x660:0x6f0)))}
function groupForYear(year){return year>=1446?'recent':year>=1426&&year<=1436?'classic':'other'}
export function recordingEra(record){
 if(Number.isInteger(record.year)&&record.yearEvidence){return {hijriYear:record.year,era:groupForYear(record.year),yearEvidence:record.yearEvidence}}
 const text=normalizeDigits(record.title),years=[...new Set([...text.matchAll(/(?<!\d)(14\d\d)(?!\d)/g)].map(m=>Number(m[1])))];
 if(years.length===1)return {hijriYear:years[0],era:groupForYear(years[0]),yearEvidence:'Recording year explicitly stated in publisher title.'};
 const gregorian=[...new Set([...text.matchAll(/(?<!\d)(20[0-2]\d)(?!\d)/g)].map(m=>Number(m[1])))];
 if(gregorian.length===1){
  const year=gregorian[0];
  // Gregorian 2025 falls wholly in AH1446–1447. Other date-only
  // boundary years are conservatively uncertain, never assumed older.
  if(year>=2025)return {hijriYear:null,era:'recent',yearEvidence:`Publisher title dates this recording to Gregorian ${year}, within or after AH1446–1447.`};
  if(year<=2023)return {hijriYear:null,era:'other',yearEvidence:`Publisher title dates this recording to Gregorian ${year}, before AH1446.`};
 }
 return {hijriYear:null,era:'unknown',yearEvidence:'No unambiguous recording year established; included in the recent-year quota conservatively.'};
}
export function usesRecentBudget(video){return !video.prayer||!['classic','other'].includes(video.prayer.era)}
export function cappedIds(ids,videos,maxShare=.3){
 const result=[...new Set(ids)];
 // Preserve confirmed dated recordings first; undated items cannot silently
 // enlarge the older denominator. They remain in the source audit if held back.
 while(result.length&&result.filter(id=>usesRecentBudget(videos[id])).length>Math.floor(result.length*maxShare)){
  const unknown=result.findLastIndex(id=>videos[id].prayer?.era==='unknown');
  const index=unknown>=0?unknown:result.findLastIndex(id=>usesRecentBudget(videos[id]));
  result.splice(index,1);
 }
 return result;
}
