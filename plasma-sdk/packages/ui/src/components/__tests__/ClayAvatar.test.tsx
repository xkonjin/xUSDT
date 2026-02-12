import React from 'react';
import { render, screen } from '@testing-library/react';
import { ClayAvatar, ClayAvatarGroup } from '../ClayAvatar';

// Mock Next.js Image component
jest.mock('next/image', () => ({
  __esModule: true,
  default: ({ src, alt, className }: any) => (
    <img src={src} alt={alt} className={className} />
  ),
}));

describe('ClayAvatar', () => {
  it('renders avatar with initials', () => {
    render(<ClayAvatar name="John Doe" />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders initials from single name', () => {
    render(<ClayAvatar name="John" />);
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('renders initials from email', () => {
    render(<ClayAvatar name="john@example.com" />);
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('renders initials from wallet address', () => {
    render(<ClayAvatar name="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb7" />);
    expect(screen.getByText('4D')).toBeInTheDocument();
  });

  it('renders image when src is provided', () => {
    render(<ClayAvatar name="John Doe" src="/avatar.jpg" />);
    const img = screen.getByRole('img');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', '/avatar.jpg');
    expect(img).toHaveAttribute('alt', 'John Doe');
  });

  it('applies default styles', () => {
    render(<ClayAvatar name="John" data-testid="avatar" />);
    const avatar = screen.getByTestId('avatar');
    expect(avatar.className).toContain('relative');
    expect(avatar.className).toContain('flex-shrink-0');
  });

  it('applies correct size styles', () => {
    const { rerender } = render(<ClayAvatar name="John" size="sm" data-testid="avatar" />);
    let avatar = screen.getByTestId('avatar');
    expect(avatar.className).toContain('w-8');
    expect(avatar.className).toContain('h-8');

    rerender(<ClayAvatar name="John" size="md" data-testid="avatar" />);
    avatar = screen.getByTestId('avatar');
    expect(avatar.className).toContain('w-10');
    expect(avatar.className).toContain('h-10');

    rerender(<ClayAvatar name="John" size="lg" data-testid="avatar" />);
    avatar = screen.getByTestId('avatar');
    expect(avatar.className).toContain('w-12');
    expect(avatar.className).toContain('h-12');

    rerender(<ClayAvatar name="John" size="xl" data-testid="avatar" />);
    avatar = screen.getByTestId('avatar');
    expect(avatar.className).toContain('w-16');
    expect(avatar.className).toContain('h-16');

    rerender(<ClayAvatar name="John" size="2xl" data-testid="avatar" />);
    avatar = screen.getByTestId('avatar');
    expect(avatar.className).toContain('w-20');
    expect(avatar.className).toContain('h-20');
  });

  it('applies correct rounded styles', () => {
    const { rerender } = render(<ClayAvatar name="John" rounded="full" data-testid="avatar" />);
    let avatar = screen.getByTestId('avatar');
    expect(avatar.className).toContain('rounded-full');

    rerender(<ClayAvatar name="John" rounded="2xl" data-testid="avatar" />);
    avatar = screen.getByTestId('avatar');
    expect(avatar.className).toContain('rounded-3xl');
  });

  it('renders status indicator when status is provided', () => {
    render(<ClayAvatar name="John" status="online" />);
    const statusIndicator = document.querySelector('.bg-emerald-500');
    expect(statusIndicator).toBeInTheDocument();
  });

  it('applies correct status colors', () => {
    const { rerender } = render(<ClayAvatar name="John" status="online" />);
    expect(document.querySelector('.bg-emerald-500')).toBeInTheDocument();

    rerender(<ClayAvatar name="John" status="offline" />);
    expect(document.querySelector('.bg-slate-400')).toBeInTheDocument();

    rerender(<ClayAvatar name="John" status="busy" />);
    expect(document.querySelector('.bg-red-500')).toBeInTheDocument();

    rerender(<ClayAvatar name="John" status="away" />);
    expect(document.querySelector('.bg-amber-500')).toBeInTheDocument();
  });

  it('does not render status indicator when status is not provided', () => {
    render(<ClayAvatar name="John" />);
    const statusIndicators = document.querySelectorAll('.bg-emerald-500, .bg-slate-400, .bg-red-500, .bg-amber-500');
    expect(statusIndicators).toHaveLength(0);
  });

  it('applies background color based on name', () => {
    render(<ClayAvatar name="John Doe" />);
    const innerDiv = document.querySelector('.font-bold.text-white');
    expect(innerDiv).toHaveStyle({ backgroundColor: expect.any(String) });
  });

  it('applies different background colors for different names', () => {
    const { rerender } = render(<ClayAvatar name="John Doe" />);
    const johnColor = document.querySelector('.font-bold.text-white')?.getAttribute('style');

    rerender(<ClayAvatar name="Jane Smith" />);
    const janeColor = document.querySelector('.font-bold.text-white')?.getAttribute('style');

    expect(johnColor).not.toBe(janeColor);
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<ClayAvatar name="John" ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });

  it('accepts additional className', () => {
    render(<ClayAvatar name="John" className="custom-class" data-testid="avatar" />);
    expect(screen.getByTestId('avatar').className).toContain('custom-class');
  });

  it('handles empty name', () => {
    render(<ClayAvatar name="" />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('handles name with extra spaces', () => {
    render(<ClayAvatar name="  John   Doe  " />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('handles name with special characters', () => {
    render(<ClayAvatar name="John-Doe" />);
    expect(screen.getByText('J')).toBeInTheDocument();
  });
});

describe('ClayAvatarGroup', () => {
  const mockNames = ['Alice', 'Bob', 'Charlie', 'David', 'Eve'];

  it('renders all visible avatars', () => {
    render(<ClayAvatarGroup names={['Alice', 'Bob', 'Charlie']} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
  });

  it('respects max prop', () => {
    render(<ClayAvatarGroup names={mockNames} max={2} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.queryByText('C')).not.toBeInTheDocument();
    expect(screen.getByText('+3')).toBeInTheDocument();
  });

  it('shows remaining count', () => {
    render(<ClayAvatarGroup names={mockNames} max={3} />);
    expect(screen.getByText('+2')).toBeInTheDocument();
  });

  it('applies default spacing', () => {
    render(<ClayAvatarGroup names={['Alice', 'Bob']} data-testid="group" />);
    const group = screen.getByTestId('group');
    expect(group.className).toContain('-space-x-4');
  });

  it('applies correct spacing styles', () => {
    const { rerender } = render(<ClayAvatarGroup names={['Alice', 'Bob']} spacing="sm" data-testid="group" />);
    let group = screen.getByTestId('group');
    expect(group.className).toContain('-space-x-3');

    rerender(<ClayAvatarGroup names={['Alice', 'Bob']} spacing="md" data-testid="group" />);
    group = screen.getByTestId('group');
    expect(group.className).toContain('-space-x-4');

    rerender(<ClayAvatarGroup names={['Alice', 'Bob']} spacing="lg" data-testid="group" />);
    group = screen.getByTestId('group');
    expect(group.className).toContain('-space-x-5');
  });

  it('applies correct size to all avatars', () => {
    const { rerender } = render(<ClayAvatarGroup names={['Alice', 'Bob']} size="sm" />);
    let avatars = document.querySelectorAll('.w-8');
    expect(avatars).toHaveLength(2);

    rerender(<ClayAvatarGroup names={['Alice', 'Bob']} size="lg" />);
    avatars = document.querySelectorAll('.w-12');
    expect(avatars).toHaveLength(2);
  });

  it('uses srcs when provided', () => {
    render(
      <ClayAvatarGroup
        names={['Alice', 'Bob']}
        srcs={['/alice.jpg', '/bob.jpg']}
      />
    );
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(2);
    expect(images[0]).toHaveAttribute('src', '/alice.jpg');
    expect(images[1]).toHaveAttribute('src', '/bob.jpg');
  });

  it('applies ring styles to avatars', () => {
    render(<ClayAvatarGroup names={['Alice', 'Bob']} />);
    const avatars = document.querySelectorAll('.ring-3');
    expect(avatars).toHaveLength(2);
  });

  it('handles single avatar', () => {
    render(<ClayAvatarGroup names={['Alice']} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.queryByText('+0')).not.toBeInTheDocument();
  });

  it('handles exact max count', () => {
    render(<ClayAvatarGroup names={['Alice', 'Bob', 'Charlie']} max={3} />);
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.queryByText('+')).not.toBeInTheDocument();
  });

  it('forwards ref correctly', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<ClayAvatarGroup names={['Alice']} ref={ref} />);
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
  });
});
