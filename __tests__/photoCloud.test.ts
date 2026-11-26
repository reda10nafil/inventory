// 26/11: foto online (archivio pubblico «product-photos»): percorsi accettati dalla regola dell'archivio, tipi, conti.
jest.mock('../backend-auth/supabase/client', () => ({ supabase: {} }));
jest.mock('../src/lib/fileSystem', () => ({}));

import { isRemote, newUuid, photoCounts, photoPath, photoType } from '../utils/photoCloud';

// La stessa espressione della regola su Supabase (migrazione product_photos_public_bucket)
const POLICY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/[A-Za-z0-9._-]{1,120}$/;

describe('photoCloud', () => {
  it('uuid del telefono e percorso passano la regola dell\'archivio, anche con un id strano', () => {
    const folder = newUuid();
    expect(folder).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(photoPath(folder, 'prod 1/àè#?', 0, 'jpg', 123)).toBe(`${folder}/prod1_123_1.jpg`);
    expect(photoPath(folder, 'p_'.repeat(80), 2, 'png', 1)).toMatch(POLICY);
    expect(photoPath(folder, '???', 0, 'jpg', 1)).toBe(`${folder}/prodotto_1_1.jpg`);
  });

  it('tipo dal nome del file; senza estensione nota vale jpg', () => {
    expect(photoType('file:///a/b/foto.PNG')).toEqual({ ext: 'png', mime: 'image/png' });
    expect(photoType('file:///a/b/foto.jpeg?x=1')).toEqual({ ext: 'jpg', mime: 'image/jpeg' });
    expect(photoType('content://media/external/images/42')).toEqual({ ext: 'jpg', mime: 'image/jpeg' });
  });

  it('online = link http; conta le foto dei prodotti non eliminati', () => {
    expect(isRemote('https://x.supabase.co/storage/v1/object/public/product-photos/a.jpg')).toBe(true);
    expect(isRemote('file:///data/foto.jpg')).toBe(false);
    expect(photoCounts([
      { images: ['https://a/1.jpg', 'file:///2.jpg'] },
      { images: ['file:///3.jpg'], deletedAt: '2026-11-26' },
      { images: [] },
    ])).toEqual({ total: 2, online: 1 });
  });
});
