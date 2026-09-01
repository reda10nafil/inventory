export type RootStackParamList = {
  '(tabs)': undefined;
  Scanner: undefined;
  ScannerAction: {type?: string; id?: string; productId?: string} | undefined;
  ProductDetail: {id: string};
  ProductEdit: {id: string};
  'settings/locations': undefined;
  'settings/fields': undefined;
  'settings/folders': undefined;
  'settings/layout-builder': undefined;
  'settings/gs1-config': undefined;
  'settings/hardware': undefined;
  'settings/automation-builder': {editId?: string} | undefined;
  'automations/automation-flow': {id: string} | undefined;
  'automations/custom-runner': {id: string} | undefined;
  NotFound: undefined;
};
