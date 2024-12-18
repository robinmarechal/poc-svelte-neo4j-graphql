# Questions


### Retrieving all games

```cypher 
MATCH (g:Games) RETURN g
```

### What year was the first olympic game?

```cypher
MATCH (g:Games) RETURN min(g.year)
```

### Where were the first olympics?

```cypher
MATCH p=(g:Games)-[]-(:City)-[]-(:Country)
RETURN p
ORDER BY g.year ASC
LIMIT 1
```
```cypher
MATCH p=(g:Games)-[*2]-(:Country)
RETURN p
ORDER BY g.year ASC
LIMIT 1
```

### Where and when were the first WINTER Olympic Games?

```cypher
MATCH p=(g:Games {season: 'Winter'})-[]-(:City)-[]-(:Country)
RETURN p
ORDER BY g.year ASC
LIMIT 1
```

_Chamonix, 1924? Wheren't the 2024 Paris OG the 100th year anniversary of 1924 Paris OG?_

```cypher
MATCH p=(g:Games {year: '1924'})-[]-(:City)-[]-(:Country)
RETURN p
ORDER BY g.year ASC
```

### Until when Winter and Summer OG were the same year?

#### Lazy version
```cypher
MATCH p=(g:Games)-[:HOSTED_IN]->(:City)-[:LOCATED_IN]->(:Country)
WITH g.year AS y, collect(g.season) AS seasons, collect(p) AS paths
WHERE size(seasons) = 2
RETURN paths
ORDER BY y DESC
LIMIT 1
```

#### More optimized version
```cypher
MATCH (g:Games) 
WITH g.year AS y, collect(g.season) AS seasons
WHERE size(seasons) = 2

WITH max(y) AS lastYear
MATCH p=(g:Games)-[:HOSTED_IN]->(:City)-[:LOCATED_IN]->(:Country)
WHERE g.year = lastYear
RETURN p
```

#### Nerd version, with virtual node and relationship
```cypher
MATCH (g:Games) 
WITH g.year AS y, collect(g.season) AS seasons
WHERE size(seasons) = 2
WITH max(y) AS lastYear
WITH lastYear, apoc.create.vNode(['Year'], {year: lastYear}) AS yearNode

MATCH p=(g:Games)-[:HOSTED_IN]->(:City)-[:LOCATED_IN]->(:Country)
WHERE g.year = lastYear
CALL apoc.create.vRelationship(g, 'YEAR', {}, yearNode) yield rel
RETURN p, yearNode, rel
```

#### Detailed history

```cypher
MATCH (g:Games) 
WITH g.year AS gyear, collect(g.season) AS coll
RETURN gyear, coll
ORDER BY gyear ASC
```

### Which country has hosted the most olympics? 

#### Top 1

```cypher
MATCH p=(country: Country)<-[:LOCATED_IN]-(city: City)<-[:HOSTED_IN]-(g:Games)
WITH country, collect(p) AS paths, count(p) AS cnt
RETURN paths
ORDER BY cnt DESC LIMIT 1
```

#### Top 2

```cypher
MATCH p=(country: Country)<-[:LOCATED_IN]-(city: City)<-[:HOSTED_IN]-(g:Games)
WHERE country.name <> 'United States'
WITH country, collect(p) AS paths, count(p) AS cnt
RETURN paths
ORDER BY cnt DESC LIMIT 1
```

#### Top 3 countries which hosted the most olympics
##### Without ex-aequos

```cypher
MATCH p=(country: Country)<-[:LOCATED_IN]-(city: City)<-[:HOSTED_IN]-(g:Games)
WITH country, collect(p) AS paths, count(p) AS cnt
RETURN paths
ORDER BY cnt DESC LIMIT 3
```

##### with ex-aequos

