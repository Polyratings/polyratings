import { type FieldValues, type UseFormClearErrors, type UseFormRegister } from "react-hook-form";

export function withClearErrorOnChange<TFieldValues extends FieldValues>(
    register: UseFormRegister<TFieldValues>,
    clearErrors: UseFormClearErrors<TFieldValues>,
): UseFormRegister<TFieldValues> {
    return (name, options) => {
        const field = register(name, options);
        return {
            ...field,
            onChange: (event) => {
                clearErrors(name);
                return field.onChange(event);
            },
        };
    };
}
