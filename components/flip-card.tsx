'use client';

import { useState, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';

export default function FlipCard({ front, back }: { front: ReactNode; back: ReactNode }) {
  const [flipped, setFlipped] = useState(false);
  const toggle = () => setFlipped(value => !value);
  const onClick = (event: MouseEvent<HTMLDivElement>) => {
    // Let a real link on the back face navigate instead of just flipping the card.
    if ((event.target as HTMLElement).closest('a')) return;
    toggle();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(); }
  };
  return <div className="flip-card" data-flipped={flipped || undefined}>
    <div className="flip-card-inner" role="button" tabIndex={0} aria-pressed={flipped} onClick={onClick} onKeyDown={onKeyDown}>
      <div className="flip-card-face flip-card-front">{front}</div>
      <div className="flip-card-face flip-card-back">{back}</div>
    </div>
  </div>;
}
