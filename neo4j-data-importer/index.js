import neo4j from "neo4j-driver";
import fs from "node:fs";
import csv from "csv-parser";

/**
 * Neo4J node types
 *
 * @typedef {'Summer' | 'Winter'} Season
 *
 * @typedef AthleteRecord
 *  @property {number} id
 *  @property {string} name
 *  @property {string} sex
 *  @property {string} birthYear
 *
 * @typedef CountryRecord
 *  @property {number} id
 *  @property {string} name
 *
 * @typedef CityRecord
 *  @property {number} id
 *  @property {string} name
 *  @property {CountryRecord} country
 *
 * @typedef GamesRecord
 *  @property {number} id
 *  @property {string} name
 *  @property {number} year
 *  @property {Season} season
 *
 * @typedef GamesCitiesRecord
 *  @property {CityRecord} city
 *  @property {GamesRecord} games
 *
 * @typedef SportRecord
 *  @property {number} id
 *  @property {string} name
 *
 * @typedef EventRecord
 *  @property {number} id
 *  @property {string} name
 *  @property {SportRecord} sport
 *
 * @typedef NocRecord
 *  @property {number} id
 *  @property {string} noc
 *
 * @typedef ParticipationRecord
 *  @property {number} id
 *  @property {NocRecord} noc
 *  @property {AthleteRecord} athlete
 *  @property {GamesRecord} games
 *  @property {Number | undefined} age
 *  @property {Number | undefined} height
 *  @property {Number | undefined} weight
 * 
 * @typedef GameEventRecord
 *  @property {number} id
 *  @property {EventRecord} event
 *  @property {GamesRecord} games
 *  @property {CityRecord} city
 *  @property {ParticipationRecord} participation
 *
 * @typedef ParticipationMedalRecord
 *  @property {string} medal
 *  @property {ParticipationRecord} participation
 *  @property {GameEventRecord} gameEvent
 */

/**
 * CSV row type
 *
 * @typedef {Object} CsvRow
 *  @property {string} id
 *  @property {string} name
 *  @property {string} sex
 *  @property {Number | undefined} age
 *  @property {Number | undefined} height
 *  @property {Number | undefined} weight
 *  @property {string} team
 *  @property {string} noc
 *  @property {string} games
 *  @property {Number} year
 *  @property {Season} season
 *  @property {string} city
 *  @property {string} sport
 *  @property {string} event
 *  @property {Number | undefined} medal
 */

const CITY_COUNTRY = {
  Albertville: "France",
  Amsterdam: "Netherlands",
  Antwerpen: "Belgium",
  Athina: "Greece",
  Atlanta: "United States",
  Barcelona: "Spain",
  Beijing: "China",
  Berlin: "Germany",
  Calgary: "Canada",
  Chamonix: "France",
  "Cortina d'Ampezzo": "Italy",
  "Garmisch-Partenkirchen": "Germany",
  Grenoble: "France",
  Helsinki: "Finland",
  Innsbruck: "Austria",
  "Lake Placid": "United States",
  Lillehammer: "Norway",
  London: "United Kingdom",
  "Los Angeles": "United States",
  Melbourne: "Australia",
  "Mexico City": "Mexico",
  Montreal: "Canada",
  Moskva: "Russia",
  Munich: "Germany",
  Nagano: "Japan",
  Oslo: "Norway",
  Paris: "France",
  "Rio de Janeiro": "Brazil",
  Roma: "Italy",
  "Salt Lake City": "United States",
  "Sankt Moritz": "Switzerland",
  Sapporo: "Japan",
  Sarajevo: "Bosnia and Herzegovina",
  Seoul: "South Korea",
  Sochi: "Russia",
  "Squaw Valley": "United States",
  "St. Louis": "United States",
  Stockholm: "Sweden",
  Sydney: "Australia",
  Tokyo: "Japan",
  Torino: "Italy",
  Vancouver: "Canada",
};

