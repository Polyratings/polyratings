import { render, RenderResult } from '@testing-library/react';
import { MinMaxSlider } from '.';

const setCurrentPos = (pos:[number, number]) => { currentSliderPos = pos; };
let currentSliderPos:[number, number];
let documentBody:RenderResult;
describe('<TwoPosSlider />', () => {
    it('Creates a slider with default resolution', () => {
        currentSliderPos = [0, 10];
        documentBody = render(<MinMaxSlider onchange={setCurrentPos} domain={[0, 10]} value={currentSliderPos} />);
        expect(currentSliderPos).toEqual([0, 10]);
        expect(documentBody.getByText(`${0}`)).toBeInTheDocument();
        expect(documentBody.getByText(`${10}`)).toBeInTheDocument();
    });
});
