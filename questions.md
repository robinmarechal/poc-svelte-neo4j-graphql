# Questions

A list of questions for live presentation which can be answered using cypher queries

### What year was the first olympic game?

```cypher
match (g:Games) return min(g.year)
```

### Where were the first olympics?

```
match p=(g:Games)-[]-(:City)-[]-(:Country)
return p
order by g.year asc
limit 1

match p=(g:Games)-[*..2]-(:Country)
return p
order by g.year asc
limit 1
```

### Where and when were the first WINTER Olympic Games?

```
match p=(g:Games {season: 'Winter'})-[]-(:City)-[]-(:Country)
return p
order by g.year asc
limit 1
```

_Chamonix, 1924? Wheren't the 2024 Paris OG the 100th year anniversary of 1924 Paris OG?_

```
match p=(g:Games {year: '1924'})-[]-(:City)-[]-(:Country)
return p
order by g.year asc
```

### Until when Winter and Summer OG were the same year?

#### Lazy version
```
match p=(g:Games)-[:HOSTED_IN]->(:City)-[:LOCATED_IN]->(:Country)
with g.year as y, collect(g.season) as seasons, collect(p) as paths
where size(seasons) = 2
return paths
order by y desc
limit 1
```

#### More optimized version
```
match (g:Games) 
with g.year as y, collect(g.season) as seasons
where size(seasons) = 2

with max(y) as lastYear
match p=(g:Games)-[:HOSTED_IN]->(:City)-[:LOCATED_IN]->(:Country)
where g.year = lastYear
return p
```

#### Nerd version, with virtual node and relationship
```
match (g:Games) 
with g.year as y, collect(g.season) as seasons
where size(seasons) = 2
with max(y) as lastYear
with lastYear, apoc.create.vNode(['Year'], {year: lastYear}) as yearNode

match p=(g:Games)-[:HOSTED_IN]->(:City)-[:LOCATED_IN]->(:Country)
where g.year = lastYear
call apoc.create.vRelationship(g, 'YEAR', {}, yearNode) yield rel
return p, yearNode, rel
```

### Which country has hosted the most olympics? What is top 3?

#### Without ex-aequos


```
match p=(country: Country)<-[:LOCATED_IN]-(city: City)<-[:HOSTED_IN]-(g:Games)
with country, collect(p) as paths, count(p) as cnt
return paths
order by cnt desc limit 1
```

#### With ex-aequos

```
call() {
    call() {
        match p=(country: Country)<-[:LOCATED_IN]-(city: City)<-[:HOSTED_IN]-(g:Games)
        with country, count(p) as cnt
        return cnt
        order by cnt desc limit 3
    }
    return cnt order by cnt asc limit 1
}
with cnt
match p=(country: Country)<-[:LOCATED_IN]-(city: City)<-[:HOSTED_IN]-(g:Games)
with cnt, country, collect(p) as paths, count(p) as countryCnt
where countryCnt >= cnt
return paths
```



### Was there any OG hosted by more than one country ? 

```
match p=(g:Games)-[:HOSTED_IN]->(:City)-[:LOCATED_IN]->(:Country)
with g, collect(p) as paths
where size(paths) > 1
return paths
```

```
match p=(games:Games)-[:HOSTED_IN]->(city:City)-[:LOCATED_IN]->(:Country)
with games, collect(city) as cities, collect(p) as paths
where size(paths) > 1

unwind cities as city
match (games)<-[:HOSTED_DURING_GAMES]-(gameEvent:GameEvent)-[:OF_EVENT]->(event:Event)-[:OF_SPORT]->(sport:Sport)
match (gameEvent)<-[:HOSTED_EVENT]-(city)
with games, city, sport, count(gameEvent) as _
with games, city, sport, apoc.create.vRelationship(city, "HOSTED_SPORT", {}, sport) as hosted_sport
return games, city, sport, hosted_sport
```

### Medals ranking

#### Countries with most medals in history

```
match (noc:NationalOlympicCommittee)<-[:UNDER_NOC]-(part:Participation)-[:MEDAL]->(ge:GameEvent)
with noc, count(ge) as nbMedals
return noc, nbMedals
order by nbMedals desc limit 20
```

