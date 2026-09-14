import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DESPENSA_FILTERED_EVENT } from '../despensa-filter';
import { refreshOnDespensaFilter } from './refresh-on-filter';

const nextFrame = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

const filtered = () =>
  document.querySelector('#despensa')!.dispatchEvent(new CustomEvent(DESPENSA_FILTERED_EVENT));

describe('refreshOnDespensaFilter', () => {
  beforeEach(() => {
    document.body.innerHTML = '<section id="despensa"></section>';
  });
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('refreshes ScrollTrigger once per animation frame after filtering', async () => {
    const scrollTrigger = { refresh: vi.fn() };
    const cleanup = refreshOnDespensaFilter(scrollTrigger);

    filtered();
    filtered();
    filtered();
    expect(scrollTrigger.refresh).not.toHaveBeenCalled();

    await nextFrame();
    expect(scrollTrigger.refresh).toHaveBeenCalledTimes(1);

    filtered();
    await nextFrame();
    expect(scrollTrigger.refresh).toHaveBeenCalledTimes(2);
    cleanup();
  });

  it('cleanup removes the listener and cancels a pending refresh', async () => {
    const scrollTrigger = { refresh: vi.fn() };
    const cleanup = refreshOnDespensaFilter(scrollTrigger);

    filtered();
    cleanup();
    await nextFrame();
    filtered();
    await nextFrame();
    expect(scrollTrigger.refresh).not.toHaveBeenCalled();
  });

  it('returns a no-op cleanup when the pantry is missing', async () => {
    document.body.innerHTML = '<main></main>';
    const scrollTrigger = { refresh: vi.fn() };
    const cleanup = refreshOnDespensaFilter(scrollTrigger);
    expect(cleanup).toBeTypeOf('function');
    expect(() => cleanup()).not.toThrow();
  });
});
