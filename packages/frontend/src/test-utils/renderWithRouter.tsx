import { render } from '@testing-library/react';
import { Router } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { ReactNode } from 'react';

export function renderWithRouter(creator: () => ReactNode) {
  const history = createMemoryHistory();
  const documentBody = render(<Router history={history}>{creator()}</Router>);
  return { history, documentBody };
}
