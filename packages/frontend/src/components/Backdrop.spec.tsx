import { RenderResult, render } from '@testing-library/react';
import { Backdrop } from './Backdrop';

let documentBody: RenderResult;
describe('<Backdrop />', () => {
  beforeEach(() => {
    documentBody = render(
      <Backdrop>
        <div>Inside</div>
      </Backdrop>,
    );
  });

  it('shows Child', () => {
    expect(documentBody.getByText('Inside')).toBeInTheDocument();
  });

  // Kind of testing implementation details but useful to remind if changed accidentally
  it('prevents user from scrolling', () => {
    expect(document.body.style.overflowY).toBe('hidden');
    expect(document.body.style.height).toBe('100vh');
    expect(window.scrollY).toBe(0);
  });

  it('resets scroll ability after unmount', () => {
    documentBody.unmount();
    expect(document.body.style.overflowY).toBe('auto');
    expect(document.body.style.height).toBe('auto');
  });
});
