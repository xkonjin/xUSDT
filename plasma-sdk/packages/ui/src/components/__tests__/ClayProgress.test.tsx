import React from 'react';
import { render, screen } from '@testing-library/react';
import { ClayProgress, ClayProgressSteps } from '../ClayProgress';

describe('ClayProgress', () => {
  it('renders progress bar correctly', () => {
    render(<ClayProgress value={50} />);
    const progress = document.querySelector('.relative.w-full.rounded-full');
    expect(progress).toBeInTheDocument();
  });

  it('applies default styles', () => {
    render(<ClayProgress data-testid="progress" />);
    const progress = screen.getByTestId('progress');
    expect(progress.className).toContain('w-full');
  });

  it('displays correct percentage for given value', () => {
    render(<ClayProgress value={50} max={100} />);
    const fillBar = document.querySelector('.transition-all.duration-500.ease-out');
    expect(fillBar).toHaveStyle({ width: '50%' });
  });

  it('clamps percentage to 0 when value is negative', () => {
    render(<ClayProgress value={-10} />);
    const fillBar = document.querySelector('.transition-all.duration-500.ease-out');
    expect(fillBar).toHaveStyle({ width: '0%' });
  });

  it('clamps percentage to 100 when value exceeds max', () => {
    render(<ClayProgress value={150} max={100} />);
    const fillBar = document.querySelector('.transition-all.duration-500.ease-out');
    expect(fillBar).toHaveStyle({ width: '100%' });
  });

  it('applies correct size styles', () => {
    const { rerender } = render(<ClayProgress size="sm" data-testid="progress" />);
    let progressContainer = document.querySelector('.relative.w-full.rounded-full');
    expect(progressContainer?.className).toContain('h-2');

    rerender(<ClayProgress size="md" data-testid="progress" />);
    progressContainer = document.querySelector('.relative.w-full.rounded-full');
    expect(progressContainer?.className).toContain('h-3');

    rerender(<ClayProgress size="lg" data-testid="progress" />);
    progressContainer = document.querySelector('.relative.w-full.rounded-full');
    expect(progressContainer?.className).toContain('h-4');
  });

  it('applies correct variant styles', () => {
    const { rerender } = render(<ClayProgress variant="primary" />);
    let fillBar = document.querySelector('.transition-all.duration-500.ease-out');
    expect(fillBar?.className).toContain('from-blue-400');
    expect(fillBar?.className).toContain('to-blue-500');

    rerender(<ClayProgress variant="success" />);
    fillBar = document.querySelector('.transition-all.duration-500.ease-out');
    expect(fillBar?.className).toContain('from-emerald-400');
    expect(fillBar?.className).toContain('to-emerald-500');

    rerender(<ClayProgress variant="warning" />);
    fillBar = document.querySelector('.transition-all.duration-500.ease-out');
    expect(fillBar?.className).toContain('from-amber-400');
    expect(fillBar?.className).toContain('to-amber-500');

    rerender(<ClayProgress variant="danger" />);
    fillBar = document.querySelector('.transition-all.duration-500.ease-out');
    expect(fillBar?.className).toContain('from-red-400');
    expect(fillBar?.className).toContain('to-red-500');
  });

  it('shows label when showLabel is true', () => {
    render(<ClayProgress value={50} showLabel />);
    expect(screen.getByText('Progress')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('does not show label when showLabel is false', () => {
    render(<ClayProgress value={50} showLabel={false} />);
    expect(screen.queryByText('Progress')).not.toBeInTheDocument();
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
  });

  it('applies animation class when animated is true', () => {
    render(<ClayProgress animated />);
    const fillBar = document.querySelector('.transition-all.duration-500.ease-out');
    expect(fillBar?.className).toContain('animate-pulse');
  });

  it('does not apply animation class when animated is false', () => {
    render(<ClayProgress animated={false} />);
    const fillBar = document.querySelector('.transition-all.duration-500.ease-out');
    expect(fillBar?.className).not.toContain('animate-pulse');
  });

  it('handles 0 value correctly', () => {
    render(<ClayProgress value={0} />);
    const fillBar = document.querySelector('.transition-all.duration-500.ease-out');
    expect(fillBar).toHaveStyle({ width: '0%' });
  });

  it('handles max value correctly', () => {
    render(<ClayProgress value={100} max={100} />);
    const fillBar = document.querySelector('.transition-all.duration-500.ease-out');
    expect(fillBar).toHaveStyle({ width: '100%' });
  });

  it('handles custom max value', () => {
    render(<ClayProgress value={5} max={10} />);
    const fillBar = document.querySelector('.transition-all.duration-500.ease-out');
    expect(fillBar).toHaveStyle({ width: '50%' });
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<ClayProgress ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('accepts additional className', () => {
    render(<ClayProgress className="custom-class" data-testid="progress" />);
    expect(screen.getByTestId('progress').className).toContain('custom-class');
  });

  it('passes through additional props', () => {
    render(<ClayProgress data-id="test-123" data-testid="progress" />);
    const progress = screen.getByTestId('progress');
    expect(progress).toHaveAttribute('data-id', 'test-123');
  });
});

describe('ClayProgressSteps', () => {
  const mockSteps = [
    { label: 'Step 1', completed: true, active: false },
    { label: 'Step 2', completed: false, active: true },
    { label: 'Step 3', completed: false, active: false },
  ];

  it('renders all steps', () => {
    render(<ClayProgressSteps steps={mockSteps} />);
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByText('Step 3')).toBeInTheDocument();
  });

  it('applies default styles', () => {
    render(<ClayProgressSteps steps={mockSteps} data-testid="steps" />);
    const steps = screen.getByTestId('steps');
    expect(steps.className).toContain('flex');
    expect(steps.className).toContain('items-center');
    expect(steps.className).toContain('justify-between');
  });

  it('applies correct size styles', () => {
    const { rerender } = render(<ClayProgressSteps size="sm" steps={mockSteps} />);
    let stepCircles = document.querySelectorAll('.rounded-full');
    expect(stepCircles[0]?.className).toContain('w-6');
    expect(stepCircles[0]?.className).toContain('h-6');

    rerender(<ClayProgressSteps size="md" steps={mockSteps} />);
    stepCircles = document.querySelectorAll('.rounded-full');
    expect(stepCircles[0]?.className).toContain('w-8');
    expect(stepCircles[0]?.className).toContain('h-8');

    rerender(<ClayProgressSteps size="lg" steps={mockSteps} />);
    stepCircles = document.querySelectorAll('.rounded-full');
    expect(stepCircles[0]?.className).toContain('w-10');
    expect(stepCircles[0]?.className).toContain('h-10');
  });

  it('renders checkmark for completed step', () => {
    render(<ClayProgressSteps steps={mockSteps} />);
    const checkmark = document.querySelector('svg');
    expect(checkmark).toBeInTheDocument();
  });

  it('renders step number for active step', () => {
    render(<ClayProgressSteps steps={mockSteps} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('renders step number for pending step', () => {
    render(<ClayProgressSteps steps={mockSteps} />);
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('applies completed styles correctly', () => {
    render(<ClayProgressSteps steps={mockSteps} />);
    const firstStep = document.querySelectorAll('.rounded-full')[0];
    expect(firstStep?.className).toContain('from-emerald-400');
    expect(firstStep?.className).toContain('to-emerald-500');
  });

  it('applies active styles correctly', () => {
    render(<ClayProgressSteps steps={mockSteps} />);
    const secondStep = document.querySelectorAll('.rounded-full')[1];
    expect(secondStep?.className).toContain('from-blue-400');
    expect(secondStep?.className).toContain('to-blue-500');
    expect(secondStep?.className).toContain('scale-110');
  });

  it('applies pending styles correctly', () => {
    render(<ClayProgressSteps steps={mockSteps} />);
    const thirdStep = document.querySelectorAll('.rounded-full')[2];
    expect(thirdStep?.className).toContain('from-slate-200');
    expect(thirdStep?.className).toContain('to-slate-300');
  });

  it('renders connector lines between steps', () => {
    render(<ClayProgressSteps steps={mockSteps} />);
    const connectors = document.querySelectorAll('.flex-1.h-0.5');
    expect(connectors).toHaveLength(2);
  });

  it('applies completed style to connector when step is completed', () => {
    render(<ClayProgressSteps steps={mockSteps} />);
    const connectors = document.querySelectorAll('.flex-1.h-0.5');
    expect(connectors[0]?.className).toContain('bg-emerald-400');
  });

  it('applies active style to step label', () => {
    render(<ClayProgressSteps steps={mockSteps} />);
    const step2Label = screen.getByText('Step 2');
    expect(step2Label).toHaveClass('text-blue-600');
  });

  it('applies pending style to step label', () => {
    render(<ClayProgressSteps steps={mockSteps} />);
    const step3Label = screen.getByText('Step 3');
    expect(step3Label).toHaveClass('text-slate-500');
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<ClayProgressSteps ref={ref} steps={mockSteps} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('accepts additional className', () => {
    render(<ClayProgressSteps className="custom-class" data-testid="steps" steps={mockSteps} />);
    expect(screen.getByTestId('steps').className).toContain('custom-class');
  });

  it('passes through additional props', () => {
    render(<ClayProgressSteps data-id="test-123" data-testid="steps" steps={mockSteps} />);
    const steps = screen.getByTestId('steps');
    expect(steps).toHaveAttribute('data-id', 'test-123');
  });

  it('handles single step', () => {
    const singleStep = [{ label: 'Only Step', completed: false, active: true }];
    render(<ClayProgressSteps steps={singleStep} />);
    expect(screen.getByText('Only Step')).toBeInTheDocument();
    const connectors = document.querySelectorAll('.flex-1.h-0.5');
    expect(connectors).toHaveLength(0);
  });

  it('handles all steps completed', () => {
    const allCompleted = [
      { label: 'Step 1', completed: true, active: false },
      { label: 'Step 2', completed: true, active: false },
      { label: 'Step 3', completed: true, active: false },
    ];
    render(<ClayProgressSteps steps={allCompleted} />);
    const checkmarks = document.querySelectorAll('svg');
    expect(checkmarks).toHaveLength(3);
  });
});
