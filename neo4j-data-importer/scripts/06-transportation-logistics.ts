import neo4j from "neo4j-driver";
import "dotenv/config";

// const warehouses = [
//     { id: "W1", name: "Paris", city: "Paris", latitude: 48.8566, longitude: 2.3522 },
//     { id: "W2", name: "Paris", city: "Paris", latitude: 48.8566, longitude: 2.3622 },
//     { id: "W3", name: "Lyon", city: "Lyon", latitude: 45.7640, longitude: 4.8357 },
//     { id: "W4", name: "Marseille", city: "Marseille", latitude: 43.2965, longitude: 5.3698 },
//     { id: "W5", name: "Lille", city: "Lille", latitude: 50.6292, longitude: 3.0573 },
//     { id: "W6", name: "Toulouse", city: "Toulouse", latitude: 43.6047, longitude: 1.4442 },
//     { id: "W7", name: "Bordeaux", city: "Bordeaux", latitude: 44.8378, longitude: -0.5792 },
//     { id: "W8", name: "Strasbourg", city: "Strasbourg", latitude: 48.5734, longitude: 7.7521 },
//     { id: "W9", name: "Nice", city: "Nice", latitude: 43.7102, longitude: 7.2620 },
//     { id: "W10", name: "Nantes", city: "Nantes", latitude: 47.2184, longitude: -1.5536 }
//   ];

//   const routes = [
//     { from: "W1", to: "W2", distance: 15, duration: 30 },
//     { from: "W1", to: "W3", distance: 465, duration: 300 },
//     { from: "W1", to: "W5", distance: 230, duration: 140 },
//     { from: "W2", to: "W4", distance: 775, duration: 480 },
//     { from: "W3", to: "W4", distance: 315, duration: 200 },
//     { from: "W3", to: "W6", distance: 540, duration: 360 },
//     { from: "W4", to: "W9", distance: 200, duration: 180 },
//     { from: "W5", to: "W8", distance: 600, duration: 420 },
//     { from: "W6", to: "W7", distance: 245, duration: 180 },
//     { from: "W7", to: "W10", distance: 340, duration: 240 },
//     { from: "W8", to: "W9", distance: 890, duration: 600 },
//     { from: "W9", to: "W10", distance: 1040, duration: 660 },
//     { from: "W2", to: "W6", distance: 680, duration: 450 },
//     { from: "W5", to: "W3", distance: 500, duration: 300 },
//     { from: "W8", to: "W1", distance: 500, duration: 330 }
//   ];

const warehouses = [
  { id: "W1", name: "Paris", city: "Paris", latitude: 48.8566, longitude: 2.3522 },
  { id: "W4", name: "Marseille", city: "Marseille", latitude: 43.2965, longitude: 5.3698 },
  { id: "W6", name: "Lyon", city: "Lyon", latitude: 45.764, longitude: 4.8357 },
  { id: "W8", name: "Lille", city: "Lille", latitude: 50.6292, longitude: 3.0573 },
  { id: "W10", name: "Toulouse", city: "Toulouse", latitude: 43.6047, longitude: 1.4442 },
  { id: "W11", name: "Bordeaux", city: "Bordeaux", latitude: 44.8378, longitude: -0.5792 },
  { id: "W13", name: "Nice", city: "Nice", latitude: 43.7102, longitude: 7.262 },
  { id: "W15", name: "Nantes", city: "Nantes", latitude: 47.2184, longitude: -1.5536 },
  { id: "W16", name: "Strasbourg", city: "Strasbourg", latitude: 48.5734, longitude: 7.7521 },
  { id: "W17", name: "Grenoble", city: "Grenoble", latitude: 45.1885, longitude: 5.7245 },
  { id: "W18", name: "Rennes", city: "Rennes", latitude: 48.1173, longitude: -1.6778 },
  { id: "W19", name: "Saint-Étienne", city: "Saint-Étienne", latitude: 45.4397, longitude: 4.3872 },
  { id: "W20", name: "Clermont-Ferrand", city: "Clermont-Ferrand", latitude: 45.7826, longitude: 3.0869 },
  { id: "W21", name: "Amiens", city: "Amiens", latitude: 49.8951, longitude: 2.3022 },
  { id: "W22", name: "La Rochelle", city: "La Rochelle", latitude: 46.1603, longitude: -1.1511 },
  { id: "W23", name: "Limoges", city: "Limoges", latitude: 45.8312, longitude: 1.262 },
  { id: "W24", name: "Angers", city: "Angers", latitude: 47.4784, longitude: -0.5632 },
  { id: "W25", name: "Caen", city: "Caen", latitude: 49.4144, longitude: -0.9681 },
  { id: "W26", name: "Nancy", city: "Nancy", latitude: 48.6921, longitude: 6.1844 },
  { id: "W27", name: "Saint-Nazaire", city: "Saint-Nazaire", latitude: 47.2872, longitude: -2.2032 },
  { id: "W28", name: "Brest", city: "Brest", latitude: 48.3902, longitude: -4.4861 },
  { id: "W29", name: "Colmar", city: "Colmar", latitude: 48.0796, longitude: 7.3582 },
  { id: "W30", name: "Ajaccio", city: "Ajaccio", latitude: 41.9192, longitude: 8.7386 },
  { id: "W31", name: "Cannes", city: "Cannes", latitude: 43.5511, longitude: 7.0128 },
  { id: "W32", name: "Nîmes", city: "Nîmes", latitude: 43.8367, longitude: 4.3601 },
  { id: "W33", name: "Avignon", city: "Avignon", latitude: 43.9493, longitude: 4.8055 },
  { id: "W34", name: "La Roche-sur-Yon", city: "La Roche-sur-Yon", latitude: 46.6679, longitude: -1.4325 },
  { id: "W35", name: "Troyes", city: "Troyes", latitude: 48.2975, longitude: 4.0744 },
  { id: "W36", name: "Bourg-en-Bresse", city: "Bourg-en-Bresse", latitude: 46.2044, longitude: 5.2345 },
  { id: "W37", name: "Douai", city: "Douai", latitude: 50.3662, longitude: 3.0873 },
  { id: "W38", name: "Mulhouse", city: "Mulhouse", latitude: 47.7508, longitude: 7.3359 },
  { id: "W46", name: "Toulon", city: "Toulon", latitude: 43.1242, longitude: 5.928 },
  { id: "W47", name: "Saint-Denis", city: "Saint-Denis", latitude: 48.9362, longitude: 2.3573 }
];

