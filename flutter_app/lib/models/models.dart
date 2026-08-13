enum ProductStatus { available, sold, archived }

class Product {
  final String id;
  final String sku;
  final String furType;
  final String location;
  final ProductStatus status;
  final List<String> images;
  final double? purchasePrice;
  final double? sellPrice;
  final double? length;
  final double? width;
  final double? weight;
  final String? technicalNotes;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? soldAt;
  final DateTime? deletedAt;
  final String? libraryId;

  Product({
    required this.id,
    required this.sku,
    required this.furType,
    required this.location,
    required this.status,
    required this.images,
    this.purchasePrice,
    this.sellPrice,
    this.length,
    this.width,
    this.weight,
    this.technicalNotes,
    required this.createdAt,
    required this.updatedAt,
    this.soldAt,
    this.deletedAt,
    this.libraryId,
  });

  Product copyWith({
    String? sku, String? furType, String? location, ProductStatus? status,
    List<String>? images, double? purchasePrice, double? sellPrice,
    double? length, double? width, double? weight, String? technicalNotes,
    DateTime? createdAt, DateTime? updatedAt, DateTime? soldAt, DateTime? deletedAt,
    String? libraryId,
  }) {
    return Product(
      id: id, sku: sku ?? this.sku, furType: furType ?? this.furType,
      location: location ?? this.location, status: status ?? this.status,
      images: images ?? this.images, purchasePrice: purchasePrice ?? this.purchasePrice,
      sellPrice: sellPrice ?? this.sellPrice, length: length ?? this.length,
      width: width ?? this.width, weight: weight ?? this.weight,
      technicalNotes: technicalNotes ?? this.technicalNotes,
      createdAt: createdAt ?? this.createdAt, updatedAt: updatedAt ?? this.updatedAt,
      soldAt: soldAt ?? this.soldAt, deletedAt: deletedAt ?? this.deletedAt,
      libraryId: libraryId ?? this.libraryId,
    );
  }
}

enum TimelineEventType { created, moved, modified, sold, scanned, photoAdded, deleted, restored }

class TimelineEventDetails {
  final String? from;
  final String? to;
  final double? finalPrice;
  final int? photoCount;
  final List<String>? changes;
  TimelineEventDetails({this.from, this.to, this.finalPrice, this.photoCount, this.changes});
}

class TimelineEvent {
  final String id;
  final String productId;
  final TimelineEventType type;
  final DateTime timestamp;
  final TimelineEventDetails details;
  TimelineEvent({required this.id, required this.productId, required this.type, required this.timestamp, required this.details});
}

class Library {
  final String id;
  final String name;
  final String icon;
  final DateTime createdAt;
  Library({required this.id, required this.name, required this.icon, required this.createdAt});
}

enum AlertType { dormant, promotionSuggestion }

class ProductAlert {
  final String id;
  final String productId;
  final AlertType type;
  final String message;
  final DateTime createdAt;
  final bool dismissed;
  ProductAlert({required this.id, required this.productId, required this.type, required this.message, required this.createdAt, this.dismissed = false});
  ProductAlert copyWith({bool? dismissed}) => ProductAlert(id: id, productId: productId, type: type, message: message, createdAt: createdAt, dismissed: dismissed ?? this.dismissed);
}

class AutomationStep {
  final String id;
  final String action;
  final Map<String, dynamic> params;
  AutomationStep({required this.id, required this.action, this.params = const {}});
}

class Automation {
  final String id;
  final String name;
  final String icon;
  final String color;
  final List<AutomationStep> steps;
  final int usageCount;
  Automation({required this.id, required this.name, required this.icon, required this.color, this.steps = const [], this.usageCount = 0});
}
