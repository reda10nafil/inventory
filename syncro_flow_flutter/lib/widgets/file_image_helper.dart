import 'dart:io';
import 'package:flutter/material.dart';

Widget buildFileImage(
  String path, {
  required BoxFit fit,
  double? width,
  double? height,
  Widget Function(BuildContext, Object, StackTrace?)? errorBuilder,
  Widget Function()? fallback,
}) {
  return Image.file(
    File(path),
    fit: fit,
    width: width,
    height: height,
    errorBuilder: (context, error, stackTrace) {
      if (errorBuilder != null) return errorBuilder(context, error, stackTrace);
      if (fallback != null) return fallback();
      return const SizedBox.shrink();
    },
  );
}
