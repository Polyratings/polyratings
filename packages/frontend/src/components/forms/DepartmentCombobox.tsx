import { forwardRef } from "react";
import { DEPARTMENT_LIST } from "@backend/utils/const";
import { toSelectOptions } from "@/utils";
import { Combobox, type ComboboxProps } from "./Combobox";

const DEPARTMENT_OPTIONS = toSelectOptions(DEPARTMENT_LIST);

export const DepartmentCombobox = forwardRef<HTMLSelectElement, Omit<ComboboxProps, "options">>(
    ({ placeholder = "Please select", ...props }, ref) => (
        <Combobox ref={ref} options={DEPARTMENT_OPTIONS} placeholder={placeholder} {...props} />
    ),
);
DepartmentCombobox.displayName = "DepartmentCombobox";
