import { cleanup, RenderResult } from '@testing-library/react'
import { MemoryHistory } from 'history';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';
import { RenderInRouter, setWindowSize } from '@/test-utils'
import { SearchWrapper } from '.'
import { useService } from '@/hooks';
import { injector, TeacherService } from '@/services';

let documentBody: RenderResult;
let history: MemoryHistory<unknown>;
describe('<Search />', () => {
    beforeEach(() => {
        ({ history, documentBody } = RenderInRouter(SearchWrapper, '/search/:searchType'));
        history.push('/search/name')
    })

    it('Has main elements', async () => {
        documentBody.getByPlaceholderText('Enter a name')

        const teacherService = useService(TeacherService)
        const firstTeacher = (await teacherService.getAllTeachers())[0]
        await documentBody.findByText(`${firstTeacher.lastName}, ${firstTeacher.firstName}`)

        documentBody.getByText('Filters:')
    })

    it('Searches for classes when requested', async () => {
        await act(async () => history.push('/search/class?term=csc%20101'))

        documentBody.getByPlaceholderText('Enter a class')

        const teacherService = useService(TeacherService)
        const firstTeacher = (await teacherService.searchForTeacher('class', 'CSC 101'))[0]

        await documentBody.findByText(`${firstTeacher.lastName}, ${firstTeacher.firstName}`)

    })

    it('Searches for departments when requested', async () => {
        await act(async () => history.push('/search/department?term=CSC'))

        documentBody.getByPlaceholderText('Enter a department')

        const teacherService = useService(TeacherService)
        const firstTeacher = (await teacherService.searchForTeacher('department', 'CSC'))[0]

        await documentBody.findByText(`${firstTeacher.lastName}, ${firstTeacher.firstName}`)

    })

    it('Restores search value state', async () => {
        const input = documentBody.getByPlaceholderText('Enter a name')
        await userEvent.type(input, 'Lupo', {delay:20})

        const teacherService = useService(TeacherService)

        const firstTeacher = (await teacherService.searchForTeacher('name', 'Lupo'))[0]
        const teacherCard = await documentBody.findByText(`${firstTeacher.lastName}, ${firstTeacher.firstName}`)

        teacherCard.click()

        // Wait time to settle
        await new Promise(resolve => {setTimeout(resolve, 100)})

        // Do not need to go back with history since /teacher does not exist in test router
        await documentBody.findByDisplayValue('Lupo')
    })

    it('Shows mobile filters', async () => {
        const currentWidth = window.innerWidth
        const currenHeight = window.innerHeight
        act(() => setWindowSize(500, 800))
        
        const mobileFilters = await documentBody.findByTestId('mobile-filters')

        userEvent.click(mobileFilters)

        documentBody.getByText('Filters:')

        act(() => setWindowSize(currentWidth, currenHeight))
    })

    it('Handles failure appropriately', async () => {
        // Wait for first version to finish loading
        const teacherService = useService(TeacherService)
        
        const firstTeacher = (await teacherService.getAllTeachers())[0]
        await documentBody.findByText(`${firstTeacher.lastName}, ${firstTeacher.firstName}`)

        cleanup();
        const restoreFn = injector.addProviders([{
            provide:TeacherService,
            useValue: {searchForTeacher: () => {throw new Error('Test failure')}}
        }]);

        ({ history, documentBody } = RenderInRouter(SearchWrapper, '/search/:searchType'));
        history.push('/search/name')
        
        // Wait for async events to settle
        await new Promise(resolve => {setTimeout(resolve)})

        expect(history.entries.at(-1)?.pathname).toBe('/')

        restoreFn()
    })
})
