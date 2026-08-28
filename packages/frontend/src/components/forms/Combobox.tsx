import {
    forwardRef,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type FocusEvent,
} from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import {
    Command,
    CommandEmpty,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { cn } from "@/utils";

const EMPTY_COMBOBOX_VALUE = "__empty__";

function toItemValue(value: string) {
    return value === "" ? EMPTY_COMBOBOX_VALUE : value;
}

function assignRef<T>(ref: React.ForwardedRef<T>, value: T | null) {
    if (typeof ref === "function") {
        ref(value);
    } else if (ref) {
        ref.current = value;
    }
}

export interface ComboboxProps extends Omit<React.ComponentProps<"select">, "children"> {
    options: { value: string; label: string }[];
    label: string;
    error?: string;
    wrapperClassName?: string;
    hideLabel?: boolean;
    placeholder?: string;
    noResultsOption?: { value: string; label: string };
}

export const Combobox = forwardRef<HTMLSelectElement, ComboboxProps>(
    (
        {
            options,
            name,
            label,
            error,
            wrapperClassName = "",
            hideLabel = false,
            placeholder = "Please select",
            noResultsOption,
            className,
            id,
            value,
            defaultValue,
            onChange,
            onBlur,
            disabled,
            required,
            "aria-describedby": ariaDescribedBy,
            "aria-invalid": ariaInvalid,
        },
        ref,
    ) => {
        const selectId = id ?? name;
        const errorId = name ? `${name}-error` : undefined;
        const describedBy = error
            ? [ariaDescribedBy, errorId].filter(Boolean).join(" ")
            : ariaDescribedBy;
        const fallbackValue = defaultValue?.toString() ?? "";
        const isControlled = value !== undefined;
        const [uncontrolledValue, setUncontrolledValue] = useState(fallbackValue);
        const selectedValue = isControlled ? value.toString() : uncontrolledValue;
        const selectedLabel =
            options.find((option) => option.value === selectedValue)?.label ??
            (noResultsOption?.value === selectedValue ? noResultsOption.label : "");
        const hasEmptyOption =
            options.some((option) => option.value === "") || noResultsOption?.value === "";
        const [query, setQuery] = useState(selectedLabel);
        const [isOpen, setIsOpen] = useState(false);
        const nativeSelectRef = useRef<HTMLSelectElement | null>(null);
        // Queried from the wrapper because CommandInput is a plain function
        // component, so a ref passed to it is dropped on React 18.
        const inputWrapperRef = useRef<HTMLDivElement | null>(null);
        const [inputId, setInputId] = useState(selectId);

        useEffect(() => {
            if (!isOpen) {
                setQuery(selectedLabel);
            }
        }, [isOpen, selectedLabel]);

        /*
          cmdk hardcodes role, id, aria-expanded, aria-controls and aria-labelledby
          on its input *after* spreading incoming props, so none of them can be set
          the normal way (and `asChild` breaks its controlled value). Two of those
          need correcting, so they are applied to the node instead:

          - aria-expanded is hardcoded `true`, which tells assistive tech the popup
            is open even when it is closed.
          - id is replaced by a generated one, leaving the visible label's htmlFor
            pointing at nothing, so clicking the label did not focus the field.

          No dependency array: React rewrites both attributes on every render, so the
          correction has to run after every commit.
        */
        useEffect(() => {
            const input = inputWrapperRef.current?.querySelector("input");
            if (!input) {
                return;
            }
            input.setAttribute("aria-expanded", String(isOpen));
            if (input.id && input.id !== inputId) {
                setInputId(input.id);
            }
        });

        const matchingOptions = useMemo(() => {
            const normalizedQuery = query.trim().toLowerCase();
            if (!normalizedQuery || query === selectedLabel) {
                return options;
            }
            return options.filter((option) => option.label.toLowerCase().includes(normalizedQuery));
        }, [options, query, selectedLabel]);

        const emitChange = (nextValue: string) => {
            if (!isControlled) {
                setUncontrolledValue(nextValue);
            }
            if (nativeSelectRef.current) {
                nativeSelectRef.current.value = nextValue;
            }
            const nextLabel =
                options.find((option) => option.value === nextValue)?.label ??
                (noResultsOption?.value === nextValue ? noResultsOption.label : nextValue);
            setQuery(nextLabel);
            setIsOpen(false);
            onChange?.({
                target: { name, value: nextValue },
                currentTarget: { name, value: nextValue },
            } as ChangeEvent<HTMLSelectElement>);
        };

        const displayValue = isOpen ? query : selectedLabel;

        return (
            <div
                className={cn(
                    "w-42 flex flex-col",
                    error ? "text-red-500" : "text-inherit",
                    wrapperClassName,
                )}
            >
                <label
                    className={cn("text-sm whitespace-nowrap", hideLabel && "sr-only")}
                    htmlFor={inputId}
                >
                    {label}
                </label>
                <select
                    ref={(element) => {
                        nativeSelectRef.current = element;
                        assignRef(ref, element);
                    }}
                    aria-hidden="true"
                    className="hidden"
                    disabled={disabled}
                    name={name}
                    required={required}
                    tabIndex={-1}
                    value={selectedValue}
                    onBlur={onBlur}
                    onChange={(event) => {
                        emitChange(event.target.value);
                    }}
                >
                    {hasEmptyOption ? null : <option value="">{placeholder}</option>}
                    {options.map(({ label: optionLabel, value: optionValue }) => (
                        <option
                            key={`${optionLabel}-${optionValue || "empty"}`}
                            value={optionValue}
                        >
                            {optionLabel}
                        </option>
                    ))}
                    {noResultsOption &&
                    !options.some((option) => option.value === noResultsOption.value) ? (
                        <option value={noResultsOption.value}>{noResultsOption.label}</option>
                    ) : null}
                </select>
                <Command
                    label={label}
                    shouldFilter={false}
                    className="relative overflow-visible rounded-md border border-input bg-card p-0"
                >
                    <div className="flex items-center gap-2 px-3" ref={inputWrapperRef}>
                        <MagnifyingGlassIcon
                            className="size-4 shrink-0 text-muted-foreground"
                            aria-hidden
                        />
                        <CommandInput
                            aria-describedby={describedBy}
                            aria-invalid={error ? true : ariaInvalid}
                            autoComplete="off"
                            className={cn("h-10", className)}
                            disabled={disabled}
                            id={selectId}
                            placeholder={placeholder}
                            value={displayValue}
                            onBlur={(event) => {
                                window.setTimeout(() => setIsOpen(false), 0);
                                onBlur?.(event as unknown as FocusEvent<HTMLSelectElement>);
                            }}
                            onFocus={() => setIsOpen(true)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter" && isOpen) {
                                    event.preventDefault();
                                    if (matchingOptions.length === 1) {
                                        emitChange(matchingOptions[0].value);
                                    } else if (matchingOptions.length === 0 && noResultsOption) {
                                        emitChange(noResultsOption.value);
                                    }
                                }
                            }}
                            onValueChange={(nextQuery) => {
                                setQuery(nextQuery);
                                setIsOpen(true);
                            }}
                        />
                    </div>
                    {/*
                      Always mounted, because cmdk points the input's aria-controls at
                      this list. Unmounting it while closed leaves that reference
                      dangling, which is a WCAG 4.1.2 failure (axe aria-valid-attr-value).
                    */}
                    <CommandList
                        className={cn(
                            "absolute top-[calc(100%+0.25rem)] left-0 z-50 max-h-52 w-full",
                            "rounded-md border border-input bg-popover p-1 shadow-lg",
                        )}
                        hidden={!isOpen}
                        onMouseDown={(event) => event.preventDefault()}
                    >
                        {matchingOptions.length === 0 && noResultsOption ? (
                            <>
                                <p className="px-2 py-1.5 text-sm text-muted-foreground">
                                    No results found.
                                </p>
                                <CommandItem
                                    key={noResultsOption.value || "empty"}
                                    value={toItemValue(noResultsOption.value)}
                                    onPointerDown={(event) => event.preventDefault()}
                                    onSelect={() => emitChange(noResultsOption.value)}
                                >
                                    {noResultsOption.label}
                                </CommandItem>
                            </>
                        ) : (
                            <CommandEmpty>No results found.</CommandEmpty>
                        )}
                        {matchingOptions.map((option) => (
                            <CommandItem
                                key={option.value || "empty"}
                                value={toItemValue(option.value)}
                                onPointerDown={(event) => event.preventDefault()}
                                onSelect={() => emitChange(option.value)}
                            >
                                {option.label}
                            </CommandItem>
                        ))}
                    </CommandList>
                </Command>
                {error && (
                    <p id={errorId} role="alert" className="text-sm text-red-500">
                        {error}
                    </p>
                )}
            </div>
        );
    },
);
Combobox.displayName = "Combobox";
