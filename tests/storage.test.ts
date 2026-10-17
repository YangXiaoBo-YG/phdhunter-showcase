import assert from 'node:assert/strict';
import test from 'node:test';
import { addFavorite, removeFavorite, getFavorites, subscribeFavorites } from '../src/lib/storage';

test('favorites notify subscribers in the same tab and unsubscribe correctly', () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const events = new EventTarget();
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: events });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  } });
  let unsubscribe = () => {};
  try {
    let notifications = 0;
    unsubscribe = subscribeFavorites(() => { notifications++; });
    addFavorite('job-a');
    addFavorite('job-a');
    assert.deepEqual(getFavorites(), ['job-a']);
    assert.equal(notifications, 1);
    removeFavorite('job-a');
    assert.deepEqual(getFavorites(), []);
    assert.equal(notifications, 2);
    events.dispatchEvent(new Event('storage'));
    assert.equal(notifications, 3);
    unsubscribe();
    addFavorite('job-b');
    assert.equal(notifications, 3);
  } finally {
    unsubscribe();
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
    if (originalStorage) Object.defineProperty(globalThis, 'localStorage', originalStorage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
