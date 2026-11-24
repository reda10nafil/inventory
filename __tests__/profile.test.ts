// ACC1 (ticket 32): profilo dell'operatore di questo telefono e autore degli eventi della Cronologia.
import { EMPTY_PROFILE, PHOTO_MAX_CHARS, authorOf, authorText, isProfilePhoto, newProfileId, normalizeProfile, profileSubtitle } from '../utils/profile';

describe('profilo di questo telefono (ACC1)', () => {
  it('vuoto o rotto: profilo di partenza, Titolare senza nome', () => {
    for (const raw of [null, undefined, 'x', 3, []]) expect(normalizeProfile(raw)).toEqual(EMPTY_PROFILE);
    expect(EMPTY_PROFILE.role).toBe('titolare');
  });

  it('si tiene ciò che è valido: nomi senza spazi in testa e in coda, ruolo noto, foto solo data:image', () => {
    const p = normalizeProfile({
      id: 'tel-abc', name: '  Mario Rossi ', phone: ' 333 123 4567', role: 'operatore', device: ' Banco 1 ',
      photo: 'data:image/jpeg;base64,AAAA', extra: 1,
    });
    expect(p).toEqual({ id: 'tel-abc', name: 'Mario Rossi', phone: '333 123 4567', role: 'operatore', device: 'Banco 1', photo: 'data:image/jpeg;base64,AAAA' });
    expect(normalizeProfile({ role: 'owner' }).role).toBe('titolare');
    expect(normalizeProfile({ photo: 'https://esempio.it/a.jpg' }).photo).toBe('');
    expect(normalizeProfile({ photo: 'javascript:alert(1)' }).photo).toBe('');
    expect(normalizeProfile({ photo: `data:image/png;base64,${'A'.repeat(PHOTO_MAX_CHARS)}` }).photo).toBe('');
    expect(normalizeProfile({ name: 'x'.repeat(200) }).name).toHaveLength(60);
  });

  it('un solo controllo della foto per la scelta e per la lettura (revisore)', () => {
    expect(isProfilePhoto('data:image/jpeg;base64,/9j/AA==')).toBe(true);
    expect(isProfilePhoto('data:image/webp;base64,AAAA')).toBe(true);
    expect(isProfilePhoto('data:image/gif;base64,AAAA')).toBe(false);
    expect(isProfilePhoto('data:image/jpeg;base64,AA AA')).toBe(false);
    expect(isProfilePhoto(`data:image/jpeg;base64,${'A'.repeat(PHOTO_MAX_CHARS)}`)).toBe(false);
    expect(isProfilePhoto(42)).toBe(false);
  });

  it('id nuovo: diverso a ogni chiamata, con il prefisso del telefono', () => {
    const a = newProfileId();
    const b = newProfileId();
    expect(a).toMatch(/^tel-[a-z0-9]+-[a-z0-9]+$/);
    expect(a).not.toBe(b);
  });

  it('autore dell\'evento: istantanea di id, nome e nome del telefono (i vuoti non si scrivono)', () => {
    expect(authorOf({ ...EMPTY_PROFILE, id: 'tel-1', name: 'Mario', device: 'Banco 1' })).toEqual({ id: 'tel-1', name: 'Mario', device: 'Banco 1' });
    expect(authorOf({ ...EMPTY_PROFILE, id: 'tel-1' })).toEqual({ id: 'tel-1' });
    // la foto e il telefono non vanno negli eventi
    expect(Object.keys(authorOf({ ...EMPTY_PROFILE, id: 'tel-1', phone: '333', photo: 'data:image/png;base64,A' }))).toEqual(['id']);
  });

  it('riga dell\'autore in Cronologia: «Mario · Banco 1», vecchi eventi «—»', () => {
    expect(authorText(undefined)).toBe('—');
    expect(authorText({ id: 'tel-1', name: 'Mario', device: 'Banco 1' })).toBe('Mario · Banco 1');
    expect(authorText({ id: 'tel-1', name: 'Mario' })).toBe('Mario');
    expect(authorText({ id: 'tel-1', device: 'Banco 1' })).toBe('Banco 1');
    expect(authorText({ id: 'tel-1' })).toBe('Questo telefono');
    expect(authorText({ name: 'Mario' } as any)).toBe('Mario');
    expect(authorText('Mario' as any)).toBe('—');
  });

  it('sottotitolo della voce «Accesso» in Impostazioni: lo stato', () => {
    expect(profileSubtitle({ ...EMPTY_PROFILE, name: 'Mario', role: 'operatore' })).toBe('Mario · Operatore');
    expect(profileSubtitle(EMPTY_PROFILE)).toBe('Titolare · nome da scrivere');
  });
});