#### Athletes with most medals in history

```
match (ath:Athlete)-[:HAS_PARTICIPATION]->(part:Participation)-[medal:MEDAL]->(ge:GameEvent)-[:OF_EVENT]->(ev:Event)-[:OF_SPORT]->(sp:Sport)
match (part)-[:UNDER_NOC]->(noc:NationalOlympicCommittee)
match (part)-[:DURING_GAMES]->(g:Games)
with ath, collect(DISTINCT noc.noc) as nocs, collect(DISTINCT sp.name) as sports, collect(DISTINCT g.year) as games, count(medal) as nbMedals
return ath.name, games, nocs, sports, nbMedals
order by nbMedals desc limit 10
```


### Athlete stats

#### Athlete with the most number or participations to distinct games 

```
match (ath:Athlete)-[:HAS_PARTICIPATION]->(part:Participation)-[:PARTICIPATION]->(ge:GameEvent)-[:OF_EVENT]->(ev:Event)-[:OF_SPORT]->(sp:Sport)
match (part)-[:UNDER_NOC]->(noc:NationalOlympicCommittee)
match (part)-[:DURING_GAMES]->(g:Games)
with ath,
    collect(DISTINCT noc.noc) as nocs,
    collect(DISTINCT sp.name) as sports,
    collect(DISTINCT g.name) as games
return ath.name, nocs, sports, size(games) as nbGames, games
order by nbGames desc limit 10
```

#### Number of games with at least one medal per athlete

```
match (ath:Athlete)-[:HAS_PARTICIPATION]->(part:Participation)-[medal:MEDAL]->(ge:GameEvent)-[:OF_EVENT]->(ev:Event)-[:OF_SPORT]->(sp:Sport)
match (part)-[:UNDER_NOC]->(noc:NationalOlympicCommittee)
match (part)-[:DURING_GAMES]->(g:Games)
with ath,
    collect(DISTINCT noc.noc) as nocs,
    collect(DISTINCT sp.name) as sports,
    collect(DISTINCT g.name) as games,
    count(medal) as nbMedals     
return ath.name, games, nocs, sports, nbMedals, size(games)  as nbGames
order by size(games) desc, nbMedals desc limit 10
```


match p=(country: Country {name: 'France'})-[*..2]-(g:Games)
return p

match (g:Games) 
with g.year as gyear, collect(g.season) as coll
return gyear, coll
order by gyear asc



### ???

#### Sports still present

#### Sports ever won by the USA

```
match (noc:NationalOlympicCommittee {noc: 'USA'})<-[:UNDER_NOC]-()-[:MEDAL]->()-[:OF_EVENT]->()-[:OF_SPORT]->(sp:Sport)
return distinct sp
```

#### Sports never won by the USA

```
match (g:Games {season: 'Summer'})

with max(g.year) as lastYear
match (g: Games) where g.year = lastYear
match (g)<-[:HOSTED_DURING_GAMES]-(ge:GameEvent)-[:OF_EVENT]->(ev:Event)-[:OF_SPORT]->(sp:Sport)

with collect(distinct sp) as currentSports
match (noc:NationalOlympicCommittee {noc: 'USA'})<-[:UNDER_NOC]-()-[:MEDAL]->()-[:OF_EVENT]->()-[:OF_SPORT]->(sports:Sport)

with currentSports, collect(distinct sports) as sportWithMedal 
unwind currentSports as sp
match (sp)
where not sp  in sportWithMedal
return sp.name
```




match (g:Games) 
with g.year as y, collect(g.season) as seasons
where size(seasons) = 2
with max(y) as lastYear

match (g:Games) where g.year = lastYear
with apoc.create.virtual.node('Year', {year: lastYear}) as yearNode

match p=(g:Games)-[]-(:City)-[]-(:Country)
where g.year = yearNode.year
return yearNode,p







match (g:Games) 
with g.year as y, collect(g.season) as seasons
where size(seasons) = 2
with max(y) as lastYear
with lastYear, apoc.create.vNode(['Year'], {year: lastYear}) as yearNode

match (g:Games) where g.year = lastYear
call apoc.create.vRelationship(g, 'YEAR', {}, yearNode) YIELD rel
return g, rel, yearNode