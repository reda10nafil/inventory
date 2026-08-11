enum TimelineEventType {
  created,
  moved,
  modified,
  sold,
  scanned,
  photoAdded,
  deleted,
  restored,
}

class TimelineEventDetails {
  final String? from;
  final String? to;
  final String? field;
  final dynamic oldValue;
  final dynamic newValue;
  final double? finalPrice;
  final int? photoCount;
  final List<String>? changes;

  const TimelineEventDetails({
    this.from,
    this.to,
    this.field,
    this.oldValue,
    this.newValue,
    this.finalPrice,
    this.photoCount,
    this.changes,
  });

  Map<String, dynamic> toJson() {
    return {
      if (from != null) 'from': from,
      if (to != null) 'to': to,
      if (field != null) 'field': field,
      if (oldValue != null) 'oldValue': oldValue,
      if (newValue != null) 'newValue': newValue,
      if (finalPrice != null) 'finalPrice': finalPrice,
      if (photoCount != null) 'photoCount': photoCount,
      if (changes != null) 'changes': changes,
    };
  }

  factory TimelineEventDetails.fromJson(Map<String, dynamic> json) {
    return TimelineEventDetails(
      from: json['from'] as String?,
      to: json['to'] as String?,
      field: json['field'] as String?,
      oldValue: json['oldValue'],
      newValue: json['newValue'],
      finalPrice: (json['finalPrice'] as num?)?.toDouble(),
      photoCount: (json['photoCount'] as num?)?.toInt(),
      changes: (json['changes'] as List<dynamic>?)
          ?.map((e) => e.toString())
          .toList(),
    );
  }
}

class TimelineEvent {
  final String id;
  final String productId;
  final TimelineEventType type;
  final DateTime timestamp;
  final TimelineEventDetails details;

  const TimelineEvent({
    required this.id,
    required this.productId,
    required this.type,
    required this.timestamp,
    required this.details,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'productId': productId,
      'type': _typeToString(type),
      'timestamp': timestamp.toIso8601String(),
      'details': details.toJson(),
    };
  }

  factory TimelineEvent.fromJson(Map<String, dynamic> json) {
    return TimelineEvent(
      id: json['id'] as String,
      productId: json['productId'] as String,
      type: _stringToType(json['type'] as String),
      timestamp: DateTime.parse(json['timestamp'] as String),
      details: TimelineEventDetails.fromJson(
        (json['details'] as Map<String, dynamic>?) ?? {},
      ),
    );
  }

  static String _typeToString(TimelineEventType type) {
    switch (type) {
      case TimelineEventType.created:
        return 'created';
      case TimelineEventType.moved:
        return 'moved';
      case TimelineEventType.modified:
        return 'modified';
      case TimelineEventType.sold:
        return 'sold';
      case TimelineEventType.scanned:
        return 'scanned';
      case TimelineEventType.photoAdded:
        return 'photo_added';
      case TimelineEventType.deleted:
        return 'deleted';
      case TimelineEventType.restored:
        return 'restored';
    }
  }

  static TimelineEventType _stringToType(String str) {
    switch (str) {
      case 'created':
        return TimelineEventType.created;
      case 'moved':
        return TimelineEventType.moved;
      case 'modified':
        return TimelineEventType.modified;
      case 'sold':
        return TimelineEventType.sold;
      case 'scanned':
        return TimelineEventType.scanned;
      case 'photo_added':
      case 'photoAdded':
        return TimelineEventType.photoAdded;
      case 'deleted':
        return TimelineEventType.deleted;
      case 'restored':
        return TimelineEventType.restored;
      default:
        return TimelineEventType.modified;
    }
  }
}
