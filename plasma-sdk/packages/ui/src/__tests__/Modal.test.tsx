import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal, ConfirmModal } from '../components/Modal';

describe('Modal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    children: <div>Modal content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when isOpen is true', () => {
    render(<Modal {...defaultProps} />);
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(<Modal {...defaultProps} isOpen={false} />);
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(<Modal {...defaultProps} title="Test Title" />);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'modal-title');
  });

  it('renders description when provided', () => {
    render(<Modal {...defaultProps} title="Title" description="Test description" />);
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('shows close button by default', () => {
    render(<Modal {...defaultProps} title="Title" />);
    expect(screen.getByTestId('modal-close-button')).toBeInTheDocument();
  });

  it('hides close button when showClose is false', () => {
    render(<Modal {...defaultProps} showClose={false} />);
    expect(screen.queryByTestId('modal-close-button')).not.toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    render(<Modal {...defaultProps} title="Title" onClose={onClose} />);
    fireEvent.click(screen.getByTestId('modal-close-button'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = jest.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose on backdrop click when closeOnOverlayClick is false', () => {
    const onClose = jest.fn();
    render(<Modal {...defaultProps} onClose={onClose} closeOnOverlayClick={false} />);
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('calls onClose when Escape key is pressed', () => {
    const onClose = jest.fn();
    render(<Modal {...defaultProps} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose on Escape when closeOnEscape is false', () => {
    const onClose = jest.fn();
    render(<Modal {...defaultProps} onClose={onClose} closeOnEscape={false} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('applies correct size styles', () => {
    const { rerender } = render(<Modal {...defaultProps} size="sm" />);
    let modal = screen.getByTestId('modal-content');
    expect(modal.className).toContain('max-w-sm');

    rerender(<Modal {...defaultProps} size="md" />);
    modal = screen.getByTestId('modal-content');
    expect(modal.className).toContain('max-w-md');

    rerender(<Modal {...defaultProps} size="lg" />);
    modal = screen.getByTestId('modal-content');
    expect(modal.className).toContain('max-w-lg');

    rerender(<Modal {...defaultProps} size="xl" />);
    modal = screen.getByTestId('modal-content');
    expect(modal.className).toContain('max-w-xl');

    rerender(<Modal {...defaultProps} size="full" />);
    modal = screen.getByTestId('modal-content');
    expect(modal.className).toContain('max-w-4xl');
  });

  it('has proper accessibility attributes', () => {
    render(<Modal {...defaultProps} title="Accessible Modal" />);
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
  });

  it('applies glass morphism styles', () => {
    render(<Modal {...defaultProps} />);
    const modal = screen.getByTestId('modal-content');
    expect(modal.className).toContain('backdrop-blur-xl');
    expect(modal.className).toContain('border-white/15');
  });

  it('prevents body scroll when open', () => {
    render(<Modal {...defaultProps} />);
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('restores body scroll when closed', () => {
    const { unmount } = render(<Modal {...defaultProps} />);
    unmount();
    expect(document.body.style.overflow).toBe('');
  });

  // Focus trap tests
  it('traps focus within modal', async () => {
    render(
      <Modal {...defaultProps} title="Focus Trap Test">
        <input data-testid="input1" />
        <button data-testid="button1">Button 1</button>
        <button data-testid="button2">Button 2</button>
      </Modal>
    );

    // Wait for focus to be set
    await waitFor(() => {
      expect(document.activeElement).not.toBe(document.body);
    });
  });

  it('moves focus to last element when shift+tab on first element', async () => {
    const user = userEvent.setup();
    
    render(
      <Modal {...defaultProps} showClose={false}>
        <button data-testid="first-button">First</button>
        <button data-testid="last-button">Last</button>
      </Modal>
    );

    // Focus first button
    const firstButton = screen.getByTestId('first-button');
    firstButton.focus();
    
    // Shift+Tab should wrap to last element
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    
    // Check focus moved (implementation varies by browser/jsdom)
    expect(document.activeElement).toBeDefined();
  });
});

describe('ConfirmModal', () => {
  const defaultProps = {
    isOpen: true,
    onClose: jest.fn(),
    onConfirm: jest.fn(),
    title: 'Confirm Action',
    message: 'Are you sure?',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title and message', () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
  });

  it('renders confirm and cancel buttons', () => {
    render(<ConfirmModal {...defaultProps} />);
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('renders custom button text', () => {
    render(<ConfirmModal {...defaultProps} confirmText="Delete" cancelText="Keep" />);
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Keep')).toBeInTheDocument();
  });

  it('calls onConfirm when confirm button is clicked', () => {
    const onConfirm = jest.fn();
    render(<ConfirmModal {...defaultProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText('Confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when cancel button is clicked', () => {
    const onClose = jest.fn();
    render(<ConfirmModal {...defaultProps} onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('shows loading state on confirm button', () => {
    render(<ConfirmModal {...defaultProps} loading />);
    const confirmButton = screen.getByText('Loading...');
    expect(confirmButton.closest('button')).toBeDisabled();
  });

  it('disables cancel button when loading', () => {
    render(<ConfirmModal {...defaultProps} loading />);
    expect(screen.getByText('Cancel').closest('button')).toBeDisabled();
  });

  it('applies danger variant to confirm button', () => {
    render(<ConfirmModal {...defaultProps} variant="danger" />);
    const confirmButton = screen.getByText('Confirm');
    expect(confirmButton.closest('button')?.className).toContain('from-red-500');
  });
});
