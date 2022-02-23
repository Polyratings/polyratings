import { Exclude, Expose, Transform } from "class-transformer";

export const ExcludeFrontend = () => (target: object, propertyKey: string) => {
    Exclude({ toPlainOnly: true })(target, propertyKey);
    Expose({ toClassOnly: true })(target, propertyKey);
};

export const ExposeFrontend = () => Expose();

// Really should be any type to not cause other problems with type checking
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const Default = (fn: () => any) => Transform(({ value }) => value ?? fn());
