/**
 * Provider registry — central lookup for all pricing sources.
 */

import type { PriceProvider } from "./types";

const providers = new Map<string, PriceProvider>();

export function registerProvider(provider: PriceProvider): void {
  providers.set(provider.name, provider);
}

export function getProvider(name: string): PriceProvider | undefined {
  return providers.get(name);
}

export function getFreeProviders(): PriceProvider[] {
  return Array.from(providers.values()).filter((p) => !p.requiresKey);
}

export function getByokProviders(): PriceProvider[] {
  return Array.from(providers.values()).filter((p) => p.requiresKey);
}

export function getAllProviders(): PriceProvider[] {
  return Array.from(providers.values());
}
