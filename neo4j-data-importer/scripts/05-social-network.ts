import { fakerFR as faker } from "@faker-js/faker";
import "dotenv/config";
import neo4j from "neo4j-driver";

const NB_USERS = 20;
const NB_POSTS = 20;
const MAX_FOLLOWS_PER_USER = 0.5 * NB_USERS

const FOLLOW_BACK_RATE_AVG = 0.5
const FOLLOW_BACK_RATE_STD_DEV = 0.1

const MIN_AGE = 10;
const MAX_AGE = 60;

const RANDOM_DATE_OFFSET_DAYS = 7

type User = {
    id: number;
    name: string;
    age: number;
};

type Post = {
    id: number;
    author: User;
    timestamp: Date;
};

type Follow = {
    source: User;
    target: User;
    since: Date;
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
    return list[randomInt(list.length-1)];
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
const posts: Post[] = [];
const follows: Follow[] = [];

//
//
//

function generateUsers() {
    for (let i = 0; i < NB_USERS; i++) {
        users.push({
            id: i + 1,
            name: faker.person.firstName + " " + faker.person.lastName,
            age: randomInt(MIN_AGE, MAX_AGE),
        })
    }
}

function generatePosts() {
    for (let i = 0; i < NB_POSTS; i++) {
        posts.push({
            id: i,
            author: random(users),
            timestamp: randomDate()
        })
    }
}

function generateFollows() {
    for (let source of users) {
        const nbFollows = randomInt(MAX_FOLLOWS_PER_USER)

        const nbFollowBack = nbFollows * (FOLLOW_BACK_RATE_AVG + Math.random() * FOLLOW_BACK_RATE_STD_DEV)
        const nbFollowOther = nbFollows - nbFollowBack;

        const skipUsers = [source];
        while (skipUsers.length < nbFollows + 1) {
            const target = random(users);

            if (skipUsers.includes(target)) {
                continue;
            }

            skipUsers.push(target);
            follows.push({
                source, target, since: randomDate()
            })
        }
    }
}


//
//
//

generateUsers();
generatePosts();
generateFollows();

//
//
//

type PostDto = Omit<Post, 'timestamp'> & {
    timestamp: string;
}

type FollowDto = Omit<Follow, 'source' | 'target' | 'since'> & {
    source: number;
    target: number;
    since: string
}

function toPostDto(post: Post): PostDto
function toPostDto(post: Post[]): PostDto[]
function toPostDto(post: Post | Post[]): PostDto | PostDto[] {
    if (Array.isArray(post)) {
        return post.map(p => toPostDto(p));
    }

    return {
        ...post,
        timestamp: post.timestamp.toISOString()
    }
}

function toFollowDto(follow: Follow): FollowDto
function toFollowDto(follow: Follow[]): FollowDto[]
function toFollowDto(follow: Follow | Follow[]): FollowDto | FollowDto[] {
    if (Array.isArray(follow)) {
        return follow.map(p => toFollowDto(p));
    }

    return {
        ...follow,
        source: follow.source.id,
        target: follow.target.id,
        since: follow.since.toISOString()
    }
}

//
//
//

const driver = neo4j.driver(
    process.env.NEO4J_URL!,
    neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!)
);

await driver.executeQuery(`
UNWIND $users as props
CREATE (u:User) SET u = props
`, { users })

await driver.executeQuery(`
UNWIND $posts as props
MATCH (u:User (id: props.author.id))
CREATE (p:Post {id: props.id, timestamp: props.timestamp})
CREATE (p)<-[:POSTES {timestamp: datetime(props.timestamp)}]-(u)
`, { posts: toPostDto(posts) })

await driver.executeQuery(`
UNWIND $follows as props
MATCH (from:User {id: props.source.id})
MATCH (to:User {id: props.target.id})
CREATE (from)-[:FOLLOWS {since: datetime(props.since)}]->(to)
`, { follows: toFollowDto(follows) })

driver.close();