/**
 *
 * @param {string} filename
 * @returns {Promise<CsvRow[]>}
 */
async function parseCsvFile(filename) {
  const sanitizeRow = (row) => {
    return Object.fromEntries(
      Object.entries(row).map(([k, v]) => [k, v == "NA" ? null : v])
    );
  };

  return new Promise((resolve, reject) => {
    const data = [];

    fs.createReadStream(filename, "utf8")
      .pipe(
        csv({
          mapHeaders: ({ header }) => header.toLowerCase(),
        })
      )
      .on("data", (d) => {
        // if (d.id && d.year >= 2008) {
        if (d.id && d.year >= 2008) {
          data.push(sanitizeRow(d));
        }
      })
      .on("end", () => {
        resolve(data);
      })
      .on("error", (err) => {
        reject(err);
      });
  });
}

const rows = await parseCsvFile(process.argv[2] ?? "./athlete_events.csv");

// 1. country
/** @type CountryRecord[] */
const countries = [];

/** @type CityRecord[] */
const cities = [];

/** @type GamesRecord[] */
const gamesList = [];

/** @type GamesCitiesRecord[] */
const gamesCities = [];

/** @type SportRecord[] */
const sports = [];

/** @type EventRecord[] */
const events = [];

/** @type Map<Number, AthleteRecord> */
const athletes = new Map();

/** @type NocRecord[] */
const nocs = [];

/** @type Map<string, GameEventRecord> */
const gameEvents = new Map();

/** @type Map<string, ParticipationRecord> */
const participations = new Map();

/** @type ParticipationMedalRecord[] */
const participationMedals = [];

/**
 * @param {CsvRow} row
 * @returns {CountryRecord}
 */
function createCountry(row) {
  return {
    id: countries.length + 1,
    name: CITY_COUNTRY[row.city],
  };
}

/**
 * @param {CsvRow} row
 * @param {CountryRecord} row
 * @returns {CityRecord}
 */
function createCity(row, country) {
  return {
    id: cities.length + 1,
    name: row.city,
    country,
  };
}

/**
 * @param {CsvRow} row
 * @returns {GamesRecord}
 */
function createGames(row) {
  return {
    id: gamesList.length + 1,
    name: row.games,
    season: row.season,
    year: row.year,
  };
}

/**
 * @param {GamesRecord} games
 * @param {CityRecord} city
 * @returns {GamesCitiesRecord}
 */
function createGamesCities(games, city) {
  return {
    games,
    city,
  };
}

/**
 * @param {CsvRow} row
 * @returns {SportRecord}
 */
function createSport(row) {
  return {
    id: sports.length + 1,
    name: row.sport,
  };
}

/**
 * @param {CsvRow} row
 * @param {SportRecord} sport
 * @returns {EventRecord}
 */
function createEvent(row, sport) {
  return {
    id: events.length + 1,
    name: row.event,
    sport
  };
}

/**
 *
 * @param {CsvRow} row
 * @returns {AthleteRecord}
 */
function createAthlete(row) {
  return {
    id: row.id,
    name: row.name,
    sex: row.sex,
    birthYear: "0",
  };
}

/**
 *
 * @param {CsvRow} row
 * @returns {NocRecord}
 */
function createNoc(row) {
  return {
    id: nocs.length + 1,
    noc: row.noc
  };
}

/**
 * 
 * @param {GamesRecord} games 
 * @param {EventRecord} event 
 * @param {CityRecord} city 
 * @param {ParticipationRecord} participation 
 * @returns {GameEventRecord}
 */
function createGameEvent(event, games, city, participation) {
  return {
    id: gameEvents.size + 1,
    games,
    event,
    city,
    participation
  }
}

/**
 * 
 * @param {CsvRow} row 
 * @param {AthleteRecord} athlete 
 * @param {NocRecord} noc 
 * @param {GamesRecord} gameEvent
 * @returns {ParticipationRecord}
 */
