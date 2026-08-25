import '../models/models.dart';

class MockData {
  static List<Product> get products => [
    Product(id: 'p1', sku: 'FUR-2024-001', furType: 'visone', location: 'vetrina', status: ProductStatus.available,
      images: ['https://images.unsplash.com/photo-1539533018447-63fcce2678e3?w=800&h=800&fit=crop'],
      purchasePrice: 2500, sellPrice: 4200, length: 85, width: 120, weight: 1.2, isFragile: true,
      createdAt: DateTime.now().subtract(const Duration(days: 30)), updatedAt: DateTime.now().subtract(const Duration(days: 5))),
    Product(id: 'p2', sku: 'FUR-2024-002', furType: 'volpe', location: 'magazzino', status: ProductStatus.available,
      images: ['https://images.unsplash.com/photo-1551488831-00ddcb6d6f3a?w=800&h=800&fit=crop'],
      purchasePrice: 1800, sellPrice: 3200, length: 90, width: 110, weight: 0.9,
      createdAt: DateTime.now().subtract(const Duration(days: 25)), updatedAt: DateTime.now().subtract(const Duration(days: 3))),
    Product(id: 'p3', sku: 'FUR-2024-003', furType: 'zibellino', location: 'stand_a', status: ProductStatus.sold,
      images: ['https://images.unsplash.com/photo-1542838132-25c845930fd2?w=800&h=800&fit=crop'],
      purchasePrice: 5000, sellPrice: 8500, length: 95, width: 130, weight: 1.5,
      createdAt: DateTime.now().subtract(const Duration(days: 60)), updatedAt: DateTime.now().subtract(const Duration(days: 10)),
      soldAt: DateTime.now().subtract(const Duration(days: 10))),
    Product(id: 'p4', sku: 'FUR-2024-004', furType: 'cincilla', location: 'sartoria', status: ProductStatus.available,
      images: ['https://images.unsplash.com/photo-1591047139829-d71aec588223?w=800&h=800&fit=crop'],
      purchasePrice: 3200, sellPrice: 5800, length: 80, width: 100, weight: 1.0, lotto: 'LOT-2024-A',
      createdAt: DateTime.now().subtract(const Duration(days: 200)), updatedAt: DateTime.now().subtract(const Duration(days: 200))),
    Product(id: 'p5', sku: 'FUR-2024-005', furType: 'ermellino', location: 'vetrina', status: ProductStatus.available,
      images: ['https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=800&h=800&fit=crop'],
      purchasePrice: 4100, sellPrice: 7200, length: 88, width: 115, weight: 1.1,
      createdAt: DateTime.now().subtract(const Duration(days: 15)), updatedAt: DateTime.now().subtract(const Duration(days: 2))),
    Product(id: 'p6', sku: 'FUR-2024-006', furType: 'astrakan', location: 'magazzino', status: ProductStatus.available,
      images: ['https://images.unsplash.com/photo-1589871290698-4451b4f06f11?w=800&h=800&fit=crop'],
      purchasePrice: 1500, sellPrice: 2800, length: 82, width: 105, weight: 0.8,
      createdAt: DateTime.now().subtract(const Duration(days: 8)), updatedAt: DateTime.now().subtract(const Duration(days: 1))),
  ];

  static List<TimelineEvent> get timeline => [
    TimelineEvent(id: 't1', productId: 'p1', type: TimelineEventType.created, timestamp: DateTime.now().subtract(const Duration(days: 30)), details: TimelineEventDetails()),
    TimelineEvent(id: 't2', productId: 'p2', type: TimelineEventType.created, timestamp: DateTime.now().subtract(const Duration(days: 25)), details: TimelineEventDetails()),
    TimelineEvent(id: 't3', productId: 'p3', type: TimelineEventType.sold, timestamp: DateTime.now().subtract(const Duration(days: 10)), details: TimelineEventDetails(finalPrice: 8500)),
    TimelineEvent(id: 't4', productId: 'p5', type: TimelineEventType.created, timestamp: DateTime.now().subtract(const Duration(days: 15)), details: TimelineEventDetails()),
    TimelineEvent(id: 't5', productId: 'p1', type: TimelineEventType.modified, timestamp: DateTime.now().subtract(const Duration(days: 5)), details: TimelineEventDetails(changes: ['Prezzo aggiornato', 'Note tecniche modificate'])),
    TimelineEvent(id: 't6', productId: 'p6', type: TimelineEventType.created, timestamp: DateTime.now().subtract(const Duration(days: 8)), details: TimelineEventDetails()),
    TimelineEvent(id: 't7', productId: 'p2', type: TimelineEventType.moved, timestamp: DateTime.now().subtract(const Duration(days: 3)), details: TimelineEventDetails(from: 'Magazzino', to: 'Vetrina')),
    TimelineEvent(id: 't8', productId: 'p5', type: TimelineEventType.photoAdded, timestamp: DateTime.now().subtract(const Duration(days: 2)), details: TimelineEventDetails(photoCount: 3)),
  ];

  static List<Library> get libraries => [
    Library(id: 'lib_collezione', name: 'Collezione 2024', icon: 'folder', barcode: 'LIB-COLLEZ-2024', createdAt: DateTime.now().subtract(const Duration(days: 90))),
    Library(id: 'lib_vintage', name: 'Vintage', icon: 'folder', barcode: 'LIB-VINTAGE', createdAt: DateTime.now().subtract(const Duration(days: 60))),
  ];

  static List<ProductAlert> get alerts => [
    ProductAlert(id: 'a1', productId: 'p4', type: AlertType.dormant, message: 'Prodotto in giacenza da oltre 6 mesi', createdAt: DateTime.now().subtract(const Duration(days: 5))),
  ];

  static List<Automation> get automations => [];
}
