import { useState } from "react";
import { PROFESSOR_TAGS, MAX_PROFESSOR_TAGS_PER_RATING } from "@backend/utils/const";

type TagSelectionVariant =
    | "desktop-primary"
    | "desktop-secondary"
    | "mobile-primary"
    | "mobile-secondary";

export type TagSelectionProps = {
    onChange: (tags: string[]) => void;
    variant: TagSelectionVariant;
};

export function TagSelection({ onChange, variant }: TagSelectionProps) {
    const [tagState, setTagState] = useState(
        PROFESSOR_TAGS.map((tagText) => ({ tagText, selected: false })),
    );

    const selectedTags = tagState.filter(({ selected }) => selected);

    const variantMap: Record<TagSelectionVariant, SelectableTagVariant> = {
        "mobile-primary": "primary",
        "mobile-secondary": "secondary",
        "desktop-primary": "primary",
        "desktop-secondary": "secondary",
    };

    return (
        <>
            {variant.startsWith("desktop") && (
                <h2 className="font-bold text-2xl mb-4">
                    Select up to {MAX_PROFESSOR_TAGS_PER_RATING} tags (Optional)
                </h2>
            )}
            {variant.startsWith("mobile") && (
                <h3 className="text-xs mb-2">
                    Select up to {MAX_PROFESSOR_TAGS_PER_RATING} tags (Optional)
                </h3>
            )}
            <div className="flex gap-2 flex-wrap mb-4">
                {tagState.map((tag, i) => (
                    <SelectableTag
                        variant={variantMap[variant]}
                        key={tag.tagText}
                        disabled={
                            selectedTags.length === MAX_PROFESSOR_TAGS_PER_RATING && !tag.selected
                        }
                        {...tag}
                        onClick={() => {
                            const copy = [...tagState];
                            copy[i].selected = !copy[i].selected;
                            onChange(
                                copy
                                    .filter(({ selected }) => selected)
                                    .map(({ tagText }) => tagText),
                            );
                            setTagState(copy);
                        }}
                    />
                ))}
            </div>
        </>
    );
}

type SelectableTagVariant = "primary" | "secondary";

interface SelectableTagProps extends React.ComponentProps<"button"> {
    variant: SelectableTagVariant;
    tagText: string;
    selected: boolean;
}

function SelectableTag({
    variant,
    tagText,
    selected,
    className: buttonClassName,
    disabled,
    ...buttonProps
}: SelectableTagProps) {
    const selectedVariantMap = {
        primary: "bg-cal-poly-light-green border-[0.1rem]",
        secondary: "border-cal-poly-gold border-2 font-bold bg-white",
    };

    const unselectedVariantMap = {
        primary: `${disabled ? "bg-gray-100" : "bg-white"} border-cal-poly-green border-[0.1rem]`,
        secondary: `${disabled ? "bg-gray-300" : "bg-white"} border-2`,
    };

    const pseudoExpander =
        "after:content-[attr(title)] after:block after:font-bold after:h-1 after:text-transparent after:overflow-hidden";

    const className = selected
        ? `${pseudoExpander} font-semibold ${selectedVariantMap[variant]} ${buttonClassName}`
        : `${pseudoExpander} font-[350] ${unselectedVariantMap[variant]} ${buttonClassName}`;

    return (
        <button
            type="button"
            {...buttonProps}
            title={tagText}
            disabled={disabled && !selected}
            // Use different y padding to account for weird font height
            className={`${className} pb-1 pt-[.313rem] px-2 h-9 text-cal-poly-green rounded-lg font-nunito`}
        >
            {tagText}
        </button>
    );
}
