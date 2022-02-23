import Slider, { createSliderWithTooltip } from 'rc-slider';
import 'rc-slider/assets/index.css';

const Range = createSliderWithTooltip(Slider.Range);

interface MinMaxSliderProps {
    domain: [number, number];
    value: [number, number];
    onchange: (pos: [number, number]) => void;
    resolution?: number;
}

const overrideHoverCss = `
.rc-slider-handle-dragging.rc-slider-handle-dragging.rc-slider-handle-dragging {
    border-color: #1F4715;
    box-shadow: 0 0 0 5px rgb(31, 71, 21, 0.5);
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
    const handleStyles = { borderColor: '#1F4715' };
    return (
        <div className="w-full h-10">
            <style>{overrideHoverCss}</style>
            <Range
                onChange={(v) => onchange(v as [number, number])}
                value={value}
                trackStyle={[{ backgroundColor: '#1F4715' }]}
                handleStyle={[handleStyles, handleStyles]}
                min={min}
                max={max}
                defaultValue={[min, max]}
                step={resolution}
                marks={marks}
                tipFormatter={(value) => `${value}`}
            />
        </div>
    );
}
