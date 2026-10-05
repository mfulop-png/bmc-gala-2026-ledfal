/* BMC Gála 2026 — LED fal kiosk */
(function () {
  'use strict';
  const D = window.BMC;
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const IDLE_MS = 120000;   // 2 perc tétlenség után vissza a kezdőképernyőre
  const WEB = !!window.BMC_WEB;   // webes változat: egér + billentyűzet, nincs kioszk-viselkedés
  const T = (touch, web) => WEB ? web : touch;
  const EMPTY_DETAIL = T('Koppints', 'Kattints') + ' egy pontra a térképen<br>a vállalat adataiért';
  const MAP_HINT = T('Két ujjal nagyíthatsz · koppints Budapestre', 'Görgővel nagyíthatsz, húzással mozgathatod · kattints Budapestre');
  const EMPTY_COUNTRY = T('Koppints', 'Kattints') + ' egy kiemelt országra<br>a földgömbön';

  /* ---------- stage fit ---------- */
  const stage = $('#stage');
  function fit() {
    const s = Math.min(window.innerWidth / 3840, window.innerHeight / 2160);
    stage.style.transform = 'translate(' + ((window.innerWidth - 3840 * s) / 2) + 'px,' +
      ((window.innerHeight - 2160 * s) / 2) + 'px) scale(' + s + ')';
  }
  window.addEventListener('resize', fit); fit();

  /* ---------- clock ---------- */
  function tick() {
    const d = new Date();
    $('#clock').textContent = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  tick(); setInterval(tick, 10000);

  /* ---------- screens + idle ---------- */
  let idleT = null, current = null;
  function go(name) {
    current = name;
    $$('.screen').forEach(s => s.classList.toggle('active', s.dataset.screen === name));
    $$('.tab').forEach(t => t.classList.toggle('active', t.dataset.go === name));
    $('#attract').classList.add('hidden');
    $$('#bgs div').forEach(b => b.classList.toggle('on', b.dataset.bg === name));   // képernyőnkénti háttér
    if (name === 'timeline') selectYear(tlYear, true);
    resetIdle();
  }
  function toAttract() {
    current = null;
    $$('.screen').forEach(s => s.classList.remove('active'));
    $$('.tab').forEach(t => t.classList.remove('active'));
    $('#attract').classList.remove('hidden');
    clearDetail(); setZoom('hu', true);
    $('#lightbox').classList.remove('show');
    $('#profile').classList.remove('show');
    resetGlobe();
    clearTimeout(idleT);
  }
  function resetIdle() {
    clearTimeout(idleT);
    if (WEB) return;                 // weben nincs visszaugrás a kezdőképernyőre
    if (current) idleT = setTimeout(toAttract, IDLE_MS);
  }
  ['pointerdown', 'keydown', 'wheel'].forEach(e => document.addEventListener(e, resetIdle, { passive: true }));
  $$('.tab').forEach(t => t.addEventListener('click', () => go(t.dataset.go)));
  $('#attract').addEventListener('pointerdown', () => go('map'));

  /* ---------- oldal-zoom tiltása: csippentés csak a térképet nagyítja (weben a böngésző zoomja marad) ---------- */
  if (!WEB) {
    const noop = e => e.preventDefault();
    ['gesturestart', 'gesturechange', 'gestureend'].forEach(t => document.addEventListener(t, noop, { passive: false }));   // Safari
    document.addEventListener('touchmove', e => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
    document.addEventListener('wheel', e => { if (e.ctrlKey && !e.target.closest('#hu-map')) e.preventDefault(); }, { passive: false });
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey || e.metaKey) && ['+', '-', '=', '0'].indexOf(e.key) >= 0) e.preventDefault();
    });
  }

  /* Esc: nagyított fotó → cégprofil → cégadatlap bezárása */
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if ($('#lightbox').classList.contains('show')) $('#lightbox').classList.remove('show');
    else if ($('#profile').classList.contains('show')) $('#profile').classList.remove('show');
    else if (selected) clearDetail();
  });

  /* webes feliratok */
  if (WEB) {
    $('#maphint').textContent = MAP_HINT;
    $('#detail').innerHTML = EMPTY_DETAIL;
    $('#wcard').innerHTML = EMPTY_COUNTRY;
    $('.wleft .maphint').textContent = 'Húzd a földgömböt · görgővel nagyíthatsz · kattints egy kiemelt országra';
  }

  /* ---------- attract particles ---------- */
  /* ---------- várakozó képernyő: arany csillámok (bokeh), lassan felfelé úszva, pislákolva ---------- */
  (function sparkles() {
    const cv = $('#particles'), ctx = cv.getContext('2d');
    cv.width = 3840; cv.height = 2160;
    // előre renderelt, lágy szélű fénypötty – a 'lighter' keverés adja a ragyogást
    const spr = document.createElement('canvas'); spr.width = spr.height = 128;
    const sc = spr.getContext('2d'), g = sc.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,238,170,1)'); g.addColorStop(.25, 'rgba(252,197,66,.75)');
    g.addColorStop(.6, 'rgba(215,173,84,.18)'); g.addColorStop(1, 'rgba(143,90,38,0)');
    sc.fillStyle = g; sc.fillRect(0, 0, 128, 128);
    const mk = () => ({
      x: Math.random() * 3840, y: Math.random() * 2160,
      s: Math.random() < .12 ? 40 + Math.random() * 70 : 6 + Math.random() * 26,   // néhány nagy, életlen bokeh
      vy: -(.15 + Math.random() * .55), sway: Math.random() * 6.28, sp: .004 + Math.random() * .01,
      tw: Math.random() * 6.28, ts: .01 + Math.random() * .03
    });
    const pts = Array.from({ length: 170 }, mk);
    function frame() {
      requestAnimationFrame(frame);
      if ($('#attract').classList.contains('hidden')) return;
      ctx.clearRect(0, 0, 3840, 2160);
      ctx.globalCompositeOperation = 'lighter';
      for (const p of pts) {
        p.y += p.vy; p.sway += p.sp; p.tw += p.ts;
        const x = p.x + Math.sin(p.sway) * 30;
        if (p.y < -120) { Object.assign(p, mk()); p.y = 2200; }
        ctx.globalAlpha = (p.s > 40 ? .10 : .35) + .45 * (.5 + .5 * Math.sin(p.tw)) * (p.s > 40 ? .3 : 1);
        ctx.drawImage(spr, x - p.s, p.y - p.s, p.s * 2, p.s * 2);
      }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
    }
    frame();
  })();

  /* ---------- filters ---------- */
  const filters = { year: null, region: null };
  function mk(tag, cls, txt) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }
  function buildChips(el, items, key) {
    el.innerHTML = '';
    const all = mk('div', 'chip on', 'Mind');
    all.addEventListener('click', () => { filters[key] = null; syncChips(el, null); applyFilters(); });
    el.appendChild(all);
    items.forEach(v => {
      const c = mk('div', 'chip', String(v));
      c.dataset.v = String(v);
      c.addEventListener('click', () => {
        filters[key] = filters[key] === String(v) ? null : String(v);   // újra koppintva kikapcsol
        syncChips(el, filters[key]); applyFilters();
        // régióválasztás: vissza a teljes Magyarország-nézetre (pl. budapesti nagyításból), hogy a kiemelt régió látsszon
        if (key === 'region' && filters.region && Z.view.k > 1.001) setZoom('hu');
      });
      el.appendChild(c);
    });
  }
  function syncChips(el, v) {
    $$('.chip', el).forEach(c => c.classList.toggle('on', (c.dataset.v || null) === v));
  }
  const regions = Array.from(new Set(D.companies.map(c => c.region))).sort((a, b) => a.localeCompare(b, 'hu'));
  buildChips($('#f-year'), D.years, 'year');
  buildChips($('#f-region'), regions, 'region');

  function match(c) {
    if (filters.year && c.years.indexOf(+filters.year) < 0) return false;
    if (filters.region && c.region !== filters.region) return false;
    return true;
  }
  function applyFilters() {
    let n = 0;
    $$('#hu-map .hu-dot').forEach(g => {
      const c = byId[g.dataset.id], ok = match(c);
      if (ok) n++;
      g.classList.toggle('dimmed', !ok);
    });
    $('#fcount').textContent = n;
    if (Z.regions) Z.regions.classed('on', f => !!filters.region && HU_REGION[f.properties.name] === filters.region);
    placeNames();
    if (selected && !match(selected)) clearDetail();
    if (!selected) {
      $('#detail').innerHTML = n ? EMPTY_DETAIL
        : 'Nincs a szűrésnek megfelelő vállalat.<br>Próbálj más kombinációt.';
    }
  }
  const byId = {};
  D.companies.forEach(c => { byId[c.id] = c; });

  /* ---------- detail ---------- */
  let selected = null;
  function clearDetail() {
    selected = null;
    const d = $('#detail');
    d.className = 'panel detail empty';
    d.innerHTML = EMPTY_DETAIL;
    $('#mapside').classList.remove('open');
    $$('#hu-map .hu-dot').forEach(g => g.classList.remove('sel'));
    placeNames();
  }
  // összecsukott szűrősávra koppintva is bezárul az adatlap
  $('#filters').addEventListener('click', () => { if (selected) clearDetail(); });
  function showCompany(c) {
    selected = c;
    $$('#hu-map .hu-dot').forEach(g => g.classList.toggle('sel', g.dataset.id === c.id));
    placeNames();
    const d = $('#detail');
    d.className = 'panel detail';
    $('#mapside').classList.add('open');
    fillProfile(d, c, clearDetail);
  }

  /* cégprofil tartalma – a térkép oldalsávja és a timeline profilablaka is ezt használja */
  function fillProfile(el, c, onClose) {
    const ord = ['', 'első', 'második', 'harmadik', 'negyedik', 'ötödik'][c.wins] || c.wins + '.';
    const where = c.district ? 'Budapest ' + c.district + '. kerület' : c.place;
    const photos = c.photos;
    el.innerHTML =
      '<div class="dclose" aria-label="Bezárás">×</div>' +
      '<div class="dh">' + logoBox(c, 'dlogo') +
      '<div><div class="dname">' + esc(c.name) + '</div>' +
      '<div class="dsub">' + esc(where) + '</div></div></div>' +
      '<div class="dmeta">' +
        '<div class="dyearsbox"><div class="dylabel">Best Managed minősítés éve</div><div class="dyears">' +
          D.years.map(y => '<div class="yrbox' + (c.years.indexOf(y) >= 0 ? ' on' : '') + '">' + y + '</div>').join('') + '</div>' +
          '<div class="dwins">Első elismerés: <b>' + c.first + '</b> · ' + ord + ' alkalommal Best Managed (' + c.wins + '×)</div>' +
        '</div>' +
      '</div>' +
      '<div class="dtext">' + esc(c.desc) + '</div>' +
      (photos.length
        ? '<div class="dphotos n' + Math.min(photos.length, 2) + '">' +
          photos.map((p, i) => '<div class="dph" data-i="' + i + '"><img src="' + p + '" alt=""></div>').join('') + '</div>'
        : c.years.length === 1 && c.first === 2026
          ? '<div class="dphotos"><div class="badge pending">Új nyertes — gálafotók a mai este után</div></div>'
          : '');
    el.scrollTop = 0;
    $('.dclose', el).addEventListener('click', e => { e.stopPropagation(); onClose(); });
    $$('.dph', el).forEach(e => e.addEventListener('click', ev => { ev.stopPropagation(); openPhoto(c, +e.dataset.i); }));
  }

  /* cégprofil ablak a timeline-on – a háttérre koppintva is bezárul */
  const prof = $('#profile');
  function openProfile(c) {
    fillProfile($('#pcard'), c, closeProfile);
    prof.classList.add('show');
  }
  function closeProfile() { prof.classList.remove('show'); }
  prof.addEventListener('click', e => { if (e.target === prof) closeProfile(); });

  /* fotó teljes képernyőn – a jobb felső × gombbal vagy a háttérre koppintva zárul */
  const lb = $('#lightbox');
  let lbOpened = 0;
  function openPhoto(c, i) { openGallery(c.photos, i, c.name); }
  function openGallery(list, i, caption) {
    $('img', lb).src = list[i];
    $('.lbn', lb).textContent = caption + ' · ' + (i + 1) + ' / ' + list.length;
    lb.classList.add('show');
    lbOpened = performance.now();
  }
  lb.addEventListener('click', () => {
    // a megnyitó koppintás utólagos click-eseménye (érintőképernyőn) ne zárja be rögtön
    if (performance.now() - lbOpened < 450) return;
    lb.classList.remove('show');
  });
  function logoBox(c, cls) {
    return '<div class="' + cls + (c.logoOnDark ? ' ondark' : c.logoDark ? ' dark' : '') + '">' +
      (c.logo ? '<img src="' + c.logo + '" alt="' + esc(c.name) + '">' : '<span>' + esc(c.name) + '</span>') + '</div>';
  }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }
  function esc(s) { return String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m])); }

  /* ---------- maps ---------- */
  const R = window.__resources || {};
  const ATLAS = [
    R.atlas50 || 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json',
    R.atlas110 || 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json'
  ];
  function loadAtlas() {
    return fetch(ATLAS[0]).then(r => { if (!r.ok) throw 0; return r.json(); })
      .catch(() => fetch(ATLAS[1]).then(r => r.json()));
  }
  loadAtlas().then(topo => {
    const feats = topojson.feature(topo, topo.objects.countries).features;
    drawHungary(feats);
    // a forgó gömbhöz a kevésbé részletes atlasz kell (képkockánként újravetítjük);
    // az abból hiányzó kis BMC-országokat (pl. Szingapúr) a részletesből pótoljuk
    fetch(ATLAS[1]).then(r => r.json()).then(t110 => {
      const light = topojson.feature(t110, t110.objects.countries).features;
      const have = new Set(light.map(f => f.properties.name));
      const bmc = new Set(D.world.map(w => w.key));
      const norm = n => D.worldAliases[n] || n;
      drawWorld(light.concat(feats.filter(f => bmc.has(norm(f.properties.name)) && !have.has(f.properties.name))));
    }).catch(() => drawWorld(feats));
  }).catch(e => console.error('atlas', e));

  // Nominatim-poligonok: d3 óramutató szerinti külső gyűrűt vár
  function rewind(f) {
    if (d3.geoArea(f) > 2 * Math.PI) {
      const g = f.geometry;
      if (g.type === 'Polygon') g.coordinates.forEach(r => r.reverse());
      else if (g.type === 'MultiPolygon') g.coordinates.forEach(p => p.forEach(r => r.reverse()));
    }
    return f;
  }

  /* megye -> statisztikai régió (a szűrő régióinak kiemeléséhez a térképen) */
  const HU_REGION = {
    'Budapest': 'Közép-Magyarország', 'Pest': 'Közép-Magyarország',
    'Fejér': 'Közép-Dunántúl', 'Komárom-Esztergom': 'Közép-Dunántúl', 'Veszprém': 'Közép-Dunántúl',
    'Győr-Moson-Sopron': 'Nyugat-Dunántúl', 'Vas': 'Nyugat-Dunántúl', 'Zala': 'Nyugat-Dunántúl',
    'Baranya': 'Dél-Dunántúl', 'Somogy': 'Dél-Dunántúl', 'Tolna': 'Dél-Dunántúl',
    'Borsod-Abaúj-Zemplén': 'Észak-Magyarország', 'Heves': 'Észak-Magyarország', 'Nógrád': 'Észak-Magyarország',
    'Hajdú-Bihar': 'Észak-Alföld', 'Jász-Nagykun-Szolnok': 'Észak-Alföld', 'Szabolcs-Szatmár-Bereg': 'Észak-Alföld',
    'Bács-Kiskun': 'Dél-Alföld', 'Békés': 'Dél-Alföld', 'Csongrád-Csanád': 'Dél-Alföld'
  };

  /* HU / Budapest zoom */
  const Z = { W: 2400, H: 1180, side: [330, 880], view: { k: 1, x: 0, y: 0 }, bp: 0, mode: 'hu', bpView: null, gBase: null, dots: null, labels: null, proj: null };
  function renderZoom() {
    const v = Z.view;
    Z.gBase.attr('transform', 'translate(' + v.x + ',' + v.y + ') scale(' + v.k + ')');
    Z.dots.attr('transform', d => {
      const x = v.x + v.k * d.real[0], y = v.y + v.k * d.real[1];
      if (d.keep) {   // kerület nélküli budapesti cégek: nagyítva a bal alsó sarokba úsznak
        d.pos = [x + (Z.side[0] - x) * Z.bp + d.off[0], y + (Z.side[1] - y) * Z.bp + d.off[1]];
      } else {
        const o = d.c.city === 'Budapest' ? 1 - Z.bp : 1;   // vidéki klaszterek nagyítva is széthúzva maradnak
        d.pos = [x + d.off[0] * o, y + d.off[1] * o];
      }
      return 'translate(' + d.pos[0] + ',' + d.pos[1] + ')';
    });
    placeNames();
    Z.labels.attr('transform', d => {
      const x = v.x + v.k * d.p[0], y = v.y + v.k * d.p[1];
      return d.fixed ? 'translate(' + (x + (Z.side[0] - x) * Z.bp) + ',' + (y + (Z.side[1] - y) * Z.bp) + ')'
        : 'translate(' + x + ',' + y + ')';
    });
  }

  /* Cégnevek a pontok mellett: nagyítás közben képkockánként újraszámolva. Egy név csak akkor
     jelenik meg, ha elfér – nem takar másik nevet vagy pontot, és a térképen belül marad. */
  const NAME_MIN_K = 1.35, NAME_H = 46, NAME_GAP = 40;
  const NAME_CAND = [['r', NAME_GAP, 0], ['l', -NAME_GAP, 0], ['t', 0, -52], ['b', 0, 52]];
  function placeNames() {
    if (!Z.names) return;
    const show = Z.view.k >= NAME_MIN_K, els = Z.names.nodes(), dots = Z.dots.nodes();
    const boxes = [];
    Z.dotData.forEach((d, i) => { if (!dots[i].classList.contains('dimmed')) boxes.push([d.pos[0] - 30, d.pos[1] - 30, 60, 60]); });
    const hit = b => b[0] < 8 || b[1] < 8 || b[0] + b[2] > Z.W - 8 || b[1] + b[3] > Z.H - 8 ||
      boxes.some(o => b[0] < o[0] + o[2] && b[0] + b[2] > o[0] && b[1] < o[1] + o[3] && b[1] + b[3] > o[1]);
    // sorrend: kiválasztott cég elöl, aztán ami eddig is látszott (kevesebb ugrálás), végül fentről lefelé
    const order = Z.dotData.map((d, i) => i).sort((a, b) => {
      const A = Z.dotData[a], B = Z.dotData[b];
      return ((B.c === selected) - (A.c === selected)) || ((!!B.nameAt) - (!!A.nameAt)) || A.pos[1] - B.pos[1];
    });
    order.forEach(i => {
      const d = Z.dotData[i], el = els[i];
      let pick = null;
      if (show && !dots[i].classList.contains('dimmed')) {
        if (!d.w) d.w = el.getComputedTextLength() || d.c.name.length * 19;
        const cands = d.nameAt ? [NAME_CAND.find(c => c[0] === d.nameAt)].concat(NAME_CAND) : NAME_CAND;
        for (const c of cands) {
          const x = d.pos[0] + c[1], y = d.pos[1] + c[2];
          const bx = c[0] === 'r' ? x : c[0] === 'l' ? x - d.w : x - d.w / 2;
          const b = [bx - 6, y - NAME_H / 2, d.w + 12, NAME_H];
          if (!hit(b)) { pick = c; boxes.push(b); el.setAttribute('x', x); el.setAttribute('y', y);
            el.setAttribute('text-anchor', c[0] === 'r' ? 'start' : c[0] === 'l' ? 'end' : 'middle'); break; }
        }
      }
      d.nameAt = pick && pick[0];
      el.classList.toggle('on', !!pick);
      el.classList.toggle('sel', d.c === selected);
    });
  }

  /* Érintéses zoom: a kerületi nézet a nagyítás mértékéből jön, ha Budapest látszik */
  function updateBp() {
    if (!Z.bpView) { Z.bp = 0; return; }
    const v = Z.view, kA = 1 + (Z.bpView.k - 1) * .3, kB = Z.bpView.k * .85;
    const sx = v.x + v.k * Z.bpCenter[0], sy = v.y + v.k * Z.bpCenter[1];
    const inView = sx > 0 && sx < Z.W && sy > 0 && sy < Z.H;
    Z.bp = inView ? Math.max(0, Math.min(1, (v.k - kA) / (kB - kA))) : 0;
    const mode = Z.bp > .5 ? 'bp' : 'hu';
    if (mode !== Z.mode) {
      Z.mode = mode;
      $$('#zoomseg div').forEach(e => e.classList.toggle('on', e.dataset.z === mode));
      $('#mapwrap').classList.toggle('mode-bp', mode === 'bp');
      $('#maphint').textContent = mode === 'bp' ? 'Budapesti díjazottak kerületenként'
        : MAP_HINT;
    }
  }
  function setZoom(mode, instant) {
    if (!Z.zoom) return;
    const to = mode === 'bp' && Z.bpView ? Z.bpView : { k: 1, x: 0, y: 0 };
    const t = d3.zoomIdentity.translate(to.x, to.y).scale(to.k);
    const svg = d3.select('#hu-map');
    svg.interrupt();
    if (instant) svg.call(Z.zoom.transform, t);
    else svg.transition().duration(1300).ease(d3.easeCubicInOut).call(Z.zoom.transform, t);
  }
  $$('#zoomseg div').forEach(e => e.addEventListener('click', () => setZoom(e.dataset.z)));

  function drawHungary(feats) {
    const svg = d3.select('#hu-map');
    const W = Z.W, H = Z.H;
    svg.attr('viewBox', '0 0 ' + W + ' ' + H).attr('preserveAspectRatio', 'xMidYMid meet');
    const hu = feats.find(f => f.properties.name === 'Hungary');
    if (!hu) return;
    const proj = Z.proj = d3.geoMercator().fitExtent([[300, 120], [W - 300, H - 120]], hu);
    const path = d3.geoPath(proj);
    svg.append('defs').html(
      '<linearGradient id="huGrad" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="rgba(245,221,134,.20)"/>' +
      '<stop offset="100%" stop-color="rgba(143,90,38,.08)"/></linearGradient>');
    const g = Z.gBase = svg.append('g');
    g.append('g').selectAll('path').data(feats.filter(f => f.properties.name !== 'Hungary'))
      .join('path').attr('class', 'hu-country').attr('d', path);
    g.append('path').datum(hu).attr('class', 'hu-main').attr('d', path);
    // megyehatárok, Balaton, Tisza (geo/hungary.js – tools/build_geo.py)
    const HG = window.HU_GEO;
    if (HG) {
      HG.counties.forEach(rewind);
      Z.regions = g.append('g').selectAll('path').data(HG.counties).join('path')
        .attr('class', 'hu-region').attr('d', path);
      g.append('g').selectAll('path').data(HG.counties).join('path')
        .attr('class', 'hu-county hu-only').attr('d', path);
      g.append('path').datum(rewind(HG.balaton)).attr('class', 'hu-lake').attr('d', path);
      g.append('path').datum(HG.tisza).attr('class', 'hu-river').attr('d', path);
    }
    const G = window.BP_GEO;
    let bpCentroid = proj([19.04, 47.4979]);
    if (G) {
      g.append('path').datum(G.huRivers).attr('class', 'hu-river hu-only').attr('d', path);
      const bp = rewind(G.budapest);
      g.append('path').datum(bp).attr('class', 'bp-outline').attr('d', path)
        .on('click', () => setZoom('bp'));
      G.districts.forEach(rewind);
      g.append('path').datum(G.duna).attr('class', 'bp-duna bp-only').attr('d', path);
      g.append('g').selectAll('path').data(G.districts).join('path').attr('class', 'bp-district bp-only').attr('d', path);
      const b = path.bounds(bp), dx = b[1][0] - b[0][0], dy = b[1][1] - b[0][1];
      const k = Math.min(W * .9 / dx, H * .9 / dy);
      const cx = (b[0][0] + b[1][0]) / 2, cy = (b[0][1] + b[1][1]) / 2;
      Z.bpView = { k: k, x: W / 2 - k * cx, y: H / 2 - k * cy };
      Z.bpCenter = bpCentroid = [cx, cy];
    }

    // budapesti cégek: az irányítószámból ismert kerület közepe (azonos kerületen belül kicsit széthúzva)
    const distPos = {}, distSeen = {};
    if (G && Z.bpView) {
      G.districts.forEach(f => { distPos[f.properties.n] = path.centroid(f); });
    }
    function districtPoint(c) {
      const p = distPos[c.district];
      if (!p) return null;
      const n = D.companies.filter(o => o.district === c.district).length;
      const i = distSeen[c.district] = (distSeen[c.district] || 0) + 1;
      return [p[0] + (i - 1 - (n - 1) / 2) * 70 / Z.bpView.k, p[1]];
    }

    // pontok: valós hely + klaszter-eltolás (a kerület nélküli budapesti cégek nagyítva is körben maradnak)
    const byPlace = {};
    D.companies.forEach(c => { (byPlace[c.place] = byPlace[c.place] || []).push(c); });
    const dotData = [], labData = [];
    Object.keys(byPlace).forEach(place => {
      const list = byPlace[place];
      const base = proj([list[0].lon, list[0].lat]);
      const r = list.length > 1 ? 16 + list.length * 5 : 0;
      const ring = list.filter(c => !(c.district && distPos[c.district]));
      const rr = ring.length > 1 ? 16 + ring.length * 5 : 0;
      list.forEach((c, i) => {
        const a = (i / list.length) * Math.PI * 2 - Math.PI / 2;
        const real = (c.district && districtPoint(c)) || base;
        const keep = real === base;
        const ang = keep ? (ring.indexOf(c) / ring.length) * Math.PI * 2 - Math.PI / 2 : a;
        const rad = keep && place === 'Budapest' ? rr : r;
        dotData.push({ c: c, real: real, keep: keep && place === 'Budapest',
          off: [base[0] + Math.cos(ang) * rad - real[0], base[1] + Math.sin(ang) * rad - real[1]] });
      });
      if (place === 'Budapest' && ring.length && ring.length < list.length) {
        labData.push({ p: base, t: 'Budapest · pontos cím nélkül', cls: 'bp-name bp-only', dy: rr + 56, fixed: true });
      }
    });
    // vízrajzi feliratok
    if (HG) [['Balaton', 17.74, 46.84], ['Tisza', 20.33, 46.92], ['Duna', 18.83, 46.42]].forEach(w =>
      labData.push({ p: proj([w[1], w[2]]), t: w[0], cls: 'hu-water hu-only', dy: 0, sub: true }));
    if (G) G.districts.forEach(d => {
      const p = path.centroid(d);
      if (isFinite(p[0])) labData.push({ p: p, t: d.properties.n, cls: 'bp-dlabel bp-only', dy: 0, sub: true });
    });
    Z.labels = svg.append('g').selectAll('g').data(labData).join('g');
    Z.labels.append('text').attr('class', d => d.cls).attr('x', d => d.dx || 0).attr('y', d => d.dy)
      .attr('text-anchor', d => d.anchor || 'middle').attr('dominant-baseline', d => d.baseline || null).text(d => d.t);
    // kerületi címkék a pontok alá kerüljenek
    Z.labels.filter(d => d.sub).lower();
    Z.dots = svg.append('g').selectAll('g').data(dotData).join('g').attr('class', 'hu-dot')
      .attr('data-id', d => d.c.id);
    // minden cég azonos méretű jelölőt kap (nem függ a díjak számától)
    Z.dots.append('circle').attr('class', 'halo').attr('r', 27);
    Z.dots.append('circle').attr('class', 'core').attr('r', 15);
    Z.dots.append('circle').attr('r', 40).attr('fill', 'transparent');
    Z.dots.append('title').text(d => d.c.name);
    Z.dotData = dotData;
    Z.names = svg.append('g').selectAll('text').data(dotData).join('text').attr('class', 'mk-name')
      .attr('dominant-baseline', 'middle').text(d => d.c.name);
    Z.zoom = d3.zoom()
      .extent([[0, 0], [W, H]])
      .scaleExtent([1, Z.bpView ? Z.bpView.k * 2.5 : 8])
      .translateExtent([[0, 0], [W, H]])
      .clickDistance(12)                       // ujjal koppintás kis elmozdulással is koppintás marad
      .on('zoom', ev => {
        const t = ev.transform;
        Z.view = { k: t.k, x: t.x, y: t.y };
        updateBp(); renderZoom();
      });
    svg.call(Z.zoom).on('dblclick.zoom', null);
    Z.names.on('click', (ev, d) => onDot(d));
    Z.dots.on('click', (ev, d) => onDot(d));
    function onDot(d) {
      if (Z.mode === 'hu' && d.c.city === 'Budapest' && Z.bpView) { setZoom('bp'); return; }   // első koppintás: nagyítás
      showCompany(d.c);
    }
    renderZoom();
    applyFilters();
  }

  /* Global Journey */
  /* Global Journey fotósávok: maguktól futnak, de ujjal/egérrel meg is foghatók és húzhatók
     (elengedve lendülettel csúsznak tovább); egy képre koppintva teljes képernyőn nyílik meg. */
  (function strips() {
    const A = D.globalPhotos;
    const tile = p => '<div class="ph" data-i="' + A.indexOf(p) + '">' + (p.src ? '<img src="' + p.src + '" alt="" draggable="false">' : '<div class="pe">Fotó érkezik</div>') +
      '<div class="pc">' + esc(p.country) + '</div></div>';
    const half = Math.ceil(A.length / 2);
    const s1 = A.slice(0, half), s2 = A.slice(half).concat(A.slice(0, Math.max(0, half - (A.length - half))));
    const fill = arr => { let o = arr.slice(); while (o.length < 9) o = o.concat(arr); return o; };
    const t1 = fill(s1).map(tile).join(''), t2 = fill(s2).map(tile).join('');
    $('#strip1').innerHTML = t1 + t1;
    $('#strip2').innerHTML = t2 + t2;

    const TILE = 420 + 20;                            // csempe szélessége + rés (4K-s színpadpixel)
    const S = [['#strip1', -1, 70], ['#strip2', 1, 84]].map(([sel, dir, secs]) => {
      const track = $(sel), period = track.children.length / 2 * TILE;
      return { track, strip: track.parentNode, period, speed: dir * period / (secs * 1000), off: -period / 2,
               drag: null, vel: 0 };
    });
    const norm = (st) => { while (st.off <= -st.period) st.off += st.period; while (st.off > 0) st.off -= st.period; };
    const scale = () => stage.getBoundingClientRect().width / 3840;   // képernyőpixel -> színpadpixel

    S.forEach(st => {
      st.strip.addEventListener('pointerdown', e => {
        st.strip.setPointerCapture(e.pointerId);
        st.drag = { id: e.pointerId, x: e.clientX, off: st.off, t: performance.now(), lastX: e.clientX, moved: 0 };
        st.vel = 0;
      });
      st.strip.addEventListener('pointermove', e => {
        const d = st.drag;
        if (!d || d.id !== e.pointerId) return;
        const k = scale(), now = performance.now(), dx = (e.clientX - d.lastX) / k;
        st.off = d.off + (e.clientX - d.x) / k; norm(st);
        d.moved = Math.max(d.moved, Math.abs(e.clientX - d.x));
        if (now > d.t) st.vel = .8 * st.vel + .2 * (dx / (now - d.t));   // simított sebesség (px/ms)
        d.t = now; d.lastX = e.clientX;
        // az abszolút eltolást a normalizálás után is konzisztensen tartjuk
        d.off = st.off - (e.clientX - d.x) / k;
      });
      const end = e => {
        const d = st.drag;
        if (!d || d.id !== e.pointerId) return;
        st.drag = null;
        if (d.moved < 24 && e.type === 'pointerup') {             // koppintás: kép nagyítása
          const ph = document.elementFromPoint(e.clientX, e.clientY);
          const el = ph && ph.closest('.ph');
          if (el && A[+el.dataset.i] && A[+el.dataset.i].src) {
            const list = A.filter(p => p.src), i = list.indexOf(A[+el.dataset.i]);
            openGallery(list.map(p => p.src), i, A[+el.dataset.i].country);
          }
          st.vel = 0;
        }
      };
      st.strip.addEventListener('pointerup', end);
      st.strip.addEventListener('pointercancel', end);
    });

    let last = performance.now();
    (function frame(now) {
      requestAnimationFrame(frame);
      const dt = Math.min(64, now - last); last = now;
      if (!$('.screen[data-screen="global"]').classList.contains('active')) return;
      S.forEach(st => {
        if (!st.drag) {
          // lendület lecsengése, majd vissza az alap sebességre
          st.vel *= Math.pow(.94, dt / 16.7);
          if (Math.abs(st.vel) < .01) st.vel = 0;
          st.off += (st.speed + st.vel) * dt;
          norm(st);
        }
        st.track.style.transform = 'translate3d(' + st.off + 'px,0,0)';
      });
    })(last);
  })();
  /* Global Journey földgömb: egy ujjal forgatható, két ujjal nagyítható, tétlenül lassan forog.
     Kiemelt országra koppintva odafordul, és jobb oldalt megjelenik az ország kártyája. */
  const GL = { rot: [-19, -30, 0], k: 1, R: 0, prev: null, lastUse: 0, anim: false, sel: null };
  const HU_LL = [19.4, 47.2];
  function drawWorld(feats) {
    const svg = d3.select('#world-map');
    const W = 2400, H = 1100;
    svg.attr('viewBox', '0 0 ' + W + ' ' + H).attr('preserveAspectRatio', 'xMidYMid meet');
    svg.append('defs').html(
      '<radialGradient id="wOcean" cx="42%" cy="38%" r="65%">' +
      '<stop offset="0%" stop-color="#2b2417"/><stop offset="70%" stop-color="#110e0a"/><stop offset="100%" stop-color="#060504"/></radialGradient>');
    GL.R = H / 2 - 24;
    GL.proj = d3.geoOrthographic().translate([W / 2, H / 2]).scale(GL.R).clipAngle(90).precision(.7).rotate(GL.rot);
    GL.path = d3.geoPath(GL.proj);
    const map = {};
    D.world.forEach(w => { map[w.key] = w; });
    const norm = n => D.worldAliases[n] || n;
    GL.sphere = svg.append('path').datum({ type: 'Sphere' }).attr('class', 'w-ocean');
    GL.grat = svg.append('path').datum(d3.geoGraticule10()).attr('class', 'w-graticule');
    GL.countries = svg.append('g').selectAll('path').data(feats).join('path')
      .attr('class', f => { const k = norm(f.properties.name); return k === 'Hungary' ? 'w-hu' : map[k] ? 'w-bmc' : 'w-land'; })
      .on('click', (ev, f) => { const w = map[norm(f.properties.name)]; if (w) selectCountry(w, f); });
    GL.countries.filter(f => map[norm(f.properties.name)]).append('title').text(f => map[norm(f.properties.name)].name);
    GL.rim = svg.append('path').datum({ type: 'Sphere' }).attr('class', 'w-rim');
    GL.pings = [0, 1].map(i => svg.append('circle').attr('class', 'w-ping').attr('r', 30).style('animation-delay', (i * 1.2) + 's'));
    GL.zoom = d3.zoom().scaleExtent([1, 5]).clickDistance(12)
      .on('start', () => { GL.prev = null; })
      .on('zoom', ev => {
        const t = ev.transform;
        if (GL.prev && Math.abs(t.k - GL.prev.k) < 1e-6) {          // egy ujj / egér: forgatás
          const f = 180 / Math.PI / (GL.R * GL.k);
          GL.rot[0] += (t.x - GL.prev.x) * f;
          GL.rot[1] = Math.max(-80, Math.min(80, GL.rot[1] - (t.y - GL.prev.y) * f));
        }
        GL.k = t.k; GL.prev = t; GL.lastUse = performance.now();
        renderGlobe();
      });
    svg.call(GL.zoom).on('dblclick.zoom', null);
    renderGlobe();
    // tétlen lassú forgás – csak amikor a fül látszik
    let last = performance.now();
    d3.timer(() => {
      const now = performance.now(), dt = now - last; last = now;
      if (GL.anim || now - GL.lastUse < 6000) return;
      if (!$('.screen[data-screen="global"]').classList.contains('active')) return;
      GL.rot[0] += dt * .004;
      renderGlobe();
    });
    $('#gohome').addEventListener('click', () => {
      const f = feats.find(x => x.properties.name === 'Hungary');
      selectCountry(D.world.find(w => w.key === 'Hungary'), f);
    });
  }
  function renderGlobe() {
    GL.proj.rotate(GL.rot).scale(GL.R * GL.k);
    GL.sphere.attr('d', GL.path); GL.grat.attr('d', GL.path); GL.rim.attr('d', GL.path);
    GL.countries.attr('d', GL.path);
    const vis = d3.geoDistance(HU_LL, [-GL.rot[0], -GL.rot[1]]) < Math.PI / 2 - .05, p = GL.proj(HU_LL);
    GL.pings.forEach(c => c.attr('cx', p[0]).attr('cy', p[1]).style('display', vis ? null : 'none'));
  }
  function selectCountry(w, f) {
    GL.sel = w.key;
    GL.countries.classed('w-sel', x => (D.worldAliases[x.properties.name] || x.properties.name) === w.key && w.key !== 'Hungary');
    // odafordulás
    const c = d3.geoCentroid(f), from = GL.rot.slice(), to = [-c[0], Math.max(-60, Math.min(60, -c[1])), 0];
    to[0] = from[0] + ((((to[0] - from[0]) % 360) + 540) % 360 - 180);   // a rövidebb irányba
    const ir = d3.interpolate(from, to);
    GL.anim = true;
    d3.select('#world-map').transition('rot').duration(1100).ease(d3.easeCubicInOut)
      .tween('rot', () => t => { GL.rot = ir(t); renderGlobe(); })
      .on('end interrupt', () => { GL.anim = false; GL.lastUse = performance.now(); });
    showCountryCard(w);
  }
  function showCountryCard(w) {
    const isHu = w.key === 'Hungary';
    const photos = (isHu ? D.groupPhotos : D.globalPhotos.filter(p => p.country === w.name).map(p => p.src)) || [];
    const stats = [
      w.since && '<div><b>' + w.since + '</b>program indulása</div>',
      w.companies && '<div><b>' + w.companies + '</b>' + (isHu ? 'díjazott 2026-ban' : 'BMC vállalat') + '</div>'
    ].filter(Boolean);
    const card = $('#wcard');
    card.className = 'panel wcard';
    card.innerHTML = '<div class="wc-kicker">Best Managed Companies</div><div class="wc-name">' + esc(w.name) + '</div>' +
      (stats.length ? '<div class="wc-stats">' + stats.join('') + '</div>' : '') +
      (!stats.length && !photos.length ? '<div class="wc-note">A Deloitte Best Managed Companies program partnerországa.</div>' : '') +
      (photos.length ? '<div class="wc-photos">' + photos.slice(0, 4).map((p, i) =>
        '<div data-i="' + i + '"><img src="' + p + '" alt=""></div>').join('') + '</div>' : '');
    $$('.wc-photos div', card).forEach(e => e.addEventListener('click', () => openGallery(photos, +e.dataset.i, w.name)));
  }
  function resetGlobe() {
    GL.sel = null;
    if (GL.countries) GL.countries.classed('w-sel', false);
    const card = $('#wcard');
    card.className = 'panel wcard empty';
    card.innerHTML = EMPTY_COUNTRY;
  }

  /* ---------- timeline ---------- */
  let tlYear = 2026;
  (function buildTimeline() {
    const rail = $('#tlrail');
    const fill = mk('div', 'fill'); fill.style.width = '0'; rail.appendChild(fill);
    D.timeline.forEach(t => {
      const n = mk('div', 'tnode');
      n.dataset.y = t.year;
      n.innerHTML = '<div class="ring">' + t.count + '</div><div class="y">' + t.year + '</div>';
      n.addEventListener('click', () => selectYear(t.year));
      rail.appendChild(n);
    });
    $('#sumbar').innerHTML = D.summary.map(s =>
      '<div><div class="v">' + s.value + '</div><div class="u">' + s.unit + '</div><div class="l">' + s.label + '</div></div>').join('');
  })();
  function selectYear(year, force) {
    if (!force && year === tlYear) return;
    tlYear = year;
    const t = D.timeline.find(x => x.year === year);
    const idx = D.timeline.indexOf(t);
    $$('#tlrail .tnode').forEach(n => n.classList.toggle('on', +n.dataset.y === year));
    $('#tlrail .fill').style.width = (idx / (D.timeline.length - 1)) * 88 + '%';
    $('#tl-pg').textContent = t.program;
    $('#tl-title').textContent = t.title;
    $('#tl-text').textContent = t.text;
    animateNum($('#tl-count'), t.count, 900);
    const winners = D.companies.filter(c => c.years.indexOf(year) >= 0);
    const isNew = c => c.first === year;
    const isJub = c => year === 2026 && c.wins === 5;   // jubiláló: csak 2026-ban, az ötödik elismerésnél
    const nNew = winners.filter(isNew).length;
    $('#tl-split').innerHTML = '<div class="n"><b>' + nNew + '</b>új</div><div><b>' + (winners.length - nNew) + '</b>visszatérő</div>';
    $('#w-label').textContent = year + ' — ' + winners.length + ' elismert vállalat';
    $('#w-legend').classList.toggle('y2026', year === 2026);
    // sorrend: új cégek elöl, aztán ábécé
    winners.sort((a, b) => isNew(b) - isNew(a) || a.name.localeCompare(b.name, 'hu'));
    $('#wgrid').innerHTML = winners.map(c =>
      '<div class="wg' + (isNew(c) ? ' new' : '') + (isJub(c) ? ' jub' : '') + '" data-id="' + c.id + '">' +
      (isNew(c) ? '<i class="new">ÚJ</i>' : '') + '<span class="nm">' + esc(c.name) + '</span>' +
      (isJub(c) ? '<span class="st">★</span>' : '') + '</div>').join('');
    $$('#wgrid .wg').forEach((e, i) => {
      e.style.setProperty('--d', (i * 0.3) + 's');
      e.addEventListener('click', () => openProfile(byId[e.dataset.id]));
    });
  }
  function animateNum(el, to, dur) {
    const t0 = performance.now();
    (function step(t) {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(Math.round(to * e));
      if (k < 1) requestAnimationFrame(step);
    })(t0);
    setTimeout(() => { el.textContent = fmt(to); }, dur + 150);
  }
  selectYear(2026, true);

  /* ---------- tonight ---------- */
  (function tonight() {
    $('#t-stats').innerHTML = D.tonight.stats.map(s =>
      '<div><div class="v"' + (s.value ? '' : ' style="color:#d8a13a;font-size:44px"') + '>' +
      (s.value || 'adat érkezik') + '</div><div class="l">' + s.label + '</div></div>').join('');
    $('#agenda').innerHTML = D.tonight.agenda.map(a =>
      '<div class="ag"><div class="tm' + (a.time ? '' : ' tbd') + '">' + (a.time || 'időpont<br>érkezik') + '</div>' +
      '<div><div class="tt">' + esc(a.title) + '</div><div class="pl">' + esc(a.place) + '</div></div></div>').join('');
  })();

  /* ---------- admin / welcome ---------- */
  const admin = $('#admin');
  // bal felső BMC logó: rövid koppintás -> kezdőképernyő, 2 mp nyomva tartás -> admin (csak kioszk)
  let pressT = null, longPress = false;
  $('#adminbtn').addEventListener('pointerdown', () => {
    longPress = false;
    if (!WEB) pressT = setTimeout(() => { longPress = true; openAdmin(); }, 2000);
  });
  $('#adminbtn').addEventListener('pointerup', () => {
    clearTimeout(pressT);
    if (!longPress && !admin.classList.contains('show')) toAttract();
  });
  ['pointerleave', 'pointercancel'].forEach(e => $('#adminbtn').addEventListener(e, () => clearTimeout(pressT)));
  if (!WEB) {
    document.addEventListener('keydown', e => { if (e.key.toLowerCase() === 'a' && e.ctrlKey) openAdmin(); });
    if (location.search.indexOf('admin') >= 0) openAdmin();
  }
  function openAdmin() { admin.classList.add('show'); clearTimeout(idleT); }
  $('#admin-close').addEventListener('click', () => { admin.classList.remove('show'); resetIdle(); });
  $('#admin-go').addEventListener('click', () => {
    const v = $('#admin-input').value.trim();
    if (v) welcome({ name: v });
  });
  $('#admin-input').addEventListener('keydown', e => {
    if (e.key === 'Enter') $('#admin-go').click();
  });
  (function fillAdminList() {
    const list = $('#alist');
    D.companies.slice().sort((a, b) => a.name.localeCompare(b.name, 'hu')).forEach(c => {
      const e = mk('div', 'ai', c.name);
      e.addEventListener('click', () => welcome(c));
      list.appendChild(e);
    });
  })();

  let welT = null;
  const welCv = $('#welfx'); welCv.width = 3840; welCv.height = 2160;
  const welCtx = welCv.getContext('2d');
  let welRaf = null;
  // visszafogott csillámok: a logó és a név körül lassan felszálló, halványuló arany fénypontok
  const welSpr = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,240,190,1)'); g.addColorStop(.3, 'rgba(245,221,134,.6)'); g.addColorStop(1, 'rgba(143,90,38,0)');
    x.fillStyle = g; x.fillRect(0, 0, 64, 64); return c;
  })();
  function sparkleWelcome() {
    const pts = [];
    const spawn = () => ({ x: 300 + Math.random() * 3240, y: 1500 + Math.random() * 800, s: 4 + Math.random() * 14,
      vy: -(.25 + Math.random() * .6), sway: Math.random() * 6.28, life: 0, max: 280 + Math.random() * 260 });
    cancelAnimationFrame(welRaf);
    let last = performance.now();
    (function frame(t) {
      const dt = Math.min(3, (t - last) / 16.67); last = t;
      if (pts.length < 70 && Math.random() < .5) pts.push(spawn());
      welCtx.clearRect(0, 0, 3840, 2160);
      welCtx.globalCompositeOperation = 'lighter';
      for (let k = pts.length - 1; k >= 0; k--) {
        const p = pts[k];
        p.life += dt; p.y += p.vy * dt; p.sway += .01 * dt;
        const a = Math.sin(Math.PI * Math.min(1, p.life / p.max));   // lassan fel, lassan le
        if (p.life >= p.max) { pts.splice(k, 1); continue; }
        welCtx.globalAlpha = .55 * a;
        welCtx.drawImage(welSpr, p.x + Math.sin(p.sway) * 24 - p.s, p.y - p.s, p.s * 2, p.s * 2);
      }
      welCtx.globalAlpha = 1; welCtx.globalCompositeOperation = 'source-over';
      welRaf = requestAnimationFrame(frame);
    })(last);
  }
  /* Üdvözlések sorban: ha közben újabb érkezik (hostess felület), az aktuális legalább WEL_MIN ideig
     látszik, utána jön a következő; egyébként WEL_MS után zárul. */
  const WEL_MS = 15000, WEL_MIN = 8000, welQ = [];
  let welOn = false, welClosing = false, welStart = 0, welName = '';
  function welcome(c) {
    if (welClosing) { welQ.unshift(c); return; }      // az előző épp elhalványul: utána jön
    admin.classList.remove('show');
    welOn = true; welStart = performance.now(); welName = c.name;
    $('#wel-name').textContent = c.name;
    const lg = $('#guest-logo');
    lg.className = 'logo' + (c.logoOnDark ? ' ondark' : c.logoDark ? ' dark' : '');
    lg.innerHTML = c.logo ? '<img src="' + c.logo + '" alt="">' : '';
    $('.wel').classList.toggle('nologo', !c.logo);
    const w = $('#welcome');
    w.classList.remove('play'); void w.offsetWidth; w.classList.add('play');
    w.classList.add('show');
    sparkleWelcome();
    clearTimeout(welT);
    welT = setTimeout(closeWelcome, welQ.length ? WEL_MIN : WEL_MS);
  }
  function closeWelcome() {
    if (!welOn) return;
    welOn = false; welClosing = true;
    $('#welcome').classList.remove('show');
    setTimeout(() => {
      $('#welcome').classList.remove('play');
      cancelAnimationFrame(welRaf);
      welCtx.clearRect(0, 0, 3840, 2160);
      welClosing = false;
      if (welQ.length) setTimeout(() => { if (!welOn && !welClosing && welQ.length) welcome(welQ.shift()); }, 250);
    }, 550);
  }
  function queueWelcome(c) {
    // ugyanaz a cég ne fusson le többször egymás után (pl. kollégák együtt érkeznek)
    if ((welOn && welName === c.name) || welQ.some(x => x.name === c.name)) return;
    if (!welOn && !welClosing) { welcome(c); return; }
    welQ.push(c);
    if (welOn) { clearTimeout(welT); welT = setTimeout(closeWelcome, Math.max(0, welStart + WEL_MIN - performance.now())); }
  }
  // hostess felület → LED fal (csak a kioszkon; a webes változat nem üdvözöl)
  const CK = window.BMCCheckin;
  if (CK && !WEB) CK.onWelcome(ev => {
    const m = (ev.company_id && byId[ev.company_id]) || byId[(CK.matchCompany(ev.company) || {}).id];
    // név a vendégcég-lista szerint; BMC-cégnél logóval, egyébként logó nélkül
    queueWelcome(Object.assign({}, m, { name: CK.companyName(ev.company, m && m.id) }));
    resetIdle();
  });
  $('#welcome').addEventListener('pointerdown', () => { clearTimeout(welT); closeWelcome(); });

  /* ---------- érintés-jelzések: ha egy ideig senki nem nyúl semmihez, egy koppintó kéz mutatja,
     mire lehet bökni (térképpont, kiemelt ország, timeline-csempe). Csak a kioszkon. ---------- */
  $$('#hu-map .hu-dot').forEach((g, i) => g.style.setProperty('--d', (-(i * 0.37) % 3.2).toFixed(2) + 's'));
  (function nudges() {
    if (WEB) return;
    const nudge = $('#nudge');
    let lastTouch = performance.now(), lastNudge = 0;
    const hide = () => nudge.classList.remove('show');
    document.addEventListener('pointerdown', () => { lastTouch = performance.now(); hide(); }, true);
    const inView = (r, box) => r.width > 0 && r.left > box.left + 40 && r.right < box.right - 40 && r.top > box.top + 40 && r.bottom < box.bottom - 40;
    function target() {
      let els = [], box;
      if (current === 'map' && !selected) {
        box = $('#hu-map').getBoundingClientRect();
        els = $$('#hu-map .hu-dot:not(.dimmed) circle.core');
      } else if (current === 'global') {
        box = $('#world-map').getBoundingClientRect();
        els = $$('#world-map path.w-bmc');
      } else if (current === 'timeline' && !$('#profile').classList.contains('show')) {
        box = $('#wgrid').getBoundingClientRect();
        els = $$('#wgrid .wg');
      }
      els = els.filter(e => inView(e.getBoundingClientRect(), box));
      return els.length ? els[(Math.random() * els.length) | 0] : null;
    }
    setInterval(() => {
      const now = performance.now();
      const busy = !current || $('#lightbox').classList.contains('show') || $('#welcome').classList.contains('show') ||
        $('#admin').classList.contains('show');
      if (busy) { hide(); return; }
      if (nudge.classList.contains('show')) { if (now - lastNudge > 4200) hide(); return; }
      if (now - lastTouch < 7000 || now - lastNudge < 12000) return;
      const el = target();
      if (!el) return;
      const r = el.getBoundingClientRect(), st = stage.getBoundingClientRect(), k = st.width / 3840;
      nudge.style.transform = 'translate(' + ((r.left + r.width / 2 - st.left) / k) + 'px,' + ((r.top + r.height / 2 - st.top) / k) + 'px)';
      nudge.classList.add('show');
      lastNudge = now;
    }, 700);
  })();

  if (WEB) go('map'); else toAttract();
})();
