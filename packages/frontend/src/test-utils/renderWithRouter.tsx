import { render } from '@testing-library/react';
import { Router, Route } from 'react-router-dom';
import { createMemoryHistory } from 'history';
import { ReactNode } from 'react';

export function renderWithRouter(creator: () => ReactNode) {
  const history = createMemoryHistory();
  const documentBody = render(<Router history={history}>{creator()}</Router>);
  return { history, documentBody };
}

export function RenderInRouter(component:React.ComponentType<any>, path:string) {
  const history = createMemoryHistory();
  const documentBody = render(
    <Router history={history}>
        <Route path={path} component={component}/>
    </Router>
  );
  return { history, documentBody };
}
