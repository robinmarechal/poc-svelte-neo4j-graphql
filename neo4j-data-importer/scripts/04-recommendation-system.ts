import { faker } from "@faker-js/faker";
import "dotenv/config";
import neo4j from "neo4j-driver";

const NB_USERS = parseInt(process.argv[2] ?? 1000);
const NB_VIDEOS = parseInt(process.argv[3] ?? 50);

const LIKE_RATE = 0.75
const SUBSCRIPTION_RATE = 0.75

const MAX_VIDEOS_PER_USER = 0.5 * NB_VIDEOS;

type User = {
    id: number;
    name: string;
}

type Video = {
    id: number;
    title: string;
    author: User;
    timestamp: Date;
    duration: number;
}

type Subscription = {
    source: User;
    target: User;
    since: Date;
}

type View = {
    user: User;
    video: Video;
    completion: number;
    timestamp: Date;
}

type Like = {
    user: User;
    video: Video;
    timestamp: Date;
}

//
//
//



function randomInt(max: number): number;
function randomInt(min: number, max: number): number;
function randomInt(min: number, max?: number) {
    if (max === undefined || max === null) {
        max = min;
        min = 0;
    } else if (min === undefined || min === null) {
        min = 0;
    } else if (min > max) {
        [min, max] = [max, min];
    }

    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function random<T>(list: T[]): T {
    return list[randomInt(list.length - 1)];
}

function randomDate() {
    const today = new Date();

    const randomSecondsOffset = randomInt(60 * 60 * 24 * 7)
    today.setSeconds(today.getSeconds() - randomSecondsOffset)

    return today;
}

//
//
//

const users: User[] = [];
const videos: Video[] = [];
const subscriptions: Subscription[] = [];
const views: View[] = [];
const likes: Like[] = [];

// Users
for (let i = 0; i < NB_USERS; i++) {
    users.push({
        id: i + 1,
        name: faker.internet.displayName()
    });
}

// Videos
let remainingVideos = NB_VIDEOS;
while (remainingVideos > 0) {
    const user = random(users);

    if (videos.some(v => v.author === user)) {
        continue;
    }

    const nbVideos = randomInt(remainingVideos);

    for (let i = 0; i < nbVideos; i++) {
        videos.push({
            id: videos.length + 1,
            author: user,
            duration: randomInt(60, 3600),
            timestamp: randomDate(),
            title: faker.word.words(randomInt(3, 10))
        })
    }

    remainingVideos -= nbVideos;
}

// Views
const viewsCache = new Set<string>();
for (let video of videos) {
    const viewsRemaining = randomInt(users.length * 0.10);
    
    for (let i = 0; i < viewsRemaining; i++) {
        const user = random(users);
        const cacheKey = `${video.id}-${user.id}`

        if(viewsCache.has(cacheKey)){
            continue;
        }
        viewsCache.add(cacheKey)

        // No duplicate check, users can watch same video multiple times
        // And an author can definitely watch is own video multiple times as well... why not
        views.push({
            user, video,
            timestamp: randomDate(),
            completion: Math.random(),
        })
    }
}

// Likes
const likesCache = new Set<string>();
for (let view of views) {
    const cacheKey = `${view.video.id}-${view.user.id}`
    if (likesCache.has(cacheKey)) {
        continue;
    }

    const liked = Math.random() > LIKE_RATE
    if (!liked) {
        continue;
    }

    likes.push({
        timestamp: randomDate(),
        user: view.user,
        video: view.video
    })

    likesCache.add(cacheKey);
}

// Subscriptions
const subsCache = new Set<string>();
for (let view of views) {
    const cacheKey = `${view.video.author.id}-${view.user.id}`
    if (subsCache.has(cacheKey)) {
        continue;}

    const subd = Math.random() > SUBSCRIPTION_RATE
    if (!subd) {
        continue;
    }

    subscriptions.push({
        since: randomDate(),
        source: view.user,
        target: view.video.author
    })

    subsCache.add(cacheKey);
}


// 
// 
// 

type VideoDto = Omit<Video, 'timestamp'> & {
    timestamp: string
}

type ViewDto = Omit<View, 'timestamp'> & {
    timestamp: string
}

type LikeDto = Omit<Like, 'timestamp'> & {
    timestamp: string
}

type SubscriptionDto = Omit<Subscription, 'since'> & {
    since: string
}

function toVideoDto(video: Video): VideoDto;
function toVideoDto(video: Video[]): VideoDto[];
function toVideoDto(video: Video | Video[]): VideoDto | VideoDto[] {
    if (Array.isArray(video)) {
        return video.map(v => toVideoDto(v));
    }

    return {
        ...video,
        timestamp: video.timestamp.toISOString()
    }
}

function toViewDto(view: View): ViewDto;
function toViewDto(view: View[]): ViewDto[];
function toViewDto(view: View | View[]): ViewDto | ViewDto[] {
    if (Array.isArray(view)) {
        return view.map(v => toViewDto(v));
    }

    return {
        ...view,
        timestamp: view.timestamp.toISOString()
    }
}

function toLikeDto(like: Like): LikeDto;
function toLikeDto(like: Like[]): LikeDto[];
function toLikeDto(like: Like | Like[]): LikeDto | LikeDto[] {
    if (Array.isArray(like)) {
        return like.map(v => toLikeDto(v));
    }

    return {
        ...like,
        timestamp: like.timestamp.toISOString()
    }
}

function toSubscriptionDto(subscription: Subscription): SubscriptionDto;
function toSubscriptionDto(subscription: Subscription[]): SubscriptionDto[];
function toSubscriptionDto(subscription: Subscription | Subscription[]): SubscriptionDto | SubscriptionDto[] {
    if (Array.isArray(subscription)) {
        return subscription.map(v => toSubscriptionDto(v));
    }

    return {
        ...subscription,
        since: subscription.since.toISOString()
    }
}


//
//
//

const driver = neo4j.driver(
    process.env.NEO4J_URL!,
    neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!)
);

