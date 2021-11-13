export interface DbEntryProperties {
    id: string;
}
export declare type DatabaseEntry<I extends InterfaceType, T> = I extends 'db' ? Omit<T, keyof DbEntryProperties> & {
    [K in keyof T & keyof DbEntryProperties]: DbEntryProperties[K];
} : T;
export declare type InterfaceType = 'db' | 'plain';
