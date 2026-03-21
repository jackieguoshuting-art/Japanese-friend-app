// Standalone safe read — used throughout the app
export function load(key, defaultValue = null) {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

// Standalone safe write — used throughout the app
export function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error(key, e);
  }
}

// Legacy object API — delegates to load/save for backward compatibility
export const storage = {
  get(key, fallback = null) {
    return load(key, fallback);
  },
  set(key, value) {
    save(key, value);
  }
};
