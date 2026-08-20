import 'package:flutter/material.dart';
import '../core/theme/app_colors.dart';
import '../core/theme/app_typography.dart';
import '../models/product.dart';

class ProductCardWidget extends StatelessWidget {
  final Product product;
  final String locationLabel;
  final VoidCallback onTap;
  final VoidCallback? onLongPress;
  final bool isSelected;

  const ProductCardWidget({
    super.key,
    required this.product,
    required this.locationLabel,
    required this.onTap,
    this.onLongPress,
    this.isSelected = false,
  });

  @override
  Widget build(BuildContext context) {
    final isAvailable = product.status == ProductStatusType.available;

    return Card(
      color: isSelected ? AppColors.surfaceElevated : AppColors.surface,
      margin: const EdgeInsets.only(bottom: 12),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(
          color: isSelected ? AppColors.accentGold : AppColors.border,
          width: isSelected ? 2 : 1,
        ),
      ),
      child: InkWell(
        onTap: onTap,
        onLongPress: onLongPress,
        borderRadius: BorderRadius.circular(16),
        child: Padding(
          padding: const EdgeInsets.all(12.0),
          child: Row(
            children: [
              // Product Image Preview
              Container(
                width: 70,
                height: 70,
                decoration: BoxDecoration(
                  color: AppColors.backgroundSecondary,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: product.images.isNotEmpty && product.images.first.startsWith('assets/')
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: Image.asset(product.images.first, fit: BoxFit.cover),
                      )
                    : const Icon(Icons.inventory_2_outlined, size: 36, color: AppColors.accentGold),
              ),
              const SizedBox(width: 14),

              // Product Info Column
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          product.furType.toUpperCase(),
                          style: AppTypography.titleMedium.copyWith(color: AppColors.accentGold),
                        ),
                        if (product.isFragile == true) ...[
                          const SizedBox(width: 6),
                          const Icon(Icons.warning_amber_rounded, size: 16, color: AppColors.warning),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text('SKU: ${product.sku}', style: AppTypography.bodySmall.copyWith(color: AppColors.textSecondary)),
                    const SizedBox(height: 6),
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: isAvailable ? AppColors.success.withAlpha(30) : AppColors.error.withAlpha(30),
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Text(
                            isAvailable ? 'DISPONIBILE' : 'VENDUTO',
                            style: AppTypography.labelSmall.copyWith(
                              color: isAvailable ? AppColors.success : AppColors.error,
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        Row(
                          children: [
                            const Icon(Icons.location_on, size: 12, color: AppColors.textMuted),
                            const SizedBox(width: 2),
                            Text(locationLabel, style: AppTypography.caption.copyWith(color: AppColors.textMuted)),
                          ],
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              // Price
              if (product.sellPrice != null)
                Text(
                  '€${product.sellPrice!.toStringAsFixed(2)}',
                  style: AppTypography.titleMedium.copyWith(color: AppColors.accentGoldLight),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
