import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClayAlert } from '../ClayAlert';

describe('ClayAlert', () => {
  it('renders children correctly', () => {
    render(<ClayAlert>Alert message</ClayAlert>);
    expect(screen.getByText('Alert message')).toBeInTheDocument();
  });

  it('renders string children as paragraph', () => {
    const { container } = render(<ClayAlert>String alert</ClayAlert>);
    const p = container.querySelector('p');
    expect(p).toBeInTheDocument();
    expect(p).toHaveTextContent('String alert');
  });

  it('renders non-string children as is', () => {
    const { container } = render(<ClayAlert><div data-testid="custom">Custom content</div></ClayAlert>);
    expect(screen.getByTestId('custom')).toBeInTheDocument();
    const p = container.querySelector('p');
    expect(p).not.toBeInTheDocument();
  });

  it('applies default styles', () => {
    render(<ClayAlert data-testid="alert">Alert</ClayAlert>);
    const alert = screen.getByTestId('alert');
    expect(alert.className).toContain('relative');
    expect(alert.className).toContain('flex');
    expect(alert.className).toContain('items-start');
    expect(alert.className).toContain('gap-4');
    expect(alert.className).toContain('p-4');
    expect(alert.className).toContain('rounded-3xl');
  });

  it('applies correct variant styles', () => {
    const { rerender } = render(<ClayAlert variant="info" data-testid="alert">Info</ClayAlert>);
    let alert = screen.getByTestId('alert');
    expect(alert.className).toContain('from-blue-50');
    expect(alert.className).toContain('to-blue-100/80');
    expect(alert.className).toContain('border-blue-200/60');

    rerender(<ClayAlert variant="success" data-testid="alert">Success</ClayAlert>);
    alert = screen.getByTestId('alert');
    expect(alert.className).toContain('from-emerald-50');
    expect(alert.className).toContain('to-emerald-100/80');
    expect(alert.className).toContain('border-emerald-200/60');

    rerender(<ClayAlert variant="warning" data-testid="alert">Warning</ClayAlert>);
    alert = screen.getByTestId('alert');
    expect(alert.className).toContain('from-amber-50');
    expect(alert.className).toContain('to-amber-100/80');
    expect(alert.className).toContain('border-amber-200/60');

    rerender(<ClayAlert variant="danger" data-testid="alert">Danger</ClayAlert>);
    alert = screen.getByTestId('alert');
    expect(alert.className).toContain('from-red-50');
    expect(alert.className).toContain('to-red-100/80');
    expect(alert.className).toContain('border-red-200/60');
  });

  it('renders default icon based on variant', () => {
    const { rerender } = render(<ClayAlert variant="info" data-testid="alert">Info</ClayAlert>);
    let icon = document.querySelector('.w-5.h-5');
    expect(icon).toBeInTheDocument();

    rerender(<ClayAlert variant="success" data-testid="alert">Success</ClayAlert>);
    icon = document.querySelector('.w-5.h-5');
    expect(icon).toBeInTheDocument();

    rerender(<ClayAlert variant="warning" data-testid="alert">Warning</ClayAlert>);
    icon = document.querySelector('.w-5.h-5');
    expect(icon).toBeInTheDocument();

    rerender(<ClayAlert variant="danger" data-testid="alert">Danger</ClayAlert>);
    icon = document.querySelector('.w-5.h-5');
    expect(icon).toBeInTheDocument();
  });

  it('renders custom icon when provided', () => {
    render(<ClayAlert icon={<span data-testid="custom-icon">★</span>}>Alert</ClayAlert>);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });

  it('does not render dismiss button when dismissible is false', () => {
    render(<ClayAlert dismissible={false}>Alert</ClayAlert>);
    const dismissButton = screen.queryByLabelText('Dismiss');
    expect(dismissButton).not.toBeInTheDocument();
  });

  it('renders dismiss button when dismissible is true', () => {
    render(<ClayAlert dismissible>Alert</ClayAlert>);
    const dismissButton = screen.getByLabelText('Dismiss');
    expect(dismissButton).toBeInTheDocument();
    expect(dismissButton.tagName).toBe('BUTTON');
  });

  it('calls onDismiss when dismiss button is clicked', async () => {
    const handleDismiss = jest.fn();
    const user = userEvent.setup();
    render(<ClayAlert dismissible onDismiss={handleDismiss}>Alert</ClayAlert>);
    
    const dismissButton = screen.getByLabelText('Dismiss');
    await user.click(dismissButton);
    
    expect(handleDismiss).toHaveBeenCalledTimes(1);
  });

  it('applies correct dismiss button styles', () => {
    render(<ClayAlert dismissible variant="info">Alert</ClayAlert>);
    const dismissButton = screen.getByLabelText('Dismiss');
    expect(dismissButton).toHaveClass('flex-shrink-0');
    expect(dismissButton).toHaveClass('p-1');
    expect(dismissButton).toHaveClass('rounded-full');
    expect(dismissButton).toHaveClass('text-blue-500');
  });

  it('applies correct icon color based on variant', () => {
    const { rerender } = render(<ClayAlert variant="info">Info</ClayAlert>);
    let iconContainer = document.querySelector('.flex-shrink-0.mt-0\\.5');
    expect(iconContainer).toHaveClass('text-blue-600');

    rerender(<ClayAlert variant="success">Success</ClayAlert>);
    iconContainer = document.querySelector('.flex-shrink-0.mt-0\\.5');
    expect(iconContainer).toHaveClass('text-emerald-600');

    rerender(<ClayAlert variant="warning">Warning</ClayAlert>);
    iconContainer = document.querySelector('.flex-shrink-0.mt-0\\.5');
    expect(iconContainer).toHaveClass('text-amber-600');

    rerender(<ClayAlert variant="danger">Danger</ClayAlert>);
    iconContainer = document.querySelector('.flex-shrink-0.mt-0\\.5');
    expect(iconContainer).toHaveClass('text-red-600');
  });

  it('has proper accessibility attributes', () => {
    render(<ClayAlert dismissible>Alert</ClayAlert>);
    const dismissButton = screen.getByLabelText('Dismiss');
    expect(dismissButton).toHaveAttribute('aria-label', 'Dismiss');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<ClayAlert ref={ref}>Alert</ClayAlert>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('accepts additional className', () => {
    render(<ClayAlert className="custom-class" data-testid="alert">Alert</ClayAlert>);
    expect(screen.getByTestId('alert').className).toContain('custom-class');
  });

  it('passes through additional props', () => {
    render(<ClayAlert data-id="test-123" data-testid="alert">Alert</ClayAlert>);
    const alert = screen.getByTestId('alert');
    expect(alert).toHaveAttribute('data-id', 'test-123');
  });

  it('renders with dismissible and onDismiss', async () => {
    const handleDismiss = jest.fn();
    const user = userEvent.setup();
    render(<ClayAlert dismissible onDismiss={handleDismiss}>Dismissible alert</ClayAlert>);
    
    const dismissButton = screen.getByLabelText('Dismiss');
    await user.click(dismissButton);
    
    expect(handleDismiss).toHaveBeenCalled();
  });

  it('handles dismiss button hover state', () => {
    render(<ClayAlert dismissible variant="success">Alert</ClayAlert>);
    const dismissButton = screen.getByLabelText('Dismiss');
    expect(dismissButton).toHaveClass('hover:bg-black/5');
    expect(dismissButton).toHaveClass('hover:text-emerald-700');
  });
});
