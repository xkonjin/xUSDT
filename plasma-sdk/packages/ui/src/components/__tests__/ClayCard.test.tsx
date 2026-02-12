import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  ClayCard,
  ClayCardHeader,
  ClayCardTitle,
  ClayCardContent,
  ClayCardFooter,
} from '../ClayCard';

describe('ClayCard', () => {
  it('renders children correctly', () => {
    render(<ClayCard>Card content</ClayCard>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('applies default styles', () => {
    render(<ClayCard data-testid="card">Content</ClayCard>);
    const card = screen.getByTestId('card');
    expect(card.className).toContain('bg-gradient-to-br');
    expect(card.className).toContain('shadow-clay');
    expect(card.className).toContain('p-6');
    expect(card.className).toContain('rounded-[2.5rem]');
  });

  it('applies correct variant styles', () => {
    const { rerender } = render(<ClayCard variant="default" data-testid="card">Default</ClayCard>);
    let card = screen.getByTestId('card');
    expect(card.className).toContain('shadow-clay');

    rerender(<ClayCard variant="elevated" data-testid="card">Elevated</ClayCard>);
    card = screen.getByTestId('card');
    expect(card.className).toContain('shadow-clay-lg');

    rerender(<ClayCard variant="subtle" data-testid="card">Subtle</ClayCard>);
    card = screen.getByTestId('card');
    expect(card.className).toContain('shadow-clay-sm');
  });

  it('applies correct color styles', () => {
    const { rerender } = render(<ClayCard color="default" data-testid="card">Default</ClayCard>);
    let card = screen.getByTestId('card');
    expect(card.className).toContain('from-white');

    rerender(<ClayCard color="blue" data-testid="card">Blue</ClayCard>);
    card = screen.getByTestId('card');
    expect(card.className).toContain('from-blue-300');

    rerender(<ClayCard color="pink" data-testid="card">Pink</ClayCard>);
    card = screen.getByTestId('card');
    expect(card.className).toContain('from-pink-300');

    rerender(<ClayCard color="green" data-testid="card">Green</ClayCard>);
    card = screen.getByTestId('card');
    expect(card.className).toContain('from-emerald-300');

    rerender(<ClayCard color="purple" data-testid="card">Purple</ClayCard>);
    card = screen.getByTestId('card');
    expect(card.className).toContain('from-violet-300');

    rerender(<ClayCard color="yellow" data-testid="card">Yellow</ClayCard>);
    card = screen.getByTestId('card');
    expect(card.className).toContain('from-amber-200');
  });

  it('applies correct padding styles', () => {
    const { rerender } = render(<ClayCard padding="none" data-testid="card">No padding</ClayCard>);
    let card = screen.getByTestId('card');
    expect(card.className).not.toContain('p-4');
    expect(card.className).not.toContain('p-6');
    expect(card.className).not.toContain('p-8');

    rerender(<ClayCard padding="sm" data-testid="card">Small padding</ClayCard>);
    card = screen.getByTestId('card');
    expect(card.className).toContain('p-4');

    rerender(<ClayCard padding="md" data-testid="card">Medium padding</ClayCard>);
    card = screen.getByTestId('card');
    expect(card.className).toContain('p-6');

    rerender(<ClayCard padding="lg" data-testid="card">Large padding</ClayCard>);
    card = screen.getByTestId('card');
    expect(card.className).toContain('p-8');
  });

  it('applies correct rounded styles', () => {
    const { rerender } = render(<ClayCard rounded="md" data-testid="card">Medium rounded</ClayCard>);
    let card = screen.getByTestId('card');
    expect(card.className).toContain('rounded-xl');

    rerender(<ClayCard rounded="lg" data-testid="card">Large rounded</ClayCard>);
    card = screen.getByTestId('card');
    expect(card.className).toContain('rounded-2xl');

    rerender(<ClayCard rounded="xl" data-testid="card">XL rounded</ClayCard>);
    card = screen.getByTestId('card');
    expect(card.className).toContain('rounded-3xl');

    rerender(<ClayCard rounded="2xl" data-testid="card">2XL rounded</ClayCard>);
    card = screen.getByTestId('card');
    expect(card.className).toContain('rounded-[2rem]');

    rerender(<ClayCard rounded="3xl" data-testid="card">3XL rounded</ClayCard>);
    card = screen.getByTestId('card');
    expect(card.className).toContain('rounded-[2.5rem]');
  });

  it('applies interactive styles', () => {
    render(<ClayCard interactive data-testid="card">Interactive</ClayCard>);
    const card = screen.getByTestId('card');
    expect(card.className).toContain('cursor-pointer');
    expect(card.className).toContain('hover:-translate-y-1');
    expect(card.className).toContain('active:scale-[0.98]');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<ClayCard ref={ref}>Ref Card</ClayCard>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('accepts additional className', () => {
    render(<ClayCard className="custom-class" data-testid="card">Content</ClayCard>);
    expect(screen.getByTestId('card').className).toContain('custom-class');
  });

  it('passes through additional props', () => {
    render(<ClayCard data-id="test-123" data-testid="card">Content</ClayCard>);
    const card = screen.getByTestId('card');
    expect(card).toHaveAttribute('data-id', 'test-123');
  });

  it('renders with all components', () => {
    render(
      <ClayCard data-testid="card">
        <ClayCardHeader>
          <ClayCardTitle>Test Title</ClayCardTitle>
        </ClayCardHeader>
        <ClayCardContent>Test Content</ClayCardContent>
        <ClayCardFooter>Test Footer</ClayCardFooter>
      </ClayCard>
    );
    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
    expect(screen.getByText('Test Footer')).toBeInTheDocument();
  });
});

describe('ClayCardHeader', () => {
  it('renders children correctly', () => {
    render(<ClayCardHeader>Header content</ClayCardHeader>);
    expect(screen.getByText('Header content')).toBeInTheDocument();
  });

  it('applies default styles', () => {
    render(<ClayCardHeader data-testid="header">Header</ClayCardHeader>);
    const header = screen.getByTestId('header');
    expect(header.className).toContain('flex');
    expect(header.className).toContain('flex-col');
    expect(header.className).toContain('space-y-1.5');
    expect(header.className).toContain('pb-4');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<ClayCardHeader ref={ref}>Header</ClayCardHeader>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('accepts additional className', () => {
    render(<ClayCardHeader className="custom-class" data-testid="header">Header</ClayCardHeader>);
    expect(screen.getByTestId('header').className).toContain('custom-class');
  });
});

describe('ClayCardTitle', () => {
  it('renders as h3 element', () => {
    render(<ClayCardTitle>Title text</ClayCardTitle>);
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Title text');
  });

  it('applies default styles', () => {
    render(<ClayCardTitle data-testid="title">Title</ClayCardTitle>);
    const title = screen.getByTestId('title');
    expect(title.className).toContain('text-xl');
    expect(title.className).toContain('font-bold');
    expect(title.className).toContain('text-slate-800');
    expect(title.className).toContain('tracking-tight');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLHeadingElement>();
    render(<ClayCardTitle ref={ref}>Title</ClayCardTitle>);
    expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
  });

  it('accepts additional className', () => {
    render(<ClayCardTitle className="custom-class" data-testid="title">Title</ClayCardTitle>);
    expect(screen.getByTestId('title').className).toContain('custom-class');
  });
});

describe('ClayCardContent', () => {
  it('renders children correctly', () => {
    render(<ClayCardContent>Content here</ClayCardContent>);
    expect(screen.getByText('Content here')).toBeInTheDocument();
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<ClayCardContent ref={ref}>Content</ClayCardContent>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('accepts additional className', () => {
    render(<ClayCardContent className="custom-class" data-testid="content">Content</ClayCardContent>);
    expect(screen.getByTestId('content').className).toContain('custom-class');
  });
});

describe('ClayCardFooter', () => {
  it('renders children correctly', () => {
    render(<ClayCardFooter>Footer content</ClayCardFooter>);
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  it('applies default styles', () => {
    render(<ClayCardFooter data-testid="footer">Footer</ClayCardFooter>);
    const footer = screen.getByTestId('footer');
    expect(footer.className).toContain('flex');
    expect(footer.className).toContain('items-center');
    expect(footer.className).toContain('pt-4');
    expect(footer.className).toContain('mt-4');
    expect(footer.className).toContain('border-t');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<ClayCardFooter ref={ref}>Footer</ClayCardFooter>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('accepts additional className', () => {
    render(<ClayCardFooter className="custom-class" data-testid="footer">Footer</ClayCardFooter>);
    expect(screen.getByTestId('footer').className).toContain('custom-class');
  });
});
