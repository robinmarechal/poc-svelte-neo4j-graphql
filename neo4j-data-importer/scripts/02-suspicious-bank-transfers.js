import neo4j from "neo4j-driver";
import "dotenv/config";
import { fakerFR as faker } from "@faker-js/faker";

const NB_ACCOUNTS = process.argv[2] ?? 100;
const NB_TRANSFERS = process.argv[3] ?? 100;

const NB_GENERATED_LOOPS_NON_FRAUD = 10;
const NB_GENERATED_FRAUDS = 3;
const FRAUD_MIN_TRANSFER_AMOUNT = 1000;

const AMOUNT_MIN = 50;
const AMOUNT_MAX = 10000;

const RANDOM_DATE_OFFSET = 14;

/**
 * @typedef Account
 *  @property {number} id
 *  @property {string} name
 *
 * @typedef TransferData
 *  @property {number} amount
 *  @property {Date} date
 *
 * @typedef Transfer
 *  @property {Account} from
 *  @property {Account} to
 *  @property {TransferData} data
 */

/** @type Account[] */
const accounts = [];
/** @type Transfer[] */
const transfers = [];
/** @type Transfer[][] */
const fraudedPaths = [];
/** @type Transfer[][] */
const loopsNonFraudPaths = [];

function randomInt(min, max) {
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

function randomAccount() {
  return accounts[randomInt(accounts.length)];
}

function randomAmount() {
  return randomInt(AMOUNT_MIN, AMOUNT_MAX);
}

function randomDate() {
  const today = new Date();

  const randomSecondsOffset = randomInt(60 * 60 * 24 * 7)
  today.setSeconds(today.getSeconds() - randomSecondsOffset)

  return today;
}

/**
 * @returns {{from: Account, to: Account}}
 */
function randomFromTo() {
  const from = randomAccount();
  let to = randomAccount();

  while (to === from) {
    to = randomAccount();
  }

  return { from, to };
}

function generateLoop(fraud = false) {
  const pathSize = randomInt(3, 5);
  const start = randomAccount();

  const baseDate = randomDate();

  /** @type Transfer[] */
  const path = [];
  /** @type Account[] */
  const skipNodes = [start];

  let from = start;

  while (path.length < pathSize) {
    const to = randomAccount();

    if (!skipNodes.includes(to)) {
      const amount = randomInt(FRAUD_MIN_TRANSFER_AMOUNT, AMOUNT_MAX);
      const date = randomDate();

      if (fraud) {
        date.setDate(baseDate.getDate());
      }

      const transfer = {
        from,
        to,
        data: {
          amount,
          date: date.toISOString(),
        },
      };

      path.push(transfer);
      skipNodes.push(to);
      from = to;
    }
  }

  const transfer = {
    from: from,
    to: start,
    data: {
      amount: randomInt(FRAUD_MIN_TRANSFER_AMOUNT, AMOUNT_MAX),
      date: baseDate.toISOString(),
    },
  };

  path.push(transfer);
  return path;
}

//
// Génération des données
//

for (let i = 0; i < NB_ACCOUNTS; i++) {
  accounts.push({
    id: i + 1,
    name: faker.person.firstName() + " " + faker.person.lastName(),
  });
}

for (let i = 0; i < NB_TRANSFERS; i++) {
  transfers.push({
    ...randomFromTo(),
    data: {
      amount: randomAmount(),
      date: randomDate().toISOString(),
    },
  });
}

for (let i = 0; i < NB_GENERATED_LOOPS_NON_FRAUD; i++) {
  loopsNonFraudPaths.push(generateLoop(false));
}

for (let i = 0; i < NB_GENERATED_FRAUDS; i++) {
  fraudedPaths.push(generateLoop(true));
}

/////////////////// Cypher

const driver = neo4j.driver(
  process.env.NEO4J_URL,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);

// const session = driver.session();

// Nettoyage des noeuds pour partir d'une base vide
await driver.executeQuery("MATCH (n:Account) DETACH DELETE n");

await driver.executeQuery(
  `
UNWIND $accounts as data
CREATE (a:Account) SET a = data
`,
  { accounts }
);

console.log(`Created ${accounts.length} Account nodes`);

const result = await driver.executeQuery(
  `
UNWIND $transfers as data
MATCH (from: Account {id: data.from.id})
MATCH (to: Account {id: data.to.id})
CREATE (from)-[:TRANSFERRED {amount: data.data.amount, timestamp: datetime(data.data.date)}]->(to)
`,
  { transfers }
);

console.log(`Created ${transfers.length} TRANSFERRED relationships`);

for (let loop of [...fraudedPaths, ...loopsNonFraudPaths]) {
  await driver.executeQuery(
    `
        UNWIND $transfers as data
        MATCH (from: Account {id: data.from.id})
        MATCH (to: Account {id: data.to.id})
        CREATE (from)-[:TRANSFERRED {amount: data.data.amount, timestamp: datetime(data.data.date)}]->(to)
`,
    { transfers: loop }
  );

  console.log(
    `Generated random loop of length ${loop.length}`,
    loop.map((f) => [f.from.id, f.to.id])
  );
}

// session.close();
driver.close();

// MATCH path = (a:Account)-[:TRANSFERRED*1..6]->(a)
// WITH path, relationships(path) as rels
// WHERE ALL(
//     rel IN relationships(path)
//         WHERE rel.amount > 1000
//     )
//     AND ALL(
//         idx in range(0, size(rels)-2) WHERE abs(duration.between(rels[idx].timestamp, rels[idx+1].timestamp).days) < 1
//     )
// RETURN path, length(path) AS loopLength
