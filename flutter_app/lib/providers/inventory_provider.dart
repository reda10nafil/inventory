import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../services/mock_data.dart';
import '../constants/config.dart';

class InventoryProvider extends ChangeNotifier {
  List<Product> _products = MockData.products;
  List<TimelineEvent> _timeline = MockData.timeline;
  List<Library> _libraries = MockData.libraries;
  List<ProductAlert> _alerts = MockData.alerts;
  List<Automation> _automations = MockData.automations;
  GS1Config _gs1Config = GS1Config.defaults;

  List<Product> get products => _products;
  List<TimelineEvent> get timeline => _timeline;
  List<Library> get libraries => _libraries;
  List<ProductAlert> get alerts => _alerts;
  List<Automation> get automations => _automations;
  GS1Config get gs1Config => _gs1Config;

  Product? getProductById(String id) {
    for (final p in _products) {
      if (p.id == id) return p;
    }
    return null;
  }

  void addProduct(Product product) {
    _products = [..._products, product];
    _timeline = [
      TimelineEvent(id: 't_${DateTime.now().millisecondsSinceEpoch}', productId: product.id, type: TimelineEventType.created, timestamp: DateTime.now(), details: TimelineEventDetails()),
      ..._timeline,
    ];
    notifyListeners();
  }

  void updateProduct(String id, Map<String, dynamic> changes) {
    final index = _products.indexWhere((p) => p.id == id);
    if (index == -1) return;
    _products[index] = _products[index].copyWith(
      sku: changes['sku'] as String?,
      libraryId: changes['libraryId'] as String?,
      status: changes['status'] as ProductStatus?,
      sellPrice: changes['sellPrice'] as double?,
      purchasePrice: changes['purchasePrice'] as double?,
      location: changes['location'] as String?,
      furType: changes['furType'] as String?,
      technicalNotes: changes['technicalNotes'] as String?,
      length: changes['length'] as double?,
      width: changes['width'] as double?,
      weight: changes['weight'] as double?,
      isFragile: changes['isFragile'] as bool?,
      updatedAt: DateTime.now(),
    );
    _timeline = [
      TimelineEvent(id: 't_${DateTime.now().millisecondsSinceEpoch}', productId: id, type: TimelineEventType.modified, timestamp: DateTime.now(), details: TimelineEventDetails(changes: changes.keys.map((k) => k).toList())),
      ..._timeline,
    ];
    notifyListeners();
  }

  void moveProduct(String id, String newLocation) {
    final index = _products.indexWhere((p) => p.id == id);
    if (index == -1) return;
    final oldLocation = _products[index].location;
    _products[index] = _products[index].copyWith(location: newLocation, updatedAt: DateTime.now());
    _timeline = [
      TimelineEvent(id: 't_${DateTime.now().millisecondsSinceEpoch}', productId: id, type: TimelineEventType.moved, timestamp: DateTime.now(), details: TimelineEventDetails(from: oldLocation, to: newLocation)),
      ..._timeline,
    ];
    notifyListeners();
  }

  void sellProduct(String id, [double? finalPrice]) {
    final index = _products.indexWhere((p) => p.id == id);
    if (index == -1) return;
    _products[index] = _products[index].copyWith(status: ProductStatus.sold, sellPrice: finalPrice ?? _products[index].sellPrice, soldAt: DateTime.now(), updatedAt: DateTime.now());
    _timeline = [
      TimelineEvent(id: 't_${DateTime.now().millisecondsSinceEpoch}', productId: id, type: TimelineEventType.sold, timestamp: DateTime.now(), details: TimelineEventDetails(finalPrice: finalPrice ?? _products[index].sellPrice)),
      ..._timeline,
    ];
    notifyListeners();
  }

  void deleteProduct(String id) {
    final index = _products.indexWhere((p) => p.id == id);
    if (index == -1) return;
    _products[index] = _products[index].copyWith(deletedAt: DateTime.now());
    _timeline = [
      TimelineEvent(id: 't_${DateTime.now().millisecondsSinceEpoch}', productId: id, type: TimelineEventType.deleted, timestamp: DateTime.now(), details: TimelineEventDetails()),
      ..._timeline,
    ];
    notifyListeners();
  }

  void restoreProduct(String id) {
    final index = _products.indexWhere((p) => p.id == id);
    if (index == -1) return;
    _products[index] = _products[index].copyWith(deletedAt: null);
    _timeline = [
      TimelineEvent(id: 't_${DateTime.now().millisecondsSinceEpoch}', productId: id, type: TimelineEventType.restored, timestamp: DateTime.now(), details: TimelineEventDetails()),
      ..._timeline,
    ];
    notifyListeners();
  }

  void permanentlyDelete(String id) {
    _products = _products.where((p) => p.id != id).toList();
    notifyListeners();
  }

  void dismissAlert(String alertId) {
    final index = _alerts.indexWhere((a) => a.id == alertId);
    if (index == -1) return;
    _alerts[index] = _alerts[index].copyWith(dismissed: true);
    notifyListeners();
  }

  void addAutomation(Automation automation) {
    _automations = [..._automations, automation];
    notifyListeners();
  }

  void deleteAutomation(String id) {
    _automations = _automations.where((a) => a.id != id).toList();
    notifyListeners();
  }

  void updateGS1Config({String? baseUrl, bool? enableSerial, String? serialMode, bool? enableLotto, String? lottoFieldId}) {
    _gs1Config = _gs1Config.copyWith(
      baseUrl: baseUrl, enableSerial: enableSerial, serialMode: serialMode,
      enableLotto: enableLotto, lottoFieldId: lottoFieldId,
    );
    notifyListeners();
  }

  void resetGS1Config() {
    _gs1Config = GS1Config.defaults;
    notifyListeners();
  }

  String generateSKU() {
    final year = DateTime.now().year;
    final existing = _products.map((p) => p.sku).where((sku) => sku.startsWith('FUR-$year-')).toList();
    int nextNumber = 1;
    if (existing.isNotEmpty) {
      final numbers = existing.map((sku) {
        final match = RegExp(r'FUR-\d{4}-(\d+)').firstMatch(sku);
        return match != null ? int.parse(match.group(1)!) : 0;
      }).toList();
      nextNumber = (numbers.reduce((a, b) => a > b ? a : b)) + 1;
    }
    return 'FUR-$year-${nextNumber.toString().padLeft(3, '0')}';
  }

  static bool isDormant(Product product) {
    if (product.status != ProductStatus.available) return false;
    final threshold = DateTime.now().subtract(const Duration(days: dormantThresholdDays));
    return product.updatedAt.isBefore(threshold);
  }

  static bool needsPromotion(Product product) {
    if (product.status != ProductStatus.available) return false;
    final threshold = DateTime.now().subtract(const Duration(days: promotionThresholdDays));
    return product.updatedAt.isBefore(threshold) && !isDormant(product);
  }
}
