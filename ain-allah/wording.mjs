// Editorial explanations are kept distinct from the quoted evidence records.
export function wordingEntries({records,esc,quote,sources}) {
 const find=id=>records.find(r=>r.id===id);
 const link=(href,label)=>`<a class="source" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
 const passage=(id,heading)=>{const r=find(id);return `<div class="wording-passage"><h4>${esc(heading)}</h4>${quote(r)}<div class="sources">${sources(r)}</div></div>`};
 const ref=(id,label)=>`<a href="#${id}">${esc(label)}</a>`;
 return [
  {id:'fawq-in-revelation',title:'Fawq: “above” is wording from revelation',badge:'Qur’an & Sunnah',content:`
   <p>The word <bdi class="arabic-inline" lang="ar" dir="rtl">فَوْقَ</bdi> (<em>fawqa</em>, “above”) occurs in the revealed texts themselves. In this Athari reading, affirming Allah’s highness follows these texts, without likening Him to His creation.</p>
   ${passage('q-16-50','“They fear their Lord above them”')}
   <p class="wording-observation">The wording in An-Nahl is <bdi class="arabic-inline" lang="ar" dir="rtl">مِنْ فَوْقِهِمْ</bdi> (<em>min fawqihim</em>). After <em>min</em>, the word is pronounced <em>fawqi</em>, with a kasrah. In the next verse below, it is <em>fawqa</em>, with a fatḥah.</p>
   ${passage('q-6-18','“Above His servants”')}
   ${passage('muslim-2713a','“There is nothing above You”')}
   <p>The Qur’an also uses <em>fawqa</em> in ${link('https://quran.com/6/61','Al-Anʿam 6:61')}. These passages establish the wording “above”; the verses specifically concerning the Throne use <em>istiwāʾ ʿalā al-ʿarsh</em>, as in ${ref('q-20-5','Ta-Ha 20:5 and the other six passages')}.</p>`},
  {id:'above-rather-than-on',title:'Why “above the Throne” is clearer English',badge:'Translation note',content:`
   <p><strong>This page prefers “above the Throne” when stating the belief, and “rose over the Throne” when translating <em>istiwāʾ</em>.</strong> “Above” expresses highness directly, without adding an image of a body sitting on a surface.</p>
   <p>In ordinary English, “on” often suggests contact or support, as when something rests on a table. “Above” is therefore a clearer choice for readers who might otherwise imagine that kind of relationship. This is a reason for careful translation, not a claim that every use of the English word “on” necessarily asserts physical contact.</p>
   <div class="sources">${link('https://dictionary.cambridge.org/dictionary/english/on','Cambridge Dictionary: the spatial sense of “on”')}</div>
   <p>The Arabic of revelation remains <bdi class="arabic-inline" lang="ar" dir="rtl">عَلَى الْعَرْشِ اسْتَوَىٰ</bdi>. We affirm that wording as well as the texts using <em>fawq</em>. An English preference does not replace the Qur’an’s <em>ʿalā</em>, nor establish a theory about contact, distance or the manner of Allah’s istiwa.</p>
   <p>The expression “above His Throne” is also transmitted from the early scholars:</p>
   ${passage('salaf-awzai','Al-Awzaʿī: above His Throne')}
   <p>Al-Dhahabī cautions against adding assertions about contact or its absence, treating those as questions about the unknown manner, while affirming in general that Allah is above His Throne.</p><div class="sources">${link('https://www.islamweb.net/ar/library/content/1046/558/القيرواني','Al-Dhahabī, al-ʿUluww, entry 585, p. 261')}</div>
   <p class="wording-observation">The case for “above” is both textual and linguistic. A person’s intended meaning must be understood before judging a translation that uses “on” or “upon”.</p>`},
  {id:'above-without-tashbih',title:'Affirmation without tashbīh',badge:'A principle of belief',content:`
   <p><em>Tashbīh</em> means likening Allah to His creation. In the Athari account of Ahl al-Sunnah presented here, affirming that Allah is above His creation and above His Throne does not mean that His attributes resemble ours. The meaning is affirmed; the manner is not described.</p>
   ${passage('q-42-11','Nothing is like Him')}
   <p>Al-Awzaʿī and al-Dārimī affirm highness; Mālik’s answer forbids pursuing the “how”. Ibn Taymiyyah likewise affirms highness alongside nearness, and rejects the idea that the created heaven carries or shelters Allah. These explanations bring affirmation and incomparability together.</p>
   <p class="wording-crossrefs">Read ${ref('salaf-awzai','al-Awzaʿī')}, ${ref('salaf-darimi','al-Dārimī')}, ${ref('salaf-malik','Mālik')} and ${ref('scholar-ibn-taymiyyah','Ibn Taymiyyah')} with their sources.</p>
   <p class="wording-observation">Within this Athari understanding, denying Allah’s highness conflicts with the affirmed doctrine. The expressions “no scholar denied it” and “Ahl al-Sunnah agreed” still need a stated historical scope: the ${ref('ijma','reported ijmāʿ passages')} preserve their authors’ actual claims. They are not used here to erase the known differences between theological schools or between scholars over additional terminology.</p>`},
  {id:'four-istiwa-explanations',title:'The four explanations listed by Ibn al-Qayyim',badge:'Scholarly terminology',content:`
   <p>Ibn al-Qayyim lists four expressions in his <em>Nūniyyah</em>. These are reported scholarly explanations of <em>istiwāʾ</em>, not four new Qur’anic names or four descriptions of its physical manner.</p>
   <dl class="term-list">
    <div><dt lang="ar" dir="rtl">عَلَا</dt><dd><strong>ʿAlā</strong>
     <span>Was high; rose above.</span></dd></div>
    <div><dt lang="ar" dir="rtl">اِرْتَفَعَ</dt><dd><strong>Irtafaʿa</strong>
     <span>Rose; was elevated.</span></dd></div>
    <div><dt lang="ar" dir="rtl">صَعِدَ</dt><dd><strong>Ṣaʿida</strong>
     <span>Ascended.</span></dd></div>
    <div><dt lang="ar" dir="rtl">اِسْتَقَرَّ</dt><dd><strong>Istaqarra</strong>
     <span>Became established; settled (an ordinary-language gloss). The noun is <em>istiqrār</em>.</span></dd></div>
   </dl>
   <p>These brief English glosses identify the Arabic words. They do not specify how an attribute applies to Allah. The first three concern highness or rising; <em>istiqrār</em> adds a meaning that scholars have discussed separately.</p>
   <div class="sources">${link('https://www.ibnalqayem.net/books/078.pdf','Ibn al-Qayyim, selected Nūniyyah, printed p. 8, verses 61–64')}</div>
   <p>Ibn ʿUthaymīn accepts the four explanations and distinguishes <em>istiqrār</em> from highness alone. Al-Dhahabī expressly prefers not to use <em>istaqarra</em>; al-Albānī also objects to introducing <em>istiqrār</em> as a divine description. Consequently, this is a list reported by Ibn al-Qayyim, not a claim that every Salafi scholar accepted every term.</p>
   <div class="sources">${link('https://alathar.net/home/esound/index.php?coid=129797&op=codevi','Ibn ʿUthaymīn, Nūniyyah lesson 16b: the four expressions')} ${link('https://alathar.net/home/esound/index.php?coid=5179&op=codevi','Al-Albānī, al-Hudā wa-l-nūr, recording 569, item 2')}</div>
   <div class="wording-passage"><h4>Al-Dhahabī’s reservation about istaqarra</h4><blockquote><p class="arabic" lang="ar" dir="rtl">لَا يُعْجِبُنِي قَوْلُهُ اسْتَقَرَّ، بَلْ أَقُولُ كَمَا قَالَ مَالِكٌ الْإِمَامُ: الِاسْتِوَاءُ مَعْلُومٌ</p><span class="translation-label">Excerpt · English meaning</span><p class="translation">I do not favour his saying “istaqarra”; rather, I say as Imam Mālik said: “Istiwāʾ is known.”</p></blockquote><div class="sources">${link('https://www.islamweb.net/ar/library/content/1046/559/البغوي','Al-Dhahabī, al-ʿUluww, entry 586, p. 262')}</div></div>
   <p>This reservation concerns an additional expression. It is not a denial of “above”: al-Dhahabī affirms that wording in the preceding discussion.</p>
   <p class="wording-observation">The clear wording used in this collection remains <em>istiwāʾ</em>, highness and “above”, without a description of the manner.</p>`},
  {id:'sitting-terminology',title:'Jalasa and qaʿada: why this page avoids “sitting”',badge:'A disputed explanation',content:`
   <p><bdi class="arabic-inline" lang="ar" dir="rtl">جَلَسَ</bdi> (<em>jalasa</em>) and <bdi class="arabic-inline" lang="ar" dir="rtl">قَعَدَ</bdi> (<em>qaʿada</em>) are words for sitting. They are not the words of the Qur’anic Throne verses, and they are not among the four expressions listed above.</p>
   <p>Some scholars transmitted or discussed sitting terminology; others rejected applying it to Allah. Ibn ʿUthaymīn mentions its attribution to some early scholars in one lesson; in another answer, he treats applying it to Allah cautiously and conditionally. Al-Albānī rejects the sitting report under discussion as unestablished and does not accept the wording as an established divine description. That disagreement must be represented honestly.</p>
   <p>Calling them simply “the two weak meanings” confuses two questions: whether a particular narration has a sound chain, and whether an explanatory term is justified. A report’s authenticity must be assessed individually; a word itself does not have a chain of transmission.</p>
   <p class="wording-observation">For that reason, this page does not translate istiwa as “sat down”. It retains the revealed wording and the well-attested explanations of highness, while leaving the manner to Allah.</p>
   <div class="sources">${link('https://old.binothaimeen.net/content/2229','Ibn ʿUthaymīn, official website: Open Door meeting 11')} ${link('https://alathar.net/home/esound/index.php?coid=131550&op=codevi','Ibn ʿUthaymīn, Nūniyyah lesson 49b')} ${link('https://alathar.net/home/esound/index.php?coid=5179&op=codevi','Al-Albānī, al-Hudā wa-l-nūr, recording 569, item 2')}</div>`}
 ];
}
