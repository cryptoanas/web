import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ConfigStore } from '../src/config/store';

describe('ConfigStore', () => {
  it('loads and updates config safely', () => {
    const src = path.resolve('config/runtime-config.json');
    const tmp = path.join(os.tmpdir(), `bot-config-${Date.now()}.json`);
    fs.copyFileSync(src, tmp);

    const store = new ConfigStore(tmp);
    const cfg = store.load();
    expect(cfg.trading.leverage).toBeGreaterThan(0);

    const updated = store.update((c) => ({ ...c, trading: { ...c.trading, leverage: 5 } }));
    expect(updated.trading.leverage).toBe(5);
  });
});
