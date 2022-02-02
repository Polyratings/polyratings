import { RenderResult, waitFor } from '@testing-library/react';
import { Teacher } from '@polyratings/shared';
import userEvent from '@testing-library/user-event';
import { MemoryHistory } from 'history';
import { injector, TeacherService } from '@/services';
import { TeacherCard } from './TeacherCard';
import { renderWithRouter } from '@/test-utils';

const mockTeacher: Teacher = {
  id: 'uuid-v4',
  firstName: 'Ben',
  lastName: 'Fisher',
  department: 'CSC',
  courses: ['CSC 101', 'CSC 202'],
  overallRating: 3.2,
  studentDifficulties: 3.9,
  materialClear: 2.9,
  numEvals: 12,
};

const getComponentDiv = () => documentBody.container.children[0];

let documentBody: RenderResult;
let history: MemoryHistory<unknown>;
describe('<TeacherCard />', () => {
  beforeEach(() => {
    injector.addProviders([{ provide: TeacherService, useValue: { getTeacher: () => {} } }]);
    // Workaround to allow destructuring with declared variables
    ({ documentBody, history } = renderWithRouter(() => <TeacherCard teacher={mockTeacher} />));
  });

  it('Teacher\'s name is displayed', () => {
    expect(documentBody.getByText(mockTeacher.firstName, { exact: false })).toBeInTheDocument();
    expect(documentBody.getByText(mockTeacher.lastName, { exact: false })).toBeInTheDocument();
  });

  it('Teacher\'s overall rating is displayed', () => {
    expect(documentBody.getByText(mockTeacher.overallRating, { exact: false })).toBeInTheDocument();
  });

  it('Teacher\'s department is displayed', () => {
    expect(documentBody.getByText(mockTeacher.department, { exact: false })).toBeInTheDocument();
  });

  it('Teacher\'s number of evaluations is displayed', () => {
    expect(documentBody.getByText(mockTeacher.numEvals, { exact: false })).toBeInTheDocument();
  });

  it('Redirects on click', async () => {
    userEvent.click(getComponentDiv());
    await waitFor(() => expect(history.location.pathname).toBe(`/teacher/${mockTeacher.id}`));
  });

  it('Runs custom handler on click', async () => {
    let clicked = false;
    ({ documentBody, history } = renderWithRouter(() => (
      <TeacherCard
        teacher={mockTeacher}
        beforeNavigation={() => {
          clicked = true;
        }}
      />
    )));
    userEvent.click(getComponentDiv());
    await waitFor(() => expect(clicked).toBe(true));
  });
});
