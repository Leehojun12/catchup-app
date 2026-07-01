// Stub for Expo Go — avoids bundling native WatermelonDB (Hermes parse errors).
// Used via metro.config.js alias when EXPO_PUBLIC_USE_WATERMELON !== 'true'.

function decorator() {
  return () => {};
}

export class Model {
  static table = '';
  update() {
    return Promise.resolve();
  }
  destroyPermanently() {
    return Promise.resolve();
  }
}

export class Database {
  constructor() {
    this.collections = new Map();
  }
  get(name) {
    if (!this.collections.has(name)) {
      this.collections.set(name, {
        query: () => ({
          fetch: async () => [],
          fetchCount: async () => 0,
          observe: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
        }),
        create: async () => ({ toPlain: () => ({}) }),
        find: async () => ({
          update: async () => {},
          destroyPermanently: async () => {},
          toPlain: () => ({}),
        }),
      });
    }
    return this.collections.get(name);
  }
  write(fn) {
    return fn();
  }
}

export default class SQLiteAdapter {
  constructor() {}
}

export const appSchema = (config) => config;
export const tableSchema = (config) => config;
export const field = decorator;
export const text = decorator;
export const date = decorator;
export const json = decorator;
export const readonly = decorator;
export const writer = decorator;
export const Q = {
  where: () => Q,
  sortBy: () => Q,
  asc: () => Q,
  desc: () => Q,
};
