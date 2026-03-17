import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  broadcastHighlights,
  broadcastFolders,
  broadcastTags,
  attachCrossTabListener,
} from "../../lib/cross-tab-sync";
import { useDashboardStore, type Highlight, type Folder, type Tag } from "@/store/dashboard";

// Mock the store
vi.mock("@/store/dashboard", () => ({
  useDashboardStore: {
    setState: vi.fn(),
  },
}));

describe("cross-tab-sync", () => {
  let mockPostMessage: ReturnType<typeof vi.fn>;
  let mockAddEventListener: ReturnType<typeof vi.fn>;
  let mockRemoveEventListener: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset window and channel state
    mockPostMessage = vi.fn();
    mockAddEventListener = vi.fn();
    mockRemoveEventListener = vi.fn();

    const MockBroadcastChannel = vi.fn(() => ({
      postMessage: mockPostMessage,
      addEventListener: mockAddEventListener,
      removeEventListener: mockRemoveEventListener,
      close: vi.fn(),
    }));

    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
    vi.stubGlobal("window", {}); // ensure window is defined
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();

    // reset module state (the cached channel) by re-importing or reloading?
    // Actually, we can reset modules with vi.resetModules()
    vi.resetModules();
  });

  it("should initialize a BroadcastChannel when broadcasting highlights", async () => {
    // We need to dynamically import to get fresh module state due to the singleton `channel`
    const { broadcastHighlights } = await import("../../lib/cross-tab-sync");

    const highlights: Highlight[] = [];
    broadcastHighlights(highlights);

    expect(mockPostMessage).toHaveBeenCalledTimes(1);
    const callArgs = mockPostMessage.mock.calls[0][0];

    expect(callArgs.type).toBe("highlights:set");
    expect(callArgs.highlights).toBe(highlights);
    expect(typeof callArgs.tabId).toBe("string");
  });

  it("should broadcast folders correctly", async () => {
    const { broadcastFolders } = await import("../../lib/cross-tab-sync");

    const folders: Folder[] = [];
    broadcastFolders(folders);

    expect(mockPostMessage).toHaveBeenCalledTimes(1);
    const callArgs = mockPostMessage.mock.calls[0][0];

    expect(callArgs.type).toBe("folders:set");
    expect(callArgs.folders).toBe(folders);
  });

  it("should broadcast tags correctly", async () => {
    const { broadcastTags } = await import("../../lib/cross-tab-sync");

    const tags: Tag[] = [];
    broadcastTags(tags);

    expect(mockPostMessage).toHaveBeenCalledTimes(1);
    const callArgs = mockPostMessage.mock.calls[0][0];

    expect(callArgs.type).toBe("tags:set");
    expect(callArgs.tags).toBe(tags);
  });

  it("should not initialize BroadcastChannel if window is undefined", async () => {
    vi.stubGlobal("window", undefined);
    const { broadcastHighlights } = await import("../../lib/cross-tab-sync");

    broadcastHighlights([]);
    expect(mockPostMessage).not.toHaveBeenCalled();
  });

  it("should attach listener and update store on message", async () => {
    const { attachCrossTabListener } = await import("../../lib/cross-tab-sync");
    const { useDashboardStore } = await import("@/store/dashboard");

    const cleanup = attachCrossTabListener();

    expect(mockAddEventListener).toHaveBeenCalledTimes(1);
    expect(mockAddEventListener.mock.calls[0][0]).toBe("message");
    const handler = mockAddEventListener.mock.calls[0][1];

    const highlights: Highlight[] = [{ id: "1", text: "test", color: "yellow", url: "http://example.com", createdAt: new Date().toISOString() }];

    // Trigger handler
    handler({
      data: {
        tabId: "different-tab-id", // Ensure it's not the same tabId
        type: "highlights:set",
        highlights,
      }
    } as MessageEvent);

    expect(useDashboardStore.setState).toHaveBeenCalledTimes(1);
    expect(useDashboardStore.setState).toHaveBeenCalledWith({ highlights });

    // Clean up
    cleanup();
    expect(mockRemoveEventListener).toHaveBeenCalledTimes(1);
    expect(mockRemoveEventListener.mock.calls[0][0]).toBe("message");
    expect(mockRemoveEventListener.mock.calls[0][1]).toBe(handler);
  });

  it("should ignore messages from the same tabId", async () => {
    const { attachCrossTabListener, broadcastHighlights } = await import("../../lib/cross-tab-sync");
    const { useDashboardStore } = await import("@/store/dashboard");

    attachCrossTabListener();
    const handler = mockAddEventListener.mock.calls[0][1];

    // Trigger a broadcast to capture the internal TAB_ID
    broadcastHighlights([]);
    const myTabId = mockPostMessage.mock.calls[0][0].tabId;

    // Trigger handler with SAME tabId
    handler({
      data: {
        tabId: myTabId,
        type: "highlights:set",
        highlights: [],
      }
    } as MessageEvent);

    // setState should not be called
    expect(useDashboardStore.setState).not.toHaveBeenCalled();
  });
});
