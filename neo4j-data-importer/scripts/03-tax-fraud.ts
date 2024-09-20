import "dotenv/config";
import { fakerFR as faker } from "@faker-js/faker";
import neo4j from "neo4j-driver";


const entities = [
    { id: 1, nom: "Entreprise A (Maison Mère)", label: "Entreprise" },
    { id: 2, nom: "Holding X", label: "Holding" },
    { id: 3, nom: "Holding Y", label: "Holding" },
    { id: 4, nom: "Filiale B", label: "Entreprise" },
    { id: 5, nom: "Filiale C", label: "Entreprise" },
    { id: 6, nom: "Filiale D", label: "Entreprise" },
    { id: 7, nom: "Filiale E", label: "Entreprise" },
    { id: 8, nom: "Filiale F", label: "Entreprise" },
    { id: 9, nom: "Filiale G", label: "Entreprise" },
    { id: 10, nom: "Investisseur 1", label: "Investisseur" },
    { id: 11, nom: "Investisseur 2", label: "Investisseur" },
    { id: 12, nom: "Investisseur 3", label: "Investisseur" },
    { id: 13, nom: "Investisseur 4", label: "Investisseur" },
    { id: 14, nom: "Investisseur 5", label: "Investisseur" },
    { id: 15, nom: "Filiale H", label: "Entreprise" },
    { id: 16, nom: "Filiale I", label: "Entreprise" },
    { id: 17, nom: "Filiale J", label: "Entreprise" },
    { id: 18, nom: "Filiale K", label: "Entreprise" },
    { id: 19, nom: "Filiale L", label: "Entreprise" },
    { id: 20, nom: "Filiale M", label: "Entreprise" },
    { id: 21, nom: "Investisseur 6", label: "Investisseur" },
    { id: 22, nom: "Investisseur 7", label: "Investisseur" },
    { id: 23, nom: "Investisseur 8", label: "Investisseur" },
    { id: 24, nom: "Investisseur 9", label: "Investisseur" },
    { id: 25, nom: "Investisseur 10", label: "Investisseur" },
    { id: 26, nom: "Filiale N", label: "Entreprise" },
    { id: 27, nom: "Filiale O", label: "Entreprise" },
    { id: 28, nom: "Investisseur 11", label: "Investisseur" },
    { id: 29, nom: "Investisseur 12", label: "Investisseur" },
    { id: 30, nom: "Filiale P", label: "Entreprise" },
    { id: 31, nom: "Filiale Q", label: "Entreprise" },
    { id: 32, nom: "Filiale R", label: "Entreprise" },
    { id: 33, nom: "Filiale S", label: "Entreprise" },
    { id: 34, nom: "Filiale T", label: "Entreprise" },
    { id: 35, nom: "Investisseur 13", label: "Investisseur" },
    { id: 36, nom: "Investisseur 14", label: "Investisseur" },

    // Nouvelles entités ajoutées
    { id: 37, nom: "Filiale U", label: "Entreprise" },
    { id: 38, nom: "Filiale V", label: "Entreprise" },
    { id: 39, nom: "Filiale W", label: "Entreprise" },
    { id: 40, nom: "Investisseur 15", label: "Investisseur" },
    { id: 41, nom: "Investisseur 16", label: "Investisseur" },
    { id: 42, nom: "Filiale X", label: "Entreprise" },
    { id: 43, nom: "Filiale Y", label: "Entreprise" },
    { id: 44, nom: "Filiale Z", label: "Entreprise" },
    { id: 45, nom: "Investisseur 17", label: "Investisseur" },
    { id: 46, nom: "Investisseur 18", label: "Investisseur" },
    { id: 47, nom: "Filiale AA", label: "Entreprise" },
    { id: 48, nom: "Filiale AB", label: "Entreprise" },
    { id: 49, nom: "Filiale AC", label: "Entreprise" },
    { id: 50, nom: "Investisseur 19", label: "Investisseur" },
    { id: 51, nom: "Investisseur 20", label: "Investisseur" },
];