```cypher
CALL() {
    CALL() {
        MATCH p=(country: Country)<-[:LOCATED_IN]-(city: City)<-[:HOSTED_IN]-(g:Games)
        WITH country, count(p) AS cnt
        RETURN cnt
        ORDER BY cnt DESC LIMIT 3
    }
    RETURN cnt ORDER BY cnt ASC LIMIT 1
}
WITH cnt
MATCH p=(country: Country)<-[:LOCATED_IN]-(city: City)<-[:HOSTED_IN]-(g:Games)
WITH cnt, country, collect(p) AS paths, count(p) AS countryCnt
WHERE countryCnt >= cnt
RETURN paths
```

### Was there any OG hosted by more than one country ? 

```cypher
MATCH p=(g:Games)-->(:City)-[:LOCATED_IN]->(:Country)
WITH g, collect(p) AS paths
WHERE size(paths) > 1
RETURN paths
```

Sports hosted by Stockholm
```cypher
MATCH p=(g:Games {name: '1956 Summer'})-->(city:City {name: 'Stockholm'})-->(ge:GameEvent)-->(e:Event)-->(s:Sport)
MATCH (city)-->(ge:GameEvent)-->(e:Event)-->(s:Sport)
WHERE EXISTS ((g)<--(ge))
RETURN s
```

Nerd version: Both cities and the sports they hosted
```cypher
MATCH p=(games:Games)-->(city:City)-[:LOCATED_IN]->(:Country)
WITH games, collect(city) AS cities, collect(p) AS paths
WHERE size(paths) > 1

UNWIND cities AS city
MATCH (games)<-[:HOSTED_DURING_GAMES]-(gameEvent:GameEvent)-[:OF_EVENT]->(event:Event)-[:OF_SPORT]->(sport:Sport)
MATCH (gameEvent)<-[:HOSTED_EVENT]-(city)
WITH games, city, sport, count(gameEvent) AS _
WITH games, city, sport, apoc.create.vRelationship(city, "HOSTED_SPORT", {}, sport) AS hosted_sport
RETURN games, city, sport, hosted_sport
```

### Medals ranking

#### Countries with most medals in history

```cypher
MATCH (noc:NationalOlympicCommittee)<-[:UNDER_NOC]-(part:Participation)-[:MEDAL]->(ge:GameEvent)
WITH noc, count(ge) AS nbMedals
RETURN noc.noc, nbMedals
ORDER BY nbMedals DESC LIMIT 20
```

#### Athletes with most medals in history

```cypher
MATCH (ath:Athlete)-[:HAS_PARTICIPATION]->(part:Participation)-[medal:MEDAL]->(ge:GameEvent)-[:OF_EVENT]->(ev:Event)-[:OF_SPORT]->(sp:Sport)
MATCH (part)-[:UNDER_NOC]->(noc:NationalOlympicCommittee)
MATCH (part)-[:DURING_GAMES]->(g:Games)
WITH ath, collect(DISTINCT noc.noc) AS nocs, collect(DISTINCT sp.name) AS sports, collect(DISTINCT g.year) AS games, count(medal) AS nbMedals
RETURN ath.name, games, nocs, sports, nbMedals
ORDER BY nbMedals DESC LIMIT 10
```


### Athlete stats

#### Athlete with the most number or participations to distinct games 

```cypher
MATCH (ath:Athlete)-[:HAS_PARTICIPATION]->(part:Participation)-[:PARTICIPATION]->(ge:GameEvent)-[:OF_EVENT]->(ev:Event)-[:OF_SPORT]->(sp:Sport)
MATCH (part)-[:UNDER_NOC]->(noc:NationalOlympicCommittee)
MATCH (part)-[:DURING_GAMES]->(g:Games)
WITH ath,
    collect(DISTINCT noc.noc) AS nocs,
    collect(DISTINCT sp.name) AS sports,
    collect(DISTINCT g.name) AS games
RETURN ath.name, nocs, sports, size(games) AS nbGames, games
ORDER BY nbGames DESC LIMIT 10
```

#### Athletes who have won at least one medal to the most distinct games