function createParticipation(row, athlete, noc, games) {
  return {
    id: participations.size + 1,
    athlete,
    games,
    noc,
    age: row.age == 'NA' ? null : row.age,
    height: row.height == 'NA' ? null : row.height,
    weight: row.weight == 'NA' ? null : row.weight,
  }
}

/**
 * 
 * @param {CsvRow} row 
 * @param {ParticipationRecord} participation 
 * @param {GameEventRecord} gameEvent 
 * @returns {ParticipationMedalRecord}
 */
function createMedal(row, participation, gameEvent) {
  return {
    medal: row.medal,
    participation,
    gameEvent
  }
}

/**
 * @param {CsvRow} row
 * @returns {CountryRecord}
 */
function findOrAddCountry(row) {
  const countryName = CITY_COUNTRY[row.city];
  let country = countries.find((c) => countryName === c.name);
  if (!country) {
    country = createCountry(row);
    countries.push(country);
  }
  return country;
}

/**
 * @param {CsvRow} row
 * @param {CountryRecord} country
 * @returns {CityRecord}
 */
function findOrAddCity(row, country) {
  let city = cities.find((c) => row.city === c.name && c.country === country);
  if (!city) {
    city = createCity(row, country);
    cities.push(city);
  }
  return city;
}

/**
 * @param {CsvRow} row
 * @returns {GamesRecord}
 */
function findOrAddGames(row) {
  let games = gamesList.find((g) => g.name === row.games);
  if (!games) {
    games = createGames(row);
    gamesList.push(games);
  }
  return games;
}

function findOrAddGamesCities(games, city) {
  let gamesCity = gamesCities.find(
    (gc) => gc.city === city && gc.games === games
  );
  if (!gamesCity) {
    gamesCity = createGamesCities(games, city);
    gamesCities.push(gamesCity);
  }
  return gamesCity;
}

function findOrAddSports(row) {
  let sport = sports.find((s) => s.name === row.sport);
  if (!sport) {
    sport = createSport(row);
    sports.push(sport);
  }
  return sport;
}

function findOrAddEvent(row, sport) {
  let event = events.find((e) => e.name === row.event && e.sport === sport);
  if (!event) {
    event = createEvent(row, sport);
    events.push(event);
  }
  return event;
}

function findOrAddAthlete(row) {
  let athlete = athletes.get(row.id);
  if (!athlete) {
    athlete = createAthlete(row);
    athletes.set(row.id, athlete);
  }
  return athlete;
}

function findOrAddNoc(row) {
  let noc = nocs.find(n => n.noc === row.noc)
  if (!noc) {
    noc = createNoc(row)
    nocs.push(noc)
  }
  return noc;
}

function findOrAddGameEvent(event, games, city, participation) {
  const key = `${event.id}-${games.id}-${city.id}-${participation.id}`
  let gameEvent = gameEvents.get(key)
  if (!gameEvent) {
    gameEvent = createGameEvent(event, games, city, participation)
    gameEvents.set(key, gameEvent)
  }
  return gameEvent
}

function storeParticipation(row, athlete, noc, games) {
  const key = `${athlete.id}-${noc.id}-${games.id}`
  let participation = participations.get(key)
  if (!participation) {
    participation = createParticipation(row, athlete, noc, games);
    participations.set(key, participation)
  }
  return participation
}

function storeMedal(row, participation, gameEvent) {
  if (row.medal && row.medal != 'NA') {
    const participationMedal = createMedal(row, participation, gameEvent)
    participationMedals.push(participationMedal)
  }
}

for (let i = 0; i < rows.length; i++) {
  const row = rows[i];

  const country = findOrAddCountry(row);
  const city = findOrAddCity(row, country);
  const games = findOrAddGames(row);
  const gamesCity = findOrAddGamesCities(games, city);

  const sport = findOrAddSports(row);
  const event = findOrAddEvent(row, sport);

  const athlete = findOrAddAthlete(row);

  const noc = findOrAddNoc(row)
  const participation = storeParticipation(row, athlete, noc, games)
  const gameEvent = findOrAddGameEvent(event, games, city, participation)
  const medal = storeMedal(row, participation, gameEvent)

  if (i % 1000 === 0) {
    console.log(`Processed row #${i}`);
  }
}

