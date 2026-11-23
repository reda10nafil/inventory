import {
  addPhotos, clampPhotoIndex, indexAfterRemove, isReorder, makeMainPhoto, movePhoto, photosPatch, removePhoto,
} from '../utils/photos';
import { describeChanges } from '../utils/productChanges';
import type { Product } from '../types';

const tre = { images: ['f1', 'f2', 'f3'], storageImagePaths: ['p1', 'p2', 'p3'] };

describe('ordine delle foto con i percorsi cloud allineati (GAL, CSV-G6)', () => {
  it('sposta una foto e il suo percorso insieme', () => {
    expect(movePhoto(tre, 0, 1)).toEqual({ images: ['f2', 'f1', 'f3'], storageImagePaths: ['p2', 'p1', 'p3'] });
    expect(movePhoto(tre, 2, 0)).toEqual({ images: ['f3', 'f1', 'f2'], storageImagePaths: ['p3', 'p1', 'p2'] });
  });

  it('indici fuori misura o uguali: nessun cambio, e non tocca l\'elenco di partenza', () => {
    expect(movePhoto(tre, 0, 3)).toEqual(tre);
    expect(movePhoto(tre, -1, 0)).toEqual(tre);
    expect(movePhoto(tre, 1, 1)).toEqual(tre);
    movePhoto(tre, 0, 2);
    removePhoto(tre, 0);
    expect(tre).toEqual({ images: ['f1', 'f2', 'f3'], storageImagePaths: ['p1', 'p2', 'p3'] });
  });

  it('«Metti come principale»: la foto va in testa, le altre restano nell\'ordine di prima', () => {
    expect(makeMainPhoto(tre, 2)).toEqual({ images: ['f3', 'f1', 'f2'], storageImagePaths: ['p3', 'p1', 'p2'] });
    expect(makeMainPhoto(tre, 0)).toEqual(tre);
  });

  it('eliminare toglie la foto scelta e il suo percorso, non un\'altra (CSV-G1)', () => {
    expect(removePhoto(tre, 2)).toEqual({ images: ['f1', 'f2'], storageImagePaths: ['p1', 'p2'] });
    expect(removePhoto(tre, 0)).toEqual({ images: ['f2', 'f3'], storageImagePaths: ['p2', 'p3'] });
    expect(removePhoto(tre, 5)).toEqual(tre);
  });

  it('senza percorsi cloud resta senza (un prodotto solo locale non cambia forma)', () => {
    expect(movePhoto({ images: ['a', 'b'] }, 0, 1)).toEqual({ images: ['b', 'a'] });
    expect(removePhoto({ images: ['a', 'b'] }, 0)).toEqual({ images: ['b'] });
    expect(addPhotos({ images: ['a'] }, ['b'])).toEqual({ images: ['a', 'b'] });
  });

  it('percorsi più corti delle foto (foto nuova non ancora copiata): il vuoto segue la sua foto', () => {
    const corta = { images: ['f1', 'f2', 'f3'], storageImagePaths: ['p1'] };
    expect(movePhoto(corta, 2, 0)).toEqual({ images: ['f3', 'f1', 'f2'], storageImagePaths: ['', 'p1', ''] });
    expect(removePhoto(corta, 0)).toEqual({ images: ['f2', 'f3'], storageImagePaths: ['', ''] });
  });

  it('aggiungere foto: fino a 10, le nuove senza percorso', () => {
    expect(addPhotos(tre, ['f4'])).toEqual({ images: ['f1', 'f2', 'f3', 'f4'], storageImagePaths: ['p1', 'p2', 'p3', ''] });
    const nove = { images: Array.from({ length: 9 }, (_, i) => `x${i}`) };
    expect(addPhotos(nove, ['a', 'b', 'c']).images).toHaveLength(10);
  });
});

describe('foto da mostrare', () => {
  it('indice valido per la lunghezza', () => {
    expect(clampPhotoIndex(5, 3)).toBe(2);
    expect(clampPhotoIndex(-1, 3)).toBe(0);
    expect(clampPhotoIndex(1.6, 3)).toBe(2);
    expect(clampPhotoIndex(2, 0)).toBe(0);
    expect(clampPhotoIndex(Number.NaN, 3)).toBe(0);
  });

  it('dopo un\'eliminazione: la successiva al posto di quella tolta, la precedente se era l\'ultima', () => {
    expect(indexAfterRemove(2, 2, 2)).toBe(1); // tolta la 3 guardando la 3 → la 2
    expect(indexAfterRemove(0, 0, 2)).toBe(0); // tolta la 1 → la (vecchia) 2, ora prima
    expect(indexAfterRemove(1, 1, 2)).toBe(1); // tolta la 2 → la (vecchia) 3
    expect(indexAfterRemove(2, 0, 2)).toBe(1); // tolta una prima di quella guardata: resta la stessa foto
    expect(indexAfterRemove(0, 0, 0)).toBe(0);
  });
});

describe('salvataggio e Cronologia', () => {
  it('photosPatch scrive i percorsi solo se il prodotto li aveva', () => {
    expect(photosPatch({}, { images: ['a'] })).toEqual({ images: ['a'] });
    expect(photosPatch({ storageImagePaths: ['p1', 'p2'] }, { images: ['b'], storageImagePaths: ['p2'] })).toEqual({ images: ['b'], storageImagePaths: ['p2'] });
    // percorsi che il modulo non ha ricevuto: si allineano alle foto con il vuoto
    expect(photosPatch({ storageImagePaths: ['p1'] }, { images: ['a', 'b'] })).toEqual({ images: ['a', 'b'], storageImagePaths: ['', ''] });
  });

  it('isReorder: stesse foto in un altro ordine', () => {
    expect(isReorder(['a', 'b', 'c'], ['c', 'a', 'b'])).toBe(true);
    expect(isReorder(['a', 'b'], ['a', 'b'])).toBe(false);
    expect(isReorder(['a', 'b'], ['a', 'c'])).toBe(false);
    expect(isReorder(['a', 'b'], ['b'])).toBe(false);
    expect(isReorder(['a', 'a', 'b'], ['a', 'b', 'b'])).toBe(false);
  });

  it('describeChanges scrive «Foto riordinate» per un cambio d\'ordine, «N foto tolte» per un\'eliminazione', () => {
    const p = { id: 'x', sku: 'S', images: ['a', 'b', 'c'], customData: [] } as unknown as Product;
    expect(describeChanges(p, { images: ['c', 'a', 'b'] })).toEqual(['Foto riordinate']);
    expect(describeChanges(p, { images: ['a', 'b'] })).toEqual(['1 foto tolte']);
    expect(describeChanges(p, { images: ['a', 'b', 'c'] })).toEqual([]);
  });
});
