import * as cheerio from 'cheerio';
import { error } from 'console';
import "dotenv/config";
import express from 'express';
import got from 'got';
import { url } from 'inspector';
import neo4j from "neo4j-driver";
import { argv, exit, title } from 'process';
import promClient from 'prom-client';
import { describe } from 'vitest';

console.debug = () => { };

// Pyroscope.init(
//     appName: 'neo4j-demo/wikipedia'
// });

const app = express()
app.listen(3000)

const register = promClient.register;
// register.setContentType(promClient.Registry.OPENMETRICS_CONTENT_TYPE);

// app.use(Pyroscope.expressMiddleware());
// Pyroscope.start()

// Status response bucket (histogram)
const cypherTimer = new promClient.Histogram({
    name: 'wikiscraper_cypher_timer',
    help: 'The time spent in cypher queries',
});

// Status response bucket (histogram)
const scrapeTimer = new promClient.Histogram({
    name: 'wikiscraper_scraper_timer',
    help: 'The time spent in scraping',
});

// Status response bucket (histogram)
const enqueueTimer = new promClient.Histogram({
    name: 'wikiscraper_enqueue_timer',
    help: 'The time spent in enqueueing',
});

const wikiPageCounter = new promClient.Counter({
    name: 'wikiscraper_pages',
    help: 'The number of page scraped'
})

const wikiLinksCounter = new promClient.Counter({
    name: 'wikiscraper_links',
    help: 'The number of links created'
})

const neo4jNodesCounter = new promClient.Gauge({
    name: 'wikiscraper_neo4j_nodes_total',
    help: 'Total number of WikiPage nodes in Neo4j'
})

const neo4jLinksCounter = new promClient.Gauge({
    name: 'wikiscraper_neo4j_links_total',
    help: 'Total number of LINKS relationships in Neo4j'
})

const queueSize = new promClient.Gauge({
    name: 'wikiscraper_queue_size',
    help: 'Current size of the queue'
})

const uptime = new promClient.Gauge({
    name: 'wikiscraper_uptime_seconds',
    help: 'Uptime in seconds'
})

const startTime = new promClient.Gauge({
    name: 'wikiscraper_start_time',
    help: 'Start timestamp'
})

const httpTimer = new promClient.Histogram({
    name: 'wikiscraper_wikepedia_http_timer',
    help: 'Duration of wikipedia http requests'
})

const cheerioLoadTimer = new promClient.Histogram({
    name: 'wikiscraper_cheerio_load_timer',
    help: 'Duration of Cheerio load phase'
})

const htmlParseTimer = new promClient.Histogram({
    name: 'wikiscraper_html_parse_timer',
    help: 'Duration of HTML parsing phase'
})

const startMs = Date.now();
startTime.set(startMs)

const METRICS_NEO4J_INTERVAL_MS = 60000
const MAX_CACHE_SIZE = 100000;
const MAX_NEXTS = 3;

const DEFAULT_URL = "https://fr.wikipedia.org/wiki/Barack_Obama"
const DEFAULT_MAX_DISTANCE = 10;
const DEFAULT_PAGE_SIZE = 100000;

type WikiUrl = string;

type PageInfo = {
    url: WikiUrl;
    title: string;
    next: Set<{ url: WikiUrl, title: string }>;
    distance: number;
}

function findTitle(url: string, $: cheerio.CheerioAPI): string {
    let text = $('.mw-page-title-main').first().text();
    if (text) {
        return text;
    }

    const heading = $('#firstHeading').first()
    if (!heading.find('span').length) {
        return heading.text();
    }

    text = $('#firstHeading span').first().text()
    if (text) {
        return text;
    }

    console.error("Unable to find title. url=" + url)
    return '';
}

function timeSync<T>(timer: promClient.Histogram<string>, fn: () => T): T {
    const endFn = timer.startTimer()
    const result: T = fn();
    endFn();
    return result;
}


function timeAsync<T>(timer: promClient.Histogram<string>, fn: () => Promise<T>): Promise<T> {
    const endFn = timer.startTimer()
    return fn().finally(() => endFn());
}

