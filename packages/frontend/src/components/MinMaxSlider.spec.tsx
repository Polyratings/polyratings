import { render, RenderResult } from "@testing-library/react";
import { MinMaxSlider } from ".";

const setCurrentPos = (pos: [number, number]) => {
    currentSliderPos = pos;
};
let currentSliderPos: [number, number];
let documentBody: RenderResult;
describe("<TwoPosSlider />", () => {
    it("Creates a slider with default resolution", () => {
        currentSliderPos = [0, 10];
        documentBody = render(
            <MinMaxSlider onchange={setCurrentPos} domain={[0, 10]} value={currentSliderPos} />,
        );
        expect(currentSliderPos).toEqual([0, 10]);
        // Can not use getByText since it the popup will also have that value
        expect(documentBody.getAllByText(`${0}`).length > 0);
        expect(documentBody.getAllByText(`${10}`).length > 0);
    });
});
