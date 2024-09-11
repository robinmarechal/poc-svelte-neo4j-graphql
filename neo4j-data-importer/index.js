import neo4j from "neo4j-driver";
import fs from "node:fs";
import csv from "csv-parser";
import { rejects } from "node:assert";

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
 *  @property {GamesRecord} games
 *  @property {CityRecord} city
 *
 * @typedef NocRecord
 *  @property {number} id
 *  @property {string} noc
 *
 * @typedef ParticipationRecord
 *  @property {number} id
 *  @property {NocRecord} noc
 *  @property {GamesRecord} games
 *  @property {EventRecord} event
 *  @property {Number | undefined} age
 *  @property {Number | undefined} height
 *  @property {Number | undefined} weight
 *
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
        if (d.id) {
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

const rows = await parseCsvFile("./athlete_events.csv");

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
    id: gamesCities.length + 1,
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
function createEvent(row, sport, city, games) {
  return {
    id: events.length + 1,
    name: row.event,
    sport,
    city,
    games
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

function findOrAddEvent(row, sport, city, games) {
  let event = events.find((e) => e.name === row.event && e.sport === sport && e.city === city && e.games === games);
  if (!event) {
    event = createEvent(row, sport, city, games);
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

for (let i = 0; i < rows.length; i++) {
  const row = rows[i];

  const country = findOrAddCountry(row);
  const city = findOrAddCity(row, country);
  const games = findOrAddGames(row);
  const gamesCity = findOrAddGamesCities(games, city);

  const sport = findOrAddSports(row);
  const event = findOrAddEvent(row, sport, games, city);

  const athlete = findOrAddAthlete(row);

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

const cypherQueries = [];

cypherQueries.push("// Countries");
for (let country of countries) {
  cypherQueries.push(`MERGE (:Country ${toCypherProperties(country)});`);
}
console.log("Generated Country");

cypherQueries.push("");
cypherQueries.push("// Cities and relationship LOCATED_IN with Countries");
for (let city of cities) {
  cypherQueries.push(`
MATCH (country: Country {id: ${city.country.id}})
MERGE (city: City ${toCypherProperties(city)})-[:LOCATED_IN]->(country);`);
}
console.log("Generated Country and LOCATED_IN");

cypherQueries.push("");
cypherQueries.push("// Games");
for (let games of gamesList) {
  cypherQueries.push(`MERGE (:Games ${toCypherProperties(games)});`);
}
console.log("Generated Games");

cypherQueries.push("");
cypherQueries.push("// Relationships HOSTED_IN between games and cities ");
for (let gamesCity of gamesCities) {
  cypherQueries.push(`
MATCH (city: City {id: ${gamesCity.city.id}})
MATCH (games: Games {id: ${gamesCity.games.id}})
MERGE (games)-[:HOSTED_IN]->(city);`);
}
console.log("Generated HOSTED_IN");

cypherQueries.push("// Sports");
for (let sport of sports) {
  cypherQueries.push(`MERGE (:Sport ${toCypherProperties(sport)});`);
}
console.log("Generated Sport");

cypherQueries.push("");
cypherQueries.push("// Events and relationship EVENT_OF with Sports");
for (let event of events) {
  cypherQueries.push(`
MATCH (sport: Sport {id: ${event.sport.id}})
MERGE (event: Event ${toCypherProperties(event)})-[:EVENT_OF]->(event);`);
}
console.log("Generated Event and EVENT_OF");

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
import ts from "typescript";

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

await session.executeWrite(async (tx) => {
  tx.run("MATCH (n:Country) DETACH DELETE n;");
  tx.run("MATCH (n:City) DETACH DELETE n;");
  tx.run("MATCH (n:Games) DETACH DELETE n;");
  tx.run("MATCH (n:Sport) DETACH DELETE n;");
  tx.run("MATCH (n:Event) DETACH DELETE n;");
  tx.run("MATCH (n:Team) DETACH DELETE n;");
  tx.run("MATCH (n:Athlete) DETACH DELETE n;");
  tx.run("MATCH (n:NationalOlympicCommittee) DETACH DELETE n;");
  tx.run("MATCH (n:GameEvent) DETACH DELETE n;");

  //   for (let query of cypherQueries) {
  //     if (!query || query === "" || query.trim().startsWith("//")) {
  //       continue;
  //     }

  //     console.time("duration");
  //     await tx.run(query);
  //     console.log("Executed query", query);
  //     console.timeEnd("duration");
  //   }

  tx.run(
    `
  UNWIND $countries as props
  CREATE (n:Country) SET n = props.values
  `,
    { countries: asQueryParam(countries) }
  );

  tx.run(
    `
  UNWIND $cities as props
  MATCH (country: Country {id: props.relations.country.id})
  CREATE (n:City)-[:LOCATED_IN]->(country) SET n = props.values
  `,
    { cities: asQueryParam(cities) }
  );

  tx.run(
    `
  UNWIND $games as props
  CREATE (n:Games) SET n = props.values
  `,
    { games: asQueryParam(gamesList) }
  );

  tx.run(
    `
  UNWIND $gamesCities as props
  MATCH (games: Games {id: props.relations.games.id})
  MATCH (city: City {id: props.relations.city.id})
  CREATE (games)-[:HOSTED_IN]->(city)
  `,
    { gamesCities: asQueryParam(gamesCities) }
  );



  tx.run(
    `
  UNWIND $sports as props
  CREATE (n: Sport) SET n = props.values
  `,
    { sports: asQueryParam(sports) }
  );

  tx.run(
    `
UNWIND $events as props
MATCH (sport: Sport {id: props.relations.sport.id})
CREATE (event: Event)-[:OF_SPORT]->(sport) SET event = props.values
`,
    { events: asQueryParam(events) }
  );

  tx.run(
    `
UNWIND $events as props
MATCH (event: Event {id: props.values.id})
MATCH (city: City {id: props.relations.city.id})
MATCH (games: Games {id: props.relations.games.id})
CREATE (ge: GameEvent)
CREATE (ge)-[:OF_EVENT]->(event)
CREATE (ge)-[:HOSTED_IN_CITY]->(city)
CREATE (ge)-[:HOSTED_DURING_GAMES]->(games)
`,
    { events: asQueryParam(events) }
  );

  // tx.run(
  //   `
  //       UNWIND $athletes as props
  //       CREATE (n: Athlete) SET n = props.values
  //       RETURN n
  //   `,
  //   { athletes: asQueryParam(Array.from(athletes.values())) }
  // );
});

await session.close();
await driver.close();