const routes = [
  { from: "W28", to: "W18", distance: 210.11, duration: 255 },
  { from: "W18", to: "W27", distance: 100.33, duration: 139 },
  { from: "W27", to: "W15", distance: 49.62, duration: 69 },
  { from: "W15", to: "W24", distance: 80.02, duration: 95 },
  { from: "W24", to: "W18", distance: 109.44, duration: 156 },
  { from: "W18", to: "W15", distance: 100.38, duration: 137 },
  { from: "W27", to: "W28", distance: 209.92, duration: 309 },
  { from: "W15", to: "W34", distance: 61.9, duration: 83 },
  { from: "W34", to: "W22", distance: 60.16, duration: 85 },
  { from: "W22", to: "W23", distance: 190.72, duration: 285 },
  { from: "W23", to: "W11", distance: 182.04, duration: 257 },
  { from: "W22", to: "W11", distance: 153.66, duration: 190 },
  { from: "W10", to: "W11", distance: 212.86, duration: 272 },
  { from: "W10", to: "W32", distance: 234.93, duration: 292 },
  { from: "W32", to: "W33", distance: 37.82, duration: 50 },
  { from: "W32", to: "W4", distance: 102.42, duration: 123 },
  { from: "W33", to: "W4", distance: 86.49, duration: 113 },
  { from: "W4", to: "W46", distance: 47.64, duration: 63 },
  { from: "W46", to: "W31", distance: 100.46, duration: 130 },
  { from: "W31", to: "W13", distance: 27.35, duration: 40 },
  { from: "W31", to: "W13", distance: 26.15, duration: 31 },
  { from: "W46", to: "W30", distance: 266.45, duration: 329 },
  { from: "W30", to: "W31", distance: 229.26, duration: 311 },
  { from: "W33", to: "W17", distance: 155.84, duration: 211 },
  { from: "W17", to: "W13", distance: 205.67, duration: 252 },
  { from: "W17", to: "W19", distance: 108.23, duration: 151 },
  { from: "W6", to: "W19", distance: 51.27, duration: 75 },
  { from: "W19", to: "W20", distance: 107.36, duration: 157 },
  { from: "W20", to: "W10", distance: 274.77, duration: 351 },
  { from: "W23", to: "W10", distance: 248.04, duration: 342 },
  { from: "W6", to: "W36", distance: 57.05, duration: 71 },
  { from: "W36", to: "W17", distance: 119.2, duration: 143 },
  { from: "W38", to: "W36", distance: 234.47, duration: 294 },
  { from: "W38", to: "W29", distance: 36.6, duration: 54 },
  { from: "W16", to: "W29", distance: 62.5, duration: 75 },
  { from: "W26", to: "W16", distance: 116.69, duration: 162 },
  { from: "W26", to: "W29", distance: 110.23, duration: 131 },
  { from: "W35", to: "W26", distance: 161.55, duration: 221 },
  { from: "W35", to: "W36", distance: 248.66, duration: 364 },
  { from: "W26", to: "W37", distance: 290.84, duration: 432 },
  { from: "W37", to: "W21", distance: 76.65, duration: 111 },
  { from: "W37", to: "W8", distance: 29.25, duration: 39 },
  { from: "W1", to: "W25", distance: 251.48, duration: 311 },
  { from: "W25", to: "W18", distance: 153.32, duration: 220 },
  { from: "W21", to: "W25", distance: 241.39, duration: 319 },
  { from: "W24", to: "W1", distance: 266.8, duration: 335 },
  { from: "W35", to: "W1", distance: 139.15, duration: 197 },
  { from: "W23", to: "W1", distance: 346.82, duration: 437 },
  { from: "W20", to: "W1", distance: 346.03, duration: 462 },
  { from: "W21", to: "W47", distance: 106.7, duration: 137 },
  { from: "W47", to: "W1", distance: 9.04, duration: 6 },
  { from: "W20", to: "W23", distance: 142.33, duration: 197 }
]



