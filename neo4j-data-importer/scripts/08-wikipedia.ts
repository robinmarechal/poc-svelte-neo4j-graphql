import * as cheerio from 'cheerio';
import "dotenv/config";
import express from 'express';
import got from 'got';
import neo4j from "neo4j-driver";
import { exit } from 'process';
import promClient from 'prom-client';


// Pyroscope.init(
//     appName: 'neo4j-demo/wikipedia'
// });

const app = express()
app.listen(3000)

const register = promClient.register;
promClient.collectDefaultMetrics({ register });
// register.setContentType(promClient.Registry.OPENMETRICS_CONTENT_TYPE);

// app.use(Pyroscope.expressMiddleware());
// Pyroscope.start()

// Status response bucket (histogram)
const cypherTimer = new promClient.Histogram({
    name: 'wikiscraper_cypher_timer',
    help: 'Duration of cypher query',
    labelNames: ["query"]
})

// const cypherSaveResultTimer = new promClient.Histogram({
//     name: 'wikiscraper_save_scrape_cypher_timer',
//     help: 'The time spent in cypher queries',
// });

// const cypherSaveErrorTimer = new promClient.Histogram({
//     name: 'wikiscraper_save_error_cypher_timer',
//     help: 'The time spent in cypher queries',
// });

// Status response bucket (histogram)
const scrapeTimer = new promClient.Histogram({
    name: 'wikiscraper_scraper_timer',
    help: 'The time spent in scraping',
});

// // Status response bucket (histogram)
// const enqueueTimer = new promClient.Histogram({
//     name: 'wikiscraper_enqueue_timer',
//     help: 'The time spent in enqueueing',
// });

const wikiPageCounter = new promClient.Counter({
    name: 'wikiscraper_pages',
    help: 'The number of page scraped'
})

const wikiLinksCounter = new promClient.Counter({
    name: 'wikiscraper_links',
    help: 'The number of links created'
})

// const cypherMergeReplaceSourceNodeTimer = new promClient.Histogram({
//     name: 'wikiscraper_merge_replace_source_node_timer',
//     help: 'Time spent in source node replacement during merge operation'
// })

// const cypherMergeReplaceTargetNodeTimer = new promClient.Histogram({
//     name: 'wikiscraper_merge_replace_target_node_timer',
//     help: 'Time spent in target node replacement during merge operation'
// })

// const cypherMergeDeleteOldNodeTimer = new promClient.Histogram({
//     name: 'wikiscraper_merge_delete_old_node_timer',
//     help: 'Time spent in old node deletion during merge operation'
// })

// const cypherPageAlreadyScrapedTimer = new promClient.Histogram({
//     name: 'wikiscraper_was_page_already_scraped_timer',
//     help: 'Duration of cypher query to check if a page has already been scraped'
// })

// const cypherLoadQueueChunkTimer = new promClient.Histogram({
//     name: 'wikiscraper_queue_chunk_load_timer',
//     help: 'Duration of cypher query to load next queue chunk'
// })

const wikiMergedPageNodesCounter = new promClient.Counter({
    name: 'wikiscraper_neo4j_merged_nodes_total',
    help: 'Number of merged wiki page nodes'
})

const neo4jNodesCounter = new promClient.Gauge({
    name: 'wikiscraper_neo4j_nodes_total',
    help: 'Total number of WikiPage nodes in Neo4j'
})

const neo4jLinksCounter = new promClient.Gauge({
    name: 'wikiscraper_neo4j_links_total',
    help: 'Total number of LINKS relationships in Neo4j'
})

const neo4jCompletedPagesGauge = new promClient.Gauge({
    name: 'wikiscraper_neo4j_pages_completed_current',
    help: 'Current number of completed pages saved in Neo4j'
})

const neo4jRemainingPagesGauge = new promClient.Gauge({
    name: 'wikiscraper_neo4j_remaining_pages',
    help: 'Current number of not scraped yet pages saved in Neo4j'
})

const neo4jNotScrapedYetCounter = new promClient.Counter({
    name: 'wikiscraper_neo4j_page_not_scraped_yet_hit_total',
    help: 'Number of times a page has been considered not scraped yet, using neo4j as cache'
})

