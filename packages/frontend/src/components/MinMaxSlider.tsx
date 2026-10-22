import { Slider } from "@/components/ui/slider";

interface MinMaxSliderProps {
    domain: [number, number];
    value: [number, number];
    onchange: (pos: [number, number]) => void;
    resolution?: number;
}

function formatSliderNumber(value: number, step: number) {
    if (step >= 1) {
        return String(Math.round(value));
    }
    return String(Number(value.toFixed(1)));
}

export function MinMaxSlider({
    domain: [min, max],
    value: [low, high],
    onchange,
    resolution = (max - min) / 20,
}: MinMaxSliderProps) {
    const lowChanged = low > min;
    const highChanged = high < max;

    return (
        <div className="w-full">
            <Slider
                min={min}
                max={max}
                step={resolution}
                value={[low, high]}
                onValueChange={(next) => onchange(next as [number, number])}
                minStepsBetweenThumbs={0}
            />
            <div className="mt-1 flex justify-between text-xs tabular-nums">
                <span
                    aria-live="polite"
                    className={lowChanged ? "font-medium text-foreground" : "text-muted-foreground"}
                >
                    {formatSliderNumber(low, resolution)}
                </span>
                <span
                    aria-live="polite"
                    className={
                        highChanged ? "font-medium text-foreground" : "text-muted-foreground"
                    }
                >
                    {formatSliderNumber(high, resolution)}
                </span>
            </div>
        </div>
    );
}
