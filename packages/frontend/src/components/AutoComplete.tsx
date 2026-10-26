import { useId, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
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
    /** Show popover suggestions below `md` (desktop navbar mid-slot). */
    forceDropdown?: boolean;
    /**
     * `popover` — absolutely positioned dropdown under the input (desktop).
     * `inline` — in-flow list that fills remaining flex space (mobile full-screen search).
     */
    listPlacement?: "popover" | "inline";
    /** Rendered left of the input in the inline header row (e.g. back button). */
    inputLeading?: ReactNode;
    /** Launch-pad inputs that open full-screen search instead of typing in place. */
    inputReadOnly?: boolean;
    onInputFocus?: () => void;
    /** Set by mobile search so openSearch can focus synchronously on tap. */
    inputRef?: RefObject<HTMLInputElement | null>;
}

/** Fixed row heights (16px root) — avoids getComputedStyle on every render. */
const ROW_SIZE_PX = 32;
const TOUCH_ROW_SIZE_PX = 52;

export function AutoComplete<T, U>(props: AutoCompleteProps<T, U>) {
    if (props.listPlacement === "inline") {
        return <InlineAutoComplete {...props} />;
    }
    return <PopoverAutoComplete {...props} />;
}

/**
 * Mobile full-screen search: plain input + virtualized list.
 * Intentionally not cmdk — Command.Item scrollIntoView jumps the iOS keyboard on the
 * first keystroke when results mount.
 */
function InlineAutoComplete<T, U>({
    placeholder,
    filterFn,
    items,
    onChange: parentOnChange,
    className = "",
    inputClassName = "",
    listClassName = "",
    inputId,
    disableDropdown,
    inputLeading,
    label,
    inputValue,
    inputRef,
}: AutoCompleteProps<T, U>) {
    const listRef = useRef<HTMLDivElement | null>(null);
    const listboxId = useId();
    const generatedInputId = useId();
    const resolvedInputId = inputId ?? generatedInputId;

    const filteredItems = useMemo(() => {
        if (disableDropdown || inputValue.trim().length === 0) {
            return [];
        }
        return filterFn(items, inputValue);
    }, [disableDropdown, filterFn, items, inputValue]);

    // oxlint-disable-next-line react/incompatible-library -- TanStack Virtual is intentional here
    const rowVirtualizer = useVirtualizer({
        estimateSize: () => TOUCH_ROW_SIZE_PX,
        count: filteredItems.length,
        getScrollElement: () => listRef.current,
        overscan: 6,
    });

    const hasQuery = inputValue.trim().length > 0;
    const showClear = inputValue.length > 0;
    const listVisible = !disableDropdown && filteredItems.length > 0;
    const showEmpty = !disableDropdown && hasQuery && filteredItems.length === 0;

    const selectItem = (item: AutoCompleteOption<U>) => {
        parentOnChange({
            inputValue: item.label,
            selection: item.value,
        });
    };

    return (
        <div
            className={cn(
                "flex min-h-0 flex-1 flex-col overflow-hidden rounded-md bg-transparent p-0",
                className,
            )}
        >
            <div
                className={cn(
                    "flex shrink-0 items-center gap-1 px-3 pt-3 pb-3",
                    inputLeading ? "pr-2" : "px-4",
                )}
            >
                {inputLeading}
                <div className="relative min-w-0 flex-1">
                    <input
                        ref={inputRef}
                        id={resolvedInputId}
                        type="text"
                        enterKeyHint="search"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        value={inputValue}
                        onChange={(event) => {
                            parentOnChange({ inputValue: event.target.value });
                        }}
                        placeholder={placeholder}
                        aria-label={label}
                        aria-expanded={listVisible}
                        aria-controls={listVisible ? listboxId : undefined}
                        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- search combobox pattern
                        role="combobox"
                        className={cn(
                            "h-12 w-full rounded-full border-0 bg-muted py-2 text-lg leading-normal shadow-none",
                            "pl-4 text-foreground placeholder:text-muted-foreground outline-hidden",
                            showClear ? "pr-12" : "pr-4",
                            "focus-visible:border-transparent focus-visible:bg-muted focus-visible:ring-0",
                            "disabled:cursor-not-allowed disabled:opacity-50",
                            "dark:bg-muted dark:focus-visible:bg-muted",
                            // Prevent iOS from scrolling the focused field when the list paints.
                            "[scroll-margin:0] [scroll-padding:0]",
                            inputClassName,
                        )}
                    />
                    {showClear ? (
                        <button
                            type="button"
                            aria-label="Clear search"
                            className={cn(
                                "absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center",
                                "rounded-full text-muted-foreground",
                                "hover:bg-foreground/10 hover:text-foreground",
                                "focus-visible:bg-foreground/10 focus-visible:outline-2",
                                "focus-visible:outline-offset-2 focus-visible:outline-ring",
                            )}
                            onMouseDown={(event) => {
                                // Keep the field focused so the soft keyboard stays up.
                                event.preventDefault();
                            }}
                            onClick={() => {
                                parentOnChange({ inputValue: "" });
                                inputRef?.current?.focus({ preventScroll: true });
                            }}
                        >
                            <XMarkIcon className="size-5" aria-hidden />
                        </button>
                    ) : null}
                </div>
            </div>

            {showEmpty ? (
                <output className="flex min-h-13 items-center px-4 text-lg leading-snug font-medium text-muted-foreground">
                    No professors found
                </output>
            ) : null}

            {/* Flex slot always mounted so the first result paint does not reflow the input. */}
            <div
                id={listboxId}
                ref={listRef}
                // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- combobox listbox pattern; not a native select
                role="listbox"
                aria-label={label}
                className={cn(
                    "min-h-0 flex-1 overflow-y-auto overscroll-contain border-0 bg-transparent p-0 text-lg shadow-none",
                    listClassName,
                )}
            >
                {listVisible ? (
                    <div
                        className="relative w-full"
                        style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
                    >
                        {rowVirtualizer.getVirtualItems().map((virtualElement) => {
                            const item = filteredItems[virtualElement.index];
                            return (
                                <button
                                    key={`${item.label}${String(item.value)}`}
                                    type="button"
                                    // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- combobox option pattern
                                    role="option"
                                    aria-selected={false}
                                    className={cn(
                                        "absolute top-0 left-0 flex w-full cursor-pointer items-center",
                                        "min-h-13 rounded-none border-b border-border/60 px-4 text-left",
                                        "text-lg leading-snug font-medium text-foreground",
                                        "hover:bg-accent hover:text-accent-foreground",
                                        "focus-visible:bg-accent focus-visible:outline-hidden",
                                    )}
                                    style={{
                                        height: `${virtualElement.size}px`,
                                        transform: `translateY(${virtualElement.start}px)`,
                                    }}
                                    onMouseDown={(event) => {
                                        // Keep the input focused; do not dismiss the keyboard.
                                        event.preventDefault();
                                    }}
                                    onClick={() => selectItem(item)}
                                >
                                    {item.label}
                                </button>
                            );
                        })}
                    </div>
                ) : null}
            </div>
        </div>
    );
}

