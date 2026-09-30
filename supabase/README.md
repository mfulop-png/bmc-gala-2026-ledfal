# Vendégérkeztetés – beállítás

A hostessek a bejáratnál a **`/hostess/`** oldalon (tablet/telefon) pipálják ki az érkező vendégeket.
Ha a vendéghez cég tartozik, a LED falon (kioszk mód, `/`) azonnal lefut a cég üdvözlő animációja.
Best Managed cégnél logóval, más cégnél csak a cégnévvel.

```
hostess tablet ──► Supabase (guests tábla) ──trigger──► welcome_events ──realtime──► LED fal
```

> **Élő projekt:** Deloitte szervezet → **BMC Gala 2026** (`axtjmpjivhagvubvjvsp`, Frankfurt).
> A séma már fut rajta, a `config.js` ki van töltve. Az 1. pontból már csak a **3–4. lépés** van hátra
> (hostess-felhasználó és a regisztráció kikapcsolása).

## 1. Supabase projekt

1. Hozz létre egy projektet a supabase.com-on (az ingyenes csomag elég). Régiónak a `eu-central-1` (Frankfurt) javasolt.
2. **SQL Editor** → illeszd be a [`schema.sql`](schema.sql) teljes tartalmát → **Run**.
3. **Authentication → Users → Add user → Create new user**
   - e-mail: `hostess@bmc-gala.hu` (ha mást választasz, a `config.js`-ben és a `schema.sql` szabályaiban is írd át)
   - jelszó: ezt kapják meg a hostessek
   - pipáld be: **Auto Confirm User**
4. **Authentication → Sign In / Providers → Email:** a „Allow new users to sign up” kapcsolót kapcsold **ki**,
   hogy más ne tudjon fiókot létrehozni.
5. **Project Settings → API** (vagy **API Keys**): másold ki a *Project URL*-t és az *anon / publishable* kulcsot.

## 2. `config.js`

```js
window.BMC_CONFIG = {
  supabaseUrl: 'https://xxxxxxxx.supabase.co',
  supabaseAnonKey: 'eyJ… vagy sb_publishable_…',
  hostessEmail: 'hostess@bmc-gala.hu',
  demoPassword: 'demo'
};
```

Az anon/publishable kulcs nyilvános kulcs, a repóba is írható. A vendéglistához csak bejelentkezett
hostess fér hozzá (RLS). A LED fal bejelentkezés nélkül csak az üdvözlési eseményeket (cégneveket) látja.
**A `service_role` / secret kulcsot soha ne írd ide.**

Amíg a `config.js` üres, a rendszer **bemutató módban** fut (jelszó: `demo`). Ilyenkor a lista csak az adott
böngészőben él, és a LED fal csak ugyanazon a gépen, egy másik fülön kapja meg az üdvözléseket.

## 3. Használat a gálán

- **LED fal:** a szokásos kioszk URL (`/`, **nem** `?mode=web`). Internetkapcsolat kell hozzá.
- **Hostessek:** `/hostess/` → jelszó → keresés névre vagy cégre → **Megérkezett**.
  - Téves koppintásnál a felugró sávban **Visszavonás** (az animációt nem állítja le).
  - **↻ Üdvözlés:** egy megérkezett vendég cégének animációja újra.
  - **+ Új vendég:** kézi felvétel. A cégmező felajánlja a Best Managed cégeket, és „Most érkezett meg” jelöléssel azonnal üdvözöl.
  - **⋯ menü → Vendéglista importálása:** Excel (.xlsx) vagy CSV. Az első sor fejléc, a felismert oszlopok:
    *Név* (vagy *Vezetéknév* + *Keresztnév*), *Cég*, *E-mail*, *Megjegyzés*. A már listán lévő vendéget
    (azonos név és cég) kihagyja, így a frissített lista újra importálható.
  - **⋯ menü → Érkezések letöltése:** CSV az érkezési időpontokkal.
- Több tablet egyszerre is használható, a lista valós időben szinkronizál.

**Animációk sorrendje:** ha egyszerre többen érkeznek, az üdvözlések sorban jönnek. Ilyenkor mindegyik
legalább 8 mp-ig látszik, egyedül 15 mp-ig. Ugyanaz a cég nem fut le kétszer közvetlenül egymás után
(pl. ha kollégák együtt érkeznek).

## Gála után

A vendéglista személyes adat. Az esemény után töröld: SQL Editor → `truncate public.guests, public.welcome_events;`
(vagy töröld a projektet).
