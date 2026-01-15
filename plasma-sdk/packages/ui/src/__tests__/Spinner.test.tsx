import React from 'react';
import { render, screen } from '@testing-library/react';
import { Spinner, LoadingScreen } from '../components/Spinner';

describe('Spinner', () => {
  it('renders correctly', () => {
    const { container } = render(<Spinner />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('applies plasma cyan color', () => {
    const { container } = render(<Spinner />);
    const spinner = container.firstChild as HTMLElement;
    expect(spinner.className).toContain('border-[rgb(0,212,255)]');
  });

  it('applies correct size styles', () => {
    const { rerender, container } = render(<Spinner size="sm" />);
    let spinner = container.firstChild as HTMLElement;
    expect(spinner.className).toContain('w-4');
    expect(spinner.className).toContain('h-4');
    expect(spinner.className).toContain('border-2');

    rerender(<Spinner size="md" />);
    spinner = container.firstChild as HTMLElement;
    expect(spinner.className).toContain('w-6');
    expect(spinner.className).toContain('h-6');
    expect(spinner.className).toContain('border-2');

    rerender(<Spinner size="lg" />);
    spinner = container.firstChild as HTMLElement;
    expect(spinner.className).toContain('w-8');
    expect(spinner.className).toContain('h-8');
    expect(spinner.className).toContain('border-[3px]');

    rerender(<Spinner size="xl" />);
    spinner = container.firstChild as HTMLElement;
    expect(spinner.className).toContain('w-12');
    expect(spinner.className).toContain('h-12');
    expect(spinner.className).toContain('border-[3px]');
  });

  it('has animation class', () => {
    const { container } = render(<Spinner />);
    const spinner = container.firstChild as HTMLElement;
    expect(spinner.className).toContain('animate-spin');
  });

  it('accepts additional className', () => {
    const { container } = render(<Spinner className="custom-class" />);
    const spinner = container.firstChild as HTMLElement;
    expect(spinner.className).toContain('custom-class');
  });

  it('is rounded', () => {
    const { container } = render(<Spinner />);
    const spinner = container.firstChild as HTMLElement;
    expect(spinner.className).toContain('rounded-full');
  });

  it('has transparent top border for animation effect', () => {
    const { container } = render(<Spinner />);
    const spinner = container.firstChild as HTMLElement;
    expect(spinner.className).toContain('border-t-transparent');
  });
});

describe('LoadingScreen', () => {
  it('renders with default message', () => {
    render(<LoadingScreen />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders with custom message', () => {
    render(<LoadingScreen message="Please wait" />);
    expect(screen.getByText('Please wait')).toBeInTheDocument();
  });

  it('includes a spinner', () => {
    const { container } = render(<LoadingScreen />);
    // Should have a spinner element with animate-spin
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('is centered on screen', () => {
    const { container } = render(<LoadingScreen />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.className).toContain('min-h-screen');
    expect(wrapper.className).toContain('flex');
    expect(wrapper.className).toContain('items-center');
    expect(wrapper.className).toContain('justify-center');
  });

  it('uses xl spinner size', () => {
    const { container } = render(<LoadingScreen />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner?.className).toContain('w-12');
    expect(spinner?.className).toContain('h-12');
  });
});
