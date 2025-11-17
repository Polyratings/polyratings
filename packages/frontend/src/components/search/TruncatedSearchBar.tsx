import { MagnifyingGlassIcon } from "@heroicons/react/24/solid";
import { SearchBarProps, SearchBase } from "./SearchBar";

export function TruncatedSearchBar({
    onChange,
    disableAutoComplete = false,
    className,
    value,
}: SearchBarProps) {
    return (
        <SearchBase
            className={className}
            searchType="name"
            onChange={onChange}
            value={value}
            disableAutoComplete={disableAutoComplete}
            inputClassName="pl-0"
            LeftSlot={<div className="w-5 h-10 bg-white rounded-l-full" />}
            RightSlot={
                <div className="py-1 px-2 text-cal-poly-green rounded-l-none rounded-r-full bg-white">
                    <MagnifyingGlassIcon className="w-8 h-8" />
                </div>
            }
        />
    );
}
