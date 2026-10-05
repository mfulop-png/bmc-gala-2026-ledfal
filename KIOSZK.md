# LED fal kioszk-beállítás (Legamaster EVOLVE3)

Cél: a vendég a kijelző nyomkodásával ne léphessen ki a böngészőből, ne váltson más alkalmazásra,
és ne hívjon elő rendszer- vagy böngészőmenüt.

## 1. Amit maga az oldal már letilt (kioszk módban, `/` – nem `?mode=web`)

- hosszú nyomásra megjelenő menü, szövegkijelölés, képek kihúzása
- dupla koppintásos és csippentéses **oldal**nagyítás (a térkép saját nagyítása működik)
- lehúzásra frissítés, oldalra húzásos „vissza” navigáció; a „vissza” gomb a kezdőképernyőre visz, nem lép ki
- böngésző-gyorsbillentyűk: F1–F12, Ctrl+R/T/N/W/L/P/S…, Alt+←/→, Backspace (billentyűzet csatlakoztatása esetén)
- az első érintéskor **teljes képernyőre** vált (eltűnik a címsor és a fülsáv), és ha valahogy kilép belőle,
  a következő érintésre visszavált

**Amit egy weboldal nem tud letiltani:** a kijelző szélénél behúzható Android-menük, a navigációs sáv
(vissza/kezdőlap/alkalmazásváltó), a lebegő eszköztár, a fizikai gombok, és néhány böngészőszintű
billentyű (pl. Ctrl+W, Alt+F4). Ezeket az alábbi módon a kijelzőn kell lezárni.

## 2. A kijelző lezárása – Android (a kijelző beépített rendszere)

**Ajánlott: kioszkböngésző.** A legmegbízhatóbb egy erre készült böngészőalkalmazás, pl. a
*Fully Kiosk Browser* (Google Play, a kioszkfunkciókhoz PLUS licenc kell). Ebben:

1. Kezdőlap (Start URL): a LED fal címe (`…/` – **nem** `?mode=web`).
2. Kioszk mód bekapcsolása, kilépési PIN beállítása (ezt csak a személyzet tudja).
3. Kapcsold be: állapotsor (status bar) tiltása, navigációs sáv / kezdőlap- és alkalmazásváltó gomb tiltása,
   *Disable other apps*, alvás/képernyőzár tiltása (a kijelző mindig ébren marad).
4. Kapcsold ki: a böngésző saját kontextusmenüje és címsora, nagyítás (zoom), húzásra frissítés.
5. Állítsd be, hogy a kijelző bekapcsolásakor automatikusan ez az alkalmazás induljon.

**Ha nem telepíthető alkalmazás:** az Android beépített *alkalmazásrögzítés* (App pinning / Képernyő
rögzítése) funkciója – Beállítások → Biztonság → Alkalmazásrögzítés. Ezzel a böngésző nem hagyható el, amíg a
személyzet fel nem oldja. (Ez gyengébb: a böngésző saját menüi elérhetők maradnak, de az oldal teljes képernyőre
váltása ezeket elrejti.)

**A kijelző saját menüi:** a Legamaster kijelzőkön a beállításokban (jellemzően admin jelszóval védve)
kikapcsolható a **lebegő/oldalsó eszköztár** és a **széléről behúzható menük (gesztusok)**, valamint
beállítható a beállítások jelszavas zárolása. A pontos menünév a firmware-verziótól függ –
keresd a *toolbar / sidebar / floating menu / gesture / lock* kifejezéseket, vagy a Legamaster kézikönyvet.

## 3. Ha a kijelzőben Windows-os OPS-számítógép fut

- Chrome indítása kioszkként:
  `chrome.exe --kiosk --disable-pinch --overscroll-history-navigation=0 --noerrdialogs --no-first-run "https://…/"`
- Windows szélről behúzott gesztusok tiltása: csoportházirend
  *Számítógép konfigurációja → Felügyeleti sablonok → Windows-összetevők → Edge UI → „Allow edge swipe” = Letiltva*.
- Teljes zároláshoz: Windows *Hozzárendelt hozzáférés (Assigned Access / kioszk mód)* egy dedikált felhasználóval.

## 4. Személyzet

- Admin (üdvözlés kézi indítása): a bal felső BMC logó **2 mp-es nyomva tartása**.
- Kezdőképernyő: a bal felső logó rövid koppintása.
- Kilépés a kioszkból: a kioszkböngésző PIN-je / az alkalmazásrögzítés feloldása.
- Ellenőrzés a helyszínen: próbáld ki a széléről behúzást minden oldalon, a hosszú nyomást, a dupla és a
  háromujjas koppintást, és a fizikai gombokat. Az érintés diagnosztikája: `…/touchtest.html`.
