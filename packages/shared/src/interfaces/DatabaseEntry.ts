export interface DbEntryProperties {
    id:string;
    // createdAt: Date;
}

// Apply the default db items as required to the target interface
export type DatabaseEntry<I extends InterfaceType, T> = 
    I extends 'db' ? 
        Omit<T, keyof DbEntryProperties>
        & { [K in keyof T & keyof DbEntryProperties]: DbEntryProperties[K] }
    :
        T


export type InterfaceType = 'db' | 'plain'
