// SKTorrent Stremio addon s pokročilým fallback systémom pre filmy a seriály
const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const { decode } = require("entities");
const axios = require("axios");
const cheerio = require("cheerio");
const bencode = require("bncode");
const crypto = require("crypto");


const SKT_UID = process.env.SKT_UID || "";
const SKT_PASS = process.env.SKT_PASS || "";
const TMDB_API_KEY = process.env.TMDB_API_KEY || "";


const BASE_URL = "https://sktorrent.eu";
const SEARCH_URL = `${BASE_URL}/torrent/torrents_v2.php`;
const TMDB_BASE_URL = "https://api.themoviedb.org/3";


const builder = addonBuilder({
    id: "org.stremio.sktorrent",
    version: "1.0.0",
    name: "SKTorrent",
    description: "Streamuj torrenty z SKTorrent.eu (filmy aj seriály)",
    types: ["movie", "series"],
    catalogs: [
        { type: "movie", id: "sktorrent-movie", name: "SKTorrent Filmy" },
        { type: "series", id: "sktorrent-series", name: "SKTorrent Seriály" }
    ],
    resources: ["stream"],
    idPrefixes: ["tt"]
});


const langToFlag = {
    CZ: "🇨🇿", SK: "🇸🇰", EN: "🇬🇧", US: "🇺🇸",
    DE: "🇩🇪", FR: "🇫🇷", IT: "🇮🇹", ES: "🇪🇸",
    RU: "🇷🇺", PL: "🇵🇱", HU: "🇭🇺", JP: "🇯🇵",
    KR: "🇰🇷", CN: "🇨🇳"
};


function removeDiacritics(str) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}


function shortenTitle(title, wordCount = 3) {
    return title.split(/\s+/).slice(0, wordCount).join(" ");
}


function isMultiSeason(title) {
    return /(S\d{2}E\d{2}-\d{2}|Complete|All Episodes|Season \d+(-\d+)?)/i.test(title);
}


async function getTitleFromTMDB(imdbId, type) {
    try {
        // Convert IMDB ID to TMDB ID
        const findRes = await axios.get(`${TMDB_BASE_URL}/find/${imdbId}`, {
            params: {
                api_key: TMDB_API_KEY,
                external_source: 'imdb_id'
            },
            timeout: 5000,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
        });

        let tmdbId, title, originalTitle;

        if (type === 'movie' && findRes.data.movie_results && findRes.data.movie_results.length > 0) {
            tmdbId = findRes.data.movie_results[0].id;
        } else if (type === 'series' && findRes.data.tv_results && findRes.data.tv_results.length > 0) {
            tmdbId = findRes.data.tv_results[0].id;
        } else {
            console.log(`[WARN] TMDB nenašiel ${type} pre ${imdbId}`);
            return null;
        }

        // Get detailed info
        const endpoint = type === 'movie' ? 'movie' : 'tv';
        const detailsRes = await axios.get(`${TMDB_BASE_URL}/${endpoint}/${tmdbId}`, {
            params: {
                api_key: TMDB_API_KEY,
                append_to_response: 'external_ids'
            },
            timeout: 5000,
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
        });

        const data = detailsRes.data;
        title = data.title || data.name;
        originalTitle = data.original_title || data.original_name;

        console.log(`[DEBUG] 🌝 Lokalizovaný názov: ${title}`);
        console.log(`[DEBUG] 🇳️ Originálny názov: ${originalTitle}`);

        return { title, originalTitle };
    } catch (err) {
        console.error("[ERROR] TMDB API zlyhal:", err.message);
        if (err.response) {
            console.error(`[ERROR] Status: ${err.response.status}, Data:`, err.response.data);
        }
        return null;
    }
}


async function searchTorrents(query) {
    console.log(`[INFO] 🔎 Hľadám '${query}' na SKTorrent...`);
    try {
        const session = axios.create({
            headers: {
                Cookie: `uid=${SKT_UID}; pass=${SKT_PASS}`,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
                "Accept-Language": "sk-SK,sk;q=0.9,cs;q=0.8,en;q=0.7",
                "Referer": BASE_URL,
                "DNT": "1",
                "Connection": "keep-alive"
            },
            timeout: 10000,
            maxRedirects: 5
        });

        const res = await session.get(SEARCH_URL, { params: { search: query, category: 0 } });
        const $ = cheerio.load(res.data);
        const posters = $('a[href^="details.php"] img');
        const results = [];


        posters.each((i, img) => {
            const parent = $(img).closest("a");
            const outerTd = parent.closest("td");
            const fullBlock = outerTd.text().replace(/\s+/g, ' ').trim();
            const href = parent.attr("href") || "";
            const tooltip = parent.attr("title") || "";
            const torrentId = href.split("id=").pop();
            const category = outerTd.find("b").first().text().trim();
            const sizeMatch = fullBlock.match(/Velkost\s([^|]+)/i);
            const seedMatch = fullBlock.match(/Odosielaju\s*:\s*(\d+)/i);
            const size = sizeMatch ? sizeMatch[1].trim() : "?";
            const seeds = seedMatch ? seedMatch[1] : "0";
            if (!category.toLowerCase().includes("film") && !category.toLowerCase().includes("seri")) return;
            results.push({
                name: tooltip,
                id: torrentId,
                size,
                seeds,
                category,
                downloadUrl: `${BASE_URL}/torrent/download.php?id=${torrentId}`
            });
        });
        console.log(`[INFO] 📦 Nájdených torrentov: ${results.length}`);
        return results;
    } catch (err) {
        console.error("[ERROR] Vyhľadávanie zlyhalo:", err.message);
        if (err.response) {
            console.error(`[ERROR] Status: ${err.response.status}`);
        }
        return [];
    }
}


