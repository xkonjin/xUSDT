import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClayModal, ClayModalFooter } from '../ClayModal';

describe('ClayModal', () => {
  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('does not render when isOpen is false', () => {
    render(<ClayModal isOpen={false}><p>Modal content</p></ClayModal>);
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  it('renders when isOpen is true', () => {
    render(<ClayModal isOpen><p>Modal content</p></ClayModal>);
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('renders with correct accessibility attributes', () => {
    render(<ClayModal isOpen><p>Content</p></ClayModal>);
    const modal = screen.getByRole('dialog');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveAttribute('aria-modal', 'true');
  });

  it('renders title when provided', () => {
    render(<ClayModal isOpen title="Modal Title"><p>Content</p></ClayModal>);
    const title = screen.getByRole('heading', { level: 2 });
    expect(title).toBeInTheDocument();
    expect(title).toHaveTextContent('Modal Title');
  });

  it('renders description when provided', () => {
    render(<ClayModal isOpen description="Modal description"><p>Content</p></ClayModal>);
    expect(screen.getByText('Modal description')).toBeInTheDocument();
  });

  it('renders close button by default', () => {
    render(<ClayModal isOpen onClose={jest.fn()}><p>Content</p></ClayModal>);
    const closeButton = screen.getByLabelText('Close modal');
    expect(closeButton).toBeInTheDocument();
  });

  it('does not render close button when showCloseButton is false', () => {
    render(<ClayModal isOpen showCloseButton={false}><p>Content</p></ClayModal>);
    const closeButton = screen.queryByLabelText('Close modal');
    expect(closeButton).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const handleClose = jest.fn();
    const user = userEvent.setup();
    render(<ClayModal isOpen onClose={handleClose}><p>Content</p></ClayModal>);
    
    const closeButton = screen.getByLabelText('Close modal');
    await user.click(closeButton);
    
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', async () => {
    const handleClose = jest.fn();
    const user = userEvent.setup();
    render(<ClayModal isOpen onClose={handleClose}><p>Content</p></ClayModal>);
    
    const backdrop = document.querySelector('.bg-black\\/30');
    await user.click(backdrop!);
    
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when backdrop is clicked and closeOnOverlayClick is false', async () => {
    const handleClose = jest.fn();
    const user = userEvent.setup();
    render(
      <ClayModal isOpen onClose={handleClose} closeOnOverlayClick={false}>
        <p>Content</p>
      </ClayModal>
    );
    
    const backdrop = document.querySelector('.bg-black\\/30');
    await user.click(backdrop!);
    
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('calls onClose when escape key is pressed', async () => {
    const handleClose = jest.fn();
    const user = userEvent.setup();
    render(<ClayModal isOpen onClose={handleClose}><p>Content</p></ClayModal>);
    
    await user.keyboard('{Escape}');
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when escape key is pressed and closeOnEscape is false', async () => {
    const handleClose = jest.fn();
    const user = userEvent.setup();
    render(
      <ClayModal isOpen onClose={handleClose} closeOnEscape={false}>
        <p>Content</p>
      </ClayModal>
    );
    
    await user.keyboard('{Escape}');
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('prevents body scroll when open', () => {
    render(<ClayModal isOpen><p>Content</p></ClayModal>);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores body scroll when closed', async () => {
    const { rerender } = render(<ClayModal isOpen><p>Content</p></ClayModal>);
    expect(document.body.style.overflow).toBe('hidden');
    
    rerender(<ClayModal isOpen={false}><p>Content</p></ClayModal>);
    await waitFor(() => {
      expect(document.body.style.overflow).toBe('');
    });
  });

  it('applies correct size styles', () => {
    const { rerender } = render(<ClayModal isOpen size="sm"><p>Content</p></ClayModal>);
    let modal = document.querySelector('.relative.w-full');
    expect(modal?.className).toContain('max-w-sm');

    rerender(<ClayModal isOpen size="md"><p>Content</p></ClayModal>);
    modal = document.querySelector('.relative.w-full');
    expect(modal?.className).toContain('max-w-md');

    rerender(<ClayModal isOpen size="lg"><p>Content</p></ClayModal>);
    modal = document.querySelector('.relative.w-full');
    expect(modal?.className).toContain('max-w-lg');

    rerender(<ClayModal isOpen size="xl"><p>Content</p></ClayModal>);
    modal = document.querySelector('.relative.w-full');
    expect(modal?.className).toContain('max-w-xl');

    rerender(<ClayModal isOpen size="full"><p>Content</p></ClayModal>);
    modal = document.querySelector('.relative.w-full');
    expect(modal?.className).toContain('max-w-full');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<ClayModal isOpen ref={ref}><p>Content</p></ClayModal>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('accepts additional className', () => {
    render(<ClayModal isOpen className="custom-class" data-testid="modal"><p>Content</p></ClayModal>);
    const modal = screen.getByRole('dialog');
    expect(modal).toHaveClass('custom-class');
  });
});

describe('ClayModalFooter', () => {
  it('renders children correctly', () => {
    render(<ClayModalFooter><button>Save</button></ClayModalFooter>);
    expect(screen.getByText('Save')).toBeInTheDocument();
  });

  it('applies default styles', () => {
    render(<ClayModalFooter data-testid="footer"><button>Button</button></ClayModalFooter>);
    const footer = screen.getByTestId('footer');
    expect(footer.className).toContain('flex');
    expect(footer.className).toContain('items-center');
    expect(footer.className).toContain('justify-end');
    expect(footer.className).toContain('gap-3');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<ClayModalFooter ref={ref}><button>Button</button></ClayModalFooter>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('accepts additional className', () => {
    render(<ClayModalFooter className="custom-class" data-testid="footer"><button>Button</button></ClayModalFooter>);
    expect(screen.getByTestId('footer').className).toContain('custom-class');
  });
});