const neo4jAlreadyScrapedCounter = new promClient.Counter({
    name: 'wikiscraper_neo4j_page_already_scraped_hit_total',
    help: 'Number of times a page has been considered already scraped, using neo4j as cache'
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

const mSuccessCounter = new promClient.Counter({
    name: 'wikiscraper_scrape_success_total',
    help: 'Number of successfully scraped pages'
})

const mErrorsCounter = new promClient.Counter({
    name: 'wikiscraper_scrape_failed_total',
    help: 'Number of failed scrapes'
})

const startMs = Date.now();
startTime.set(startMs)

const METRICS_NEO4J_INTERVAL_MS = 60000
const MAX_CACHE_SIZE = 1000000000; //100000;
const MAX_NEXTS = 3;

const OPT_START_URL = "url"
const OPT_RESTART = "restart"
const OPT_PARALLEL_SCRAPES = "parallel-scrapes"
const OPT_MAX_DISTANCE = "max-distance"
const OPT_RESET = "reset"
const OPT_RESET_AND_STOP = "reset-and-stop"
const OPT_DEBUG = "debug"
const OPT_QUEUE_CHUNK_SIZE = "queue-chunk"

const DEFAULT_URL = "https://fr.wikipedia.org/wiki/Barack_Obama"
const DEFAULT_MAX_DISTANCE = 999;
const DEFAULT_PAGE_SIZE = 100000;
const DEFAULT_PARALLEL_SCRAPES = 10;
const DEFAULT_QUEUE_CHUNK_SIZE = 10000

type WikiUrl = string;

type PageInfo = {
    canonicalUrl: WikiUrl,
    url: WikiUrl;
    title: string;
    next: Set<{ url: WikiUrl, title: string }>;
    distance: number;
}

module CLI {
    export function getCliOption(key: string, defaultValue: number): number;
    export function getCliOption(key: string, defaultValue: string): string;
    export function getCliOption(key: string, defaultValue: number | string): number | string {
        const entry = process.argv.find(arg => arg.startsWith(`--${key}=`))

        if (!entry) {
            return defaultValue;
        }

        const cliValue = entry.split("=")[1]

        if (typeof defaultValue === 'string') {
            return cliValue;
        }
        if (typeof defaultValue === 'number') {
            return parseInt(cliValue);
        }

        throw new Error(`Cannot get CLI option --${key}`)
    }

    export function getCliFlag(key: string, defaultValue: boolean = false): boolean {
        return process.argv.includes(`--${key}`) ? true : defaultValue;
    }
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

    console.error(`Unable to find title. url=${url}`)
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
    const response = await timeAsync(httpTimer, async () => got(url));
    const $ = timeSync(cheerioLoadTimer, () => cheerio.load(response.body));

    const endParseFn = htmlParseTimer.startTimer();
    const title = findTitle(url, $)
    // console.log(`${url} - title: ${title}`)

    const a = $('.mw-content-ltr').first()
        .find('a')

    const canonicalUrl = $('link[rel=canonical]')?.[0]?.attribs?.href ?? url;

    if (canonicalUrl !== url) {
        console.debug(`Detected redirection: ${url} → ${canonicalUrl}`)
    }

    // console.log(`${url} - a:`, a)

    const baseUrl = url.split('/wiki')[0]
    const next = a
        .filter((_, el) => el.attribs.href?.startsWith('/wiki/') && !el.attribs.href.includes('/API_') && !el.attribs.href.includes(':'))
        .map((_, el) => ({ url: baseUrl + el.attribs.href.split("#")[0], title: el.attribs.title ?? '' }))
        .get()
    endParseFn();
    // console.log(`${url} - links: ${next.length}`)

    // console.log(`[#${++count}] (d=${distance}) ${title} - ${next.length} links - ${url}`)

    //////////// MAX NUMBER OF NEIGHBOURS
    // nextUrls.splice(MAX_NEXTS, Infinity)

    const nextSet = new Set(next);

    wikiPageCounter.inc();
    wikiLinksCounter.inc(nextSet.size)

    return {
        canonicalUrl,
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

const startUrl = CLI.getCliOption(OPT_START_URL, DEFAULT_URL);
const maxDistance = CLI.getCliOption(OPT_MAX_DISTANCE, DEFAULT_MAX_DISTANCE)
const parallelScrapes = CLI.getCliOption(OPT_PARALLEL_SCRAPES, DEFAULT_PARALLEL_SCRAPES)
const restart = CLI.getCliFlag(OPT_RESTART)
const reset = CLI.getCliFlag(OPT_RESET)
const resetAndStop = CLI.getCliFlag(OPT_RESET_AND_STOP)
const debug = CLI.getCliFlag(OPT_DEBUG)
const queueChunkSize = CLI.getCliOption(OPT_QUEUE_CHUNK_SIZE, DEFAULT_QUEUE_CHUNK_SIZE)

console.log(`
------------------------------------------ Initialization ------------------------------------------
-------- Start URL: ${startUrl}
-------- Max Distance: ${maxDistance}
-------- ParallelScrapes: ${parallelScrapes}
-------- Debug: ${debug}
-------- Reset: ${reset || resetAndStop} (and stop: ${resetAndStop})
-------- Queue Chunk Size: ${queueChunkSize}
----------------------------------------------------------------------------------------------------
`)

// const visited = new Set<WikiUrl>();

type QueueItem = { url: WikiUrl, distance: number }
let nodeCount = 0
const queue: QueueItem[] = [{ url: startUrl, distance: 0 }];
let cntSuccess = 0;
let cntErrors = 0;

app.get('/stats', (req, res) => {
    res.send({ success: cntSuccess, failures: cntErrors });
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
// await driver.executeQuery("CREATE INDEX wikipage_idx_url IF NOT EXISTS FOR (n:WikiPage) ON (n.url)");
await driver.executeQuery("CREATE CONSTRAINT wikipage_idx_url_unique IF NOT EXISTS FOR (n:WikiPage) REQUIRE n.url IS UNIQUE");

function stop(code: number) {
    driver.close();
    exit(code);
}

// Metrics endpoint handler (for Prometheus scraping)
app.get('/metrics', async (req, res) => {
    uptime.set(Math.floor((Date.now() - startMs) / 1000))
    queueSize.set(queue.length);
    res.set('Content-Type', register.contentType);
    res.send(await register.metrics());
});

async function runCount(query: string, params?: object) {
    const countResult = await executeQuery(query, params);
    return countResult.records?.[0]?.get('cnt')?.low;
}

setInterval(async () => {
    const cntNodes = await runCount(`MATCH (n:WikiPage) RETURN count(n) as cnt`)
    const cntLinks = await runCount(`MATCH (:WikiPage)-[r:LINKS]->() RETURN count(r) as cnt`)
    const cntDoneNodes = await runCount(`MATCH (n:WikiPage) WHERE exists ((n)-[:LINKS]->()) RETURN count(n) as cnt`)
    const cntNotDoneNodes = cntNodes - cntDoneNodes;

    neo4jNodesCounter.set(cntNodes);
    neo4jLinksCounter.set(cntLinks);
    neo4jCompletedPagesGauge.set(cntDoneNodes)
    neo4jRemainingPagesGauge.set(cntNotDoneNodes)

    console.log(`Updated neo4j metrics. Nodes: ${cntNodes}, Links; ${cntLinks}, PagesCompleted: ${cntDoneNodes}, PageNotScrapedYet: ${cntNotDoneNodes}`)

}, METRICS_NEO4J_INTERVAL_MS)

function executeQuery(cypher: string, params?: object) {
    console.debug(`[CYPHER] ${cypher}`);
    return driver.executeQuery(cypher, params ?? {});
}

function paginate(cypher: string, page: number = 0, pageSize: number = DEFAULT_PAGE_SIZE) {
    const skip = page * pageSize
    cypher = `${cypher} SKIP ${skip} LIMIT ${pageSize}`

    return executeQuery(cypher);
}

// async function loadVisitedFromNeo4j(visited: Set<string>) {
//     const count = await runCount('match (n:WikiPage) where n.__load_created_at is not null return count(n) as cnt');
//     console.log(`Loading ${count} visited nodes...`)

//     let page = 0;
//     while (visited.size < count) {
//         const results = await paginate(`match (n:WikiPage) where n.__load_created_at is not null return n`, page, 10000)

//         if (!results.records.length) {
//             console.debug("No more visted nodes...")
//             break;
//         }

//         for (const rec of results.records) {
//             const props = rec.get('n').properties
//             visited.add(props.url)
//         }

//         console.log("[%f%%] Page: %d, visited size: %d", Math.floor(100 * (visited.size * 100 / count)) / 100, page, visited.size)
//         page++;
//     }
// }

// async function loadQueueFromNeo4j(queue: QueueItem[]) {
//     const count = await runCount('match (n:WikiPage) where n.__error is null and n.__load_created_at is null and not exists ((n)-[:LINKS]->()) return count(n) as cnt');
//     console.log(`Loading ${count} nodes...`)

//     let page = 0;
//     while (queue.length < count) {
//         const results = await paginate(`match (n:WikiPage) where n.__error is null and n.__load_created_at is null and not exists ((n)-[:LINKS]->()) return n`, page)

//         if (!results.records.length) {
//             console.debug("No more queue element...")
//             break;
//         }

//         for (const rec of results.records) {
//             const props = rec.get('n').properties
//             queue.push({ url: props.url, distance: props.__load_distance })
//         }


//         console.log("[%f%%] Page: %d, queue size: %d", Math.floor(100 * (queue.length * 100 / count)) / 100, page, queue.length)
//         page++;
//     }
// }

async function popNextPages<T>(queue: T[], n: number, ignoreFn: (candidate: T) => boolean | Promise<boolean>): Promise<T[]> {
    const nextPages: T[] = [];
    while (nextPages.length < n) {
        const candidate = queue.shift();

        if (!candidate) {
            break;
        }

        if (await ignoreFn(candidate!)) {
            continue;
        }

        nextPages.push(candidate!);
    }

    return nextPages;
}

async function concurrentScrape(nodes: QueueItem[]) {
    const fulfilled: { node: QueueItem, pageInfo: PageInfo }[] = [];
    const rejected: { node: QueueItem, error: any }[] = [];

    const endFn = scrapeTimer.startTimer();

    // Pseudo fork
    // Launching multiple promises
    // without await, an "await all" is done once all promises are submitted
    // Does not preserve order but that's ok
    const promises = nodes.map(node => {
        return scrape(node.url, node.distance)
            .then(pageInfo => fulfilled.push({ node, pageInfo }))
            .catch(error => rejected.push({ node, error }))
    })

    // Pseudo join
    // Await all promises previously started
    // allSettled because it does not throw, as errors are already handled inside .catch()
    try {
        await Promise.allSettled(promises);
    } catch (error) {
        console.error("[ERROR] Promise.allSettled()", error);
    }

    endFn();
    return { fulfilled, rejected }
}



function deduplicate<T>(array: T[], uniqueKeySelector: (t: T) => any): T[]{
    const dedup: T[] = [];

    for(const item of array){
        const itemKey = uniqueKeySelector(item)
        if(dedup.every(d => uniqueKeySelector(d) !== itemKey)){
            dedup.push(item);
        }
    }

    return dedup;
}

async function handleRejects(rejects: { node: QueueItem, error: any }[]) {
    const endFn = cypherTimer.startTimer({ query: 'save-error' });

    rejects = rejects.map(rej => ({ node: rej.node, error: rej.error?.message ?? rej.error }))

    for (const { node, error } of rejects) {
        console.error(`[ERROR] ${node.url} - ${error}`)
    }

    try {
        await driver.executeQuery(`
            UNWIND $rejects as reject
            MATCH (from: WikiPage {url: reject.node.url}) 
                SET from.__has_error = true,
                    from.__error_msg = reject.error,
                    from.__error_at = datetime()
        `, { rejects })
    }
    catch (error) {
        console.error("[ERROR] Error when saving errors in neo4j", error)
    }

    endFn();
}

async function handleRenamedPages(fulfills: { node: QueueItem, pageInfo: PageInfo }[]) {
    const toMerge = fulfills.map(ff => ff.pageInfo).filter(page => page.canonicalUrl !== page.url)
    if (toMerge.length) {
        // Redirecting relationships to canonical node
        for (const page of toMerge) {
            console.log(`Merging node ${page.url} → ${page.canonicalUrl}`)
        }

        // Creating canonical nodes beforeall
        console.debug("Creating/merging correct nodes before before merge")
        await driver.executeQuery(`
            UNWIND $pages as page
            MERGE (n:WikiPage {url: page.canonicalUrl})
                SET n.distance = page.distance,
                    n.title = page.title, 
                    n.__load_created_at = datetime()
        `, { pages: toMerge })

        console.debug("Redirecting incoming relationships to new targets")
        const endReplaceTargetFn = cypherTimer.startTimer({ query: 'merge/replace-target' });
        await driver.executeQuery(`
            UNWIND $pages as page
            MATCH (from)-[inc:LINKS]->(oldTo:WikiPage {url: page.url})
            MATCH (newTo: WikiPage {url: page.canonicalUrl})
            WHERE oldTo <> newTo
                AND NOT EXISTS ((from)-->(newTo))
            CALL apoc.refactor.to(inc, newTo)
            YIELD input, output
            RETURN input, output
        `, { pages: toMerge })
        endReplaceTargetFn();

        console.debug("Redirecting outgoing relationships to new sources")
        const endReplaceSourceFn = cypherTimer.startTimer({ query: 'merge/replace-source' })
        await driver.executeQuery(`
            UNWIND $pages as page
            MATCH (oldFrom: WikiPage {url: page.url})-[out:LINKS]->(to)
            MATCH (newFrom: WikiPage {url: page.canonicalUrl})
            WHERE oldFrom <> newFrom
                AND NOT EXISTS ((newFrom)-->(to))
            CALL apoc.refactor.from(out, newFrom)
            YIELD input, output
            RETURN input, output
        `, { pages: toMerge })
        endReplaceSourceFn();

        console.debug("Deleting old nodes turned orphans")
        const endDeleteOldFn = cypherTimer.startTimer({ query: 'merge/delete-old-node' });
        await driver.executeQuery(`
            UNWIND $pages as page
            MATCH (n: WikiPage {url: page.url})
            DETACH DELETE n
        `, { pages: toMerge })
        endDeleteOldFn();

        wikiMergedPageNodesCounter.inc(toMerge.length)
    }
}

async function handleFulfilled(fulfills: { node: QueueItem, pageInfo: PageInfo }[]) {
    const endFn = cypherTimer.startTimer({ query: 'save-result' });
    try {
        await handleRenamedPages(fulfills)

        await driver.executeQuery(`
            UNWIND $pages as page
            MERGE (from: WikiPage {url: page.canonicalUrl}) 
                SET from.title = page.title, 
                    from.__load_created_at = datetime()
            WITH page, from
            UNWIND page.next as next
            MERGE (to: WikiPage {url: next.url})
                SET to.title = next.title, 
                    to.__load_distance = page.distance, 
                    to.__load_precreated_at = datetime()
            WITH from, to
            WHERE NOT EXISTS ((from)-->(to))
            MERGE (from)-[:LINKS { __load_created_at: datetime() }]->(to)
        `, { pages: fulfills.map(f => f.pageInfo) })
    }
    catch (error) {
        console.error("[ERROR] Error when saving pages and links to neo4j", error)
    }

    for (const { pageInfo } of fulfills) {
        console.log(`[#${++nodeCount}] (d=${pageInfo.distance}) Created node '${pageInfo.url}' and ${pageInfo.next.size} outgoing links`)
    }
    endFn();
}

// function updateQueue(fulfilled: { node: QueueItem; pageInfo: PageInfo; }[]) {
//     const endFn = enqueueTimer.startTimer();
//     for (const { pageInfo } of fulfilled) {
//         for (const { url } of pageInfo.next) {
//             queue.push({ url, distance: pageInfo.distance + 1 })
//         }
//     }
//     endFn();
// }

async function alreadyScraped(url: WikiUrl): Promise<boolean> {
    const endFn = cypherTimer.startTimer({ query: 'already-hit' });
    const count = await runCount(`
        MATCH (n:WikiPage {url: $url}) 
        WHERE n.__load_created_at IS NOT NULL 
            OR n.__error IS NOT NULL            
        RETURN COUNT(n) as cnt
    `, { url })
    endFn();

    if (count === 1) {
        console.debug(`Is '${url}' already scraped? → ${count === 1}`)
        neo4jAlreadyScrapedCounter.inc();
        return true;
    }

    neo4jNotScrapedYetCounter.inc();
    return false;
}

async function loadQueueChunk(queue: QueueItem[]) {
    const endFn = cypherTimer.startTimer({ query: 'load-queue-chunk' });
    const results = await driver.executeQuery(`
        match (n:WikiPage)
        where n.__error is null 
            and n.__load_created_at is null 
            and not exists ((n)-[:LINKS]->()) 
        return n
        limit ${queueChunkSize}`)
    endFn();

    if (!results.records.length) {
        console.debug("No more queue element...")
        return;
    }

    for (const rec of results.records) {
        const props = rec.get('n').properties
        queue.push({ url: props.url, distance: props.__load_distance })
    }

    console.log(`Loaded next queue chunk of ${queue.length} items`);
}

async function doReset() {
    console.log("Resetting...");
    await driver.executeQuery(`
        call apoc.periodic.iterate(
            "MATCH (:WikiPage)-[r:LINKS]->() return id(r) as id", 
            "MATCH ()-[r]->() WHERE id(r) = id DETACH DELETE r", 
            {batchSize:10000}
        )
        yield batches, total 
        return batches, total
    `)
    console.log("Deleted relationships")

    await driver.executeQuery(`
        call apoc.periodic.iterate(
            "MATCH (n:WikiPage) return id(n) as id", 
            "MATCH (n) WHERE id(n) = id DETACH DELETE n", 
            {batchSize:10000}
        )
        yield batches, total 
        return batches, total
    `)
    console.log("Deleted nodes")
}


// =====================================================================
// =====================================================================
// =====================================================================



if (!debug) {
    console.debug = () => { };
}

if (reset || resetAndStop) {
    await doReset();

    if (resetAndStop) {
        console.log("Stopping after reset.")
        stop(0)
    }
}

if (restart) {
    console.log("Restarting...")
    queue.splice(0, queue.length)

    // await loadQueueFromNeo4j(queue);
    // await loadVisitedFromNeo4j(visited)
    await loadQueueChunk(queue);

    queue.sort((a, b) => a.distance - b.distance)
    console.log(`Loaded queue of ${queue.length} elements`)

    if (!queue.length) {
        queue.push({url: startUrl, distance: 0})
        // console.error("[ERROR] Cannot restart with empty queue")
        // stop(1)
    }

    console.log("Restart done");
}

while (queue.length) {
    // const nodes = popNextPages(queue, parallelScrapes, (node) => node.distance >= maxDistance || visited.has(node.url))
    const nodes = await popNextPages(queue, parallelScrapes, async (node) => node.distance >= maxDistance || await alreadyScraped(node.url))

    try {
        let { fulfilled, rejected } = await concurrentScrape(nodes);

        rejected = deduplicate(rejected, item => item.node.url)
        fulfilled = deduplicate(fulfilled, item => item.pageInfo.canonicalUrl)

        await handleRejects(rejected);
        await handleFulfilled(fulfilled);

        cntSuccess += fulfilled.length;
        cntErrors += rejected.length;

        mSuccessCounter.inc(cntSuccess)
        mErrorsCounter.inc(cntErrors);

        // nodes.forEach(n => visited.add(n.url));
        // fulfilled.forEach(n => visited.add(n.pageInfo.canonicalUrl));

        // updateQueue(fulfilled)
    }
    catch (error) {
        console.error("[ERROR] Error in main loop", error)
    }

    if (!queue.length) {
        await loadQueueChunk(queue);
    }
}

if (!queue.length) {
    console.log("Empty queue. Stopping")
}

driver.close();