await driver.executeQuery(`MATCH (n:Yt) DETACH DELETE n`);
await driver.executeQuery(`MATCH (n:YtUser) DETACH DELETE n`);
await driver.executeQuery(`MATCH (n:YtVideo) DETACH DELETE n`);

// console.log(users);
await driver.executeQuery(`
UNWIND $users as props
CREATE (u:Yt:YtUser) SET u = props
`, { users })

console.log(`Created ${users.length} nodes YtUser`)

await driver.executeQuery(`
UNWIND $videos as props
MATCH (u:YtUser {id: props.author.id})
CREATE (v:Yt:YtVideo {id: props.id, title: props.title, timestamp: datetime(props.timestamp), duration: props.duration})
CREATE (u)-[:PUBLISHED {timestamp: datetime(props.timestamp)}]->(v)
`, { videos: toVideoDto(videos) })

console.log(`Created ${videos.length} nodes YtVideo with relationship PUBLISHED`)

await driver.executeQuery(`
UNWIND $subscriptions as props
MATCH (source:YtUser {id: props.source.id})
MATCH (target:YtUser {id: props.target.id})
CREATE (source)-[:SUBSCRIBED_TO {since: datetime(props.since)}]->(target)
`, { subscriptions: toSubscriptionDto(subscriptions) })

console.log(`Created ${subscriptions.length} relationsships SUBSCRIBED_TO`)

await driver.executeQuery(`
UNWIND $views as props
MATCH (user:YtUser {id: props.user.id})
MATCH (video:YtVideo {id: props.video.id})
CREATE (user)-[:VIEWED {completion: props.completion, timestamp: datetime(props.timestamp)}]->(video)
`, { views: toViewDto(views) })

console.log(`Created ${views.length} relationsships VIEWED`)

await driver.executeQuery(`
UNWIND $likes as props
MATCH (user:YtUser {id: props.user.id})
MATCH (video:YtVideo {id: props.video.id})
CREATE (user)-[:LIKED {timestamp: datetime(props.timestamp)}]->(video)
`, { likes: toLikeDto(likes) })

console.log(`Created ${likes.length} relationsships LIKED`)

driver.close();

// MATCH (n:YtVideo) WITH n LIMIT 5
// MATCH (u:YtUser)-->(n)
// RETURN n,u LIMIT 100

// MATCH (n: YtUser {id: 1}) RETURN n




// MATCH (n: YtUser {id: 1})-[v1:VIEWED]->(video:YtVideo)
//
// MATCH (video:YtVideo)<-[v2:VIEWED]-(u:YtUser)
// WHERE n <> u
//
// MATCH (u:YtUser)-[v3:VIEWED]->(suggestion:YtVideo)
// WHERE NOT EXISTS((n)-[:VIEWED]->(suggestion))
//     AND v1.completion > 0.5 
//     AND v2.completion > 0.5 
//     AND v3.completion > 0.5
//
// MATCH allPaths = (n)-[]->()<-[]-(u)
// WITH n, video, suggestion, count(allPaths) as nbPaths LIMIT 3
//
// MATCH path=(n)-->(video)<--(u)-->(suggestion)
// RETURN path, nbPaths
// ORDER BY nbPaths DESC