// console.log("countries", countries);
// console.log("cities", cities);
// console.log("games", gamesList);
// console.log("gamesCities", gamesCities);

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////// CYPHER
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

function toCypherProperties(obj) {
  const parts = Object.entries(obj)
    .filter(([, v]) => !!v && typeof v !== "object")
    .map(([k, v]) => {
      if (typeof v === "number") {
        return `${k}: ${v}`;
      } else {
        return `${k}: '${v.replaceAll("'", "\\'")}'`;
      }
    });

  if (!parts.length) {
    return "";
  }

  return "{" + parts.join(", ") + "}";
}

// const cypherQueries = [];

// cypherQueries.push("// Countries");
// for (let country of countries) {
//   cypherQueries.push(`MERGE (:Country ${toCypherProperties(country)});`);
// }
// console.log("Generated Country");

// cypherQueries.push("");
// cypherQueries.push("// Cities and relationship LOCATED_IN with Countries");
// for (let city of cities) {
//   cypherQueries.push(`
// MATCH (country: Country {id: ${city.country.id}})
// MERGE (city: City ${toCypherProperties(city)})-[:LOCATED_IN]->(country);`);
// }
// console.log("Generated Country and LOCATED_IN");

// cypherQueries.push("");
// cypherQueries.push("// Games");
// for (let games of gamesList) {
//   cypherQueries.push(`MERGE (:Games ${toCypherProperties(games)});`);
// }
// console.log("Generated Games");

// cypherQueries.push("");
// cypherQueries.push("// Relationships HOSTED_IN between games and cities ");
// for (let gamesCity of gamesCities) {
//   cypherQueries.push(`
// MATCH (city: City {id: ${gamesCity.city.id}})
// MATCH (games: Games {id: ${gamesCity.games.id}})
// MERGE (games)-[:HOSTED_IN]->(city);`);
// }
// console.log("Generated HOSTED_IN");

// cypherQueries.push("// Sports");
// for (let sport of sports) {
//   cypherQueries.push(`MERGE (:Sport ${toCypherProperties(sport)});`);
// }
// console.log("Generated Sport");

// cypherQueries.push("");
// cypherQueries.push("// Events and relationship EVENT_OF with Sports");
// for (let event of events) {
//   cypherQueries.push(`
// MATCH (sport: Sport {id: ${event.sport.id}})
// MERGE (event: Event ${toCypherProperties(event)})-[:EVENT_OF]->(event);`);
// }
// console.log("Generated Event and EVENT_OF");

// cypherQueries.push("// Athletes");
// for (let athlete of athletes.values()) {
//   cypherQueries.push(`MERGE (:Athlete ${toCypherProperties(athlete)});`);
// }
// console.log("Generated Athlete");

//
//

// console.log(cypherQueries.join("\n"));

// 2. city
// 3. games

// 4. sport
// 5. event

// 6. Athlete

// 7. noc

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////// NEO4J
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

import "dotenv/config";

const driver = neo4j.driver(
  process.env.NEO4J_URL,
  neo4j.auth.basic(process.env.NEO4J_USERNAME, process.env.NEO4J_PASSWORD)
);

const session = driver.session();

function removeNonPrimiviteProps(obj) {
  if (obj.length) {
    return obj.map(removeNonPrimiviteProps);
  }

  return Object.fromEntries(
    Object.entries(obj).filter(([k, v]) => typeof v !== "object")
  );
}

