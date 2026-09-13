// SyncroFlow — Jest setup (bare RN 0.81.5)
// Mock nativi minimi per far girare __tests__/chatPayload.test.ts senza dipendenze native.

jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  // Se preset react-native non disponibile in CI, fallback mock leggero
  if (RN && RN.Platform) return RN;
  return {
    Platform: { OS: 'android', select: (o) => o.android ?? o.default },
    StyleSheet: { create: (s) => s, flatten: (s) => s },
  };
});

// Mock expo-crypto / expo-network / NetInfo usati da meshSync (evita require crash)
jest.mock('expo-crypto', () => ({ randomUUID: () => '00000000-0000-4000-a000-000000000000' }), { virtual: true });
jest.mock('expo-network', () => ({ getIpAddressAsync: jest.fn(async () => '192.168.1.100') }), { virtual: true });
jest.mock('@react-native-community/netinfo', () => ({ fetch: jest.fn(async () => ({ details: { ipAddress: '192.168.1.100' } })) }), { virtual: true });

// Silenzia console.log rumorosi in test (riattivabili con JEST_VERBOSE=1)
if (!process.env.JEST_VERBOSE) {
  const origLog = console.log;
  console.log = (...args) => {
    const msg = String(args[0] ?? '');
    if (msg.includes('[meshSync') || msg.includes('[mediaCompressor') || msg.includes('[HydratedCard')) return;
    origLog(...args);
  };
}
