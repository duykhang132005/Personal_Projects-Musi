// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import DataView from './DataView.jsx';
import { emptyLibrary } from '../lib/library.js';

describe('DataView status region', () => {
  afterEach(() => cleanup());

  it('keeps a polite status live region mounted, even before any message', () => {
    render(<DataView lib={emptyLibrary()} setLib={() => {}} />);
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.textContent).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Clear search cache' }));
    expect(status.textContent).toBe('Search cache cleared.');
    expect(status.className).toBe('muted');
  });

  it('uses the error style when an import fails', async () => {
    render(<DataView lib={emptyLibrary()} setLib={() => {}} />);
    const input = document.querySelector('input[type="file"]');
    const file = new File(['{"nope":1}'], 'bad.json', { type: 'application/json' });
    fireEvent.change(input, { target: { files: [file] } });
    const status = screen.getByRole('status');
    await waitFor(() => expect(status.textContent).toMatch(/^Import failed:/));
    expect(status.className).toBe('error');
  });

  it('revokes the export blob URL only after the download click', () => {
    const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:musi-export');
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    vi.useFakeTimers();
    try {
      render(<DataView lib={emptyLibrary()} setLib={() => {}} />);
      fireEvent.click(screen.getByRole('button', { name: 'Export JSON' }));
      expect(create).toHaveBeenCalledTimes(1);
      expect(click).toHaveBeenCalledTimes(1);
      expect(revoke).not.toHaveBeenCalled();
      expect(screen.getByRole('status').textContent).toBe('Exported.');
      vi.runAllTimers();
      expect(revoke).toHaveBeenCalledTimes(1);
      expect(revoke).toHaveBeenCalledWith('blob:musi-export');
      expect(click.mock.invocationCallOrder[0]).toBeLessThan(revoke.mock.invocationCallOrder[0]);
    } finally {
      vi.useRealTimers();
      create.mockRestore();
      revoke.mockRestore();
      click.mockRestore();
    }
  });
});