async function getInfoHashFromTorrent(url) {
    try {
        const res = await axios.get(url, {
            responseType: "arraybuffer",
            headers: {
                Cookie: `uid=${SKT_UID}; pass=${SKT_PASS}`,
                Referer: BASE_URL,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            },
            timeout: 10000
        });
        const torrent = bencode.decode(res.data);
        const info = bencode.encode(torrent.info);
        const infoHash = crypto.createHash("sha1").update(info).digest("hex");
        return infoHash;
    } catch (err) {
        console.error("[ERROR] ⛔️ Chyba pri spracovaní .torrent:", err.message);
        return null;
    }
}


async function toStream(t) {
    if (isMultiSeason(t.name)) {
        console.log(`[DEBUG] ❌ Preskakujem multi-season balík: '${t.name}'`);
        return null;
    }
    const langMatches = t.name.match(/\b([A-Z]{2})\b/g) || [];
    const flags = langMatches.map(code => langToFlag[code.toUpperCase()]).filter(Boolean);
    const flagsText = flags.length ? `\n${flags.join(" / ")}` : "";


    let cleanedTitle = t.name.replace(/^Stiahni si\s*/i, "").trim();
    const categoryPrefix = t.category.trim().toLowerCase();
    if (cleanedTitle.toLowerCase().startsWith(categoryPrefix)) {
        cleanedTitle = cleanedTitle.slice(t.category.length).trim();
    }


    const infoHash = await getInfoHashFromTorrent(t.downloadUrl);
    if (!infoHash) return null;


    return {
        title: `${cleanedTitle}\n👤 ${t.seeds}  📀 ${t.size}  🩲 sktorrent.eu${flagsText}`,
        name: `SKTorrent\n${t.category}`,
        behaviorHints: { bingeGroup: cleanedTitle },
        infoHash
    };
}


builder.defineStreamHandler(async ({ type, id }) => {
    console.log(`\n====== 🎮 RAW Požiadavka: type='${type}', id='${id}' ======`);


    const [imdbId, sRaw, eRaw] = id.split(":");
    const season = sRaw ? parseInt(sRaw) : undefined;
    const episode = eRaw ? parseInt(eRaw) : undefined;


    console.log(`====== 🎮 STREAM Požiadavka pre typ='${type}' imdbId='${imdbId}' season='${season}' episode='${episode}' ======`);


    const titles = await getTitleFromTMDB(imdbId, type);
    if (!titles) {
        console.log(`[WARN] Žiadne názvy z TMDB pre ${imdbId}, vraciam prázdne streamy`);
        return { streams: [] };
    }


    const { title, originalTitle } = titles;
    const queries = new Set();
    const baseTitles = [title, originalTitle].map(t => t.replace(/\(.*?\)/g, '').replace(/TV (Mini )?Series/gi, '').trim());


    baseTitles.forEach(base => {
        const noDia = removeDiacritics(base);
        const short = shortenTitle(noDia);


        if (type === 'series' && season && episode) {
            const epTag = ` S${String(season).padStart(2, '0')}E${String(episode).padStart(2, '0')}`;
            [base, noDia, short].forEach(b => {
                queries.add(b + epTag);
                queries.add((b + epTag).replace(/[\':]/g, ''));
                queries.add((b + epTag).replace(/[\':]/g, '').replace(/\s+/g, '.'));
            });
        } else {
            [base, noDia, short].forEach(b => {
                queries.add(b);
                queries.add(b.replace(/[\':]/g, ''));
                queries.add(b.replace(/[\':]/g, '').replace(/\s+/g, '.'));
            });
        }
    });


    console.log(`[DEBUG] 🔍 Vytvorených ${queries.size} vyhľadávacích dotazov:`, Array.from(queries));


    let torrents = [];
    let attempt = 1;
    for (const q of queries) {
        console.log(`[DEBUG] 🔍 Pokus ${attempt++}: Hľadám '${q}'`);
        torrents = await searchTorrents(q);
        if (torrents.length > 0) {
            console.log(`[INFO] ✅ Nájdené výsledky po ${attempt - 1} pokusoch`);
            break;
        }
        await new Promise(r => setTimeout(r, 800)); // Delay between requests
    }


    const streams = (await Promise.all(torrents.map(toStream))).filter(Boolean);
    console.log(`[INFO] ✅ Odosielam ${streams.length} streamov do Stremio`);
    return { streams };
});


builder.defineCatalogHandler(({ type, id }) => {
    console.log(`[DEBUG] 📚 Katalóg požiadavka pre typ='${type}' id='${id}'`);
    return { metas: [] }; // aktivuje prepojenie
});


console.log("\ud83d\udccc Manifest debug výpis:", builder.getInterface().manifest);
serveHTTP(builder.getInterface(), { port: 7000 });
console.log("\ud83d\ude80 SKTorrent addon beží na http://localhost:7000/manifest.json");
