# Sktorrent-Stremio-addon

Tento neoficiálny doplnok pre [Stremio](https://www.stremio.com/) umožňuje vyhľadávať a streamovať filmy a seriály z populárneho slovenského torrent trackera **[SKTorrent.eu](https://sktorrent.eu/torrent/index.php)** priamo cez Stremio rozhranie. Inšpiráciou pre vytvorenie tohto doplnku bol populárny Stremio doplnok [Torrentio](https://github.com/TheBeastLT/torrentio-scraper).

## 🔧 Funkcie

- Vyhľadávanie filmov aj seriálov podľa názvu z TMDB (vrátane fallback variant).
- Podpora sezón a epizód v rôznych formátoch (`S01E01`, `1. serie`, `Season 3`, atď.).
- Detekcia a selekcia relevantných multimediálnych súborov z multi-epizódnych torrent balíkov.
- Filtrovanie podľa veľkosti, typu súboru (.mkv, .mp4, .avi, atď.).
- Automatická extrakcia `infoHash` zo `.torrent` súborov (funkcia je vo vývoji pre multi-session torrenty).
- Piktogramy jazykových vlajok a CSFD rating v názve streamu.

## 🧪 Lokálna inštalácia a testovanie

### 1. Klonovanie projektu
```bash
git clone https://github.com/tvoje-username/sktorrent-stremio-addon.git
cd sktorrent-stremio-addon
npm init -y
```

### 2. Inštalácia závislostí

```bash
npm install axios cheerio stremio-addon-sdk axios-cookiejar-support tough-cookie bncode entities parse-torrent-file
```

Poznámka: Je odporúčané používať Node.js verziu >=18, testované s [Node.js v20.09 LTS](https://nodejs.org/en/blog/release/v20.9.0)

### 3. Spustenie lokálneho servera (v príkazovom riadku sa potom zobrazujú debug správy)
```bash
node sktorrent-addon.js
```

Ak je všetko správne nakonfigurované, doplnok bude bežať na:

http://localhost:7000/manifest.json

## 🔗 Pridanie doplnku do aplikácie Stremio

- Otvor Stremio desktop alebo webovú aplikáciu.
- Choď na Add-ons > Community Add-ons > "Install via URL"
- Vlož adresu: http://localhost:7000/manifest.json

  Alternatívny postup inštalácie doplnku do aplikácie Stremio:
- V aplikácii Stremio klikni na "Addons" a potom na tlačidlo "Add addon" alebo jednoducho zadaj nasledovný odkaz do vyhľadávacieh poľa a nainštaluj doplnok: http://127.0.0.1:7000/manifest.json

## 📁 Konfigurácia

Autentifikácia na stránke [SKTorrent.eu](https://sktorrent.eu/torrent/index.php) je pre lokálne testovanie doplnku momentálne riešená pevne zadanými cookies (uid, pass) v zdrojovom kóde. Každý používateľ by si mal upraviť svoj vlastný login údaj pre korektné fungovanie:
```js
const SKT_UID = "tvoj_uid";
const SKT_PASS = "tvoj_pass_hash";
```

## ⚠️ Upozornenie

**Tento doplnok je určený výhradne na osobné, vývojové a experimentálne účely.**

Používanie tohto doplnku pre prístup k chránenému obsahu je **na vlastné riziko**.
Autor nenesie **žiadnu zodpovednosť** za prípadné porušenie autorských práv alebo právnych predpisov vyplývajúcich z používania tohto nástroja.
Tento projekt **nepropaguje pirátstvo**, ale demonštruje technické možnosti rozšírenia Stremio platformy.

## 🛠 Licencia

MIT License (voľné použitie, bez záruky)

## 👨‍💻 Autor

Tento doplnok je experimentálny projekt na osobné účely.
Ak máš návrhy na vylepšenie alebo chceš prispieť – neváhaj a pošli pull request.

# Inštrukcie pre online testovanie

Ukážky z lokálneho testovania doplnku:
<img title="A sample of usage stremio adddon with movie search in Stremio" alt="A sample of usage stremio adddon with movie search in Stremio" src="sample1.png">
<img title="A sample of usage stremio adddon with series search in Stremio" alt="The sample of usage stremio adddon with movie search in Stremio" src="sample2.png">


🛠️ Krok za krokom: Deploy na Render (online testovanie)

    - Vytvor nový GitHub repozitár s týmito súbormi (alebo vytvor fork projektu na svojom GitHub učte)
    - Prejdi na: https://render.com/ a zaregistruj sa / prihlás.
    - Klikni na "New +" → "Web Service".
    - Vyber možnosť "Deploy from a Git repository" a prepoj svoj GitHub účet.
    - Vyber svoj repozitár (napr. Sktorrent-Stremio-addon).
    - Vyplň nastavenia:
        Name: napr. sktorrent-addon
        Environment: Node
        Build Command:	npm install
        Start Command:  node sktorrent-addon.js
        Region: podľa tvojho výberu
        Instance Type: Free (ak ti postačuje)
    - V sekcii Environment Variables zadaj:
        SKT_UID = tvoje_UID
        SKT_PASS = tvoje_PASS
    - Klikni "Create Web Service".

🌐 Po deploy

Po deployi ti Render vygeneruje URL napr.:

https://sktorrent-addon.onrender.com/manifest.json

Túto adresu môžeš použiť v Stremio na inštaláciu doplnku a jeho testovanie.
