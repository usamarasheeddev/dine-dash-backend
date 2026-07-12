const cache = new Map();

/**
 * Get a value from the cache
 * @param {string} key 
 * @returns {any|null}
 */
const get = (key) => {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
        cache.delete(key);
        return null;
    }
    return entry.value;
};

/**
 * Set a value in the cache
 * @param {string} key 
 * @param {any} value 
 * @param {number} ttlMs Default 60000ms (1 minute)
 */
const set = (key, value, ttlMs = 60000) => {
    cache.set(key, {
        value,
        expiry: Date.now() + ttlMs
    });
};

/**
 * Delete a value from the cache
 * @param {string} key 
 */
const del = (key) => {
    cache.delete(key);
};

/**
 * Invalidate all customer caches for a given company
 * @param {number|string} companyId 
 */
const invalidateCustomerCache = (companyId) => {
    const prefix = `customers:${companyId}:`;
    for (const key of cache.keys()) {
        if (key.startsWith(prefix)) {
            cache.delete(key);
        }
    }
};

module.exports = {
    get,
    set,
    del,
    invalidateCustomerCache
};
