/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as cachedSpells from "../cachedSpells.js";
import type * as customClasses from "../customClasses.js";
import type * as customSpells from "../customSpells.js";
import type * as players from "../players.js";
import type * as prisms from "../prisms.js";
import type * as spellMappings from "../spellMappings.js";
import type * as spells from "../spells.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  cachedSpells: typeof cachedSpells;
  customClasses: typeof customClasses;
  customSpells: typeof customSpells;
  players: typeof players;
  prisms: typeof prisms;
  spellMappings: typeof spellMappings;
  spells: typeof spells;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
