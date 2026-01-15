import React from 'react';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/Card';

describe('Card', () => {
  it('renders children correctly', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies glass morphism styles by default', () => {
    render(<Card data-testid="card">Content</Card>);
    const card = screen.getByTestId('card');
    expect(card.className).toContain('backdrop-blur');
    expect(card.className).toContain('border-white/10');
  });

  it('applies correct variant styles', () => {
    const { rerender } = render(<Card variant="default" data-testid="card">Default</Card>);
    let card = screen.getByTestId('card');
    expect(card.className).toContain('from-white/[0.08]');

    rerender(<Card variant="elevated" data-testid="card">Elevated</Card>);
    card = screen.getByTestId('card');
    expect(card.className).toContain('from-white/[0.12]');
    expect(card.className).toContain('backdrop-blur-xl');

    rerender(<Card variant="subtle" data-testid="card">Subtle</Card>);
    card = screen.getByTestId('card');
    expect(card.className).toContain('from-white/[0.03]');

    rerender(<Card variant="plasma" data-testid="card">Plasma</Card>);
    card = screen.getByTestId('card');
    expect(card.className).toContain('from-[rgba(0,212,255');

    rerender(<Card variant="interactive" data-testid="card">Interactive</Card>);
    card = screen.getByTestId('card');
    expect(card.className).toContain('cursor-pointer');
    expect(card.className).toContain('hover:-translate-y-1');
  });

  it('applies correct padding styles', () => {
    const { rerender } = render(<Card padding="none" data-testid="card">No padding</Card>);
    let card = screen.getByTestId('card');
    expect(card.className).not.toContain('p-4');
    expect(card.className).not.toContain('p-6');
    expect(card.className).not.toContain('p-8');

    rerender(<Card padding="sm" data-testid="card">Small padding</Card>);
    card = screen.getByTestId('card');
    expect(card.className).toContain('p-4');

    rerender(<Card padding="md" data-testid="card">Medium padding</Card>);
    card = screen.getByTestId('card');
    expect(card.className).toContain('p-6');

    rerender(<Card padding="lg" data-testid="card">Large padding</Card>);
    card = screen.getByTestId('card');
    expect(card.className).toContain('p-8');
  });

  it('applies correct rounded styles', () => {
    const { rerender } = render(<Card rounded="md" data-testid="card">Medium rounded</Card>);
    let card = screen.getByTestId('card');
    expect(card.className).toContain('rounded-xl');

    rerender(<Card rounded="lg" data-testid="card">Large rounded</Card>);
    card = screen.getByTestId('card');
    expect(card.className).toContain('rounded-2xl');

    rerender(<Card rounded="xl" data-testid="card">XL rounded</Card>);
    card = screen.getByTestId('card');
    expect(card.className).toContain('rounded-3xl');

    rerender(<Card rounded="2xl" data-testid="card">2XL rounded</Card>);
    card = screen.getByTestId('card');
    expect(card.className).toContain('rounded-[2rem]');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Card ref={ref}>Ref Card</Card>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('accepts additional className', () => {
    render(<Card className="custom-class" data-testid="card">Content</Card>);
    expect(screen.getByTestId('card').className).toContain('custom-class');
  });
});

describe('CardHeader', () => {
  it('renders children correctly', () => {
    render(<CardHeader>Header content</CardHeader>);
    expect(screen.getByText('Header content')).toBeInTheDocument();
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<CardHeader ref={ref}>Header</CardHeader>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});

describe('CardTitle', () => {
  it('renders as h3 element', () => {
    render(<CardTitle>Title text</CardTitle>);
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Title text');
  });

  it('applies styling', () => {
    render(<CardTitle data-testid="title">Title</CardTitle>);
    const title = screen.getByTestId('title');
    expect(title.className).toContain('text-xl');
    expect(title.className).toContain('font-semibold');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLHeadingElement>();
    render(<CardTitle ref={ref}>Title</CardTitle>);
    expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
  });
});

describe('CardContent', () => {
  it('renders children correctly', () => {
    render(<CardContent>Content here</CardContent>);
    expect(screen.getByText('Content here')).toBeInTheDocument();
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<CardContent ref={ref}>Content</CardContent>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