const cities = Array.from(new Set(warehouses.map(w => w.city)))

const driver = neo4j.driver(
    process.env.NEO4J_URL!,
    neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!)
);

await driver.executeQuery(`MATCH (n:Logistics|City|Warehouse) DETACH DELETE n`);

await driver.executeQuery(`
UNWIND $cities as name
CREATE (c: City:Logistics {name: name})
`, { cities })

console.log(`Created ${cities.length} nodes City`)

await driver.executeQuery(`
UNWIND $warehouses as props
MATCH (c:City {name: props.city})
CREATE (w: Warehouse:Logistics {id: props.id, name: props.name, latitude: props.latitude, longitude: props.longitude})
CREATE (w)-[:LOCATED_IN]->(c)
`, { warehouses })

console.log(`Created ${warehouses.length} nodes Warehouse`)

await driver.executeQuery(`
UNWIND $routes as props
MATCH (from: Warehouse {id: props.from})
MATCH (to: Warehouse {id: props.to})
CREATE (from)-[:ROUTE {distance: props.distance, duration: props.duration}]->(to)
CREATE (to)-[:ROUTE {distance: props.distance, duration: props.duration}]->(from)
`, { routes })

console.log(`Created ${routes.length} relationships ROUTE`)

await driver.executeQuery(`CALL gds.graph.drop('WarehouseGraph', false)`)
await driver.executeQuery(`
MATCH (source:Warehouse)-[r:ROUTE]->(target:Warehouse)
RETURN gds.graph.project(
  'WarehouseGraph',
  source,
  target,
  {
    sourceNodeProperties: source { .latitude, .longitude },
    targetNodeProperties: target { .latitude, .longitude },
    relationshipProperties: r { .distance, .duration }
  }
)
`)

driver.close();

// CALL gds.graph.drop('WarehouseGraph', false);

// CALL gds.graph.project(
//     'WarehouseGraph', 
//     'Warehouse', 
//     {
//       ROUTE: {
//         type: 'ROUTE',
//         properties: 'duration'
//       }
//     }
//   ); 


// MATCH (source:Warehouse {name: 'Paris 1'}), (target:Warehouse {name: 'Nice 1'})
// CALL gds.shortestPath.dijkstra.stream('WarehouseGraph', {
//     sourceNode: source,
//     targetNodes: target,
//     relationshipWeightProperty: 'duration'
// })
// YIELD index, sourceNode, targetNode, totalCost, nodeIds, costs, path
// RETURN
//     index,
//     gds.util.asNode(sourceNode).name AS sourceNodeName,
//     gds.util.asNode(targetNode).name AS targetNodeName,
//     totalCost,
//     [nodeId IN nodeIds | gds.util.asNode(nodeId).name] AS nodeNames,
//     costs,
//     nodes(path) as path
// ORDER BY index;



// MATCH (source:Warehouse)-[r:ROUTE]->(target:Warehouse)
// RETURN gds.graph.project(
//   'WarehouseGraph',
//   source,
//   target,
//   {
//     sourceNodeProperties: source { .latitude, .longitude },
//     targetNodeProperties: target { .latitude, .longitude },
//     relationshipProperties: r { .distance, .duration }
//   }
// )



// MATCH (source:Warehouse {name: 'Paris 4'}), (target:Warehouse {name: 'Nice 3'})
// CALL gds.shortestPath.astar.stream('WarehouseGraph', {
//     sourceNode: source,
//     targetNode: target,
//     latitudeProperty: 'latitude',
//     longitudeProperty: 'longitude',
//     relationshipWeightProperty: 'duration'
// })
// YIELD index, sourceNode, targetNode, totalCost, nodeIds, costs, path
// RETURN
//     index,
//     gds.util.asNode(sourceNode).name AS sourceNodeName,
//     gds.util.asNode(targetNode).name AS targetNodeName,
//     totalCost,
//     [nodeId IN nodeIds | gds.util.asNode(nodeId).name] AS nodeNames,
//     costs,
//     nodes(path) as path
// ORDER BY index