import { Review } from '@polyratings/shared';
import { render, RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClassSection } from '.';

const mockReviews:Review[] = [
    {
        gradeLevel: 'Senior',
        grade: 'A',
        courseType: 'Major (Required)',
        rating: 'Sample Rating Text 1',
        postDate: new Date(),
    },
    {
        gradeLevel: 'Senior',
        grade: 'A',
        courseType: 'Major (Required)',
        rating: 'Sample Rating Text 2',
        postDate: new Date()
    },
    {
        gradeLevel: 'Senior',
        grade: 'A',
        courseType: 'Major (Required)',
        rating: 'Sample Rating Text 3',
        postDate: new Date(),
    }
]
const mockTaughtClass = 'CSC 357';

let documentBody: RenderResult;
describe('<ClassSection />', () => {
    beforeEach(() => {
        documentBody = render(<ClassSection reviews={mockReviews} taughtClass={mockTaughtClass} disableDropDown={false}/>)
    })

    it('Displays class name', () => {
        expect(documentBody.getByText(mockTaughtClass)).toBeInTheDocument()
    })

    it('Shows text from first rating', () => {
        expect(documentBody.getByText(mockReviews[0].rating)).toBeInTheDocument()
    })

    it('Can Click Show More and Turns Into Show Less', async () => {
        const showMoreButton = documentBody.getByText('Show More')
        userEvent.click(showMoreButton)

        const showLessButton = await documentBody.findByText('Show Less')
        userEvent.click(showLessButton)

        const showMoreButtonReset = await documentBody.findByText('Show More')
        expect(showMoreButtonReset).toBeInTheDocument()
    })

})
