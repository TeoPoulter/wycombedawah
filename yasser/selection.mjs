export function selectedPool(catalog,numbers){
 const selected=new Set([...numbers].map(Number));
 return [...new Set(catalog.juz.filter(j=>selected.has(j.number)).flatMap(j=>j.ids))];
}
export function selectionLabel(numbers){
 const sorted=[...new Set([...numbers].map(Number))].filter(n=>Number.isInteger(n)&&n>=20&&n<=30).sort((a,b)=>a-b);
 if(!sorted.length)return 'Choose ajza';
 if(sorted.length===11)return 'Juz 20–30';
 if(sorted.length===1)return `Juz ${sorted[0]}`;
 return sorted.length<=4?`Juz ${sorted.join(', ')}`:`${sorted.length} ajza`;
}
