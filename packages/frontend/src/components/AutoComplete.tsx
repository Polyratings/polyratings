import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useTailwindBreakpoint } from "@/hooks";
import { cn } from "@/utils";
import { Command, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export interface AutoCompleteOption<U> {
    label: string;
    value: U;
}

export interface AutoCompleteProps<T, U> {
    onChange: (val: { inputValue: string; selection?: U }) => void;
    filterFn: (items: T[], inputValue: string) => AutoCompleteOption<U>[];
    items: T[];
    placeholder: string;
    label: string;
    inputValue: string;
    className?: string;
    inputClassName?: string;
    listClassName?: string;
    /** Optional id for associating an external label. */
    inputId?: string;
    disableDropdown: boolean;
    /** Show suggestions below `md` as well (navbar search panel). */
    forceDropdown?: boolean;
    /** Focus the combobox on mount (mobile overlay). */
    focusOnMount?: boolean;
    /**
     * Stretch the suggestion list to the nearest `form` width (full search pill),
     * with larger tap targets — used by the mobile/truncated search bar.
     */
    listMatchForm?: boolean;
}

const ROW_HEIGHT_REM = 2;
const TOUCH_ROW_HEIGHT_REM = 3.25;

export function AutoComplete<T, U>({
    placeholder,
    filterFn,
    items,
    onChange: parentOnChange,
    className = "",
    inputClassName = "",
    listClassName = "",
    inputId,
    disableDropdown,
    forceDropdown = false,
    focusOnMount = false,
    listMatchForm = false,
    label,
    inputValue,
}: AutoCompleteProps<T, U>) {
    const listRef = useRef<HTMLDivElement | null>(null);
    const listboxId = useId();
    const generatedInputId = useId();
    const resolvedInputId = inputId ?? generatedInputId;
    const [highlighted, setHighlighted] = useState("");
    const [allowHighlight, setAllowHighlight] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
        if (!focusOnMount) {
            return;
        }
        // Intentional dialog-pattern focus for the mobile search overlay (no focusOnMount attr).
        const id = window.setTimeout(() => {
            document.getElementById(resolvedInputId)?.focus();
            setIsFocused(true);
        }, 0);
        return () => window.clearTimeout(id);
    }, [focusOnMount, resolvedInputId]);

    const remMultiplier =
        parseFloat(window.getComputedStyle(document.body).getPropertyValue("font-size") || "16") /
        16;
    const rowHeightRem = listMatchForm ? TOUCH_ROW_HEIGHT_REM : ROW_HEIGHT_REM;

    const filteredItems = useMemo(() => filterFn(items, inputValue), [filterFn, items, inputValue]);

    // oxlint-disable-next-line react/incompatible-library -- TanStack Virtual rowVirtualizer is intentionally used here
    const rowVirtualizer = useVirtualizer({
        estimateSize: () => rowHeightRem * 16 * remMultiplier,
        count: filteredItems.length,
        getScrollElement: () => listRef.current,
        overscan: 2,
    });

    const deviceSupportsDropdown = useTailwindBreakpoint({ md: true }, false);
    const dropdownVisible =
        !disableDropdown &&
        (forceDropdown || deviceSupportsDropdown) &&
        isFocused &&
        filteredItems.length > 0;

    const selectItem = (item: AutoCompleteOption<U>) => {
        parentOnChange({
            inputValue: item.label,
            selection: item.value,
        });
        setHighlighted("");
        setAllowHighlight(false);
        setIsFocused(false);
    };

    return (
        <Command
            label={label}
            shouldFilter={false}
            value={allowHighlight ? highlighted : ""}
            onValueChange={setHighlighted}
            className={cn(
                // `static` so the list can position against the parent search `form`.
                listMatchForm ? "static" : "relative",
                "overflow-visible rounded-md bg-transparent p-0",
                className,
            )}
            onKeyDown={(event) => {
                if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                    setAllowHighlight(true);
                }
                if (event.key === "Enter" && !allowHighlight) {
                    event.preventDefault();
                    event.currentTarget.closest("form")?.requestSubmit();
                }
            }}
        >
            <CommandInput
                id={resolvedInputId}
                value={inputValue}
                onValueChange={(nextValue) => {
                    setAllowHighlight(false);
                    setHighlighted("");
                    parentOnChange({ inputValue: nextValue });
                }}
                placeholder={placeholder}
                aria-label={label}
                aria-expanded={dropdownVisible}
                aria-controls={dropdownVisible ? listboxId : undefined}
                // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- cmdk CommandInput renders a styled combobox input
                role="combobox"
                autoComplete="off"
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                    // Pointer selection uses preventDefault on the item so this only
                    // runs for real focus loss (tab away, click outside).
                    window.setTimeout(() => setIsFocused(false), 0);
                }}
                className={cn(
                    // Match Input form-field chrome; SearchBar overrides for pill/hero sizing.
                    "h-10 w-full rounded-md border border-input bg-card px-4 py-2 leading-normal",
                    "placeholder:text-muted-foreground",
                    "focus-visible:border-brand focus-visible:bg-field-active focus-visible:ring-3 focus-visible:ring-ring/35",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "dark:bg-secondary",
                    inputClassName,
                )}
            />

            <CommandList
                className={cn(
                    "absolute z-50 max-h-none overflow-visible border-0 p-0 shadow-none",
                    listMatchForm
                        ? "top-[calc(100%+0.5rem)] right-0 left-0 w-auto min-w-0"
                        : "top-[calc(100%+0.25rem)] left-0 w-full min-w-72",
                    !dropdownVisible && "hidden",
                )}
                onMouseDown={(event) => {
                    // Keep input focus so the list is not hidden before the click selects.
                    event.preventDefault();
                }}
            >
                <div
                    id={listboxId}
                    ref={listRef}
                    className={cn(
                        "overflow-y-auto overscroll-contain",
                        "rounded-md border border-input bg-popover shadow-lg",
                        listMatchForm ? "max-h-52 p-1.5 text-lg" : "max-h-52 p-1 text-sm",
                        listClassName,
                    )}
                >
                    <div
                        className="relative w-full"
                        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
                    >
                        {rowVirtualizer.getVirtualItems().map((virtualElement) => {
                            const item = filteredItems[virtualElement.index];
                            return (
                                <CommandItem
                                    key={`${item.label}${String(item.value)}`}
                                    value={`${item.label}__${String(item.value)}`}
                                    className={cn(
                                        "absolute top-0 left-0 w-full",
                                        listMatchForm &&
                                            "min-h-13 px-3.5 text-lg leading-snug font-medium md:text-lg",
                                    )}
                                    style={{
                                        height: `${virtualElement.size}px`,
                                        transform: `translateY(${virtualElement.start}px)`,
                                    }}
                                    onPointerDown={(event) => {
                                        event.preventDefault();
                                    }}
                                    onSelect={() => selectItem(item)}
                                >
                                    {item.label}
                                </CommandItem>
                            );
                        })}
                    </div>
                </div>
            </CommandList>
        </Command>
    );
}
