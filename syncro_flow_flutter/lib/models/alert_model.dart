enum AlertType { dormant, promotionSuggestion }

class AlertModel {
  final String id;
  final String productId;
  final AlertType type;
  final String message;
  final DateTime createdAt;
  final bool dismissed;

  const AlertModel({
    required this.id,
    required this.productId,
    required this.type,
    required this.message,
    required this.createdAt,
    this.dismissed = false,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'productId': productId,
      'type': type == AlertType.dormant ? 'dormant' : 'promotion_suggestion',
      'message': message,
      'createdAt': createdAt.toIso8601String(),
      'dismissed': dismissed,
    };
  }

  factory AlertModel.fromJson(Map<String, dynamic> json) {
    return AlertModel(
      id: json['id'] as String,
      productId: json['productId'] as String,
      type: json['type'] == 'dormant'
          ? AlertType.dormant
          : AlertType.promotionSuggestion,
      message: json['message'] as String,
      createdAt: DateTime.parse(json['createdAt'] as String),
      dismissed: json['dismissed'] as bool? ?? false,
    );
  }

  AlertModel copyWith({
    String? id,
    String? productId,
    AlertType? type,
    String? message,
    DateTime? createdAt,
    bool? dismissed,
  }) {
    return AlertModel(
      id: id ?? this.id,
      productId: productId ?? this.productId,
      type: type ?? this.type,
      message: message ?? this.message,
      createdAt: createdAt ?? this.createdAt,
      dismissed: dismissed ?? this.dismissed,
    );
  }
}
