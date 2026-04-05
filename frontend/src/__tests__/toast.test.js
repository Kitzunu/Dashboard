import { describe, it, expect, vi } from 'vitest';
import { toast } from '../toast';

describe('toast', () => {
  it('dispatches a custom "toast" event on the window', () => {
    const handler = vi.fn();
    window.addEventListener('toast', handler);

    toast('Hello!');

    expect(handler).toHaveBeenCalledTimes(1);
    const event = handler.mock.calls[0][0];
    expect(event.detail).toEqual({ text: 'Hello!', type: 'success' });

    window.removeEventListener('toast', handler);
  });

  it('uses the provided type', () => {
    const handler = vi.fn();
    window.addEventListener('toast', handler);

    toast('Oops', 'error');

    const event = handler.mock.calls[0][0];
    expect(event.detail).toEqual({ text: 'Oops', type: 'error' });

    window.removeEventListener('toast', handler);
  });

  it('defaults to "success" type when none specified', () => {
    const handler = vi.fn();
    window.addEventListener('toast', handler);

    toast('Done');

    const event = handler.mock.calls[0][0];
    expect(event.detail.type).toBe('success');

    window.removeEventListener('toast', handler);
  });
});
