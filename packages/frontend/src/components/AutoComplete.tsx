import { useCallback, useRef, useState } from "react";
import { useCombobox } from "downshift";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useTailwindBreakpoint } from "@/hooks";

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
    initialValue: string;
    className?: string;
    inputClassName?: string;
    disableDropdown: boolean;
    search: (inputValue: string) => void;
}

export function AutoComplete<T, U>({
    placeholder,
    filterFn,
    items,
    onChange: parentOnChange,
    className = "",
    inputClassName = "",
    disableDropdown,
    label,
    initialValue,
    search,
}: AutoCompleteProps<T, U>) {
    const [filteredItems, setFilteredItems] = useState(filterFn(items, ""));
    const listRef = useRef<HTMLUListElement | null>(null);

    const remMultiplier =
        parseFloat(window.getComputedStyle(document.body).getPropertyValue("font-size") || "16") /
        16;

    const rowVirtualizer = useVirtualizer({
        estimateSize: useCallback(() => 28 * remMultiplier, []),
        count: filteredItems.length,
        getScrollElement: () => listRef.current,
        overscan: 2,
    });

    // Disable autocomplete on small devices
    const deviceSupportsDropdown = useTailwindBreakpoint({ md: true }, false);

    const { isOpen, getMenuProps, getInputProps, highlightedIndex, getItemProps } = useCombobox({
        stateReducer(state, actionAndChanges) {
            const { changes, type } = actionAndChanges;
            switch (type) {
                case useCombobox.stateChangeTypes.InputClick:
                    return {
                        ...changes,
                        isOpen: state.isOpen, // do not toggle the menu when input is clicked.
                    };
                default:
                    return changes;
            }
        },
        onInputValueChange({ inputValue }) {
            const filteredItems = filterFn(items, inputValue ?? "");
            setFilteredItems(filteredItems);
            parentOnChange({
                inputValue: inputValue ?? "",
            });
        },
        onSelectedItemChange({ selectedItem, inputValue }) {
            if (selectedItem) {
                parentOnChange({
                    inputValue: inputValue ?? "",
                    selection: selectedItem.value,
                });
            }
        },
        items: filteredItems,
        itemToString(item) {
            return item ? item.label : "";
        },
        onHighlightedIndexChange({ highlightedIndex }) {
            rowVirtualizer.scrollToIndex(highlightedIndex ?? 0);
        },
        initialInputValue: initialValue,
    });
    return (
        <div className={`relative ${className}`}>
            <input
                aria-label={label}
                className={`p-2 w-full h-full outline-none ${inputClassName}`}
                type="text"
                placeholder={placeholder}
                {...getInputProps({
                    onKeyDown: (event) => {
                        if (event.key === "Enter") {
                            search(event.currentTarget.value);
                            event.preventDefault();
                        }
                    },
                })}
            />

            <ul
                {...getMenuProps({ ref: listRef })}
                className={`absolute top-full left-0 w-full bg-white shadow-xl max-h-28 overflow-y-auto ${
                    isOpen && !disableDropdown && deviceSupportsDropdown
                        ? "border border-black"
                        : "border-none"
                }`}
            >
                {isOpen && !disableDropdown && deviceSupportsDropdown && (
                    <div style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
                        {rowVirtualizer.getVirtualItems().map((virtualElement) => {
                            const item = filteredItems[virtualElement.index];
                            return (
                                <li
                                    key={`${item.label}${item.value}`}
                                    className={`pl-1 absolute top-0 left-0 w-full ${
                                        highlightedIndex === virtualElement.index
                                            ? "bg-gray-300"
                                            : ""
                                    }`}
                                    style={{
                                        height: `${virtualElement.size}px`,
                                        transform: `translateY(${virtualElement.start}px)`,
                                    }}
                                    {...getItemProps({ item, index: virtualElement.index })}
                                >
                                    {item.label}
                                </li>
                            );
                        })}
                    </div>
                )}
            </ul>
        </div>
    );
}
