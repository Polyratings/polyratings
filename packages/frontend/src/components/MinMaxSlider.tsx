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

function isAtBound(value: number, bound: number, step: number) {
    return Math.abs(value - bound) < Math.max(step / 2, 1e-6);
}

function thumbPercent(value: number, min: number, max: number) {
    if (max === min) {
        return 0;
    }
    return ((value - min) / (max - min)) * 100;
}

export function MinMaxSlider({
    domain: [min, max],
    value: [low, high],
    onchange,
    resolution = (max - min) / 20,
}: MinMaxSliderProps) {
    const showLow = !isAtBound(low, min, resolution);
    const showHigh = !isAtBound(high, max, resolution);

    return (
        <div className="w-full">
            <div className="relative h-4 text-xs font-medium tabular-nums text-foreground">
                {showLow && (
                    <span
                        className="absolute top-0 -translate-x-1/2"
                        style={{ left: `${thumbPercent(low, min, max)}%` }}
                    >
                        {formatSliderNumber(low, resolution)}
                    </span>
                )}
                {showHigh && (
                    <span
                        className="absolute top-0 -translate-x-1/2"
                        style={{ left: `${thumbPercent(high, min, max)}%` }}
                    >
                        {formatSliderNumber(high, resolution)}
                    </span>
                )}
            </div>
            <Slider
                min={min}
                max={max}
                step={resolution}
                value={[low, high]}
                onValueChange={(next) => onchange(next as [number, number])}
                minStepsBetweenThumbs={0}
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground tabular-nums">
                <span>{formatSliderNumber(min, resolution)}</span>
                <span>{formatSliderNumber(max, resolution)}</span>
            </div>
        </div>
    );
}
