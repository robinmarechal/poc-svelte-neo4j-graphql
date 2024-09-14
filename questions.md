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




Is there any OG hosted by more than one country ? 




match p=(country: Country {name: 'France'})-[*..2]-(g:Games)
return p

match (g:Games) 
with g.year as gyear, collect(g.season) as coll
return gyear, coll
order by gyear asc