import { Exclude, Expose, Transform } from 'class-transformer';

export const ExcludeFrontend = () => {
    return (target: object, propertyKey: string) => {
        Exclude({ toPlainOnly: true })(target, propertyKey)
        Expose({ toClassOnly: true })(target, propertyKey)
    }
};

export const ExposeFrontend = () => Expose()

export const Default = (fn:() => any) => Transform(({value}) => value ?? fn())
