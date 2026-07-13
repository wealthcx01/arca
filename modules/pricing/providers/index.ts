/**
 * Register all pricing providers.
 * Import this module to populate the provider registry.
 */

import { registerProvider } from "./registry";

import { pokemonTcgProvider } from "./pokemon-tcg";
import { tcgcsvProvider } from "./tcgcsv";
// Free providers
import { tcgdexProvider } from "./tcgdex";

// BYOK providers
import { pokemonPriceTrackerProvider } from "./pokemon-price-tracker";
import { poketraceProvider } from "./poketrace";
import { pricechartingProvider } from "./pricecharting";

registerProvider(tcgdexProvider);
registerProvider(tcgcsvProvider);
registerProvider(pokemonTcgProvider);
registerProvider(pokemonPriceTrackerProvider);
registerProvider(poketraceProvider);
registerProvider(pricechartingProvider);

export {
  tcgdexProvider,
  tcgcsvProvider,
  pokemonTcgProvider,
  pokemonPriceTrackerProvider,
  poketraceProvider,
  pricechartingProvider,
};
