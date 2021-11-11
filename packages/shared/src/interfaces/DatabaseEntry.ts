interface DefaultDbItems {
    id:number;
    createdAt: Date;
}

// Apply the default db items as required to the target interface
export type DatabaseEntry<I extends InterfaceType, T> = 
    I extends 'db' ? 
        Omit<T, keyof DefaultDbItems>
        & { [K in keyof T & keyof DefaultDbItems]: DefaultDbItems[K] }
    :
        T


export type InterfaceType = 'db' | 'plain'