function PopoverAutoComplete<T, U>({
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
    inputReadOnly = false,
    onInputFocus,
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

    const filteredItems = useMemo(() => {
        if (disableDropdown) {
            return [];
        }
        return filterFn(items, inputValue);
    }, [disableDropdown, filterFn, items, inputValue]);

    // oxlint-disable-next-line react/incompatible-library -- TanStack Virtual is intentional here
    const rowVirtualizer = useVirtualizer({
        estimateSize: () => ROW_SIZE_PX,
        count: filteredItems.length,
        getScrollElement: () => listRef.current,
        overscan: 6,
    });

    const deviceSupportsDropdown = useTailwindBreakpoint({ md: true }, false);
    const listVisible =
        !disableDropdown &&
        filteredItems.length > 0 &&
        (forceDropdown || deviceSupportsDropdown) &&
        isFocused;

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
            className={cn("relative overflow-visible rounded-md bg-transparent p-0", className)}
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
                aria-expanded={listVisible}
                aria-controls={listVisible ? listboxId : undefined}
                // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- cmdk CommandInput renders a styled combobox input
                role="combobox"
                autoComplete="off"
                readOnly={inputReadOnly}
                onFocus={() => {
                    setIsFocused(true);
                    onInputFocus?.();
                }}
                onBlur={() => {
                    window.setTimeout(() => setIsFocused(false), 0);
                }}
                className={cn(
                    inputReadOnly && "cursor-pointer caret-transparent",
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
                    "absolute top-[calc(100%+0.25rem)] left-0 z-50 w-full min-w-72 overflow-visible",
                    "max-h-none border-0 p-0 shadow-none",
                    !listVisible && "hidden",
                )}
                onMouseDown={(event) => {
                    event.preventDefault();
                }}
            >
                <div
                    id={listboxId}
                    ref={listRef}
                    className={cn(
                        "max-h-52 overflow-y-auto overscroll-contain rounded-md border border-input bg-popover p-1 text-sm shadow-lg",
                        listClassName,
                    )}
                >
                    {listVisible ? (
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
                    ) : null}
                </div>
            </CommandList>
        </Command>
    );
}
