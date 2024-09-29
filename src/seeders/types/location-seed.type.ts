// Define an interface for the parent location
interface ParentLocation {
    id: number;
}

// Define an interface for the survey (if you need to specify its structure, otherwise use any)
interface Survey {
    // Define properties of Survey here or use `any` if the structure is not specified
}

// Define an interface for the organisation (if you need to specify its structure, otherwise use any)
interface Organisation {
    // Define properties of Organisation here or use `any` if the structure is not specified
}

// Define the main interface for the location
export interface LocationSeed {
    id: number;
    createdAt: string;  // ISO date string format
    updatedAt: string;  // ISO date string format
    parentLocation: ParentLocation;  // Parent location reference
    locationId: number;
    name: string;
    locationLevelId: number;
    childrenLocations: Location[];  // Recursive type definition for nested children locations
    surveys: Survey[];  // Array of Survey objects
    organisation: Organisation[];  // Array of Organisation objects
}

// Define the interface for the object
export  interface LocationLevelSeed {
    id: number;
    createdAt: string;  // ISO date string format
    updatedAt: string;  // ISO date string format
    order_number: number;
    name: string;
    code: string;
}
