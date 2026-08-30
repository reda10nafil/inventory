import 'package:flutter/material.dart';

Widget buildFileImage(
  String path, {
  required BoxFit fit,
  double? width,
  double? height,
  Widget Function(BuildContext, Object, StackTrace?)? errorBuilder,
  Widget Function()? fallback,
}) {
  // Web fallback: treat local path as network or placeholder
  if (fallback != null) return fallback();
  return Image.network(
    path,
    fit: fit,
    width: width,
    height: height,
    errorBuilder: (context, error, stackTrace) {
      if (errorBuilder != null) return errorBuilder(context, error, stackTrace);
      if (fallback != null) return fallback();
      return const Icon(Icons.broken_image, color: Colors.grey);
    },
  );
}
