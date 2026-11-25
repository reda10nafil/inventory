import { deflateRawSync } from 'zlib';
import {
  base64ToBytes, bytesToBase64, crc32, dataUrlBytes, extensionOf, isZip, makeZip, mimeOfName, readZip, safeFileName, utf8, fromUtf8,
} from '../utils/zip';

describe('zip (DATI: «Esporta con le foto» e import dello ZIP)', () => {
  it('CRC32 noto', () => {
    expect(crc32(utf8('123456789'))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
  });

  it('base64 andata e ritorno, anche con 1 e 2 byte di resto', () => {
    for (const s of ['', 'a', 'ab', 'abc', 'Città › Visone ✓']) {
      const b = utf8(s);
      expect(bytesToBase64(b)).toBe(Buffer.from(b).toString('base64'));
      expect(fromUtf8(base64ToBytes(bytesToBase64(b)))).toBe(s);
    }
  });

  it('foto data: → byte e tipo; estensione e tipo dal nome', () => {
    const png = 'data:image/png;base64,iVBORw0KGgo=';
    expect(dataUrlBytes(png)?.mime).toBe('image/png');
    expect(Array.from(dataUrlBytes(png)!.data.slice(0, 4))).toEqual([0x89, 0x50, 0x4e, 0x47]);
    expect(dataUrlBytes('blob:http://x/1')).toBeNull();
    expect(dataUrlBytes('https://x/y.jpg')).toBeNull();
    expect(extensionOf('image/jpeg')).toBe('jpg');
    expect(extensionOf('image/png')).toBe('png');
    expect(extensionOf('application/x')).toBe('jpg');
    expect(mimeOfName('VIS-0142-2.PNG')).toBe('image/png');
    expect(mimeOfName('x')).toBe('image/jpeg');
  });

  it('scrive uno ZIP senza compressione e lo rilegge uguale (nomi UTF-8, cartella immagini/)', async () => {
    const entries = [
      { name: 'inventario.csv', data: utf8('﻿SKU,Note\r\nVIS-0142,Città\r\n') },
      { name: 'immagini/VIS-0142-1.jpg', data: new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3]) },
      { name: 'immagini/àè.png', data: new Uint8Array(70000).fill(7) },
    ];
    const zip = makeZip(entries, new Date(2026, 10, 25, 10, 30, 0));
    expect(isZip(zip)).toBe(true);
    expect(Array.from(zip.slice(0, 4))).toEqual([0x50, 0x4b, 3, 4]);
    const back = await readZip(zip);
    expect(back.map((e) => e.name)).toEqual(entries.map((e) => e.name));
    back.forEach((e, i) => expect(Array.from(e.data)).toEqual(Array.from(entries[i].data)));
  });

  it('ZIP vuoto e file che non è uno ZIP', async () => {
    expect(await readZip(makeZip([]))).toEqual([]);
    await expect(readZip(utf8('SKU,Note\r\n'))).rejects.toThrow('non è uno ZIP');
    expect(isZip(utf8('SKU'))).toBe(false);
  });

  it('CRC sbagliato: errore chiaro', async () => {
    const zip = makeZip([{ name: 'a.txt', data: utf8('ciao') }]);
    zip[30 + 5] ^= 0xff; // primo byte dei dati
    await expect(readZip(zip)).rejects.toThrow('rovinato');
  });

  it('metodo 8 (deflate) con la funzione data; senza, messaggio chiaro', async () => {
    const plain = utf8('SKU,Note\r\nA,B\r\n'.repeat(50));
    const zip = makeZip([{ name: 'inventario.csv', data: plain }]);
    // rifatto «compresso»: metodo 8 e dimensione compressa nel locale e nel centrale
    const packed = new Uint8Array(deflateRawSync(Buffer.from(plain)));
    const name = utf8('inventario.csv');
    const local = new Uint8Array(30 + name.length);
    local.set(zip.subarray(0, 30 + name.length));
    const lv = new DataView(local.buffer);
    lv.setUint16(8, 8, true); lv.setUint32(18, packed.length, true);
    const central = zip.slice(30 + name.length + plain.length, zip.length - 22);
    const cv = new DataView(central.buffer);
    cv.setUint16(10, 8, true); cv.setUint32(20, packed.length, true);
    const end = zip.slice(zip.length - 22);
    new DataView(end.buffer).setUint32(16, local.length + packed.length, true);
    const compressed = new Uint8Array([...local, ...packed, ...central, ...end]);
    const inflate = async (d: Uint8Array) => new Uint8Array(require('zlib').inflateRawSync(Buffer.from(d)));
    const back = await readZip(compressed, inflate);
    expect(fromUtf8(back[0].data)).toBe(fromUtf8(plain));
    const noStream = async () => { throw new Error('Questo ZIP è compresso e qui non si può aprire'); };
    await expect(readZip(compressed, noStream)).rejects.toThrow('compresso');
  });

  it('nomi dei file sicuri', () => {
    expect(safeFileName('VIS/01:2')).toBe('VIS_01_2');
    expect(safeFileName('..\\x')).toBe('_x');
    expect(safeFileName('   ')).toBe('prodotto');
  });
});
