import React from 'react';
import { render, screen } from '@testing-library/react';
import { ClaySection } from '../components/ClaySection';

describe('ClaySection', () => {
  it('renders children correctly', () => {
    render(<ClaySection>Section content</ClaySection>);
    expect(screen.getByText('Section content')).toBeInTheDocument();
  });

  it('applies default styles', () => {
    render(<ClaySection data-testid="section">Content</ClaySection>);
    const section = screen.getByTestId('section');
    expect(section.className).toContain('w-full');
    expect(section.className).toContain('py-12');
    expect(section.className).toContain('px-8');
  });

  it('renders title when provided', () => {
    render(<ClaySection title="Section Title">Content</ClaySection>);
    const title = screen.getByRole('heading', { level: 2 });
    expect(title).toBeInTheDocument();
    expect(title).toHaveTextContent('Section Title');
    expect(title.className).toContain('text-3xl');
    expect(title.className).toContain('font-bold');
  });

  it('does not render title when not provided', () => {
    render(<ClaySection>Content</ClaySection>);
    const title = screen.queryByRole('heading');
    expect(title).not.toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<ClaySection description="Section description">Content</ClaySection>);
    expect(screen.getByText('Section description')).toBeInTheDocument();
  });

  it('applies correct size styles', () => {
    const { rerender } = render(<ClaySection size="sm" data-testid="section">Small</ClaySection>);
    let section = screen.getByTestId('section');
    expect(section.className).toContain('py-6');
    expect(section.className).toContain('px-4');

    rerender(<ClaySection size="md" data-testid="section">Medium</ClaySection>);
    section = screen.getByTestId('section');
    expect(section.className).toContain('py-8');
    expect(section.className).toContain('px-6');

    rerender(<ClaySection size="lg" data-testid="section">Large</ClaySection>);
    section = screen.getByTestId('section');
    expect(section.className).toContain('py-12');
    expect(section.className).toContain('px-8');

    rerender(<ClaySection size="xl" data-testid="section">XL</ClaySection>);
    section = screen.getByTestId('section');
    expect(section.className).toContain('py-16');
    expect(section.className).toContain('px-10');
  });

  it('centers content by default', () => {
    render(<ClaySection centered data-testid="section">Content</ClaySection>);
    const section = screen.getByTestId('section');
    expect(section.className).toContain('text-center');
  });

  it('does not center content when centered is false', () => {
    render(<ClaySection centered={false} data-testid="section">Content</ClaySection>);
    const section = screen.getByTestId('section');
    expect(section.className).not.toContain('text-center');
  });

  it('applies correct variant styles', () => {
    const { rerender } = render(<ClaySection variant="default" data-testid="section">Default</ClaySection>);
    let section = screen.getByTestId('section');
    expect(section.className).toContain('from-slate-50');
    expect(section.className).toContain('to-slate-100');

    rerender(<ClaySection variant="primary" data-testid="section">Primary</ClaySection>);
    section = screen.getByTestId('section');
    expect(section.className).toContain('from-blue-50');
    expect(section.className).toContain('to-blue-100');

    rerender(<ClaySection variant="secondary" data-testid="section">Secondary</ClaySection>);
    section = screen.getByTestId('section');
    expect(section.className).toContain('from-slate-100');
    expect(section.className).toContain('to-slate-200');

    rerender(<ClaySection variant="accent" data-testid="section">Accent</ClaySection>);
    section = screen.getByTestId('section');
    expect(section.className).toContain('from-violet-50');
    expect(section.className).toContain('to-violet-100');
  });

  it('renders as section element', () => {
    render(<ClaySection>Content</ClaySection>);
    const section = screen.getByTestId('section');
    expect(section.tagName).toBe('SECTION');
  });

  it('applies max width to inner container', () => {
    render(<ClaySection>Content</ClaySection>);
    const innerContainer = document.querySelector('.max-w-6xl');
    expect(innerContainer).toBeInTheDocument();
    expect(innerContainer).toHaveClass('mx-auto');
  });

  it('renders multiple children', () => {
    render(
      <ClaySection>
        <div data-testid="child1">Child 1</div>
        <div data-testid="child2">Child 2</div>
        <div data-testid="child3">Child 3</div>
      </ClaySection>
    );
    expect(screen.getByTestId('child1')).toBeInTheDocument();
    expect(screen.getByTestId('child2')).toBeInTheDocument();
    expect(screen.getByTestId('child3')).toBeInTheDocument();
  });

  it('renders both title and description', () => {
    render(
      <ClaySection title="Section Title" description="Section description">
        Content
      </ClaySection>
    );
    expect(screen.getByText('Section Title')).toBeInTheDocument();
    expect(screen.getByText('Section description')).toBeInTheDocument();
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLElement>();
    render(<ClaySection ref={ref}>Ref Section</ClaySection>);
    expect(ref.current).toBeInstanceOf(HTMLElement);
  });

  it('accepts additional className', () => {
    render(<ClaySection className="custom-class" data-testid="section">Content</ClaySection>);
    expect(screen.getByTestId('section').className).toContain('custom-class');
  });

  it('passes through additional props', () => {
    render(<ClaySection data-id="test-123" data-testid="section">Content</ClaySection>);
    const section = screen.getByTestId('section');
    expect(section).toHaveAttribute('data-id', 'test-123');
  });

  it('centers title and description when centered is true', () => {
    render(
      <ClaySection centered title="Title" description="Description">
        Content
      </ClaySection>
    );
    const titleContainer = document.querySelector('.flex.flex-col.items-center');
    expect(titleContainer).toBeInTheDocument();
  });
});
