import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Input } from '../components/Input';

describe('Input', () => {
  it('renders correctly', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<Input label="Email" />);
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('handles value changes', () => {
    const handleChange = jest.fn();
    render(<Input onChange={handleChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'test' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('shows error state', () => {
    render(<Input error="This field is required" data-testid="input" />);
    expect(screen.getByText('This field is required')).toBeInTheDocument();
    const input = screen.getByTestId('input');
    expect(input.className).toContain('border-red-500');
  });

  it('shows hint text', () => {
    render(<Input hint="Must be at least 8 characters" />);
    expect(screen.getByText('Must be at least 8 characters')).toBeInTheDocument();
  });

  it('hides hint when error is present', () => {
    render(<Input hint="Hint text" error="Error text" />);
    expect(screen.queryByText('Hint text')).not.toBeInTheDocument();
    expect(screen.getByText('Error text')).toBeInTheDocument();
  });

  it('renders left icon', () => {
    const Icon = () => <span data-testid="left-icon">icon</span>;
    render(<Input leftIcon={<Icon />} />);
    expect(screen.getByTestId('left-icon')).toBeInTheDocument();
  });

  it('renders right icon', () => {
    const Icon = () => <span data-testid="right-icon">icon</span>;
    render(<Input rightIcon={<Icon />} />);
    expect(screen.getByTestId('right-icon')).toBeInTheDocument();
  });

  it('applies padding for left icon', () => {
    const Icon = () => <span>icon</span>;
    render(<Input leftIcon={<Icon />} data-testid="input" />);
    const input = screen.getByTestId('input');
    expect(input.className).toContain('pl-11');
  });

  it('applies padding for right icon', () => {
    const Icon = () => <span>icon</span>;
    render(<Input rightIcon={<Icon />} data-testid="input" />);
    const input = screen.getByTestId('input');
    expect(input.className).toContain('pr-11');
  });

  it('supports different input types', () => {
    const { rerender } = render(<Input type="email" data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'email');

    rerender(<Input type="password" data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'password');

    rerender(<Input type="number" data-testid="input" />);
    expect(screen.getByTestId('input')).toHaveAttribute('type', 'number');
  });

  it('is disabled when disabled prop is true', () => {
    render(<Input disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('applies glass morphism styles', () => {
    render(<Input data-testid="input" />);
    const input = screen.getByTestId('input');
    expect(input.className).toContain('bg-white/[0.05]');
    expect(input.className).toContain('backdrop-blur');
  });

  it('applies plasma cyan focus ring without error', () => {
    render(<Input data-testid="input" />);
    const input = screen.getByTestId('input');
    expect(input.className).toContain('focus:border-[rgba(0,212,255');
  });

  it('applies red focus ring with error', () => {
    render(<Input error="Error" data-testid="input" />);
    const input = screen.getByTestId('input');
    expect(input.className).toContain('focus:border-red-500');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLInputElement>();
    render(<Input ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLInputElement);
  });

  it('passes additional props to input element', () => {
    render(<Input maxLength={50} autoComplete="email" data-testid="input" />);
    const input = screen.getByTestId('input');
    expect(input).toHaveAttribute('maxLength', '50');
    expect(input).toHaveAttribute('autoComplete', 'email');
  });

  it('has minimum touch target size', () => {
    render(<Input data-testid="input" />);
    const input = screen.getByTestId('input');
    expect(input.className).toContain('min-h-[44px]');
  });
});
