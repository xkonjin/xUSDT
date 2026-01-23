import React from 'react';
import { render, screen } from '@testing-library/react';
import { ClayContainer } from '../components/ClayContainer';

describe('ClayContainer', () => {
  it('renders children correctly', () => {
    render(<ClayContainer>Container content</ClayContainer>);
    expect(screen.getByText('Container content')).toBeInTheDocument();
  });

  it('applies default styles', () => {
    render(<ClayContainer data-testid="container">Content</ClayContainer>);
    const container = screen.getByTestId('container');
    expect(container.className).toContain('w-full');
    expect(container.className).toContain('mx-auto');
    expect(container.className).toContain('max-w-lg');
  });

  it('applies correct size styles', () => {
    const { rerender } = render(<ClayContainer size="sm" data-testid="container">Small</ClayContainer>);
    let container = screen.getByTestId('container');
    expect(container.className).toContain('max-w-sm');

    rerender(<ClayContainer size="md" data-testid="container">Medium</ClayContainer>);
    container = screen.getByTestId('container');
    expect(container.className).toContain('max-w-md');

    rerender(<ClayContainer size="lg" data-testid="container">Large</ClayContainer>);
    container = screen.getByTestId('container');
    expect(container.className).toContain('max-w-lg');

    rerender(<ClayContainer size="xl" data-testid="container">XL</ClayContainer>);
    container = screen.getByTestId('container');
    expect(container.className).toContain('max-w-xl');

    rerender(<ClayContainer size="full" data-testid="container">Full</ClayContainer>);
    container = screen.getByTestId('container');
    expect(container.className).toContain('max-w-full');
  });

  it('centers content by default', () => {
    render(<ClayContainer data-testid="container">Content</ClayContainer>);
    const container = screen.getByTestId('container');
    expect(container.className).toContain('flex');
    expect(container.className).toContain('flex-col');
    expect(container.className).toContain('items-center');
  });

  it('does not center content when centered is false', () => {
    render(<ClayContainer centered={false} data-testid="container">Content</ClayContainer>);
    const container = screen.getByTestId('container');
    expect(container.className).not.toContain('flex');
    expect(container.className).not.toContain('flex-col');
    expect(container.className).not.toContain('items-center');
  });

  it('applies default padding', () => {
    render(<ClayContainer data-testid="container">Content</ClayContainer>);
    const container = screen.getByTestId('container');
    expect(container.className).toContain('p-6');
  });

  it('applies correct padding styles', () => {
    const { rerender } = render(<ClayContainer padding="none" data-testid="container">No padding</ClayContainer>);
    let container = screen.getByTestId('container');
    expect(container.className).not.toContain('p-4');
    expect(container.className).not.toContain('p-6');
    expect(container.className).not.toContain('p-8');

    rerender(<ClayContainer padding="sm" data-testid="container">Small padding</ClayContainer>);
    container = screen.getByTestId('container');
    expect(container.className).toContain('p-4');

    rerender(<ClayContainer padding="md" data-testid="container">Medium padding</ClayContainer>);
    container = screen.getByTestId('container');
    expect(container.className).toContain('p-6');

    rerender(<ClayContainer padding="lg" data-testid="container">Large padding</ClayContainer>);
    container = screen.getByTestId('container');
    expect(container.className).toContain('p-8');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<ClayContainer ref={ref}>Ref Container</ClayContainer>);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('accepts additional className', () => {
    render(<ClayContainer className="custom-class" data-testid="container">Content</ClayContainer>);
    expect(screen.getByTestId('container').className).toContain('custom-class');
  });

  it('passes through additional props', () => {
    render(<ClayContainer data-id="test-123" data-testid="container">Content</ClayContainer>);
    const container = screen.getByTestId('container');
    expect(container).toHaveAttribute('data-id', 'test-123');
  });

  it('renders multiple children', () => {
    render(
      <ClayContainer>
        <div data-testid="child1">Child 1</div>
        <div data-testid="child2">Child 2</div>
        <div data-testid="child3">Child 3</div>
      </ClayContainer>
    );
    expect(screen.getByTestId('child1')).toBeInTheDocument();
    expect(screen.getByTestId('child2')).toBeInTheDocument();
    expect(screen.getByTestId('child3')).toBeInTheDocument();
  });
});