function asQueryParam(obj) {
  if (obj.length) {
    return obj.map(asQueryParam);
  }

  const target = {
    relations: {},
    values: {},
  };
  for (let key of Object.keys(obj)) {
    if (typeof obj[key] === "object") {
      target.relations[key] = obj[key];
    } else {
      target.values[key] = obj[key];
    }
  }

  return target;
}

// await session.executeWrite(async (tx) => {
await driver.executeQuery("CREATE INDEX country_idx_id IF NOT EXISTS FOR (n:Country) ON (n.id)")
await driver.executeQuery("CREATE INDEX city_idx_id IF NOT EXISTS FOR (n:City) ON (n.id)")
await driver.executeQuery("CREATE INDEX games_idx_id IF NOT EXISTS FOR (n:Games) ON (n.id)")
await driver.executeQuery("CREATE INDEX sport_idx_id IF NOT EXISTS FOR (n:Sport) ON (n.id)")
await driver.executeQuery("CREATE INDEX event_idx_id IF NOT EXISTS FOR (n:Event) ON (n.id)")
await driver.executeQuery("CREATE INDEX team_idx_id IF NOT EXISTS FOR (n:Team) ON (n.id)")
await driver.executeQuery("CREATE INDEX athlete_idx_id IF NOT EXISTS FOR (n:Athlete) ON (n.id)")
await driver.executeQuery("CREATE INDEX nationalolympiccommittee_idx_id IF NOT EXISTS FOR (n:NationalOlympicCommittee) ON (n.id)")
await driver.executeQuery("CREATE INDEX gameevent_idx_id IF NOT EXISTS FOR (n:GameEvent) ON (n.id)")
await driver.executeQuery("CREATE INDEX participation_idx_id IF NOT EXISTS FOR (n:Participation) ON (n.id)")
console.log("Created indexes if not exist")
// })

// await session.executeWrite(async (tx) => {
await driver.executeQuery("MATCH (n:Country) DETACH DELETE n;");
await driver.executeQuery("MATCH (n:City) DETACH DELETE n;");
await driver.executeQuery("MATCH (n:Games) DETACH DELETE n;");
await driver.executeQuery("MATCH (n:Sport) DETACH DELETE n;");
await driver.executeQuery("MATCH (n:Event) DETACH DELETE n;");
await driver.executeQuery("MATCH (n:Team) DETACH DELETE n;");
await driver.executeQuery("MATCH (n:Athlete) DETACH DELETE n;");
await driver.executeQuery("MATCH (n:NationalOlympicCommittee) DETACH DELETE n;");
await driver.executeQuery("MATCH (n:GameEvent) DETACH DELETE n;");
await driver.executeQuery("MATCH (n:Participation) DETACH DELETE n;");
console.log("Deleted existing nodes")

//   for (let query of cypherQueries) {
//     if (!query || query === "" || query.trim().startsWith("//")) {
//       continue;
//     }

//     console.time("duration");
//     await driver.executeQuery(query);
//     console.log("Executed query", query);
//     console.timeEnd("duration");
//   }

await driver.executeQuery(
  `
  UNWIND $countries as props
  CREATE (n:Country) SET n = props.values
  `,
  { countries: asQueryParam(countries) }
);
console.log("Created nodes Country")

await driver.executeQuery(
  `
  UNWIND $cities as props
  MATCH (country: Country {id: props.relations.country.id})
  CREATE (n:City)-[:LOCATED_IN]->(country) SET n = props.values
  `,
  { cities: asQueryParam(cities) }
);
console.log("Created nodes City and relationship LOCATED_IN Country")

await driver.executeQuery(
  `
  UNWIND $games as props
  CREATE (n:Games) SET n = props.values
  `,
  { games: asQueryParam(gamesList) }
);
console.log("Created nodes Games")

await driver.executeQuery(
  `
  UNWIND $gamesCities as props
  MATCH (games: Games {id: props.relations.games.id})
  MATCH (city: City {id: props.relations.city.id})
  CREATE (games)-[:HOSTED_IN]->(city)
  `,
  { gamesCities: asQueryParam(gamesCities) }
);
console.log("Created relationships Games HOSTED_IN City")


