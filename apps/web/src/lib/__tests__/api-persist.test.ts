import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createHighlight } from '../api-persist';
import { mutateOrQueue } from '../sync-queue';

// Mock the dependencies
vi.mock('../sync-queue', () => ({
  mutateOrQueue: vi.fn(),
}));

describe('createHighlight', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a highlight with default values when only text is provided', () => {
    // Setup mocked time so we can check savedAt reliably
    const mockDate = new Date('2023-01-01T00:00:00.000Z');
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);

    createHighlight({ text: 'Sample text' });

    expect(mutateOrQueue).toHaveBeenCalledTimes(1);
    expect(mutateOrQueue).toHaveBeenCalledWith({
      endpoint: '/api/highlights',
      method: 'POST',
      body: {
        text: 'Sample text',
        source: '',
        url: '',
        topic: 'Web',
        topicColor: 'bg-blue-500/20 text-blue-300',
        savedAt: mockDate.toISOString(),
        folder: null,
        folderId: null,
        note: null,
        tags: [],
        isCode: false,
        isFavorite: false,
        isArchived: false,
        isPinned: false,
        highlightColor: null,
      },
      offlineFallback: expect.objectContaining({
        endpoint: '/api/highlights',
        method: 'POST',
        entityType: 'highlight',
      }),
    });

    vi.useRealTimers();
  });

  it('passes through all provided fields correctly', () => {
    createHighlight({
      text: 'Detailed text',
      source: 'Example Source',
      url: 'https://example.com',
      topic: 'Research',
      topicColor: 'bg-red-500 text-white',
      savedAt: '2023-05-01T12:00:00Z',
      folder: 'My Folder',
      folderId: '123',
      note: 'A quick note',
      tags: ['tag1', 'tag2'],
      isCode: true,
      isFavorite: true,
      isArchived: true,
      isPinned: true,
      highlightColor: 'yellow',
    });

    expect(mutateOrQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          text: 'Detailed text',
          source: 'Example Source',
          url: 'https://example.com',
          topic: 'Research',
          topicColor: 'bg-red-500 text-white',
          savedAt: '2023-05-01T12:00:00Z',
          folder: 'My Folder',
          folderId: 123,
          note: 'A quick note',
          tags: ['tag1', 'tag2'],
          isCode: true,
          isFavorite: true,
          isArchived: true,
          isPinned: true,
          highlightColor: 'yellow',
        }),
      })
    );
  });

  it('handles negative numeric folderId by converting to null (temporary IDs)', () => {
    createHighlight({
      text: 'Text with negative folderId',
      folderId: '-123',
    });

    expect(mutateOrQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          folderId: null,
        }),
      })
    );
  });

  it('handles non-numeric folderId (like UUIDs) by converting to null', () => {
    createHighlight({
      text: 'Text with UUID folderId',
      folderId: 'abc-123-def',
    });

    expect(mutateOrQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          folderId: null,
        }),
      })
    );
  });

  it('correctly parses positive numeric strings as folderId', () => {
    createHighlight({
      text: 'Text with string folderId',
      folderId: '456',
    });

    expect(mutateOrQueue).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.objectContaining({
          folderId: 456,
        }),
      })
    );
  });
});
