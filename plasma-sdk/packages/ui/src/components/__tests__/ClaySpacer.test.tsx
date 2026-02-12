import React from 'react';
import { render, screen } from '@testing-library/react';
import { ClaySpacer } from '../ClaySpacer';

describe('ClaySpacer', () => {
  it('renders correctly', () => {
    render(<ClaySpacer data-testid="spacer" />);
    const spacer = screen.getByTestId('spacer');
    expect(spacer).toBeInTheDocument();
    expect(spacer.tagName).toBe('DIV');
  });

  it('applies default styles', () => {
    render(<ClaySpacer data-testid="spacer" />);
    const spacer = screen.getByTestId('spacer');
    expect(spacer.className).toContain('w-0');
    expect(spacer).not.toContain('h-0');
  });

  it('applies default size (md)', () => {
    render(<ClaySpacer data-testid="spacer" />);
    const spacer = screen.getByTestId('spacer');
    expect(spacer).toHaveStyle({ height: '1.5rem' });
  });

  it('applies correct axis styles', () => {
    const { rerender } = render(<ClaySpacer axis="vertical" data-testid="spacer" />);
    let spacer = screen.getByTestId('spacer');
    expect(spacer.className).toContain('w-0');
    expect(spacer).not.toContain('h-0');

    rerender(<ClaySpacer axis="horizontal" data-testid="spacer" />);
    spacer = screen.getByTestId('spacer');
    expect(spacer.className).toContain('h-0');
    expect(spacer).not.toContain('w-0');

    rerender(<ClaySpacer axis="both" data-testid="spacer" />);
    spacer = screen.getByTestId('spacer');
    expect(spacer.className).not.toContain('w-0');
    expect(spacer.className).not.toContain('h-0');
  });

  it('applies correct size styles for vertical axis', () => {
    const { rerender } = render(<ClaySpacer size="xs" data-testid="spacer" />);
    let spacer = screen.getByTestId('spacer');
    expect(spacer).toHaveStyle({ height: '0.5rem' });

    rerender(<ClaySpacer size="sm" data-testid="spacer" />);
    spacer = screen.getByTestId('spacer');
    expect(spacer).toHaveStyle({ height: '1rem' });

    rerender(<ClaySpacer size="md" data-testid="spacer" />);
    spacer = screen.getByTestId('spacer');
    expect(spacer).toHaveStyle({ height: '1.5rem' });

    rerender(<ClaySpacer size="lg" data-testid="spacer" />);
    spacer = screen.getByTestId('spacer');
    expect(spacer).toHaveStyle({ height: '2rem' });

    rerender(<ClaySpacer size="xl" data-testid="spacer" />);
    spacer = screen.getByTestId('spacer');
    expect(spacer).toHaveStyle({ height: '3rem' });

    rerender(<ClaySpacer size="2xl" data-testid="spacer" />);
    spacer = screen.getByTestId('spacer');
    expect(spacer).toHaveStyle({ height: '4rem' });

    rerender(<ClaySpacer size="3xl" data-testid="spacer" />);
    spacer = screen.getByTestId('spacer');
    expect(spacer).toHaveStyle({ height: '6rem' });

    rerender(<ClaySpacer size="4xl" data-testid="spacer" />);
    spacer = screen.getByTestId('spacer');
    expect(spacer).toHaveStyle({ height: '8rem' });

    rerender(<ClaySpacer size="5xl" data-testid="spacer" />);
    spacer = screen.getByTestId('spacer');
    expect(spacer).toHaveStyle({ height: '12rem' });
  });

  it('applies correct size styles for horizontal axis', () => {
    const { rerender } = render(<ClaySpacer size="xs" axis="horizontal" data-testid="spacer" />);
    let spacer = screen.getByTestId('spacer');
    expect(spacer).toHaveStyle({ width: '0.5rem' });

    rerender(<ClaySpacer size="lg" axis="horizontal" data-testid="spacer" />);
    spacer = screen.getByTestId('spacer');
    expect(spacer).toHaveStyle({ width: '2rem' });

    rerender(<ClaySpacer size="xl" axis="horizontal" data-testid="spacer" />);
    spacer = screen.getByTestId('spacer');
    expect(spacer).toHaveStyle({ width: '3rem' });
  });

  it('applies both width and height for both axis', () => {
    render(<ClaySpacer size="md" axis="both" data-testid="spacer" />);
    const spacer = screen.getByTestId('spacer');
    expect(spacer).toHaveStyle({ height: '1.5rem' });
    expect(spacer).toHaveStyle({ width: '1.5rem' });
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<ClaySpacer ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('accepts additional className', () => {
    render(<ClaySpacer className="custom-class" data-testid="spacer" />);
    expect(screen.getByTestId('spacer').className).toContain('custom-class');
  });

  it('passes through additional props', () => {
    render(<ClaySpacer data-id="test-123" data-testid="spacer" />);
    const spacer = screen.getByTestId('spacer');
    expect(spacer).toHaveAttribute('data-id', 'test-123');
  });
});
