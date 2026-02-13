import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClayButton } from '../ClayButton';

describe('ClayButton', () => {
  it('renders children correctly', () => {
    render(<ClayButton>Click me</ClayButton>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('renders as button element', () => {
    render(<ClayButton>Button</ClayButton>);
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button.tagName).toBe('BUTTON');
  });

  it('applies default styles', () => {
    render(<ClayButton data-testid="button">Button</ClayButton>);
    const button = screen.getByTestId('button');
    expect(button.className).toContain('inline-flex');
    expect(button.className).toContain('bg-gradient-to-br');
    expect(button.className).toContain('shadow-clay');
  });

  it('applies correct variant styles', () => {
    const { rerender } = render(<ClayButton variant="primary" data-testid="button">Primary</ClayButton>);
    let button = screen.getByTestId('button');
    expect(button.className).toContain('from-blue-400');
    expect(button.className).toContain('to-blue-500');
    expect(button.className).toContain('shadow-clay');

    rerender(<ClayButton variant="secondary" data-testid="button">Secondary</ClayButton>);
    button = screen.getByTestId('button');
    expect(button.className).toContain('from-slate-100');
    expect(button.className).toContain('to-slate-200');
    expect(button.className).toContain('shadow-clay-sm');

    rerender(<ClayButton variant="success" data-testid="button">Success</ClayButton>);
    button = screen.getByTestId('button');
    expect(button.className).toContain('from-emerald-400');
    expect(button.className).toContain('to-emerald-500');
    expect(button.className).toContain('shadow-clay-green');

    rerender(<ClayButton variant="danger" data-testid="button">Danger</ClayButton>);
    button = screen.getByTestId('button');
    expect(button.className).toContain('from-red-400');
    expect(button.className).toContain('to-red-500');

    rerender(<ClayButton variant="ghost" data-testid="button">Ghost</ClayButton>);
    button = screen.getByTestId('button');
    expect(button.className).toContain('from-slate-50');
    expect(button.className).toContain('to-transparent');
    expect(button.className).toContain('border');
  });

  it('applies correct size styles', () => {
    const { rerender } = render(<ClayButton size="sm" data-testid="button">Small</ClayButton>);
    let button = screen.getByTestId('button');
    expect(button.className).toContain('px-4');
    expect(button.className).toContain('py-2');
    expect(button.className).toContain('text-sm');
    expect(button.className).toContain('rounded-2xl');
    expect(button.className).toContain('min-h-[36px]');

    rerender(<ClayButton size="md" data-testid="button">Medium</ClayButton>);
    button = screen.getByTestId('button');
    expect(button.className).toContain('px-6');
    expect(button.className).toContain('py-3');
    expect(button.className).toContain('text-base');
    expect(button.className).toContain('rounded-3xl');
    expect(button.className).toContain('min-h-[44px]');

    rerender(<ClayButton size="lg" data-testid="button">Large</ClayButton>);
    button = screen.getByTestId('button');
    expect(button.className).toContain('px-8');
    expect(button.className).toContain('py-4');
    expect(button.className).toContain('text-lg');

    rerender(<ClayButton size="xl" data-testid="button">XL</ClayButton>);
    button = screen.getByTestId('button');
    expect(button.className).toContain('px-10');
    expect(button.className).toContain('py-5');
    expect(button.className).toContain('text-xl');
  });

  it('shows loading state correctly', () => {
    render(<ClayButton loading>Submit</ClayButton>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    // Check for loading spinner
    expect(button.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('is disabled when loading is true', () => {
    render(<ClayButton loading>Submit</ClayButton>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('is disabled when disabled prop is true', () => {
    render(<ClayButton disabled>Disabled</ClayButton>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button.className).toContain('opacity-50');
    expect(button.className).toContain('cursor-not-allowed');
  });

  it('renders icon on the left', () => {
    render(
      <ClayButton icon={<span data-testid="icon">Icon</span>} iconPosition="left">
        Button
      </ClayButton>
    );
    const button = screen.getByRole('button');
    const icon = screen.getByTestId('icon');
    expect(icon).toBeInTheDocument();
    // Icon should appear before text
    expect(button.firstChild).toContainElement(icon);
  });

  it('renders icon on the right', () => {
    render(
      <ClayButton icon={<span data-testid="icon">Icon</span>} iconPosition="right">
        Button
      </ClayButton>
    );
    const button = screen.getByRole('button');
    const icon = screen.getByTestId('icon');
    expect(icon).toBeInTheDocument();
    // Icon should appear after text
    expect(button.lastChild).toContainElement(icon);
  });

  it('renders without icon', () => {
    render(<ClayButton>No icon</ClayButton>);
    const button = screen.getByRole('button');
    expect(button.textContent).toBe('No icon');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLButtonElement>();
    render(<ClayButton ref={ref}>Ref Button</ClayButton>);
    expect(ref.current).toBeInstanceOf(HTMLButtonElement);
  });

  it('accepts additional className', () => {
    render(<ClayButton className="custom-class" data-testid="button">Button</ClayButton>);
    expect(screen.getByTestId('button').className).toContain('custom-class');
  });

  it('passes through additional props', () => {
    render(<ClayButton data-id="test-123" type="submit" data-testid="button">Button</ClayButton>);
    const button = screen.getByTestId('button');
    expect(button).toHaveAttribute('data-id', 'test-123');
    expect(button).toHaveAttribute('type', 'submit');
  });

  it('handles click events', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();
    render(<ClayButton onClick={handleClick}>Click</ClayButton>);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('does not handle click when disabled', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();
    render(<ClayButton disabled onClick={handleClick}>Disabled</ClayButton>);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('does not handle click when loading', async () => {
    const handleClick = jest.fn();
    const user = userEvent.setup();
    render(<ClayButton loading onClick={handleClick}>Loading</ClayButton>);
    
    const button = screen.getByRole('button');
    await user.click(button);
    
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('has focus-visible styles for accessibility', () => {
    render(<ClayButton data-testid="button">Button</ClayButton>);
    const button = screen.getByTestId('button');
    expect(button.className).toContain('focus:outline-none');
    expect(button.className).toContain('focus-visible:ring-2');
  });
});
