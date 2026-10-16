// Salvare locală în IndexedDB: tot în telefon, dar cu mult mai mult spațiu decât localStorage.
// Toată starea aplicației e un singur obiect, salvat sub o singură cheie.

const DB_NAME = 'finante';
const STORE = 'kv';
const KEY = 'state';
let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('IndexedDB indisponibil'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('IndexedDB blocat'));
  });
  dbPromise.catch(() => { dbPromise = null; });
  return dbPromise;
}

// Tranzacțiile de scriere se aplică în ordinea în care au fost pornite, deci ultima salvare câștigă.
function run(mode, fn) {
  return openDb().then(db => new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = fn(t.objectStore(STORE));
    t.oncomplete = () => resolve(req.result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  }));
}

export const idbGet = () => run('readonly', s => s.get(KEY));
export const idbSet = value => run('readwrite', s => s.put(value, KEY));
export const idbDelete = () => run('readwrite', s => s.delete(KEY));
