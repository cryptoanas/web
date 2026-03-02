import fs from 'node:fs';
import path from 'node:path';
import { botConfigSchema } from './schema';
import { BotConfig } from '../types';

export class ConfigStore {
  constructor(private readonly configPath: string) {}

  load(): BotConfig {
    const raw = fs.readFileSync(this.configPath, 'utf-8');
    const parsed = JSON.parse(raw);
    return botConfigSchema.parse(parsed) as BotConfig;
  }

  save(config: BotConfig): void {
    const validated = botConfigSchema.parse(config);
    const dir = path.dirname(this.configPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(this.configPath, JSON.stringify(validated, null, 2));
  }

  update(mutator: (cfg: BotConfig) => BotConfig): BotConfig {
    const current = this.load();
    const updated = mutator(current);
    this.save(updated);
    return updated;
  }
}
