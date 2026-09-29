/* BMC Gála 2026 – LED fal adatmodell
   A cégadatok a companies.js-ből jönnek (Ledfal data.xlsx), a számok abból számolódnak.
   Itt a kézzel írt tartalom van: timeline-szövegek, Global Journey, a mai este. */

window.BMC = (function () {
  const G = window.BMC_DATA;   // companies.js – a Ledfal data.xlsx-ből generálva (tools/build_data.py)

  const companies = G.companies.map(c => Object.assign({}, c, {
    wins: c.years.length,
    first: c.years[0],
    place: c.city || (c.county + ' megye')   // cím nélkül csak a megye ismert
  }));

  const countYear = y => companies.filter(c => c.years.indexOf(y) >= 0).length;
  const recognitions = companies.reduce((s, c) => s + c.wins, 0);
  const fiveTimes = companies.filter(c => c.wins === 5).length;

  const years = [2022, 2023, 2024, 2025, 2026];

  const timeline = [
    { year: 2022, count: countYear(2022), title: 'A kezdet', program: 'I. program',
      text: 'Elindult a Best Managed Companies program Magyarországon, 10 elismert vállalattal.' },
    { year: 2023, count: countYear(2023), title: 'Bővülő közösség', program: 'II. program',
      text: 'A II. programban már 16 vállalat kapott Best Managed elismerést, és megjelentek az első visszatérő nyertesek.' },
    { year: 2024, count: countYear(2024), title: 'Stabil növekedés', program: 'III. program',
      text: 'A III. programban 21 vállalat alkotta a Best Managed közösséget. Egyre több vállalat tért vissza újra az elismerésért.' },
    { year: 2025, count: countYear(2025), title: 'Erősödő közösség', program: 'IV. program',
      text: 'A IV. programban már 26 vállalat részesült elismerésben, tovább nőtt a visszatérő és többszörös nyertesek aránya.' },
    { year: 2026, count: countYear(2026), title: 'Jubileumi mérföldkő', program: 'V. jubileumi program',
      text: 'Az V., jubileumi programban 28 vállalat kapott Best Managed elismerést. Hat vállalat ötödik alkalommal nyerte el a címet.' }
  ];

  const summary = [
    { value: '5', unit: 'éve', label: 'a program Magyarországon' },
    { value: String(recognitions), unit: 'elismerés', label: 'öt program alatt' },
    { value: String(countYear(2026)), unit: 'Best Managed vállalat', label: 'a 2026-os programban' },
    { value: String(fiveTimes), unit: 'ötszörösen díjazott', label: 'vállalat' }
  ];

  /* Global Journey – a program 45+ országban működik.
     A világ-atlasz országneveihez illesztve. year: null = adat érkezik. */
  const world = [
    ['Canada', 'Kanada', 1993], ['United States of America', 'Egyesült Államok', null],
    ['Mexico', 'Mexikó', null], ['Brazil', 'Brazília', null], ['Argentina', 'Argentína', null],
    ['Chile', 'Chile', null], ['Colombia', 'Kolumbia', null], ['Costa Rica', 'Costa Rica', null],
    ['Ireland', 'Írország', null], ['United Kingdom', 'Egyesült Királyság', null],
    ['Netherlands', 'Hollandia', null], ['Belgium', 'Belgium', null], ['Germany', 'Németország', null],
    ['Austria', 'Ausztria', null], ['Switzerland', 'Svájc', null], ['France', 'Franciaország', null],
    ['Spain', 'Spanyolország', null], ['Portugal', 'Portugália', null], ['Italy', 'Olaszország', null],
    ['Denmark', 'Dánia', null], ['Norway', 'Norvégia', null], ['Sweden', 'Svédország', null],
    ['Finland', 'Finnország', null], ['Poland', 'Lengyelország', null], ['Czechia', 'Csehország', null],
    ['Slovakia', 'Szlovákia', null], ['Hungary', 'Magyarország', 2022], ['Romania', 'Románia', null],
    ['Slovenia', 'Szlovénia', null], ['Croatia', 'Horvátország', null], ['Greece', 'Görögország', null],
    ['Turkey', 'Törökország', null], ['Israel', 'Izrael', null],
    ['United Arab Emirates', 'Egyesült Arab Emírségek', null], ['Saudi Arabia', 'Szaúd-Arábia', null],
    ['South Africa', 'Dél-Afrika', null], ['India', 'India', null], ['China', 'Kína', null],
    ['Japan', 'Japán', null], ['South Korea', 'Dél-Korea', null], ['Singapore', 'Szingapúr', null],
    ['Malaysia', 'Malajzia', null], ['Thailand', 'Thaiföld', null], ['Indonesia', 'Indonézia', null], ['Philippines', 'Fülöp-szigetek', null],
    ['Australia', 'Ausztrália', null], ['New Zealand', 'Új-Zéland', null]
  ].map(function (w) {
    return { key: w[0], name: w[1], since: w[2], companies: w[0] === 'Hungary' ? countYear(2026) : null };
  });

  const worldAliases = {
    'United States of America': 'United States of America',
    'United States': 'United States of America',
    'Türkiye': 'Turkey',
    'Republic of Korea': 'South Korea',
    'Korea': 'South Korea',
    'Czech Republic': 'Czechia'
  };

  const tonight = {
    stats: [
      { value: null, label: 'vendég a gálán' },
      { value: String(countYear(2026)), label: 'díjazott vállalat' },
      { value: String(fiveTimes), label: 'ötszörös nyertes' }
    ],
    agenda: [
      { time: null, title: 'Érkezés, regisztráció, welcome drink', place: 'Előtér' },
      { time: null, title: 'Megnyitó', place: 'Nagyterem' },
      { time: null, title: 'Best Managed Companies díjátadó', place: 'Nagyterem' },
      { time: null, title: 'Vacsora', place: 'Nagyterem' },
      { time: null, title: 'Networking, kötetlen beszélgetés és fotókészítés', place: 'Előtér · Fotófal' }
    ],
    goodToKnow: 'A fotófal az előtérben található, a díjátadóról készült képek a gála után elérhetők lesznek a résztvevők számára.'
  };

  /* Global Journey fotósáv – külföldi gálák képei (BMC Graphics/bmc külföld) */
  const globalPhotos = G.globalPhotos;

  return { companies, years, groupPhotos: G.groupPhotos, timeline, summary, world, worldAliases, tonight, globalPhotos };
})();
