type Resource = {
    name: string;
}

type Building = {
    name: string;
}

const resources = [
    { name: 'Iron Ore' },
    { name: 'Iron Ingot' },
    { name: 'Iron Plate' },
    { name: 'Iron Rod' },
    { name: 'Screw' },
    { name: 'Reinforced Iron Plate' },
] as const

type ResourceType = typeof resources[number][keyof typeof resources[number]]

const buildings = [
    { name: 'Constructor' },
    { name: 'Assembler' },
] as const

type BuildingType = typeof buildings[number]['name']


type CraftPart = {
    resource: ResourceType;
    quantity: number
}

type Craft = {
    inputs: CraftPart[];
    outputs: CraftPart[];
    building: BuildingType;
}


const crafts: Craft[] = [
    {
        inputs: [{ resource: 'Iron Ore', quantity: 30 }],
        outputs: [{ resource: 'Iron Ingot', quantity: 30 }],
        building: 'Constructor'
    },
    {
        inputs: [{ resource: 'Iron Ingot', quantity: 30 }],
        outputs: [{ resource: 'Iron Plate', quantity: 20 }],
        building: 'Constructor'
    },
    {
        inputs: [{ resource: 'Iron Ingot', quantity: 30 }],
        outputs: [{ resource: 'Iron Rod', quantity: 30 }],
        building: 'Constructor'
    },
    {
        inputs: [{ resource: 'Iron Rod', quantity: 10 }],
        outputs: [{ resource: 'Screw', quantity: 40 }],
        building: 'Constructor'
    },
    {
        inputs: [{ resource: 'Iron Plate', quantity: 30 }, { resource: 'Screw', quantity: 60 }],
        outputs: [{ resource: 'Reinforced Iron Plate', quantity: 5 }],
        building: 'Assembler'
    }
]

