// @vitest-environment jsdom
import { describe, it, expect, afterEach } from 'vitest';
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
});
