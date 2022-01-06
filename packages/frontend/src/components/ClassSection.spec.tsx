import { ReviewEntry } from '@polyratings/shared';
import { render, RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClassSection } from '.';

const mockReviews:ReviewEntry[] = [
    {
        id: '1',
        profferer: 'a',
        gradeLevel: 'Senior',
        grade: 'A',
        courseType: 'Required',
        rating: 'Sample Rating Text 1',
        department: 'CSC',
        courseNum: '357',
        postDate: '',
    },
    {
        id: '2',
        profferer: 'a',
        gradeLevel: 'Senior',
        grade: 'A',
        courseType: 'Required',
        rating: 'Sample Rating Text 2',
        department: 'CSC',
        courseNum: '357',
        postDate: '',
    },
    {
        id: '3',
        profferer: 'a',
        gradeLevel: 'Senior',
        grade: 'A',
        courseType: 'Required',
        rating: 'Sample Rating Text 3',
        department: 'CSC',
        courseNum: '357',
        postDate: '',
    }
]
const mockTaughtClass = 'CSC 357';

let documentBody: RenderResult;
describe('<ClassSection />', () => {
    beforeEach(() => {
        documentBody = render(<ClassSection reviews={mockReviews} taughtClass={mockTaughtClass}/>)
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

    // it('Does Not Show More if Less than UNEXPANDED_LIMIT', async () => {
    //     documentBody = render(<ClassSection reviews={[]} taughtClass={mockTaughtClass}/>)
    //     const showMoreButton = await documentBody.findByText('Show More')
    //     expect(showMoreButton).not.toBeInTheDocument()
    // }) 

})
