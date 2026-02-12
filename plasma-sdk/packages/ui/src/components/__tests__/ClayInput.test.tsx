import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClayInput } from '../ClayInput';

describe('ClayInput', () => {
  it('renders input correctly', () => {
    render(<ClayInput />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe('INPUT');
  });

  it('applies default styles', () => {
    render(<ClayInput data-testid="input" />);
    const input = screen.getByTestId('input');
    expect(input.className).toContain('w-full');
    expect(input.className).toContain('bg-gradient-to-br');
    expect(input.className).toContain('shadow-clay-inset');
    expect(input.className).toContain('rounded-3xl');
    expect(input.className).toContain('px-5');
    expect(input.className).toContain('py-3');
    expect(input.className).toContain('text-base');
  });

  it('renders label when provided', () => {
    render(<ClayInput label="Email Address" />);
    expect(screen.getByText('Email Address')).toBeInTheDocument();
    expect(screen.getByText('Email Address').tagName).toBe('LABEL');
  });

  it('does not render label when not provided', () => {
    render(<ClayInput />);
    const label = screen.queryByText('Email Address');
    expect(label).not.toBeInTheDocument();
  });

  it('applies correct size styles', () => {
    const { rerender } = render(<ClayInput size="sm" data-testid="input" />);
    let input = screen.getByTestId('input');
    expect(input.className).toContain('px-4');
    expect(input.className).toContain('py-2');
    expect(input.className).toContain('text-sm');
    expect(input.className).toContain('rounded-2xl');
    expect(input.className).toContain('min-h-[36px]');

    rerender(<ClayInput size="md" data-testid="input" />);
    input = screen.getByTestId('input');
    expect(input.className).toContain('px-5');
    expect(input.className).toContain('py-3');
    expect(input.className).toContain('text-base');
    expect(input.className).toContain('rounded-3xl');
    expect(input.className).toContain('min-h-[44px]');

    rerender(<ClayInput size="lg" data-testid="input" />);
    input = screen.getByTestId('input');
    expect(input.className).toContain('px-6');
    expect(input.className).toContain('py-4');
    expect(input.className).toContain('text-lg');
    expect(input.className).toContain('min-h-[52px]');
  });

  it('renders left icon when provided', () => {
    render(<ClayInput leftIcon={<span data-testid="left-icon">Icon</span>} />);
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
  });

  it('applies left padding when left icon is present', () => {
    render(<ClayInput leftIcon={<span>Icon</span>} data-testid="input" />);
    const input = screen.getByTestId('input');
    expect(input.className).toContain('pl-12');
  });

  it('renders right icon when provided', () => {
    render(<ClayInput rightIcon={<span data-testid="right-icon">Icon</span>} />);
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('applies right padding when right icon is present', () => {
    render(<ClayInput rightIcon={<span>Icon</span>} data-testid="input" />);
    const input = screen.getByTestId('input');
    expect(input.className).toContain('pr-12');
  });

  it('renders both left and right icons', () => {
    render(
      <ClayInput
        leftIcon={<span data-testid="left-icon">Left</span>}
        rightIcon={<span data-testid="right-icon">Right</span>}
      />
    );
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('shows error message when error prop is provided', () => {
    render(<ClayInput error="This field is required" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
    expect(screen.getByText('This field is required')).toHaveClass('text-red-500');
  });

  it('applies error styles when error is present', () => {
    render(<ClayInput error="Error" data-testid="input" />);
    const input = screen.getByTestId('input');
    expect(input.className).toContain('border-red-400/70');
  });

  it('shows hint message when hint prop is provided and no error', () => {
    render(<ClayInput hint="Enter your email address" />);
    expect(screen.getByText('Enter your email address')).toBeInTheDocument();
  });

  it('does not show hint when error is present', () => {
    render(<ClayInput error="Error" hint="Hint" />);
    expect(screen.queryByText('Hint')).not.toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  it('renders with default type text', () => {
    render(<ClayInput data-testid="input" />);
    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('type', 'text');
  });

  it('renders with custom type', () => {
    render(<ClayInput type="email" data-testid="input" />);
    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('type', 'email');
  });

  it('renders with custom type password', () => {
    render(<ClayInput type="password" data-testid="input" />);
    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('applies disabled styles when disabled', () => {
    render(<ClayInput disabled data-testid="input" />);
    const input = screen.getByTestId('input');
    expect(input).toBeDisabled();
    expect(input.className).toContain('opacity-50');
    expect(input.className).toContain('cursor-not-allowed');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<ClayInput ref={ref}>Input</ClayInput>);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('accepts additional className', () => {
    render(<ClayInput className="custom-class" data-testid="input" />);
    expect(screen.getByTestId('input').className).toContain('custom-class');
  });

  it('passes through additional props', () => {
    render(<ClayInput placeholder="Enter text" name="email" id="email-input" data-testid="input" />);
    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('placeholder', 'Enter text');
    expect(input).toHaveAttribute('name', 'email');
    expect(input).toHaveAttribute('id', 'email-input');
  });

  it('handles change events', async () => {
    const handleChange = jest.fn();
    const user = userEvent.setup();
    render(<ClayInput onChange={handleChange} />);
    
    const input = screen.getByRole('textbox');
    await user.type(input, 'test');
    
    expect(handleChange).toHaveBeenCalled();
  });

  it('has focus-visible styles for accessibility', () => {
    render(<ClayInput data-testid="input" />);
    const input = screen.getByTestId('input');
    expect(input.className).toContain('focus:outline-none');
    expect(input.className).toContain('focus:border-blue-400/70');
  });
});
