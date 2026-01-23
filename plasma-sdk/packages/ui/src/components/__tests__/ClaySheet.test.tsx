import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClaySheet, ClaySheetFooter } from '../components/ClaySheet';

describe('ClaySheet', () => {
  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('does not render when isOpen is false', () => {
    render(<ClaySheet isOpen={false}><p>Sheet content</p></ClaySheet>);
    expect(screen.queryByText('Sheet content')).not.toBeInTheDocument();
  });

  it('renders when isOpen is true', () => {
    render(<ClaySheet isOpen><p>Sheet content</p></ClaySheet>);
    expect(screen.getByText('Sheet content')).toBeInTheDocument();
  });

  it('renders with correct accessibility attributes', () => {
    render(<ClaySheet isOpen><p>Content</p></ClaySheet>);
    const sheet = screen.getByRole('dialog');
    expect(sheet).toBeInTheDocument();
    expect(sheet).toHaveAttribute('aria-modal', 'true');
  });

  it('renders with correct position', () => {
    const { rerender } = render(<ClaySheet isOpen position="right"><p>Content</p></ClaySheet>);
    let sheet = document.querySelector('.fixed.inset-y-0.right-0');
    expect(sheet).toBeInTheDocument();

    rerender(<ClaySheet isOpen position="left"><p>Content</p></ClaySheet>);
    sheet = document.querySelector('.fixed.inset-y-0.left-0');
    expect(sheet).toBeInTheDocument();

    rerender(<ClaySheet isOpen position="bottom"><p>Content</p></ClaySheet>);
    sheet = document.querySelector('.fixed.inset-x-0.bottom-0');
    expect(sheet).toBeInTheDocument();
  });

  it('applies correct size styles for right position', () => {
    const { rerender } = render(<ClaySheet isOpen position="right" size="sm"><p>Content</p></ClaySheet>);
    let sheet = document.querySelector('.fixed.inset-y-0.right-0');
    expect(sheet?.className).toContain('w-80');

    rerender(<ClaySheet isOpen position="right" size="md"><p>Content</p></ClaySheet>);
    sheet = document.querySelector('.fixed.inset-y-0.right-0');
    expect(sheet?.className).toContain('w-96');

    rerender(<ClaySheet isOpen position="right" size="lg"><p>Content</p></ClaySheet>);
    sheet = document.querySelector('.fixed.inset-y-0.right-0');
    expect(sheet?.className).toContain('w-\\[28rem\\]');

    rerender(<ClaySheet isOpen position="right" size="xl"><p>Content</p></ClaySheet>);
    sheet = document.querySelector('.fixed.inset-y-0.right-0');
    expect(sheet?.className).toContain('w-\\[32rem\\]');
  });

  it('applies correct size styles for left position', () => {
    const { rerender } = render(<ClaySheet isOpen position="left" size="sm"><p>Content</p></ClaySheet>);
    let sheet = document.querySelector('.fixed.inset-y-0.left-0');
    expect(sheet?.className).toContain('w-80');

    rerender(<ClaySheet isOpen position="left" size="xl"><p>Content</p></ClaySheet>);
    sheet = document.querySelector('.fixed.inset-y-0.left-0');
    expect(sheet?.className).toContain('w-\\[32rem\\]');
  });

  it('applies correct size styles for bottom position', () => {
    const { rerender } = render(<ClaySheet isOpen position="bottom" size="sm"><p>Content</p></ClaySheet>);
    let sheet = document.querySelector('.fixed.inset-x-0.bottom-0');
    expect(sheet?.className).toContain('h-64');

    rerender(<ClaySheet isOpen position="bottom" size="lg"><p>Content</p></ClaySheet>);
    sheet = document.querySelector('.fixed.inset-x-0.bottom-0');
    expect(sheet?.className).toContain('h-\\[30rem\\]');
  });

  it('renders close button by default', () => {
    render(<ClaySheet isOpen><p>Content</p></ClaySheet>);
    const closeButton = screen.getByLabelText('Close sheet');
    expect(closeButton).toBeInTheDocument();
  });

  it('does not render close button when showCloseButton is false', () => {
    render(<ClaySheet isOpen showCloseButton={false}><p>Content</p></ClaySheet>);
    const closeButton = screen.queryByLabelText('Close sheet');
    expect(closeButton).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const handleClose = jest.fn();
    const user = userEvent.setup();
    render(<ClaySheet isOpen onClose={handleClose}><p>Content</p></ClaySheet>);
    
    const closeButton = screen.getByLabelText('Close sheet');
    await user.click(closeButton);
    
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', async () => {
    const handleClose = jest.fn();
    const user = userEvent.setup();
    render(<ClaySheet isOpen onClose={handleClose}><p>Content</p></ClaySheet>);
    
    const backdrop = document.querySelector('.bg-black\\/30');
    await user.click(backdrop!);
    
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when backdrop is clicked and closeOnOverlayClick is false', async () => {
    const handleClose = jest.fn();
    const user = userEvent.setup();
    render(
      <ClaySheet isOpen onClose={handleClose} closeOnOverlayClick={false}>
        <p>Content</p>
      </ClaySheet>
    );
    
    const backdrop = document.querySelector('.bg-black\\/30');
    await user.click(backdrop!);
    
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('calls onClose when escape key is pressed', async () => {
    const handleClose = jest.fn();
    const user = userEvent.setup();
    render(<ClaySheet isOpen onClose={handleClose}><p>Content</p></ClaySheet>);
    
    await user.keyboard('{Escape}');
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when escape key is pressed and closeOnEscape is false', async () => {
    const handleClose = jest.fn();
    const user = userEvent.setup();
    render(
      <ClaySheet isOpen onClose={handleClose} closeOnEscape={false}>
        <p>Content</p>
      </ClaySheet>
    );
    
    await user.keyboard('{Escape}');
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('prevents body scroll when open', () => {
    render(<ClaySheet isOpen><p>Content</p></ClaySheet>);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores body scroll when closed', async () => {
    const { rerender } = render(<ClaySheet isOpen><p>Content</p></ClaySheet>);
    expect(document.body.style.overflow).toBe('hidden');
    
    rerender(<ClaySheet isOpen={false}><p>Content</p></ClaySheet>);
    await waitFor(() => {
      expect(document.body.style.overflow).toBe('');
    });
  });

  it('renders with correct border styles for horizontal positions', () => {
    const { rerender } = render(<ClaySheet isOpen position="right"><p>Content</p></ClaySheet>);
    let sheet = document.querySelector('.fixed.inset-y-0.right-0');
    expect(sheet?.className).toContain('border-l');
    expect(sheet?.className).toContain('border-r');
    expect(sheet?.className).toContain('rounded-l-\\[2rem\\]');

    rerender(<ClaySheet isOpen position="left"><p>Content</p></ClaySheet>);
    sheet = document.querySelector('.fixed.inset-y-0.left-0');
    expect(sheet?.className).toContain('border-l');
    expect(sheet?.className).toContain('border-r');
    expect(sheet?.className).toContain('rounded-r-\\[2rem\\]');
  });

  it('renders with correct border styles for vertical position', () => {
    render(<ClaySheet isOpen position="bottom"><p>Content</p></ClaySheet>);
    const sheet = document.querySelector('.fixed.inset-x-0.bottom-0');
    expect(sheet?.className).toContain('border-t');
    expect(sheet?.className).toContain('border-b');
    expect(sheet?.className).toContain('rounded-t-\\[2rem\\]');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<ClaySheet isOpen ref={ref}><p>Content</p></ClaySheet>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('accepts additional className', () => {
    render(<ClaySheet isOpen className="custom-class" data-testid="sheet"><p>Content</p></ClaySheet>);
    const sheet = document.querySelector('.relative.flex.flex-col');
    expect(sheet).toHaveClass('custom-class');
  });

  it('has correct animation classes for each position', () => {
    const { rerender } = render(<ClaySheet isOpen position="right"><p>Content</p></ClaySheet>);
    let sheet = document.querySelector('.relative.flex.flex-col');
    expect(sheet?.className).toContain('animate-in');
    expect(sheet?.className).toContain('slide-in-from-right');

    rerender(<ClaySheet isOpen position="left"><p>Content</p></ClaySheet>);
    sheet = document.querySelector('.relative.flex.flex-col');
    expect(sheet?.className).toContain('slide-in-from-left');

    rerender(<ClaySheet isOpen position="bottom"><p>Content</p></ClaySheet>);
    sheet = document.querySelector('.relative.flex.flex-col');
    expect(sheet?.className).toContain('slide-in-from-bottom');
  });
});

describe('ClaySheetFooter', () => {
  it('renders children correctly', () => {
    render(<ClaySheetFooter><button>Save</button></ClaySheetFooter>);
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('applies default styles', () => {
    render(<ClaySheetFooter data-testid="footer"><button>Button</button></ClaySheetFooter>);
    const footer = screen.getByTestId('footer');
    expect(footer.className).toContain('flex');
    expect(footer.className).toContain('items-center');
    expect(footer.className).toContain('justify-end');
    expect(footer.className).toContain('gap-3');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<ClaySheetFooter ref={ref}><button>Button</button></ClaySheetFooter>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('accepts additional className', () => {
    render(<ClaySheetFooter className="custom-class" data-testid="footer"><button>Button</button></ClaySheetFooter>);
    expect(screen.getByTestId('footer').className).toContain('custom-class');
  });
});
