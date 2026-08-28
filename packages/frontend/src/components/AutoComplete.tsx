import { useMemo, useRef, useState } from "react";
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
    disableDropdown: boolean;
}

const ROW_HEIGHT_REM = 2;

export function AutoComplete<T, U>({
    placeholder,
    filterFn,
    items,
    onChange: parentOnChange,
    className = "",
    inputClassName = "",
    disableDropdown,
    label,
    inputValue,
}: AutoCompleteProps<T, U>) {
    const listRef = useRef<HTMLDivElement | null>(null);
    const [highlighted, setHighlighted] = useState("");
    const [allowHighlight, setAllowHighlight] = useState(false);
    const [isFocused, setIsFocused] = useState(false);

    const remMultiplier =
        parseFloat(window.getComputedStyle(document.body).getPropertyValue("font-size") || "16") /
        16;

    const filteredItems = useMemo(() => filterFn(items, inputValue), [filterFn, items, inputValue]);

    const rowVirtualizer = useVirtualizer({
        estimateSize: () => ROW_HEIGHT_REM * 16 * remMultiplier,
        count: filteredItems.length,
        getScrollElement: () => listRef.current,
        overscan: 2,
    });

    const deviceSupportsDropdown = useTailwindBreakpoint({ md: true }, false);
    const dropdownVisible =
        !disableDropdown && deviceSupportsDropdown && isFocused && filteredItems.length > 0;

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
                "relative overflow-visible rounded-none bg-transparent p-0 text-lg",
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
                value={inputValue}
                onValueChange={(nextValue) => {
                    setAllowHighlight(false);
                    setHighlighted("");
                    parentOnChange({ inputValue: nextValue });
                }}
                placeholder={placeholder}
                aria-label={label}
                aria-expanded={dropdownVisible}
                role="combobox"
                autoComplete="off"
                onFocus={() => setIsFocused(true)}
                onBlur={() => {
                    // Pointer selection uses preventDefault on the item so this only
                    // runs for real focus loss (tab away, click outside).
                    window.setTimeout(() => setIsFocused(false), 0);
                }}
                className={cn(
                    "h-full bg-card p-2 text-lg leading-normal outline-hidden placeholder:text-lg",
                    inputClassName,
                )}
            />

            <CommandList
                className={cn(
                    "absolute top-[calc(100%+0.25rem)] left-0 z-50 w-full max-h-none overflow-visible border-0 p-0 shadow-none",
                    !dropdownVisible && "hidden",
                )}
                onMouseDown={(event) => {
                    // Keep input focus so the list is not hidden before the click selects.
                    event.preventDefault();
                }}
            >
                <div
                    ref={listRef}
                    className={cn(
                        "max-h-52 overflow-y-auto overscroll-contain text-sm",
                        "rounded-md border border-input bg-popover p-1 shadow-lg",
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
                                    key={`${item.label}${item.value}`}
                                    value={`${item.label}__${String(item.value)}`}
                                    className="absolute top-0 left-0 w-full"
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