await driver.executeQuery(
  `
  UNWIND $sports as props
  CREATE (n: Sport) SET n = props.values
  `,
  { sports: asQueryParam(sports) }
);
console.log("Created nodes Sport")

await driver.executeQuery(
  `
UNWIND $events as props
MATCH (sport: Sport {id: props.relations.sport.id})
CREATE (event: Event)-[:OF_SPORT]->(sport) SET event = props.values
`,
  { events: asQueryParam(events) }
);
console.log("Created nodes Event and relationships OF_SPORT sport")

await driver.executeQuery(`
    UNWIND $nocs as props
    CREATE (n:NationalOlympicCommittee) SET n = props.values
    `, { nocs: asQueryParam(nocs) }
)
console.log("Created nodes NationalOlympicCommittee")


const athletesList = [...Array.from(athletes.values())]
while (athletesList.length) {
  const removed = athletesList.splice(0, 10000)
  await driver.executeQuery(
    `
        UNWIND $athletes as props
        CREATE (n: Athlete) SET n = props.values
        RETURN n
    `,
    { athletes: asQueryParam(removed) }
  );
  console.log("Created " + removed.length + " nodes. " + athletesList.length + " remaining")
}
console.log("Created nodes Athlete")

const tmpParticipations = [...Array.from(participations.values())]
while (tmpParticipations.length) {
  const removed = tmpParticipations.splice(0, 10000)

  await driver.executeQuery(
    `
  UNWIND $participations as props
  MATCH (athlete: Athlete {id: props.relations.athlete.id})
  MATCH (noc: NationalOlympicCommittee {id: props.relations.noc.id})
  MATCH (games: Games {id: props.relations.games.id})
  CREATE (p: Participation) SET p = props.values
  CREATE (p)-[:UNDER_NOC]->(noc)
  CREATE (athlete)-[:HAS_PARTICIPATION]->(p)-[:DURING_GAMES]->(games)
  `,
    { participations: asQueryParam(removed) }
  );

  console.log("Created " + removed.length + " nodes Participation... " + tmpParticipations.length + " remaining")
}


console.log("Created nodes Participation and UNDER_NOC, OF_EVENT, PARTICIPATED_IN, IN_EVENT, AT_GAMES and IN_CITY")
// console.log(participations)
// console.log(asQueryParam(participations))


const gameEventList = [...Array.from(gameEvents.values())]
while (gameEventList.length) {
  const removed = gameEventList.splice(0, 10000)
  await driver.executeQuery(
    `
UNWIND $gameEvents as props
MATCH (event: Event {id: props.relations.event.id})
MATCH (city: City {id: props.relations.city.id})
MATCH (games: Games {id: props.relations.games.id})
MATCH (participation: Participation {id: props.relations.participation.id})
CREATE (ge: GameEvent) SET ge = props.values
CREATE (participation)-[:PARTICIPATION]->(ge)-[:OF_EVENT]->(event)
CREATE (city)-[:HOSTED_EVENT]->(ge)-[:HOSTED_DURING_GAMES]->(games)
`,
    { gameEvents: asQueryParam(removed) }
  );
  console.log("Created " + removed.length + " nodes. " + gameEventList.length + " remaining")
}
console.log("Created nodes GameEvent and relationship OF_EVENT, HOSTED_IN_CITY and HOSTED_DURING_GAMES")


await driver.executeQuery(`
  UNWIND $medals as props
  MATCH (participation: Participation {id: props.relations.participation.id})
  MATCH (gameEvent: GameEvent {id: props.relations.gameEvent.id})
  CREATE (participation)-[r:MEDAL]->(gameEvent) SET r = props.values
  `, { medals: asQueryParam(participationMedals) })
console.log("Created relationships Participation MEDAL GameEvent")

// });

await session.close();
await driver.close();