async function scrape(url: WikiUrl, distance: number): Promise<PageInfo> {
    // console.log(`${url} (${++count})`)

    const endTimerFn = scrapeTimer.startTimer()

    const response = await timeAsync(httpTimer, async () => got(url));
    const $ = timeSync(cheerioLoadTimer, () => cheerio.load(response.body));

    const endParseFn = htmlParseTimer.startTimer();
    const title = findTitle(url, $)
    // console.log(`${url} - title: ${title}`)

    const a = $('.mw-content-ltr').first()
        .find('a')

    // console.log(`${url} - a:`, a)

    const baseUrl = url.split('/wiki')[0]
    const next = a
        .filter((_, el) => el.attribs.href?.startsWith('/wiki/'))
        .filter((_, el) => !el.attribs.href.includes('/API_'))
        .filter((_, el) => !el.attribs.href.includes(':'))
        .map((_, el) => ({ url: baseUrl + el.attribs.href.split("#")[0], title: el.attribs.title ?? '' }))
        .get()
    endParseFn();
    // console.log(`${url} - links: ${next.length}`)

    // console.log(`[#${++count}] (d=${distance}) ${title} - ${next.length} links - ${url}`)

    //////////// MAX NUMBER OF NEIGHBOURS
    // nextUrls.splice(MAX_NEXTS, Infinity)

    const nextSet = new Set(next);

    endTimerFn();
    wikiPageCounter.inc();
    wikiLinksCounter.inc(nextSet.size)

    return {
        url,
        title,
        next: nextSet,
        distance: distance + 1
    }
}

function profileAsync<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    return fn()
    // return new Promise((resolve) => {
    //     Pyroscope.wrapWithLabels({}, async () => {
    //         resolve(fn());
    //     })
    // })
}

function profileSync<T>(operation: string, fn: () => T): T {
    return fn();
    // let result: T | null = null;
    // Pyroscope.wrapWithLabels({}, () => {
    //     result = fn();
    // })
    // return result!;
}

const startUrl = process.argv[2] ?? DEFAULT_URL
const maxDistance = parseInt(process.argv[3] ?? DEFAULT_MAX_DISTANCE);

const visited = new Set<WikiUrl>();
let nodeCount = 0

const queue: { url: WikiUrl, distance: number }[] = [{ url: startUrl, distance: 0 }];
let count = 0;

app.get('/count', (req, res) => {
    res.send({ count });
})

app.get('/queue/size', (req, res) => {
    res.send({ size: queue.length })
})

app.get('/queue', (req, res) => {
    res.send(queue);
})

const driver = neo4j.driver(
    process.env.NEO4J_URL!,
    neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!)
);
await driver.executeQuery("CREATE INDEX wikipage_idx_url IF NOT EXISTS FOR (n:WikiPage) ON (n.url)");

// Metrics endpoint handler (for Prometheus scraping)
app.get('/metrics', async (req, res) => {
    uptime.set(Math.floor((Date.now() - startMs) / 1000))
    queueSize.set(queue.length);
    res.set('Content-Type', register.contentType);
    res.send(await register.metrics());
});

async function runCount(query) {
    const countResult = await driver.executeQuery(query);
    return countResult.records?.[0]?.get('cnt')?.low;
}

setInterval(async () => {
    const cntNodes = await runCount(`MATCH (n:WikiPage) RETURN count(n) as cnt`)
    const cntLinks = await runCount(`MATCH (:WikiPage)-[r:LINKS]->() RETURN count(r) as cnt`)

    neo4jNodesCounter.set(cntNodes);
    neo4jLinksCounter.set(cntLinks);

    console.log(`Updated neo4j metrics. Nodes: ${cntNodes}, Links; ${cntLinks}`)

}, METRICS_NEO4J_INTERVAL_MS)

function executeQuery(cypher: string) {
    console.debug("[CYPHER] " + cypher);
    return driver.executeQuery(cypher);
}

function paginate(cypher: string, page: number = 0, pageSize: number = DEFAULT_PAGE_SIZE) {
    const skip = page * pageSize
    cypher = `${cypher} SKIP ${skip} LIMIT ${pageSize}`

    return executeQuery(cypher);
}

async function loadVisitedFromNeo4j(visited: Set<string>) {
    const count = await runCount('match (n:WikiPage) where n.__load_created_at is not null return count(n) as cnt');
    console.log(`Loading cache of ${count} nodes...`)

    let page = 0;
    while (visited.size < count) {
        const results = await paginate(`match (n:WikiPage) where n.__load_created_at is not null return n`, page, 10000)

        for (const rec of results.records) {
            const props = rec.get('n').properties
            visited.add(props.url)
        }

        console.log("[%f%%] Page: %d, visited size: %d", Math.floor(100 * (visited.size * 100 / count)) / 100, page, visited.size)
        page++;
    }
}

async function loadQueueFromNeo4j(queue: { url: WikiUrl, distance: number }[]) {
    const count = await runCount('match (n:WikiPage) where n.__error is null and n.__load_created_at is null and not exists ((n)-[:LINKS]->()) return count(n) as cnt');
    console.log(`Loading ${count} nodes...`)

    let page = 0;
    while (queue.length < count) {
        const results = await paginate(`match (n:WikiPage) where n.__error is null and n.__load_created_at is null and not exists ((n)-[:LINKS]->()) return n`, page)

        for (const rec of results.records) {
            const props = rec.get('n').properties
            queue.push({ url: props.url, distance: props.__load_distance })
        }


        console.log("[%f%%] Page: %d, queue size: %d", Math.floor(100 * (queue.length * 100 / count)) / 100, page, queue.length)
        page++;
    }
}


