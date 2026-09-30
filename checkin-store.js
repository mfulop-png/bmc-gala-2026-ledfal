/* BMC Gála 2026 — vendégérkeztetés adatréteg (hostess felület + LED fal közösen használja)
   Supabase módban: vendéglista a `guests` táblában, üdvözlések a `welcome_events` táblán keresztül (realtime).
   Bemutató módban (nincs Supabase beállítva): localStorage + BroadcastChannel, csak egy gépen belül. */
window.BMCCheckin = (function () {
  'use strict';
  const C = window.BMC_CONFIG || {};
  const LIVE = !!(C.supabaseUrl && C.supabaseAnonKey && window.supabase && window.supabase.createClient);

  /* ---------- cégnév → Best Managed cég (logó miatt) ---------- */
  const SUFFIX = /\b(kft|zrt|nyrt|bt|kkt|rt|ltd|gmbh|cegcsoport|csoport|group|holding|magyarorszag|hungary|hungaria)\b/g;
  const norm = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[-–_/&.,()]/g, ' ').replace(SUFFIX, ' ').replace(/\s+/g, ' ').trim();
  let idx = null;
  function index() {
    if (idx) return idx;
    const list = (window.BMC_DATA && window.BMC_DATA.companies) || [];
    idx = [];
    list.forEach(c => {
      const keys = new Set([norm(c.name)]);
      const par = c.name.match(/\(([^)]+)\)/);          // pl. „Vöröskő Kft. (Euronics)”
      if (par) { keys.add(norm(par[1])); keys.add(norm(c.name.replace(par[0], ''))); }
      keys.forEach(k => { if (k) idx.push([k, c]); });
    });
    return idx;
  }
  function matchCompany(text) {
    const n = norm(text);
    if (!n) return null;
    const I = index();
    let hit = I.find(([k]) => k === n);
    // részleges egyezés szóhatáron (pl. „Goodwill” ↔ „Goodwill Pharma”), de csak elég hosszú névre
    if (!hit) hit = I.find(([k]) => (k.startsWith(n + ' ') && n.length >= 5) || (n.startsWith(k + ' ') && k.length >= 5));
    return hit ? hit[1] : null;
  }
  const searchKey = s => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  /* ---------- Supabase ---------- */
  function supabaseStore() {
    const sb = window.supabase.createClient(C.supabaseUrl, C.supabaseAnonKey, {
      auth: { persistSession: true, storageKey: 'bmc-hostess-auth' }
    });
    const cols = 'id,name,company,company_id,email,note,source,checked_in_at,created_at';
    const ok = r => { if (r.error) throw r.error; return r.data; };
    return {
      mode: 'supabase',
      async session() { return !!(await sb.auth.getSession()).data.session; },
      async login(password) {
        const r = await sb.auth.signInWithPassword({ email: C.hostessEmail, password });
        if (r.error) throw new Error('Hibás jelszó');
      },
      async logout() { await sb.auth.signOut(); },
      async list() {
        const out = [];
        for (let from = 0; ; from += 1000) {             // lapozva (1000 soros API-korlát)
          const d = ok(await sb.from('guests').select(cols).order('name').range(from, from + 999));
          out.push(...d);
          if (d.length < 1000) return out;
        }
      },
      onGuests(cb) {
        return sb.channel('guests').on('postgres_changes', { event: '*', schema: 'public', table: 'guests' }, () => cb()).subscribe();
      },
      async checkIn(id) { ok(await sb.from('guests').update({ checked_in_at: new Date().toISOString() }).eq('id', id).is('checked_in_at', null)); },
      async undo(id) { ok(await sb.from('guests').update({ checked_in_at: null }).eq('id', id)); },
      async add(g) { return ok(await sb.from('guests').insert(g).select(cols).single()); },
      async addMany(rows) {
        for (let i = 0; i < rows.length; i += 500) ok(await sb.from('guests').insert(rows.slice(i, i + 500)));
      },
      async replay(g) { ok(await sb.from('welcome_events').insert({ company: g.company, company_id: g.company_id })); },
      onWelcome(cb) {
        return sb.channel('welcome').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'welcome_events' },
          p => cb(p.new)).subscribe();
      }
    };
  }

  /* ---------- bemutató mód ---------- */
  function demoStore() {
    const KEY = 'bmc-checkin-demo', AUTH = 'bmc-checkin-demo-auth';
    const bc = 'BroadcastChannel' in window ? new BroadcastChannel('bmc-checkin') : null;
    const listeners = { guests: [], welcome: [] };
    const safe = f => { try { return f(); } catch (e) { return null; } };
    function load() {
      let g = safe(() => JSON.parse(localStorage.getItem(KEY)));
      if (!Array.isArray(g)) {
        const cs = ((window.BMC_DATA && window.BMC_DATA.companies) || []).slice(0, 8);
        g = cs.map((c, i) => ({ id: 'demo-' + i, name: 'Minta Vendég ' + (i + 1), company: c.name, company_id: c.id,
          email: null, note: null, source: 'import', checked_in_at: null, created_at: new Date().toISOString() }));
        save(g);
      }
      return g;
    }
    function save(g) { safe(() => localStorage.setItem(KEY, JSON.stringify(g))); }
    function changed() { listeners.guests.forEach(f => f()); bc && bc.postMessage({ t: 'guests' }); }
    function welcome(g) {
      if (!g.company || !String(g.company).trim()) return;
      const ev = { company: String(g.company).trim(), company_id: g.company_id || null, created_at: new Date().toISOString() };
      listeners.welcome.forEach(f => f(ev)); bc && bc.postMessage({ t: 'welcome', ev });
    }
    if (bc) bc.onmessage = m => {
      if (m.data.t === 'guests') listeners.guests.forEach(f => f());
      if (m.data.t === 'welcome') listeners.welcome.forEach(f => f(m.data.ev));
    };
    const uid = () => 'g-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    return {
      mode: 'demo',
      async session() { return safe(() => sessionStorage.getItem(AUTH)) === '1'; },
      async login(pw) {
        if (pw !== (C.demoPassword || 'demo')) throw new Error('Hibás jelszó');
        safe(() => sessionStorage.setItem(AUTH, '1'));
      },
      async logout() { safe(() => sessionStorage.removeItem(AUTH)); },
      async list() { return load(); },
      onGuests(cb) { listeners.guests.push(cb); },
      async checkIn(id) {
        const g = load(), x = g.find(v => v.id === id);
        if (!x || x.checked_in_at) return;
        x.checked_in_at = new Date().toISOString(); save(g); changed(); welcome(x);
      },
      async undo(id) {
        const g = load(), x = g.find(v => v.id === id);
        if (x) { x.checked_in_at = null; save(g); changed(); }
      },
      async add(v) {
        const g = load(), x = Object.assign({ id: uid(), created_at: new Date().toISOString() }, v);
        g.push(x); save(g); changed(); if (x.checked_in_at) welcome(x); return x;
      },
      async addMany(rows) {
        const g = load();
        rows.forEach(r => g.push(Object.assign({ id: uid(), created_at: new Date().toISOString() }, r)));
        save(g); changed();
      },
      async replay(g) { welcome(g); },
      onWelcome(cb) { listeners.welcome.push(cb); }
    };
  }

  const store = LIVE ? supabaseStore() : demoStore();
  store.matchCompany = matchCompany;
  store.searchKey = searchKey;
  store.norm = norm;
  return store;
})();
