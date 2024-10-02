import neo4j from "neo4j-driver";
import "dotenv/config";

type User = {
    id: number;
    username: string;
}

type Follow = {
    follower_id: number;
    followed_id: number;
}

const users: User[] = [
    { id: 1, username: 'alice' },
    { id: 2, username: 'bob' },
    { id: 3, username: 'carol' },
    { id: 4, username: 'dave' },
    { id: 5, username: 'eve' },
    { id: 6, username: 'frank' },
    { id: 7, username: 'grace' },
    { id: 8, username: 'heidi' },
    { id: 9, username: 'ivan' },
    { id: 10, username: 'judy' }
];

const follows: Follow[] = [
    { follower_id: 1, followed_id: 2 },
    { follower_id: 1, followed_id: 3 },
    { follower_id: 1, followed_id: 4 },
    { follower_id: 1, followed_id: 8 },
    { follower_id: 2, followed_id: 5 },
    { follower_id: 2, followed_id: 6 },
    { follower_id: 3, followed_id: 1 },
    { follower_id: 3, followed_id: 7 },
    { follower_id: 4, followed_id: 8 },
    { follower_id: 4, followed_id: 9 },
    { follower_id: 5, followed_id: 10 },
    { follower_id: 5, followed_id: 2 },
    { follower_id: 6, followed_id: 3 },
    { follower_id: 6, followed_id: 7 },
    { follower_id: 7, followed_id: 9 },
    { follower_id: 8, followed_id: 1 },
    { follower_id: 8, followed_id: 4 },
    { follower_id: 9, followed_id: 5 },
    { follower_id: 9, followed_id: 6 },
    { follower_id: 10, followed_id: 8 },
    { follower_id: 10, followed_id: 7 }
];


const driver = neo4j.driver(
    process.env.NEO4J_URL!,
    neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!)
);

await driver.executeQuery(`MATCH (u:User) DETACH DELETE u`)

await driver.executeQuery(`
UNWIND $users as props
CREATE (u:User) SET u = props
`, { users })

await driver.executeQuery(`
UNWIND $follows as rel
MATCH (follower: User {id: rel.follower_id})
MATCH (followed: User {id: rel.followed_id})
CREATE (follower)-[:FOLLOWS]->(followed)
`, { follows })

driver.close();