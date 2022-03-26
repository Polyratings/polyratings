export class BasicBehaviorSubject<T> {
    idCounter = 0;

    subscriptions: Record<number, (value: T) => void> = {};

    constructor(private currentValue: T) {}

    next(value: T) {
        Object.values(this.subscriptions).forEach((sub) => sub(value));
    }

    subscribe(fn: (value: T) => void) {
        const id = this.idCounter;
        this.idCounter += 1;

        this.subscriptions[id] = fn;
        fn(this.currentValue);
        return {
            unsubscribe: () => {
                delete this.subscriptions[id];
            },
        };
    }
}
