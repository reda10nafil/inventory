import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../models/product.dart';
import '../models/timeline_event.dart';
import '../models/alert_model.dart';
import '../models/library.dart';
import 'storage_provider.dart';

const String _productsStorageKey = 'products';
const String _timelineStorageKey = 'timeline';
const String _alertsStorageKey = 'alerts';
const String _librariesStorageKey = 'libraries';

class InventoryState {
  final List<Product> products;
  final List<TimelineEvent> timeline;
  final List<AlertModel> alerts;
  final List<LibraryModel> libraries;

  const InventoryState({
    this.products = const [],
    this.timeline = const [],
    this.alerts = const [],
    this.libraries = const [],
  });

  InventoryState copyWith({
    List<Product>? products,
    List<TimelineEvent>? timeline,
    List<AlertModel>? alerts,
    List<LibraryModel>? libraries,
  }) {
    return InventoryState(
      products: products ?? this.products,
      timeline: timeline ?? this.timeline,
      alerts: alerts ?? this.alerts,
      libraries: libraries ?? this.libraries,
    );
  }
}

class InventoryNotifier extends Notifier<InventoryState> {
  @override
  InventoryState build() {
    final storage = ref.watch(storageServiceProvider);
    final productsRaw = storage.getJson(_productsStorageKey);
    final timelineRaw = storage.getJson(_timelineStorageKey);
    final alertsRaw = storage.getJson(_alertsStorageKey);
    final librariesRaw = storage.getJson(_librariesStorageKey);

    List<Product> products = [];
    if (productsRaw != null && productsRaw is List) {
      products = productsRaw
          .map((e) => Product.fromJson(e as Map<String, dynamic>))
          .toList();
    }

    List<TimelineEvent> timeline = [];
    if (timelineRaw != null && timelineRaw is List) {
      timeline = timelineRaw
          .map((e) => TimelineEvent.fromJson(e as Map<String, dynamic>))
          .toList();
    }

    List<AlertModel> alerts = [];
    if (alertsRaw != null && alertsRaw is List) {
      alerts = alertsRaw
          .map((e) => AlertModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }

    List<LibraryModel> libraries = [
      LibraryModel(
        id: 'pellicce',
        name: 'Pellicce',
        icon: 'inventory',
        fields: const [],
        createdAt: DateTime.now(),
      )
    ];
    if (librariesRaw != null && librariesRaw is List) {
      libraries = librariesRaw
          .map((e) => LibraryModel.fromJson(e as Map<String, dynamic>))
          .toList();
    }

    final initialState = InventoryState(
      products: products,
      timeline: timeline,
      alerts: alerts,
      libraries: libraries,
    );

    return _generateAlertsForState(initialState);
  }

  Future<void> _saveProducts() async {
    final storage = ref.read(storageServiceProvider);
    await storage.setJson(
      _productsStorageKey,
      state.products.map((p) => p.toJson()).toList(),
    );
  }

  Future<void> _saveTimeline() async {
    final storage = ref.read(storageServiceProvider);
    await storage.setJson(
      _timelineStorageKey,
      state.timeline.map((t) => t.toJson()).toList(),
    );
  }

  Future<void> _saveAlerts() async {
    final storage = ref.read(storageServiceProvider);
    await storage.setJson(
      _alertsStorageKey,
      state.alerts.map((a) => a.toJson()).toList(),
    );
  }

  Future<void> _saveLibraries() async {
    final storage = ref.read(storageServiceProvider);
    await storage.setJson(
      _librariesStorageKey,
      state.libraries.map((l) => l.toJson()).toList(),
    );
  }

  InventoryState _generateAlertsForState(InventoryState currentState) {
    final now = DateTime.now();
    final newAlerts = <AlertModel>[];

    for (final product in currentState.products) {
      if (product.status == ProductStatusType.available &&
          product.deletedAt == null) {
        final lastAction = product.lastScannedAt ?? product.createdAt;
        final diffDays = now.difference(lastAction).inDays;

        if (diffDays >= 180) {
          newAlerts.add(
            AlertModel(
              id: 'alert-dormant-${product.id}',
              productId: product.id,
              type: AlertType.dormant,
              message: '${product.sku} non viene mosso da oltre 6 mesi',
              createdAt: now,
            ),
          );
        } else if (diffDays >= 90) {
          newAlerts.add(
            AlertModel(
              id: 'alert-promo-${product.id}',
              productId: product.id,
              type: AlertType.promotionSuggestion,
              message:
                  '${product.sku} in magazzino da 3+ mesi. Considera di spostarlo in vetrina',
              createdAt: now,
            ),
          );
        }
      }
    }

    final dismissedIds =
        currentState.alerts.where((a) => a.dismissed).map((a) => a.id).toSet();

    final merged = [
      ...newAlerts.where((a) => !dismissedIds.contains(a.id)),
      ...currentState.alerts.where((a) => a.dismissed),
    ];

    return currentState.copyWith(alerts: merged);
  }

  String generateSKU() {
    final year = DateTime.now().year;
    final prefix = 'SKU-$year-';
    final existingSKUs = state.products
        .where((p) => p.deletedAt == null && p.sku.startsWith(prefix))
        .map((p) => p.sku)
        .toList();

    int nextNum = 1;
    if (existingSKUs.isNotEmpty) {
      final numbers = existingSKUs.map((sku) {
        final match = RegExp(r'SKU-\d{4}-(\d+)').firstMatch(sku);
        return match != null ? int.tryParse(match.group(1)!) ?? 0 : 0;
      });
      nextNum = (numbers.reduce((a, b) => a > b ? a : b)) + 1;
    }

    return 'SKU-$year-${nextNum.toString().padLeft(3, '0')}';
  }

  Future<void> addProduct(Product product) async {
    final sku = product.sku.isEmpty ? generateSKU() : product.sku;
    final newProduct = product.copyWith(sku: sku);

    final updatedProducts = [newProduct, ...state.products];
    final newTimelineEvent = TimelineEvent(
      id: '${DateTime.now().millisecondsSinceEpoch}',
      productId: newProduct.id,
      type: TimelineEventType.created,
      timestamp: DateTime.now(),
      details: const TimelineEventDetails(),
    );
    final updatedTimeline = [newTimelineEvent, ...state.timeline];

    state = _generateAlertsForState(state.copyWith(
      products: updatedProducts,
      timeline: updatedTimeline,
    ));

    await _saveProducts();
    await _saveTimeline();
    await _saveAlerts();
  }

  Future<void> updateProduct(dynamic idOrProduct, [Product? updated]) async {
    final String id;
    final Product updatedProd;
    if (idOrProduct is Product) {
      id = idOrProduct.id;
      updatedProd = idOrProduct;
    } else {
      id = idOrProduct.toString();
      if (updated == null) return;
      updatedProd = updated;
    }

    final oldProduct = getProductById(id);
    if (oldProduct == null) return;

    final changes = <String>[];
    if (updatedProd.location != oldProduct.location) {
      changes.add('Posizione: ${oldProduct.location} → ${updatedProd.location}');
    }
    if (updatedProd.sellPrice != oldProduct.sellPrice) {
      changes.add(
          'Prezzo vendita: €${oldProduct.sellPrice ?? 0} → €${updatedProd.sellPrice}');
    }
    if (updatedProd.purchasePrice != oldProduct.purchasePrice) {
      changes.add(
          'Prezzo acquisto: €${oldProduct.purchasePrice ?? 0} → €${updatedProd.purchasePrice}');
    }

    final updatedProducts = state.products.map((p) {
      if (p.id == id) return updatedProd.copyWith(updatedAt: DateTime.now());
      return p;
    }).toList();

    List<TimelineEvent> updatedTimeline = state.timeline;
    if (changes.isNotEmpty) {
      final event = TimelineEvent(
        id: '${DateTime.now().millisecondsSinceEpoch}',
        productId: id,
        type: TimelineEventType.modified,
        timestamp: DateTime.now(),
        details: TimelineEventDetails(changes: changes),
      );
      updatedTimeline = [event, ...state.timeline];
    }

    state = state.copyWith(
      products: updatedProducts,
      timeline: updatedTimeline,
    );

    await _saveProducts();
    await _saveTimeline();
  }

  Future<void> moveProduct(String id, String newLocation) async {
    final product = getProductById(id);
    if (product == null) return;

    final oldLocation = product.location;
    final updated = product.copyWith(
      location: newLocation,
      updatedAt: DateTime.now(),
      lastScannedAt: DateTime.now(),
    );

    final updatedProducts =
        state.products.map((p) => p.id == id ? updated : p).toList();

    final event = TimelineEvent(
      id: '${DateTime.now().millisecondsSinceEpoch}',
      productId: id,
      type: TimelineEventType.moved,
      timestamp: DateTime.now(),
      details: TimelineEventDetails(from: oldLocation, to: newLocation),
    );

    state = state.copyWith(
      products: updatedProducts,
      timeline: [event, ...state.timeline],
    );

    await _saveProducts();
    await _saveTimeline();
  }

  Future<void> sellProduct(String id, [double? finalPrice]) async {
    final product = getProductById(id);
    if (product == null) return;

    final updated = product.copyWith(
      status: ProductStatusType.sold,
      soldAt: DateTime.now(),
      updatedAt: DateTime.now(),
      lastScannedAt: DateTime.now(),
      sellPrice: finalPrice ?? product.sellPrice,
    );

    final updatedProducts =
        state.products.map((p) => p.id == id ? updated : p).toList();

    final event = TimelineEvent(
      id: '${DateTime.now().millisecondsSinceEpoch}',
      productId: id,
      type: TimelineEventType.sold,
      timestamp: DateTime.now(),
      details: TimelineEventDetails(finalPrice: finalPrice),
    );

    state = state.copyWith(
      products: updatedProducts,
      timeline: [event, ...state.timeline],
    );

    await _saveProducts();
    await _saveTimeline();
  }

  Future<void> softDeleteProduct(String id) async {
    final updatedProducts = state.products.map((p) {
      if (p.id == id) return p.copyWith(deletedAt: DateTime.now());
      return p;
    }).toList();

    final event = TimelineEvent(
      id: '${DateTime.now().millisecondsSinceEpoch}',
      productId: id,
      type: TimelineEventType.deleted,
      timestamp: DateTime.now(),
      details: const TimelineEventDetails(),
    );

    state = state.copyWith(
      products: updatedProducts,
      timeline: [event, ...state.timeline],
    );

    await _saveProducts();
    await _saveTimeline();
  }

  Future<void> restoreProduct(String id) async {
    final updatedProducts = state.products.map((p) {
      if (p.id == id) {
        return Product(
          id: p.id,
          sku: p.sku,
          furType: p.furType,
          location: p.location,
          status: p.status,
          images: p.images,
          purchasePrice: p.purchasePrice,
          sellPrice: p.sellPrice,
          length: p.length,
          width: p.width,
          weight: p.weight,
          productionDate: p.productionDate,
          technicalNotes: p.technicalNotes,
          customData: p.customData,
          createdAt: p.createdAt,
          updatedAt: DateTime.now(),
          lastScannedAt: p.lastScannedAt,
          soldAt: p.soldAt,
          deletedAt: null,
          libraryId: p.libraryId,
          gs1DigitalLink: p.gs1DigitalLink,
          isFragile: p.isFragile,
        );
      }
      return p;
    }).toList();

    final event = TimelineEvent(
      id: '${DateTime.now().millisecondsSinceEpoch}',
      productId: id,
      type: TimelineEventType.restored,
      timestamp: DateTime.now(),
      details: const TimelineEventDetails(),
    );

    state = state.copyWith(
      products: updatedProducts,
      timeline: [event, ...state.timeline],
    );

    await _saveProducts();
    await _saveTimeline();
  }

  Future<void> associateNfcTag(String productId, String tagId) async {
    final product = getProductById(productId);
    if (product == null) return;
    final updated = product.copyWith(
      nfcTag: tagId,
      updatedAt: DateTime.now(),
    );
    final updatedProducts =
        state.products.map((p) => p.id == productId ? updated : p).toList();
    state = state.copyWith(products: updatedProducts);
    await _saveProducts();
  }

  Future<void> deleteProduct(String id) async {
    await softDeleteProduct(id);
  }

  Future<void> emptyTrash() async {
    final activeProducts =
        state.products.where((p) => p.deletedAt == null).toList();
    state = state.copyWith(products: activeProducts);
    await _saveProducts();
  }

  Future<void> permanentlyDeleteProduct(String id) async {
    final updatedProducts = state.products.where((p) => p.id != id).toList();
    state = state.copyWith(products: updatedProducts);
    await _saveProducts();
  }

  Future<void> updateLibrary(LibraryModel updated) async {
    final updatedLibs =
        state.libraries.map((l) => l.id == updated.id ? updated : l).toList();
    state = state.copyWith(libraries: updatedLibs);
    await _saveLibraries();
  }

  Future<void> addLibrary(dynamic libraryOrName, [String? icon]) async {
    if (libraryOrName is LibraryModel) {
      state = state.copyWith(libraries: [...state.libraries, libraryOrName]);
      await _saveLibraries();
      return;
    }
    final name = libraryOrName.toString();
    final slug = name
        .toLowerCase()
        .replaceAll(RegExp(r'[^a-z0-9]+'), '-')
        .replaceAll(RegExp(r'^-+|-+$'), '');
    final newLib = LibraryModel(
      id: slug,
      name: name,
      icon: icon ?? 'folder',
      fields: const [],
      createdAt: DateTime.now(),
    );
    state = state.copyWith(libraries: [...state.libraries, newLib]);
    await _saveLibraries();
  }

  Future<void> deleteLibrary(String id) async {
    state = state.copyWith(
      libraries: state.libraries.where((l) => l.id != id).toList(),
    );
    await _saveLibraries();
  }

  Future<void> dismissAlert(String alertId) async {
    final updatedAlerts = state.alerts.map((a) {
      if (a.id == alertId) return a.copyWith(dismissed: true);
      return a;
    }).toList();
    state = state.copyWith(alerts: updatedAlerts);
    await _saveAlerts();
  }

  Future<void> importBackup(Map<String, dynamic> backup) async {
    try {
      final productsRaw = backup['products'] as List<dynamic>?;
      final timelineRaw = backup['timeline'] as List<dynamic>?;
      final librariesRaw = backup['libraries'] as List<dynamic>?;
      List<Product> products = state.products;
      List<TimelineEvent> timeline = state.timeline;
      List<LibraryModel> libraries = state.libraries;
      if (productsRaw != null) {
        products = productsRaw.map((e) => Product.fromJson(e as Map<String, dynamic>)).toList();
      }
      if (timelineRaw != null) {
        timeline = timelineRaw.map((e) => TimelineEvent.fromJson(e as Map<String, dynamic>)).toList();
      }
      if (librariesRaw != null) {
        libraries = librariesRaw.map((e) => LibraryModel.fromJson(e as Map<String, dynamic>)).toList();
      }
      state = InventoryState(products: products, timeline: timeline, alerts: state.alerts, libraries: libraries);
      state = _generateAlertsForState(state);
      await _saveProducts();
      await _saveTimeline();
      await _saveLibraries();
      await _saveAlerts();
    } catch (_) {}
  }

  Product? getProductById(String id) {
    try {
      return state.products.firstWhere((p) => p.id == id);
    } catch (_) {
      return null;
    }
  }

  Product? getProductBySku(String sku) {
    try {
      return state.products.firstWhere((p) => p.sku == sku);
    } catch (_) {
      return null;
    }
  }

  List<TimelineEvent> getTimelineForProduct(String productId) {
    return state.timeline.where((t) => t.productId == productId).toList();
  }

  List<Product> filterProducts(String filter) {
    if (filter == 'trash') {
      return state.products.where((p) => p.deletedAt != null).toList();
    }
    final active = state.products.where((p) => p.deletedAt == null).toList();
    switch (filter) {
      case 'available':
        return active.where((p) => p.status == ProductStatusType.available).toList();
      case 'sold':
        return active.where((p) => p.status == ProductStatusType.sold).toList();
      case 'alert':
        final alertProductIds = state.alerts
            .where((a) => !a.dismissed)
            .map((a) => a.productId)
            .toSet();
        return active.where((p) => alertProductIds.contains(p.id)).toList();
      case 'all':
      default:
        return active;
    }
  }
}

final inventoryProvider =
    NotifierProvider<InventoryNotifier, InventoryState>(InventoryNotifier.new);
