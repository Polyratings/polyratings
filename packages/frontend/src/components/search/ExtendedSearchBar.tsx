import { ChevronRightIcon } from "@heroicons/react/24/solid";
import { SearchBarProps, SearchBase } from "./SearchBar";
import { SearchToggle } from "./SearchToggle";
import { Button } from "@/components/forms/Button";

export function ExtendedSearchBar({
    value,
    onChange,
    disableAutoComplete = false,
    className,
}: SearchBarProps) {
    const toggleSearchType = () => {
        if (value.type === "class") {
            onChange({ type: "name", searchValue: value.searchValue });
        } else {
            onChange({ type: "class", searchValue: value.searchValue });
        }
    };

    return (
        <SearchBase
            className={className}
            searchType={value.type}
            value={value}
            onChange={onChange}
            disableAutoComplete={disableAutoComplete}
            LeftSlot={<SearchToggle searchType={value.type} onClick={toggleSearchType} />}
            RightSlot={
                <Button className="py-1! rounded-l-none rounded-r-full px-1" type="submit">
                    <ChevronRightIcon className="w-8 h-8" />
                </Button>
            }
        />
    );
}
