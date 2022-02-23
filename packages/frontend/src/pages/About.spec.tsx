import { render, RenderResult } from '@testing-library/react';
import { About } from '.';

let aboutPage: RenderResult;
describe('<About />', () => {
    beforeEach(() => {
        aboutPage = render(<About />);
    });

    it('Has Correct Headers', () => {
        aboutPage.getByText('About Polyratings');

        aboutPage.getByText('Our Beginnings');

        aboutPage.getByText('Polyratings 2.0');

        aboutPage.getByText('Polyratings 3.0');
    });
});