```cypher
MATCH (ath:Athlete)-[:HAS_PARTICIPATION]->(part:Participation)-[medal:MEDAL]->(ge:GameEvent)-[:OF_EVENT]->(ev:Event)-[:OF_SPORT]->(sp:Sport)
MATCH (part)-[:UNDER_NOC]->(noc:NationalOlympicCommittee)
MATCH (part)-[:DURING_GAMES]->(g:Games)
WITH ath,
    collect(DISTINCT noc.noc) AS nocs,
    collect(DISTINCT sp.name) AS sports,
    collect(DISTINCT g.name) AS games,
    count(medal) AS nbMedals     
RETURN ath.name, games, nocs, sports, nbMedals, size(games)  AS nbGames
ORDER BY size(games) DESC, nbMedals DESC LIMIT 10
```


### Sports never won by the USA

#### 1. Sports ever won by the USA

```cypher
MATCH (noc:NationalOlympicCommittee {noc: 'USA'})<-[:UNDER_NOC]-()-[:MEDAL]->()-[:OF_EVENT]->()-[:OF_SPORT]->(sp:Sport)
RETURN distinct sp
```

#### 2. Sports still present

```cypher
MATCH (g:Games {season: 'Summer'})

WITH max(g.year) AS lastYear
MATCH (g: Games) WHERE g.year = lastYear
MATCH (g)<-[:HOSTED_DURING_GAMES]-(ge:GameEvent)-[:OF_EVENT]->(ev:Event)-[:OF_SPORT]->(sp:Sport)

WITH collect(distinct sp) AS currentSports
return currentSports
```

#### Result: Sports never won by the USA

```cypher
MATCH (g:Games {season: 'Summer'})

WITH max(g.year) AS lastYear
MATCH (g: Games) WHERE g.year = lastYear
MATCH (g)<-[:HOSTED_DURING_GAMES]-(ge:GameEvent)-[:OF_EVENT]->(ev:Event)-[:OF_SPORT]->(sp:Sport)

WITH collect(distinct sp) AS currentSports
MATCH (noc:NationalOlympicCommittee {noc: 'USA'})<-[:UNDER_NOC]-()-[:MEDAL]->()-[:OF_EVENT]->()-[:OF_SPORT]->(sports:Sport)

WITH currentSports, collect(distinct sports) AS sportWithMedal 
UNWIND currentSports AS sp
MATCH (sp)
WHERE not sp  in sportWithMedal
RETURN sp.name
```


# GraphQL

```graphql
query {
  games {
    name
    season
    year
    hostedInCities {
      name
      locatedInCountries {
        name
      }
    }
  }
}
```

```graphql
query {
  nationalOlympicCommittees(where: { noc: "FRA" }) {
    noc
    participationsUnderNoc(
      where: {
        athletesHasParticipation_SOME: {
          hasParticipationParticipations_SOME: {
            medalGameEvents_SOME: { ofEventEvents_SOME: {} }
          }
        }
      }
    ) {
      athletesHasParticipation {
        name
        hasParticipationParticipations {
          medalGameEvents {
            participationsMedalConnection {
              edges {
                properties {
                  medal
                }
              }
            }
            ofEventEvents {
              name
              ofSportSports {
                name
              }
            }
          }
        }
      }
    }
  }
}
```

```graphql
query {
  games(where: { year: "2016" }) {
    name
    season
    year
    hostedInCities {
      name
      locatedInCountries {
        name
      }
    }
    gameEventsHostedDuringGames(
      where: {
        participationsMedalConnection_SOME: {
          node: { underNocNationalOlympicCommittees_SOME: { noc: "FRA" } }
        }
      }
    ) {
      ofEventEvents {
        name
        ofSportSports {
          name
        }
      }
      participationsMedalConnection(
        where: {
          node: { underNocNationalOlympicCommittees_SOME: { noc: "FRA" } }
        }
      ) {
        edges {
          properties {
            medal
          }
          node {
            age
            athletesHasParticipation {
              name
              sex
            }
            underNocNationalOlympicCommittees(where: { noc: "FRA" }) {
              noc
            }
          }
        }
      }
    }
  }
}
```