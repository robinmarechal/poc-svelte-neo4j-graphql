import neo4j from "neo4j-driver";
import "dotenv/config";

const DELETE_BATCH_SIZE = 50000

const deleteNodesQuery = `
MATCH (n) 
WITH n LIMIT ${DELETE_BATCH_SIZE} 
DETACH DELETE n 
RETURN count(n) as cnt
`

const deleteRelationshipsQuery = `
MATCH ()-[r]->() 
WITH r LIMIT ${DELETE_BATCH_SIZE}
DELETE r
RETURN count(r) as cnt
` 

const countNodesQuery = `
MATCH (n) 
RETURN count(n) as cnt
`

const countRelationshipsQuery = `
MATCH ()-[r]->() 
RETURN count(r) as cnt
`

const driver = neo4j.driver(
    process.env.NEO4J_URL!,
    neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!)
);


async function runDelete(query){
    const result = await driver.executeQuery(query);
    return result.records?.[0]?.get('cnt')?.low
}

async function runCount(query){
    const countResult = await driver.executeQuery(query);
    return countResult.records?.[0]?.get('cnt')?.low;
}

function fmtProgressPercent(progress: number, total: number){
    if(total === 0){
        return '100%'
    }

    const percentFloat = progress / total;
    const exactPercent = percentFloat * 100;

    const int = Math.floor(exactPercent);
    const decimal = exactPercent % 1;

    const decimalPartString = Math.round(decimal * 100)

    return `${int},${decimalPartString}%`
}

const totalNodes = await runCount(countNodesQuery);
const totalRelationships = await runCount(countRelationshipsQuery);

console.log(`${totalNodes} nodes and ${totalRelationships} relationships will be deleted`);

console.time("Total duration")
console.time("Relationships")
console.log(`Deleting ${totalRelationships} relationships...`)
let totalDeletedRelationships = 0
while (true) {
    const deleted = await runDelete(deleteRelationshipsQuery);

    totalDeletedRelationships += deleted;

    const progress = fmtProgressPercent(totalDeletedRelationships, totalRelationships);
    console.debug(`[${progress}] ${totalDeletedRelationships}/${totalRelationships} deleted relationships. ${totalRelationships - totalDeletedRelationships} remaining relationships.`);

    if (!deleted) {
        break;
    }
}
console.timeLog("Relationships")
console.time("Nodes")
console.log(`Deleting ${totalNodes} nodes...`)

let totalDeletedNodes = 0
while (true) {
    const deleted = await runDelete(deleteNodesQuery);

    totalDeletedNodes += deleted;

    const progress = fmtProgressPercent(totalDeletedNodes, totalNodes);
    console.debug(`[${progress}] ${totalDeletedNodes}/${totalNodes} deleted nodes. ${totalNodes - totalDeletedNodes} remaining nodes.`);

    if (!deleted) {
        break;
    }
}

console.log(`Done`)
console.timeEnd("Nodes")
console.timeEnd("Total duration")

driver.close();