interface DefaultDbItems {
    id: number;
    createdAt: Date;
}
export declare type DatabaseEntry<I extends InterfaceType, T> = I extends 'db' ? Omit<T, keyof DefaultDbItems> & {
    [K in keyof T & keyof DefaultDbItems]: DefaultDbItems[K];
} : T;
export declare type InterfaceType = 'db' | 'plain';
export {};
