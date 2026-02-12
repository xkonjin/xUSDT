import React from 'react';
import { render, screen } from '@testing-library/react';
import { ClayDivider } from '../ClayDivider';

describe('ClayDivider', () => {
  it('renders correctly', () => {
    render(<ClayDivider data-testid="divider" />);
    const divider = screen.getByTestId('divider');
    expect(divider).toBeInTheDocument();
    expect(divider.tagName).toBe('DIV');
  });

  it('applies default styles', () => {
    render(<ClayDivider data-testid="divider" />);
    const divider = screen.getByTestId('divider');
    expect(divider.className).toContain('flex-shrink-0');
    expect(divider.className).toContain('w-full');
    expect(divider.className).toContain('h-px');
  });

  it('applies correct orientation styles', () => {
    const { rerender } = render(<ClayDivider orientation="horizontal" data-testid="divider" />);
    let divider = screen.getByTestId('divider');
    expect(divider.className).toContain('w-full');
    expect(divider.className).toContain('h-px');

    rerender(<ClayDivider orientation="vertical" data-testid="divider" />);
    divider = screen.getByTestId('divider');
    expect(divider.className).toContain('h-full');
    expect(divider.className).toContain('w-px');
  });

  it('applies correct size styles', () => {
    const { rerender } = render(<ClayDivider size="sm" data-testid="divider" />);
    let divider = screen.getByTestId('divider');
    expect(divider.className).toContain('opacity-30');

    rerender(<ClayDivider size="md" data-testid="divider" />);
    divider = screen.getByTestId('divider');
    expect(divider.className).toContain('opacity-50');

    rerender(<ClayDivider size="lg" data-testid="divider" />);
    divider = screen.getByTestId('divider');
    expect(divider.className).toContain('opacity-70');
  });

  it('applies correct variant styles', () => {
    const { rerender } = render(<ClayDivider variant="default" data-testid="divider" />);
    let divider = screen.getByTestId('divider');
    expect(divider.className).toContain('from-transparent');
    expect(divider.className).toContain('via-slate-300');

    rerender(<ClayDivider variant="primary" data-testid="divider" />);
    divider = screen.getByTestId('divider');
    expect(divider.className).toContain('from-transparent');
    expect(divider.className).toContain('via-blue-400');

    rerender(<ClayDivider variant="success" data-testid="divider" />);
    divider = screen.getByTestId('divider');
    expect(divider.className).toContain('from-transparent');
    expect(divider.className).toContain('via-emerald-400');

    rerender(<ClayDivider variant="warning" data-testid="divider" />);
    divider = screen.getByTestId('divider');
    expect(divider.className).toContain('from-transparent');
    expect(divider.className).toContain('via-amber-400');

    rerender(<ClayDivider variant="danger" data-testid="divider" />);
    divider = screen.getByTestId('divider');
    expect(divider.className).toContain('from-transparent');
    expect(divider.className).toContain('via-red-400');
  });

  it('renders label when provided', () => {
    render(<ClayDivider label="Divider Label" />);
    expect(screen.getByText('Divider Label')).toBeInTheDocument();
  });

  it('does not render label when not provided', () => {
    render(<ClayDivider />);
    const label = screen.queryByText('Divider Label');
    expect(label).not.toBeInTheDocument();
  });

  it('applies flex styles when label is provided', () => {
    render(<ClayDivider label="Label" data-testid="divider" />);
    const divider = screen.getByTestId('divider');
    expect(divider.className).toContain('flex');
    expect(divider.className).toContain('items-center');
    expect(divider.className).toContain('gap-4');
  });

  it('applies label styles correctly', () => {
    render(<ClayDivider label="Label" />);
    const label = screen.getByText('Label');
    expect(label).toHaveClass('text-sm');
    expect(label).toHaveClass('font-semibold');
    expect(label).toHaveClass('text-slate-500');
    expect(label).toHaveClass('bg-white/50');
    expect(label).toHaveClass('px-3');
    expect(label).toHaveClass('rounded-2xl');
    expect(label).toHaveClass('shadow-clay-sm');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<ClayDivider ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('accepts additional className', () => {
    render(<ClayDivider className="custom-class" data-testid="divider" />);
    expect(screen.getByTestId('divider').className).toContain('custom-class');
  });

  it('passes through additional props', () => {
    render(<ClayDivider data-id="test-123" data-testid="divider" />);
    const divider = screen.getByTestId('divider');
    expect(divider).toHaveAttribute('data-id', 'test-123');
  });

  it('renders with horizontal orientation and label', () => {
    render(<ClayDivider orientation="horizontal" label="Horizontal" />);
    expect(screen.getByText('Horizontal')).toBeInTheDocument();
    const divider = document.querySelector('.w-full.h-px');
    expect(divider).toBeInTheDocument();
  });

  it('renders with vertical orientation and label', () => {
    render(<ClayDivider orientation="vertical" label="Vertical" />);
    expect(screen.getByText('Vertical')).toBeInTheDocument();
    const divider = document.querySelector('.h-full.w-px');
    expect(divider).toBeInTheDocument();
  });

  it('applies gradient styles', () => {
    render(<ClayDivider variant="default" data-testid="divider" />);
    const divider = screen.getByTestId('divider');
    expect(divider.className).toContain('bg-gradient-to-r');
  });

  it('handles empty label', () => {
    render(<ClayDivider label="" />);
    const label = screen.queryByText('');
    expect(label).toBeInTheDocument();
  });

  it('handles long label text', () => {
    render(<ClayDivider label="This is a very long divider label text" />);
    expect(screen.getByText('This is a very long divider label text')).toBeInTheDocument();
  });
});
