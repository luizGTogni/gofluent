import type { LLMProvider } from "./provider.js";
import type { ProviderId } from "./id.js";

/**
 * PROVIDER.md §13 — resolves providers by stable ID. The TUI never
 * instantiates a provider directly; it asks the registry.
 */
export class ProviderRegistry {
  private readonly providers = new Map<ProviderId, LLMProvider>();

  register(provider: LLMProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: ProviderId): LLMProvider | undefined {
    return this.providers.get(id);
  }

  list(): LLMProvider[] {
    return Array.from(this.providers.values());
  }
}
