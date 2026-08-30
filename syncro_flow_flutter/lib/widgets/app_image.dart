import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import '../core/theme/app_colors.dart';
import 'file_image_helper.dart' if (dart.library.html) 'file_image_helper_web.dart';

/// Universal image widget that safely renders images from assets, web/network,
/// or local files across all Flutter platforms (including Flutter Web).
class AppImage extends StatelessWidget {
  final String path;
  final BoxFit fit;
  final double? width;
  final double? height;
  final Widget Function(BuildContext, Object, StackTrace?)? errorBuilder;

  const AppImage({
    super.key,
    required this.path,
    this.fit = BoxFit.cover,
    this.width,
    this.height,
    this.errorBuilder,
  });

  Widget _defaultFallback() {
    return Container(
      width: width,
      height: height,
      color: AppColors.surfaceElevated,
      child: const Center(
        child: Icon(
          Icons.image_outlined,
          color: AppColors.textMuted,
          size: 32,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (path.isEmpty) {
      return _defaultFallback();
    }

    if (path.startsWith('assets/')) {
      return Image.asset(
        path,
        fit: fit,
        width: width,
        height: height,
        errorBuilder: (context, error, stackTrace) {
          if (errorBuilder != null) {
            return errorBuilder!(context, error, stackTrace);
          }
          return _defaultFallback();
        },
      );
    }

    if (kIsWeb ||
        path.startsWith('http://') ||
        path.startsWith('https://') ||
        path.startsWith('blob:') ||
        path.startsWith('data:')) {
      return Image.network(
        path,
        fit: fit,
        width: width,
        height: height,
        errorBuilder: (context, error, stackTrace) {
          if (errorBuilder != null) {
            return errorBuilder!(context, error, stackTrace);
          }
          return _defaultFallback();
        },
      );
    }

    // Native platform (Android / iOS / Windows / macOS / Linux)
    return buildFileImage(
      path,
      fit: fit,
      width: width,
      height: height,
      errorBuilder: errorBuilder,
      fallback: _defaultFallback,
    );
  }
}
