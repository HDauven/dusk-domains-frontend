// Tells Bing (and the other IndexNow engines: Yandex, Seznam, Naver) that the site's pages changed, so they
// recrawl now instead of eventually. Run after a deploy that changes public pages: `npm run indexnow`.
// Google doesn't use IndexNow; it reads the sitemap (listed in robots.txt) and Search Console.
const SITE = "https://dusk.domains";
// The key is public by design: IndexNow checks that this file on the site contains it.
const KEY = "25c4581a8bbc673e1f4038635f0ac1e6";

const sitemap = await (await fetch(`${SITE}/sitemap.xml`)).text();
const urlList = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
if (!urlList.length) throw new Error("No URLs found in the sitemap.");

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: new URL(SITE).host, key: KEY, keyLocation: `${SITE}/${KEY}.txt`, urlList }),
});
// 200 = accepted, 202 = accepted while the key is being verified.
console.log(`IndexNow: ${res.status} for ${urlList.length} URLs`);
if (!res.ok) process.exit(1);