const links = [
    { actionnaire: 1, filiale: 2, actions: 0.80 },  // Entreprise A détient 80% de Holding X
    { actionnaire: 2, filiale: 3, actions: 0.85 },  // Holding X détient 85% de Holding Y
    { actionnaire: 3, filiale: 4, actions: 0.90 },  // Holding Y détient 90% de Filiale B
    { actionnaire: 4, filiale: 5, actions: 0.95 },  // Filiale B détient 95% de Filiale C
    { actionnaire: 5, filiale: 6, actions: 0.95 },  // Filiale C détient 95% de Filiale D
    { actionnaire: 6, filiale: 7, actions: 0.70 },  // Filiale D détient 70% de Filiale E
    { actionnaire: 7, filiale: 1, actions: 0.40 },  // Filiale E détient 40% de Entreprise A (Auto-détention)
    { actionnaire: 10, filiale: 1, actions: 0.20 },  // Investisseur 1 détient 20% de Entreprise A
    { actionnaire: 11, filiale: 2, actions: 0.15 },  // Investisseur 2 détient 15% de Holding X
    { actionnaire: 12, filiale: 3, actions: 0.10 },  // Investisseur 3 détient 10% de Holding Y
    { actionnaire: 13, filiale: 4, actions: 0.05 },  // Investisseur 4 détient 5% de Filiale B
    { actionnaire: 14, filiale: 5, actions: 0.05 },  // Investisseur 5 détient 5% de Filiale C
    { actionnaire: 7, filiale: 15, actions: 0.50 },  // Filiale E détient 50% de Filiale H
    { actionnaire: 15, filiale: 16, actions: 0.90 }, // Filiale H détient 90% de Filiale I
    { actionnaire: 16, filiale: 17, actions: 0.80 }, // Filiale I détient 80% de Filiale J
    { actionnaire: 17, filiale: 18, actions: 0.70 }, // Filiale J détient 70% de Filiale K
    { actionnaire: 18, filiale: 19, actions: 0.60 }, // Filiale K détient 60% de Filiale L
    { actionnaire: 19, filiale: 20, actions: 0.50 }, // Filiale L détient 50% de Filiale M
    { actionnaire: 21, filiale: 1, actions: 0.10 },  // Investisseur 6 détient 10% de Entreprise A
    { actionnaire: 22, filiale: 3, actions: 0.15 },  // Investisseur 7 détient 15% de Holding Y
    { actionnaire: 23, filiale: 4, actions: 0.10 },  // Investisseur 8 détient 10% de Filiale B
    { actionnaire: 24, filiale: 5, actions: 0.20 },  // Investisseur 9 détient 20% de Filiale C
    { actionnaire: 25, filiale: 19, actions: 0.25 },  // Investisseur 10 détient 25% de Filiale L
    { actionnaire: 1, filiale: 26, actions: 0.30 },  // Entreprise A détient 30% de Filiale N
    { actionnaire: 4, filiale: 27, actions: 0.60 },  // Filiale B détient 60% de Filiale O
    { actionnaire: 3, filiale: 30, actions: 0.40 },  // Holding Y détient 40% de Filiale P
    { actionnaire: 28, filiale: 1, actions: 0.05 },  // Investisseur 11 détient 5% de Entreprise A
    { actionnaire: 29, filiale: 4, actions: 0.10 },  // Investisseur 12 détient 10% de Filiale B
    { actionnaire: 1, filiale: 31, actions: 0.20 },  // Entreprise A détient 20% de Filiale Q
    { actionnaire: 5, filiale: 32, actions: 0.45 },  // Filiale C détient 45% de Filiale R
    { actionnaire: 7, filiale: 33, actions: 0.35 },  // Filiale E détient 35% de Filiale S
    { actionnaire: 10, filiale: 32, actions: 0.10 }, // Investisseur 1 détient 10% de Filiale R
    { actionnaire: 36, filiale: 37, actions: 0.50 }, // Investisseur 14 détient 50% de Filiale U
    { actionnaire: 37, filiale: 38, actions: 0.80 }, // Filiale U détient 80% de Filiale V
    { actionnaire: 39, filiale: 40, actions: 0.60 }, // Filiale W détient 60% de Investisseur 15
    { actionnaire: 41, filiale: 42, actions: 0.75 }, // Investisseur 16 détient 75% de Filiale X
    { actionnaire: 42, filiale: 43, actions: 0.90 }, // Filiale X détient 90% de Filiale Y
    { actionnaire: 44, filiale: 45, actions: 0.55 }, // Filiale Z détient 55% de Investisseur 17
    { actionnaire: 46, filiale: 47, actions: 0.25 }, // Investisseur 18 détient 25% de Filiale AA
    { actionnaire: 48, filiale: 49, actions: 0.45 }, // Filiale AB détient 45% de Filiale AC
    { actionnaire: 50, filiale: 51, actions: 0.30 }  // Investisseur 19 détient 30% de Investisseur 20
];



const driver = neo4j.driver(
    process.env.NEO4J_URL!,
    neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!)
);

await driver.executeQuery(`MATCH (n:Entity) DETACH DELETE n`)

await driver.executeQuery(`
UNWIND $entities as props
CREATE (e:Entity {nom: props.nom, id: props.id})
WITH e, props
CALL apoc.create.addLabels(e, [props.label]) YIELD node
RETURN node
`, { entities })

console.log(`Created ${entities.length} Entity node`)

await driver.executeQuery(`
UNWIND $links as props
MATCH (sh: Entity {id: props.actionnaire})
MATCH (sub: Entity {id: props.filiale})
CREATE (sh)-[:DETIENT {actions: props.actions}]->(sub)
`, { links })

driver.close()


// MATCH p=(e: Entity)-[:DETIENT*1..10]->(e) 
// WITH *, reduce(actions = 1, r in relationships(p) | actions * r.actions ) as shares 
// WHERE shares > 0.1 
// RETURN p, e.nom as Nom, shares


// MATCH p=(e: Entity)-[:DETIENT*1..10]->(e) 
// WITH *, reduce(actions = 1, r in relationships(p) | actions * r.actions ) as shares 
// WHERE shares > 0.1 
// WITH *, apoc.number.format(shares*100, ".2", "fr") + "%" as totalSharesStr
// RETURN p, shares, e.nom + " s'auto détient à hauteur de "+totalSharesStr+". La limite légale en France est de 10%." as text