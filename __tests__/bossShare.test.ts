/**
 * Boss -> Operaio sharing test — scenario reale richiesto:
 * Capo seleziona N prodotti + 1 automazione, invia payload leggero in chat.
 * Operaio riceve Hydrated Cards, può confermare tutti o sottoinsieme e run automazione.
 */
import { Buffer } from 'buffer';

type LightPayload = { skus: string[]; automationIds: string[]; text?: string };

// mirror normalize/parse
function normalize(raw: any) {
  const skus: string[] = Array.isArray(raw.skus) ? raw.skus.filter((s:any)=>typeof s==='string') : Array.isArray(raw.sku) ? raw.sku.filter((s:any)=>typeof s==='string') : [];
  const automationId = typeof raw.automationId==='string'? raw.automationId : Array.isArray(raw.automationIds)&&raw.automationIds[0]?String(raw.automationIds[0]):undefined;
  return { skus, automationId, automationIds: automationId?[automationId]:raw.automationIds, text: typeof raw.text==='string'?raw.text:undefined };
}
function parse(input: string){ return normalize(JSON.parse(input)); }

// Mock DB team condiviso
const mockProducts = [
  { sku:'LOG-2026-001', furType:'elettronica', location:'magazzino', status:'available', images:[]},
  { sku:'LOG-2026-002', furType:'meccanica', location:'magazzino', status:'available', images:[]},
  { sku:'LOG-2026-003', furType:'tessile', location:'sartoria', status:'available', images:[]},
];
const mockAutomation = { id:'auto-audit-vetrina', name:'Audit Vetrina', steps:[{type:'move_to', location:'vetrina'}] };

describe('Boss -> Operaio share flow', () => {
  it('boss crea payload <2KB con 3 SKU + 1 automazione + testo', () => {
    const payload: LightPayload = {
      skus: mockProducts.map(p=>p.sku),
      automationIds: [mockAutomation.id],
      text: 'Controlla questi capi che sia a posto — usa automazione Audit Vetrina',
    };
    const json = JSON.stringify(payload);
    expect(Buffer.byteLength(json,'utf8')).toBeLessThan(2048);
    const parsed = parse(json);
    expect(parsed.skus).toEqual(['LOG-2026-001','LOG-2026-002','LOG-2026-003']);
    expect(parsed.automationId).toBe('auto-audit-vetrina');
    expect(parsed.text).toContain('Controlla');
  });

  it('operaio idrata payload: lookup locale DB + render cards', () => {
    const payload: LightPayload = { skus:['LOG-2026-001','LOG-2026-002'], automationIds:['auto-audit-vetrina'] };
    const parsed = normalize(payload);
    // hydration: query locale
    const hydrated = parsed.skus.map(sku => mockProducts.find(p=>p.sku===sku)!);
    expect(hydrated).toHaveLength(2);
    expect(hydrated[0].furType).toBe('elettronica');
    // immagini WebP già presenti localmente, non inviate
    hydrated.forEach(p=> expect(p.images).toBeDefined());
  });

  it('operaio può confermare sottoinsieme e run automazione su subset', () => {
    const receivedSkus = ['LOG-2026-001','LOG-2026-002','LOG-2026-003'];
    // operaio deseleziona uno
    const selected = receivedSkus.filter(s=> s!=='LOG-2026-003');
    expect(selected).toEqual(['LOG-2026-001','LOG-2026-002']);
    // mock run automazione su selected
    const runAutomation = (skus:string[], autoId:string) => ({ executed: skus.length, autoId, movedTo:'vetrina'});
    const result = runAutomation(selected, mockAutomation.id);
    expect(result.executed).toBe(2);
    expect(result.movedTo).toBe('vetrina');
    // payload leggero non contiene immagini -> rete LAN non saturata
    const lightJson = JSON.stringify({ skus: selected, automationIds:[mockAutomation.id]});
    expect(Buffer.byteLength(lightJson,'utf8')).toBeLessThan(200);
  });

  it('conferma tutti -> timeline + sync globale', () => {
    const all = mockProducts.map(p=>p.sku);
    const timelinePush = all.map(sku=> ({ productId: sku, type:'moved', details:{from:'magazzino', to:'vetrina', automation: mockAutomation.id}}));
    expect(timelinePush).toHaveLength(3);
    timelinePush.forEach(e=> expect(e.details.automation).toBe('auto-audit-vetrina'));
  });
});
