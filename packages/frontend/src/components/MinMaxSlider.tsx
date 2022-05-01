import Slider, { SliderProps } from "rc-slider";
import "rc-slider/assets/index.css";
import { cloneElement } from "react";

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
                handleRender={handleRender}
            />
        </div>
    );
}

const handleRender: SliderProps["handleRender"] = (node, props) => {
    const { value, dragging } = props;
    const popup = (
        <div
            // Have to set key since it is force inserted as a child to an element
            key="custom-slider-popup-key"
            className={`absolute flex flex-col items-center	bottom-[0.6rem] left-[0.3rem] transform -translate-x-1/2 ${
                dragging ? "opacity-1" : "opacity-0"
            }`}
        >
            <div className=" bg-gray-900 text-white p-1 text-sm rounded min-w-[1.5rem] text-center">
                {value}
            </div>
            <div className="w-3 overflow-hidden inline-block">
                <div className=" h-2 w-2 bg-gray-900 -rotate-45 transform origin-top-left" />
            </div>
        </div>
    );
    const modifiedHandle = cloneElement(node, {
        ...node.props,
        // @ts-expect-error Clone element does not like me explicity setting class name and children
        className: `${node.props.className ?? ""} relative`,
        children: [popup],
    });
    return <div className="my-test-name">{modifiedHandle}</div>;
};
