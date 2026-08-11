import '../../models/custom_field.dart';

class TemplateField {
  final String name;
  final FieldDataType type;
  final FieldUIType uiType;
  final String? icon;
  final String? unit;
  final bool required;
  final List<Map<String, String>>? options;
  final dynamic dataset;

  const TemplateField({
    required this.name,
    required this.type,
    required this.uiType,
    this.icon,
    this.unit,
    this.required = false,
    this.options,
    this.dataset,
  });
}

class SectorTemplate {
  final String id;
  final String name;
  final String emoji;
  final String description;
  final String color;
  final List<TemplateField> fields;

  const SectorTemplate({
    required this.id,
    required this.name,
    required this.emoji,
    required this.description,
    required this.color,
    required this.fields,
  });
}

class SectorTemplates {
  static const List<SectorTemplate> templates = [
    SectorTemplate(
      id: 'pellicce',
      name: 'Pellicce & Pellicceria',
      emoji: '🧥',
      description: 'Gestione pellicce: taglia, colore, stagione, fornitore, certificazione',
      color: '#8B4513',
      fields: [
        TemplateField(
          name: 'Taglia',
          type: FieldDataType.singleChoice,
          uiType: FieldUIType.segmented,
          icon: 'straighten',
          options: [
            {'id': 'xs', 'label': 'XS'},
            {'id': 's', 'label': 'S'},
            {'id': 'm', 'label': 'M'},
            {'id': 'l', 'label': 'L'},
            {'id': 'xl', 'label': 'XL'},
            {'id': 'xxl', 'label': 'XXL'}
          ],
        ),
        TemplateField(
          name: 'Colore',
          type: FieldDataType.singleChoice,
          uiType: FieldUIType.grid,
          icon: 'palette',
          options: [
            {'id': 'nero', 'label': 'Nero'},
            {'id': 'marrone', 'label': 'Marrone'},
            {'id': 'bianco', 'label': 'Bianco'},
            {'id': 'grigio', 'label': 'Grigio'},
            {'id': 'beige', 'label': 'Beige'},
            {'id': 'rosso', 'label': 'Rosso'}
          ],
        ),
        TemplateField(
          name: 'Stagione',
          type: FieldDataType.singleChoice,
          uiType: FieldUIType.segmented,
          icon: 'ac_unit',
          options: [
            {'id': 'ai', 'label': 'A/I'},
            {'id': 'pe', 'label': 'P/E'},
            {'id': 'trans', 'label': 'Transizione'}
          ],
        ),
        TemplateField(
          name: 'Fornitore',
          type: FieldDataType.textShort,
          uiType: FieldUIType.text,
          icon: 'local_shipping',
        ),
        TemplateField(
          name: 'Certificazione',
          type: FieldDataType.singleChoice,
          uiType: FieldUIType.picker,
          icon: 'verified',
          options: [
            {'id': 'saga', 'label': 'SAGA'},
            {'id': 'kopenhagen', 'label': 'Kopenhagen'},
            {'id': 'nafa', 'label': 'NAFA'},
            {'id': 'altro', 'label': 'Altro'}
          ],
        ),
        TemplateField(
          name: 'Condizione',
          type: FieldDataType.singleChoice,
          uiType: FieldUIType.segmented,
          icon: 'star',
          options: [
            {'id': 'nuova', 'label': 'Nuova'},
            {'id': 'ottima', 'label': 'Ottima'},
            {'id': 'buona', 'label': 'Buona'},
            {'id': 'usata', 'label': 'Usata'}
          ],
        ),
        TemplateField(
          name: 'Data Acquisto',
          type: FieldDataType.date,
          uiType: FieldUIType.date,
          icon: 'event',
        ),
      ],
    ),
    SectorTemplate(
      id: 'gioielleria',
      name: 'Gioielleria & Oreficeria',
      emoji: '💎',
      description: 'Carati, metallo, pietre, certificati gemmologici',
      color: '#FFD700',
      fields: [
        TemplateField(
          name: 'Carati',
          type: FieldDataType.number,
          uiType: FieldUIType.text,
          icon: 'diamond',
          unit: 'ct',
        ),
        TemplateField(
          name: 'Metallo',
          type: FieldDataType.singleChoice,
          uiType: FieldUIType.grid,
          icon: 'auto_awesome',
          options: [
            {'id': 'oro_giallo', 'label': 'Oro Giallo'},
            {'id': 'oro_bianco', 'label': 'Oro Bianco'},
            {'id': 'oro_rosa', 'label': 'Oro Rosa'},
            {'id': 'argento', 'label': 'Argento'},
            {'id': 'platino', 'label': 'Platino'}
          ],
        ),
        TemplateField(
          name: 'Pietra Principale',
          type: FieldDataType.singleChoice,
          uiType: FieldUIType.picker,
          icon: 'lens',
          options: [
            {'id': 'diamante', 'label': 'Diamante'},
            {'id': 'rubino', 'label': 'Rubino'},
            {'id': 'smeraldo', 'label': 'Smeraldo'},
            {'id': 'zaffiro', 'label': 'Zaffiro'},
            {'id': 'nessuna', 'label': 'Nessuna'}
          ],
        ),
      ],
    ),
    SectorTemplate(
      id: 'abbigliamento',
      name: 'Abbigliamento & Moda',
      emoji: '👗',
      description: 'Taglia, colore, tessuto, stagione, brand, linea',
      color: '#FF69B4',
      fields: [
        TemplateField(
          name: 'Taglia',
          type: FieldDataType.singleChoice,
          uiType: FieldUIType.segmented,
          icon: 'straighten',
          required: true,
          options: [
            {'id': 'xs', 'label': 'XS'},
            {'id': 's', 'label': 'S'},
            {'id': 'm', 'label': 'M'},
            {'id': 'l', 'label': 'L'},
            {'id': 'xl', 'label': 'XL'},
            {'id': 'xxl', 'label': 'XXL'}
          ],
        ),
        TemplateField(
          name: 'Brand',
          type: FieldDataType.textShort,
          uiType: FieldUIType.text,
          icon: 'sell',
        ),
      ],
    ),
  ];
}
