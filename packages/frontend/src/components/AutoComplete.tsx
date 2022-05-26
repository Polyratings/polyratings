/* eslint-disable jsx-a11y/no-noninteractive-element-interactions */
import { useState } from "react";
import { useTailwindBreakpoint } from "@/hooks";

export interface AutoCompleteOption<T> {
    display: string;
    metadata: T;
}

interface AutoCompleteProps<T> {
    onResult: (result: AutoCompleteOption<T>) => void;
    onChange: (partial: string) => void;
    filterFn: (search: string) => AutoCompleteOption<T>[] | Promise<AutoCompleteOption<T>[]>;
    placeholder: string;
    maxDropDownSize: number;
    value: string;
    className?: string;
    disableDropdown: boolean;
}

export function AutoComplete<T>({
    onResult,
    placeholder,
    filterFn,
    onChange: parentOnChange,
    maxDropDownSize,
    value: inputValue,
    className = "",
    disableDropdown,
}: AutoCompleteProps<T>) {
    const [filteredSuggestions, setFilteredSuggestions] = useState<AutoCompleteOption<T>[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);

    // Disable autocomplete on small devices
    const deviceSupportsDropdown = useTailwindBreakpoint({ md: true }, false);

    const onChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const userInput = e.target.value;
        parentOnChange(userInput);

        // Filter our suggestions that don't contain the user's input
        let searchResults = await Promise.resolve(filterFn(userInput));

        if (searchResults.length > maxDropDownSize) {
            searchResults = searchResults.slice(0, maxDropDownSize);
        }

        setActiveSuggestionIndex(-1);
        setFilteredSuggestions(searchResults);
        setShowSuggestions(true);
    };

    const onClick = (clickedValue: AutoCompleteOption<T>) => {
        parentOnChange(clickedValue.display);
        onResult(clickedValue);
        setShowSuggestions(false);
    };

    const unFocus = () => {
        setShowSuggestions(false);
        setActiveSuggestionIndex(-1);
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // eslint-disable-next-line default-case
        switch (e.code) {
            case "ArrowUp":
                e.preventDefault();
                if (activeSuggestionIndex > -1) {
                    setActiveSuggestionIndex(activeSuggestionIndex - 1);
                }
                return;
            case "ArrowDown":
                e.preventDefault();
                if (activeSuggestionIndex < filteredSuggestions.length - 1) {
                    setActiveSuggestionIndex(activeSuggestionIndex + 1);
                }
                return;
            case "Enter": {
                // Not actively over option so let normal submit handler deal with it
                if (activeSuggestionIndex === -1) {
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
                setShowSuggestions(false);
                setActiveSuggestionIndex(-1);
                const searchValue = filteredSuggestions[activeSuggestionIndex];
                parentOnChange(searchValue.display);
                onResult(searchValue);
            }
        }
    };

    // eslint-disable-next-line react/no-unstable-nested-components
    function SuggestionsListComponent() {
        return filteredSuggestions.length ? (
            <ul className="suggestions w-full bg-white border list-none mt-0 pl-0 z-50 relative">
                {filteredSuggestions.map((suggestion, index) => (
                    // TODO: Find if this is ok to ignore since there are keydown listeners where the user will have focus
                    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
                    // eslint-disable-next-line jsx-a11y/click-events-have-key-events
                    <li
                        className={`z-50 cursor-pointer ${
                            activeSuggestionIndex === index ? "bg-gray-300" : ""
                        }`}
                        onMouseEnter={() => setActiveSuggestionIndex(index)}
                        key={suggestion.display}
                        onClick={() => onClick(suggestion)}
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        {suggestion.display}
                    </li>
                ))}
            </ul>
        ) : (
            <div className="no-suggestions" />
        );
    }

    return (
        <div className={`${className} relative`}>
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className="py-1 h-full absolute right-2 top-1/2 transform -translate-y-1/2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
            </svg>
            <input
                className="border-2 border-black p-2 w-full h-full rounded"
                type="text"
                placeholder={placeholder}
                onChange={onChange}
                onKeyDown={onKeyDown}
                onBlur={unFocus}
                value={inputValue}
            />
            <div className="absolute left-0 right-0">
                {showSuggestions && inputValue && deviceSupportsDropdown && !disableDropdown && (
                    <SuggestionsListComponent />
                )}
            </div>
        </div>
    );
}
