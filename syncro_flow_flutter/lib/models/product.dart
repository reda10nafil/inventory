import 'custom_field.dart';

enum ProductStatusType { available, sold, archived }

class ProductCustomData {
  final dynamic value;
  final CustomField fieldSnapshot;

  const ProductCustomData({
    required this.value,
    required this.fieldSnapshot,
  });

  Map<String, dynamic> toJson() {
    return {
      'value': value,
      'fieldSnapshot': fieldSnapshot.toJson(),
    };
  }

  factory ProductCustomData.fromJson(Map<String, dynamic> json) {
    return ProductCustomData(
      value: json['value'],
      fieldSnapshot: CustomField.fromJson(
        json['fieldSnapshot'] as Map<String, dynamic>,
      ),
    );
  }
}

class Product {
  final String id;
  final String sku;
  final String furType;
  final String location;
  final ProductStatusType status;
  final List<String> images;
  final double? purchasePrice;
  final double? sellPrice;
  final double? length;
  final double? width;
  final double? weight;
  final String? productionDate;
  final String? technicalNotes;
  final List<ProductCustomData> customData;
  final DateTime createdAt;
  final DateTime updatedAt;
  final DateTime? lastScannedAt;
  final DateTime? soldAt;
  final DateTime? deletedAt;
  final String? libraryId;
  final String? gs1DigitalLink;
  final bool? isFragile;
  final String? barcode;
  final String? nfcTag;

  const Product({
    required this.id,
    required this.sku,
    required this.furType,
    required this.location,
    this.status = ProductStatusType.available,
    this.images = const [],
    this.purchasePrice,
    this.sellPrice,
    this.length,
    this.width,
    this.weight,
    this.productionDate,
    this.technicalNotes,
    this.customData = const [],
    required this.createdAt,
    DateTime? updatedAt,
    this.lastScannedAt,
    this.soldAt,
    this.deletedAt,
    this.libraryId,
    this.gs1DigitalLink,
    this.isFragile,
    this.barcode,
    this.nfcTag,
  }) : updatedAt = updatedAt ?? createdAt;

  Map<String, dynamic> get customFields => {
        for (final cd in customData) cd.fieldSnapshot.id: cd.value
      };

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'sku': sku,
      'furType': furType,
      'location': location,
      'status': status.name,
      'images': images,
      if (purchasePrice != null) 'purchasePrice': purchasePrice,
      if (sellPrice != null) 'sellPrice': sellPrice,
      if (length != null) 'length': length,
      if (width != null) 'width': width,
      if (weight != null) 'weight': weight,
      if (productionDate != null) 'productionDate': productionDate,
      if (technicalNotes != null) 'technicalNotes': technicalNotes,
      'customData': customData.map((cd) => cd.toJson()).toList(),
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      if (lastScannedAt != null) 'lastScannedAt': lastScannedAt!.toIso8601String(),
      if (soldAt != null) 'soldAt': soldAt!.toIso8601String(),
      if (deletedAt != null) 'deletedAt': deletedAt!.toIso8601String(),
      if (libraryId != null) 'libraryId': libraryId,
      if (gs1DigitalLink != null) 'gs1DigitalLink': gs1DigitalLink,
      if (isFragile != null) 'isFragile': isFragile,
      if (barcode != null) 'barcode': barcode,
      if (nfcTag != null) 'nfcTag': nfcTag,
    };
  }

  factory Product.fromJson(Map<String, dynamic> json) {
    ProductStatusType parsedStatus = ProductStatusType.available;
    if (json['status'] == 'sold') {
      parsedStatus = ProductStatusType.sold;
    } else if (json['status'] == 'archived') {
      parsedStatus = ProductStatusType.archived;
    }

    return Product(
      id: json['id'] as String,
      sku: json['sku'] as String,
      furType: json['furType'] as String? ?? 'altro',
      location: json['location'] as String? ?? 'magazzino',
      status: parsedStatus,
      images: (json['images'] as List<dynamic>?)
              ?.map((e) => e.toString())
              .toList() ??
          [],
      purchasePrice: (json['purchasePrice'] as num?)?.toDouble(),
      sellPrice: (json['sellPrice'] as num?)?.toDouble(),
      length: (json['length'] as num?)?.toDouble(),
      width: (json['width'] as num?)?.toDouble(),
      weight: (json['weight'] as num?)?.toDouble(),
      productionDate: json['productionDate'] as String?,
      technicalNotes: json['technicalNotes'] as String?,
      customData: (json['customData'] as List<dynamic>?)
              ?.map((cd) => ProductCustomData.fromJson(cd as Map<String, dynamic>))
              .toList() ??
          [],
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      lastScannedAt: json['lastScannedAt'] != null
          ? DateTime.tryParse(json['lastScannedAt'] as String)
          : null,
      soldAt: json['soldAt'] != null
          ? DateTime.tryParse(json['soldAt'] as String)
          : null,
      deletedAt: json['deletedAt'] != null
          ? DateTime.tryParse(json['deletedAt'] as String)
          : null,
      libraryId: json['libraryId'] as String?,
      gs1DigitalLink: json['gs1DigitalLink'] as String?,
      isFragile: json['isFragile'] as bool?,
      barcode: json['barcode'] as String?,
      nfcTag: json['nfcTag'] as String?,
    );
  }

  Product copyWith({
    String? id,
    String? sku,
    String? furType,
    String? location,
    ProductStatusType? status,
    List<String>? images,
    double? purchasePrice,
    double? sellPrice,
    double? length,
    double? width,
    double? weight,
    String? productionDate,
    String? technicalNotes,
    List<ProductCustomData>? customData,
    DateTime? createdAt,
    DateTime? updatedAt,
    DateTime? lastScannedAt,
    DateTime? soldAt,
    DateTime? deletedAt,
    String? libraryId,
    String? gs1DigitalLink,
    bool? isFragile,
    String? barcode,
    String? nfcTag,
  }) {
    return Product(
      id: id ?? this.id,
      sku: sku ?? this.sku,
      furType: furType ?? this.furType,
      location: location ?? this.location,
      status: status ?? this.status,
      images: images ?? this.images,
      purchasePrice: purchasePrice ?? this.purchasePrice,
      sellPrice: sellPrice ?? this.sellPrice,
      length: length ?? this.length,
      width: width ?? this.width,
      weight: weight ?? this.weight,
      productionDate: productionDate ?? this.productionDate,
      technicalNotes: technicalNotes ?? this.technicalNotes,
      customData: customData ?? this.customData,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      lastScannedAt: lastScannedAt ?? this.lastScannedAt,
      soldAt: soldAt ?? this.soldAt,
      deletedAt: deletedAt ?? this.deletedAt,
      libraryId: libraryId ?? this.libraryId,
      gs1DigitalLink: gs1DigitalLink ?? this.gs1DigitalLink,
      isFragile: isFragile ?? this.isFragile,
      barcode: barcode ?? this.barcode,
      nfcTag: nfcTag ?? this.nfcTag,
    );
  }
}
