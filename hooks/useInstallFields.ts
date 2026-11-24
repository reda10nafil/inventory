// Aggiunge al registro i campi di un modello che non ci sono già e li mette in fondo al layout di Aggiungi,
// salvando subito (Layout builder › MODELLI e Modelli di settore, D12).
import { useCustomFields } from '../contexts/CustomFieldsContext';
import { FieldSize, useLayout } from '../contexts/LayoutContext';
import { matchTemplateFields } from '../utils/templateFields';
import type { CustomField } from '../types';

export function useInstallFields() {
  const { customFields, addField } = useCustomFields();
  const { appendToLayout } = useLayout();

  return async (fields: Omit<CustomField, 'id' | 'order'>[], size: FieldSize = 'medium') => {
    const ids: string[] = [];
    let created = 0;
    for (const { field, existingId } of matchTemplateFields(fields, customFields)) {
      if (existingId) ids.push(existingId);
      else {
        ids.push((await addField(field)).id);
        created += 1;
      }
    }
    // S2 (revisore): un campo del modello abbinato a un campo di sistema («Altezza», «Peso») entra nel layout come Base
    const layoutFields = await appendToLayout(ids, size, customFields.filter((f) => f.isSystem).map((f) => f.id));
    return { created, existing: ids.length - created, layoutFields };
  };
}
