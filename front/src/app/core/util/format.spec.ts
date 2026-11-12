import { coincide, edad, folio, iniciales, tamanoLegible, telefonoWhatsApp } from './format';

describe('format', () => {
  it('busca sin importar acentos ni mayúsculas', () => {
    expect(coincide('trevino', 'Guadalupe Treviño')).toBe(true);
    expect(coincide('  ', 'cualquier cosa')).toBe(true);
    expect(coincide('xyz', 'Andrea', null)).toBe(false);
  });

  it('calcula la edad considerando si ya pasó el cumpleaños', () => {
    expect(edad('2000-06-15', new Date(2026, 5, 14))).toBe(25);
    expect(edad('2000-06-15', new Date(2026, 5, 15))).toBe(26);
  });

  it('formatea folio, tamaño, iniciales y teléfono', () => {
    expect(folio(1040)).toBe('ML-01040');
    expect(tamanoLegible(240_000)).toBe('234 KB');
    expect(iniciales('Dra. Elena Márquez')).toBe('EM');
    expect(telefonoWhatsApp('55 0000 1001')).toBe('525500001001');
  });
});
