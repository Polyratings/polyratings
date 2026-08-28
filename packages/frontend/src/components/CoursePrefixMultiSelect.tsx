import { CheckIcon, MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
    Command,
    CommandEmpty,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { cn } from "@/utils";

interface CoursePrefixMultiSelectProps {
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
}

export function CoursePrefixMultiSelect({
    options,
    selected,
    onChange,
}: CoursePrefixMultiSelectProps) {
    const [query, setQuery] = useState("");
    const [isOpen, setIsOpen] = useState(false);
    const [listBox, setListBox] = useState({ top: 0, left: 0, width: 0 });
    const rootRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLDivElement>(null);
    const selectedSet = useMemo(() => new Set(selected), [selected]);
    const matchingOptions = useMemo(() => {
        const normalizedQuery = query.trim().toLowerCase();
        return options.filter((option) => option.toLowerCase().includes(normalizedQuery));
    }, [options, query]);

    const toggleOption = (option: string) => {
        onChange(
            selectedSet.has(option)
                ? selected.filter((selectedOption) => selectedOption !== option)
                : [...selected, option],
        );
    };

    useLayoutEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        const updatePosition = (event?: Event) => {
            if (event?.target instanceof Node && listRef.current?.contains(event.target)) {
                return;
            }
            const trigger = triggerRef.current;
            if (!trigger) {
                return;
            }
            const rect = trigger.getBoundingClientRect();
            setListBox({
                top: rect.bottom + 4,
                left: rect.left,
                width: rect.width,
            });
        };

        updatePosition();
        window.addEventListener("resize", updatePosition);
        window.addEventListener("scroll", updatePosition, true);
        return () => {
            window.removeEventListener("resize", updatePosition);
            window.removeEventListener("scroll", updatePosition, true);
        };
    }, [isOpen]);

    useLayoutEffect(() => {
        if (!isOpen) {
            return undefined;
        }
        const root = listRef.current;
        if (!root) {
            return undefined;
        }

        const onWheel = (event: WheelEvent) => {
            const list = root.querySelector<HTMLElement>("[data-slot=command-list]");
            if (!list || list.scrollHeight <= list.clientHeight) {
                return;
            }
            event.preventDefault();
            event.stopPropagation();
            list.scrollTop += event.deltaY;
        };

        root.addEventListener("wheel", onWheel, { capture: true, passive: false });
        return () => root.removeEventListener("wheel", onWheel, { capture: true });
    }, [isOpen]);

    // Dismiss when interacting outside — same idea as a native <select> / popover.
    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        const onPointerDown = (event: PointerEvent) => {
            const { target } = event;
            if (!(target instanceof Node)) {
                return;
            }
            if (rootRef.current?.contains(target) || listRef.current?.contains(target)) {
                return;
            }
            setIsOpen(false);
        };

        document.addEventListener("pointerdown", onPointerDown, true);
        return () => document.removeEventListener("pointerdown", onPointerDown, true);
    }, [isOpen]);

    return (
        <div ref={rootRef}>
            <Command
                label="Search course prefixes"
                shouldFilter={false}
                className="relative overflow-visible rounded-md border border-input bg-card p-0"
            >
                <div ref={triggerRef} className="flex items-center gap-2 px-3">
                    <MagnifyingGlassIcon
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden
                    />
                    <CommandInput
                        aria-expanded={isOpen}
                        aria-label="Search course prefixes"
                        autoComplete="off"
                        className="h-10"
                        placeholder="Search prefixes"
                        role="combobox"
                        value={query}
                        onBlur={() => {
                            window.setTimeout(() => {
                                const active = document.activeElement;
                                if (
                                    active instanceof Node &&
                                    (rootRef.current?.contains(active) ||
                                        listRef.current?.contains(active))
                                ) {
                                    return;
                                }
                                setIsOpen(false);
                            }, 0);
                        }}
                        onFocus={() => setIsOpen(true)}
                        onValueChange={setQuery}
                    />
                </div>

                {isOpen &&
                    createPortal(
                        <div
                            ref={listRef}
                            className="pointer-events-auto fixed z-[70]"
                            style={{
                                top: listBox.top,
                                left: listBox.left,
                                width: listBox.width,
                            }}
                        >
                            <CommandList
                                className={cn(
                                    "max-h-52 overscroll-contain touch-pan-y",
                                    "rounded-md border border-input bg-popover p-1 shadow-lg",
                                )}
                            >
                                <CommandEmpty>No course prefixes found.</CommandEmpty>
                                {matchingOptions.map((option) => {
                                    const isSelected = selectedSet.has(option);
                                    return (
                                        <CommandItem
                                            key={option}
                                            aria-selected={isSelected}
                                            value={option}
                                            onPointerDown={(event) => {
                                                // Keep focus in the input so the list stays open
                                                // for multi-select (same pattern as comboboxes).
                                                if (event.pointerType !== "touch") {
                                                    event.preventDefault();
                                                }
                                            }}
                                            onSelect={() => toggleOption(option)}
                                        >
                                            <span
                                                className={cn(
                                                    "flex size-4 items-center justify-center rounded-sm border border-input",
                                                    isSelected &&
                                                        "border-primary bg-primary text-primary-foreground",
                                                )}
                                                aria-hidden
                                            >
                                                {isSelected && (
                                                    <CheckIcon className="size-3" strokeWidth={3} />
                                                )}
                                            </span>
                                            {option}
                                        </CommandItem>
                                    );
                                })}
                            </CommandList>
                        </div>,
                        document.body,
                    )}
            </Command>

            {selected.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2" aria-label="Selected course prefixes">
                    {selected.map((option) => (
                        <button
                            aria-label={`Remove ${option}`}
                            key={option}
                            className={cn(
                                "inline-flex items-center gap-1 rounded-md border border-input bg-muted",
                                "px-2 py-1 text-xs font-medium hover:border-brand/45",
                            )}
                            type="button"
                            onClick={() => toggleOption(option)}
                        >
                            {option}
                            <XMarkIcon className="size-3" aria-hidden />
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