if (argv.includes('--restart')) {
    console.log("Restarting...")
    queue.splice(0, queue.length)
    await loadQueueFromNeo4j(queue);
    await loadVisitedFromNeo4j(visited)
    queue.sort((a, b) => a.distance - b.distance)
    console.log("Loaded queue of " + queue.length + " elements")
}


while (queue.length && visited.size < MAX_CACHE_SIZE) {
    // console.log("it")

    const node = queue.shift()!

    if (node.distance >= maxDistance) {
        continue;
    }

    if (visited.has(node.url)) {
        continue;
    }

    try {
        // console.log("Scraping " + node.url + "...")
        const pageInfos = await scrape(node.url, node.distance);
        if (!pageInfos.title) {
            continue;
        }

        const endCypherTimerFn = cypherTimer.startTimer()
        // await driver.executeQuery(`MERGE (p:WikiPage {url: $page.url}) SET p.title = $page.title`, {page: pageInfos})
        await driver.executeQuery(`
        MERGE (from: WikiPage {url: $page.url}) 
            SET from.title = $page.title, 
                from.__load_distance = $distance,
                from.__load_created_at = datetime()
        WITH from 
        UNWIND $page.next as next
        MERGE (to: WikiPage {url: next.url})
            SET to.title = next.title, 
                to.__load_distance = $distance+1, 
                to.__load_precreated_at = datetime()
        MERGE (from)-[:LINKS]->(to)
        `, { page: pageInfos, distance: node.distance })
        endCypherTimerFn();

        count++;


        console.log(`[#${++nodeCount}] (d=${pageInfos.distance}) Created node '${pageInfos.url}' and ${pageInfos.next.size} outgoing links`)

        visited.add(node.url);

        const queueTimerFn = enqueueTimer.startTimer();
        for (const next of pageInfos.next) {
            queue.push({ url: next.url, distance: node.distance + 1 })
        }
        queueTimerFn();
    }
    catch (err) {
        console.error(err.message, err.code, node.url);

        await driver.executeQuery(`
            MATCH (from: WikiPage {url: $url}) 
                SET from.__has_error = true,
                    from.__error_msg = $error,
                    from.__error_code = $errorCode,
                    from.__error_at = datetime()
        `, { url: node.url, error: err.message, errorCode: err.code })

        console.log("Saved node " + node.url + " with error")
    }
    // console.log("Queue length: ", queue.length);

    // queue.sort((a, b) => a.distance - b.distance)
}


// function printSummary() {
//     console.log("-----------------------------------------");
//     console.log("SUMMARY:\n");

//     const pages = Array.from(visited.values()).sort((a, b) => a.distance - b.distance);

//     for (const page of pages) {
//         for (const next of page.next) {
//             console.log(`[#${page.distance}] ${page.url} → ${next}`)
//         }
//     }
// }

// printSummary();


// async function batchInsert<T extends Record<string, Iterable<any>>>(query: string, params: T, batchSize: number = 10000) {
//     if (Object.keys(params).length > 1) {
//         throw new Error("More than one key in batchable params: " + JSON.stringify(Object.keys(params)))
//     }

//     const key = Object.keys(params)[0]

//     const items = [...params[key]];
//     console.log("Creating " + items.length + " items using batches of " + batchSize + " elements...");
//     const total = Math.ceil(items.length / batchSize);
//     let i = 0;
//     while (items.length) {
//         const batch = items.splice(0, batchSize)
//         await driver.executeQuery(query, { [key]: batch })

//         i++;
//         console.log(`[${i}/${total}] Inserted ${batch.length} elements`)
//     }
// }

// await driver.executeQuery(`MATCH (u:User) DETACH DELETE u`)

// await driver.executeQuery("CREATE INDEX wikipage_idx_url IF NOT EXISTS FOR (n:WikiPage) ON (n.url)");

// await batchInsert(`
// UNWIND $pages as page
// CREATE (p:WikiPage {title: page.title, url: page.url})
// `, { pages: visited.values() })

// console.log(`Created ${visited.size} WikiPage nodes`)


// const links = Array.from(visited.values())
//     .flatMap(page => page.next.map(next => ({ from: page.url, to: next })))

// await batchInsert(`
// UNWIND $links as link
// MATCH (from: WikiPage {url: link.from})
// MATCH (to: WikiPage {url: link.to})
// CREATE (from)-[:LINKS]->(to)
// `, { links })

// console.log(`Created ${links.length} LINKS relationships`)

driver.close();
