import { useState } from 'react';
import { useTailwindBreakpoint } from '@/hooks';

interface AutoCompleteProps {
    onResult: (result: string) => void;
    onChange: (partial: string) => void;
    filterFn: (search: string) => string[] | Promise<string[]>;
    placeholder: string;
    maxDropDownSize: number;
    value: string;
    className?: string;
    disableDropdown:boolean
}

export function AutoComplete({
    onResult,
    placeholder,
    filterFn,
    onChange: parentOnChange,
    maxDropDownSize,
    value: inputValue,
    className = '',
    disableDropdown
}: AutoCompleteProps) {
    const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);

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

        setActiveSuggestionIndex(0);
        setFilteredSuggestions(searchResults);
        setShowSuggestions(true);
    };

    const onClick = (e: React.MouseEvent) => {
        const clickedValue = (e.target as HTMLLIElement).innerText;
        parentOnChange(clickedValue);
        onResult(clickedValue);
        setShowSuggestions(false);
    };

    const unFocus = () => {
        // Use delay to allow for clicking
        setTimeout(() => {
            setShowSuggestions(false);
            setActiveSuggestionIndex(0);
        }, 200);
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // eslint-disable-next-line default-case
        switch (e.code) {
            case 'ArrowUp':
                e.preventDefault();
                if (activeSuggestionIndex !== 0) {
                    setActiveSuggestionIndex(activeSuggestionIndex - 1);
                }
                return;
            case 'ArrowDown':
                e.preventDefault();
                if (activeSuggestionIndex < filteredSuggestions.length - 1) {
                    setActiveSuggestionIndex(activeSuggestionIndex + 1);
                }
                return;
            case 'Enter':
                setShowSuggestions(false);
                setActiveSuggestionIndex(0);
                parentOnChange(filteredSuggestions[activeSuggestionIndex]);
                onResult(filteredSuggestions[activeSuggestionIndex]);
        }
    };

    // eslint-disable-next-line react/no-unstable-nested-components
    function SuggestionsListComponent() {
        return filteredSuggestions.length ? (
            <ul className="suggestions w-full bg-white border list-none mt-0 pl-0 z-50 relative">
                {filteredSuggestions.map((suggestion, index) => (
                    <li
                        className={`z-50 cursor-pointer ${
                            activeSuggestionIndex === index ? 'bg-gray-300' : ''
                        }`}
                        onMouseEnter={() => setActiveSuggestionIndex(index)}
                        key={suggestion}
                        onClick={onClick}
                    >
                        {suggestion}
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
