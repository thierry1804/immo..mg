import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/redis", () => ({
  redis: {
    incr: vi.fn(),
    expire: vi.fn(),
    ttl: vi.fn().mockResolvedValue(30),
  },
}));

import { redis } from "@/lib/redis";
import { rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.RATE_LIMIT_DISABLED;
  });

  it("allows when under limit", async () => {
    vi.mocked(redis.incr).mockResolvedValue(1);
    const r = await rateLimit("test:1", 5, 60);
    expect(r.ok).toBe(true);
  });

  it("blocks when over limit", async () => {
    vi.mocked(redis.incr).mockResolvedValue(6);
    const r = await rateLimit("test:2", 5, 60);
    expect(r.ok).toBe(false);
  });

  it("bypasses when disabled", async () => {
    process.env.RATE_LIMIT_DISABLED = "true";
    const r = await rateLimit("test:3", 1, 60);
    expect(r.ok).toBe(true);
  });
});
