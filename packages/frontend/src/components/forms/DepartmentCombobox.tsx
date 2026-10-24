import { forwardRef } from "react";
import { DEPARTMENT_LIST } from "@backend/utils/const";
import { prioritizeDepartmentList, toSelectOptions } from "@/utils";
import { Combobox, type ComboboxProps } from "./Combobox";

const DEPARTMENT_OPTIONS = toSelectOptions(DEPARTMENT_LIST);

export interface DepartmentComboboxProps extends Omit<ComboboxProps, "options"> {
    /** Shown first in the list (e.g. prefixes the professor has taught). */
    priorityValues?: readonly string[];
}

export const DepartmentCombobox = forwardRef<HTMLSelectElement, DepartmentComboboxProps>(
    ({ placeholder = "Please select", priorityValues, ...props }, ref) => {
        const options = priorityValues?.length
            ? toSelectOptions(prioritizeDepartmentList(DEPARTMENT_LIST, priorityValues))
            : DEPARTMENT_OPTIONS;

        return <Combobox ref={ref} options={options} placeholder={placeholder} {...props} />;
    },
);
DepartmentCombobox.displayName = "DepartmentCombobox";
