export function toSelectOptions(values: readonly string[]) {
    return values.map((value) => ({ label: value, value }));
}
