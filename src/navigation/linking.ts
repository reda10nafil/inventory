export const linking = {
  prefixes: ['syncroflow://', 'exp+syncro-flow://'],
  config: {
    screens: {
      '(tabs)': {
        screens: {
          index: '',
          timeline: 'timeline',
          automations: 'automations',
          add: 'add',
          settings: 'settings',
        },
      },
      Scanner: 'scanner',
      ScannerAction: 'scanner-action',
      ProductDetail: 'product/:id',
      ProductEdit: 'product/edit/:id',
      NotFound: '*',
    },
  },
};
