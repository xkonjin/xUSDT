import React from 'react';
import { render, screen } from '@testing-library/react';
import { ClayBadge } from '../ClayBadge';

describe('ClayBadge', () => {
  it('renders children correctly', () => {
    render(<ClayBadge>Badge</ClayBadge>);
    expect(screen.getByText('Badge')).toBeInTheDocument();
  });

  it('renders as span element', () => {
    render(<ClayBadge>Badge</ClayBadge>);
    const badge = screen.getByText('Badge');
    expect(badge.tagName).toBe('SPAN');
  });

  it('applies default styles', () => {
    render(<ClayBadge data-testid="badge">Badge</ClayBadge>);
    const badge = screen.getByTestId('badge');
    expect(badge.className).toContain('inline-flex');
    expect(badge.className).toContain('bg-gradient-to-br');
    expect(badge.className).toContain('font-semibold');
    expect(badge.className).toContain('shadow-clay-sm');
  });

  it('applies correct variant styles', () => {
    const { rerender } = render(<ClayBadge variant="default" data-testid="badge">Default</ClayBadge>);
    let badge = screen.getByTestId('badge');
    expect(badge.className).toContain('from-slate-100');
    expect(badge.className).toContain('to-slate-200');
    expect(badge.className).toContain('text-slate-700');

    rerender(<ClayBadge variant="primary" data-testid="badge">Primary</ClayBadge>);
    badge = screen.getByTestId('badge');
    expect(badge.className).toContain('from-blue-100');
    expect(badge.className).toContain('to-blue-200');
    expect(badge.className).toContain('text-blue-700');

    rerender(<ClayBadge variant="success" data-testid="badge">Success</ClayBadge>);
    badge = screen.getByTestId('badge');
    expect(badge.className).toContain('from-emerald-100');
    expect(badge.className).toContain('to-emerald-200');
    expect(badge.className).toContain('text-emerald-700');

    rerender(<ClayBadge variant="warning" data-testid="badge">Warning</ClayBadge>);
    badge = screen.getByTestId('badge');
    expect(badge.className).toContain('from-amber-100');
    expect(badge.className).toContain('to-amber-200');
    expect(badge.className).toContain('text-amber-700');

    rerender(<ClayBadge variant="danger" data-testid="badge">Danger</ClayBadge>);
    badge = screen.getByTestId('badge');
    expect(badge.className).toContain('from-red-100');
    expect(badge.className).toContain('to-red-200');
    expect(badge.className).toContain('text-red-700');

    rerender(<ClayBadge variant="outline" data-testid="badge">Outline</ClayBadge>);
    badge = screen.getByTestId('badge');
    expect(badge.className).toContain('from-transparent');
    expect(badge.className).toContain('to-transparent');
    expect(badge.className).toContain('text-slate-600');
  });

  it('applies correct size styles', () => {
    const { rerender } = render(<ClayBadge size="sm" data-testid="badge">Small</ClayBadge>);
    let badge = screen.getByTestId('badge');
    expect(badge.className).toContain('px-2.5');
    expect(badge.className).toContain('py-1');
    expect(badge.className).toContain('text-xs');
    expect(badge.className).toContain('rounded-2xl');
    expect(badge.className).toContain('min-h-[24px]');

    rerender(<ClayBadge size="md" data-testid="badge">Medium</ClayBadge>);
    badge = screen.getByTestId('badge');
    expect(badge.className).toContain('px-3');
    expect(badge.className).toContain('py-1.5');
    expect(badge.className).toContain('text-sm');
    expect(badge.className).toContain('min-h-[28px]');

    rerender(<ClayBadge size="lg" data-testid="badge">Large</ClayBadge>);
    badge = screen.getByTestId('badge');
    expect(badge.className).toContain('px-4');
    expect(badge.className).toContain('py-2');
    expect(badge.className).toContain('text-base');
    expect(badge.className).toContain('rounded-3xl');
    expect(badge.className).toContain('min-h-[32px]');
  });

  it('renders dot indicator when dot prop is true', () => {
    render(<ClayBadge dot>Badge</ClayBadge>);
    const dot = document.querySelector('.w-2.h-2.rounded-full');
    expect(dot).toBeInTheDocument();
  });

  it('does not render dot when dot prop is false', () => {
    render(<ClayBadge dot={false}>Badge</ClayBadge>);
    const dot = document.querySelector('.w-2.h-2.rounded-full');
    expect(dot).not.toBeInTheDocument();
  });

  it('applies correct dot color for each variant', () => {
    const { rerender } = render(<ClayBadge variant="success" dot data-testid="badge">Success</ClayBadge>);
    let dot = document.querySelector('.bg-emerald-500');
    expect(dot).toBeInTheDocument();

    rerender(<ClayBadge variant="warning" dot data-testid="badge">Warning</ClayBadge>);
    dot = document.querySelector('.bg-amber-500');
    expect(dot).toBeInTheDocument();

    rerender(<ClayBadge variant="danger" dot data-testid="badge">Danger</ClayBadge>);
    dot = document.querySelector('.bg-red-500');
    expect(dot).toBeInTheDocument();

    rerender(<ClayBadge variant="primary" dot data-testid="badge">Primary</ClayBadge>);
    dot = document.querySelector('.bg-blue-500');
    expect(dot).toBeInTheDocument();

    rerender(<ClayBadge variant="default" dot data-testid="badge">Default</ClayBadge>);
    dot = document.querySelector('.bg-slate-500');
    expect(dot).toBeInTheDocument();
  });

  it('applies additional padding when dot is present', () => {
    render(<ClayBadge dot data-testid="badge">Badge</ClayBadge>);
    const badge = screen.getByTestId('badge');
    expect(badge.className).toContain('pr-2.5');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLSpanElement>();
    render(<ClayBadge ref={ref}>Badge</ClayBadge>);
    expect(ref.current).toBeInstanceOf(HTMLSpanElement);
  });

  it('accepts additional className', () => {
    render(<ClayBadge className="custom-class" data-testid="badge">Badge</ClayBadge>);
    expect(screen.getByTestId('badge').className).toContain('custom-class');
  });

  it('passes through additional props', () => {
    render(<ClayBadge data-id="test-123" data-testid="badge">Badge</ClayBadge>);
    const badge = screen.getByTestId('badge');
    expect(badge).toHaveAttribute('data-id', 'test-123');
  });

  it('renders with dot and text', () => {
    render(<ClayBadge dot>New</ClayBadge>);
    expect(screen.getByText('New')).toBeInTheDocument();
    const dot = document.querySelector('.w-2.h-2.rounded-full');
    expect(dot).toBeInTheDocument();
  });

  it('renders with custom text content', () => {
    render(<ClayBadge>Premium Member</ClayBadge>);
    expect(screen.getByText('Premium Member')).toBeInTheDocument();
  });

  it('renders with numeric content', () => {
    render(<ClayBadge>42</ClayBadge>);
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders with icon content', () => {
    render(<ClayBadge><span data-testid="icon">★</span></ClayBadge>);
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});
