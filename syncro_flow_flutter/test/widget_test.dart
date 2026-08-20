import 'package:flutter_test/flutter_test.dart';
import 'package:syncro_flow/models/product.dart';
import 'package:syncro_flow/models/location.dart';
import 'package:syncro_flow/core/theme/app_colors.dart';

void main() {
  group('Syncro Flow Core Models Unit Tests', () {
    test('Product JSON serialization and deserialization', () {
      final now = DateTime.now();
      final product = Product(
        id: 'p1',
        sku: 'SKU-100',
        furType: 'Visone',
        location: 'loc1',
        status: ProductStatusType.available,
        images: ['assets/images/logo.png'],
        sellPrice: 1500.0,
        createdAt: now,
        updatedAt: now,
      );

      final json = product.toJson();
      expect(json['id'], 'p1');
      expect(json['sku'], 'SKU-100');
      expect(json['sellPrice'], 1500.0);

      final restored = Product.fromJson(json);
      expect(restored.id, 'p1');
      expect(restored.sku, 'SKU-100');
      expect(restored.sellPrice, 1500.0);
    });

    test('Location model properties', () {
      final loc = Location(
        id: 'loc1',
        label: 'Vetrina Centrale',
        barcode: 'LOC-001',
        color: AppColors.primary,
        capacity: 50,
      );

      expect(loc.id, 'loc1');
      expect(loc.label, 'Vetrina Centrale');
      expect(loc.capacity, 50);
    });
  });
}
