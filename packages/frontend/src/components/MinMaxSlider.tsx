import Slider from "rc-slider";
import "rc-slider/assets/index.css";

// const Range = createSliderWithTooltip(Slider.Range);
// const { createSliderWithTooltip } = Slider;

interface MinMaxSliderProps {
    domain: [number, number];
    value: [number, number];
    onchange: (pos: [number, number]) => void;
    resolution?: number;
}

// TODO: Remove hacky media query to reflow on 4k screens
const overrideHoverCss = `
.rc-slider-handle-dragging.rc-slider-handle-dragging.rc-slider-handle-dragging {
    border-color: #1F4715;
    box-shadow: 0 0 0 5px rgb(31, 71, 21, 0.5);
}
@media (min-width: 2500px) { 
    .rc-slider-handle {
        transform: translate(-50%, -25%) !important;
    }
  }

`;

export function MinMaxSlider({
    domain: [min, max],
    value,
    onchange,
    resolution = (max - min) / 20,
}: MinMaxSliderProps) {
    const marks = {
        [min]: min,
        [max]: max,
    };
    const handleStyles = {
        borderColor: "#1F4715",
        width: "0.875rem",
        height: "0.875rem",
    };
    return (
        <div className="w-full h-10">
            <style>{overrideHoverCss}</style>
            <Slider
                range
                allowCross={false}
                onChange={(v) => onchange(v as [number, number])}
                value={value}
                trackStyle={[{ backgroundColor: "#1F4715" }]}
                handleStyle={[handleStyles, handleStyles]}
                min={min}
                max={max}
                defaultValue={[min, max]}
                step={resolution}
                marks={marks}
                // tipFormatter={(value) => `${value}`}
            />
        </div>
    );
}
