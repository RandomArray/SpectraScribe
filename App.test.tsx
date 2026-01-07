import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import React from 'react';

// Mock dependencies
vi.mock('./hooks/useLiveAudio', () => ({
  useLiveAudio: () => ({
    start: vi.fn(),
    stop: vi.fn(),
    status: 'disconnected',
    analyser: null,
    transcriptions: [],
    error: null,
    setGain: vi.fn()
  })
}));

vi.mock('./hooks/useChat', () => ({
  useChat: () => ({
    messages: [],
    sendMessage: vi.fn()
  })
}));

// Mock Lucide icons to avoid rendering issues if any
vi.mock('lucide-react', async () => {
    const actual = await vi.importActual('lucide-react');
    return {
        ...actual,
        // Optional: mock specific icons if needed, or rely on actual
    };
});

describe('App Component', () => {
  it('renders login screen initially', () => {
    render(<App />);
    expect(screen.getByText(/SpectraScribe/i)).toBeInTheDocument();
    expect(screen.getByText(/Join a secure room/i)).toBeInTheDocument();
  });
});
