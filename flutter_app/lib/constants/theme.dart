import 'package:flutter/material.dart';

class AppTheme {
  static const Color primary = Color(0xFFD4AF37);
  static const Color primaryLight = Color(0xFFE6C868);
  static const Color primaryDark = Color(0xFFB8941F);

  static const Color background = Color(0xFF0A0A0A);
  static const Color backgroundSecondary = Color(0xFF1A1A1A);
  static const Color surface = Color(0xFF1F1F1F);
  static const Color surfaceElevated = Color(0xFF2A2A2A);

  static const Color textPrimary = Color(0xFFFFFFFF);
  static const Color textSecondary = Color(0xFF9CA3AF);
  static const Color textMuted = Color(0xFF6B7280);

  static const Color border = Color(0xFF374151);
  static const Color borderLight = Color(0xFF2A2A2A);

  static const Color success = Color(0xFF10B981);
  static const Color error = Color(0xFFEF4444);
  static const Color warning = Color(0xFFF59E0B);
  static const Color info = Color(0xFF3B82F6);
  static const Color notification = Color(0xFFEF4444);

  static const Color available = Color(0xFF10B981);
  static const Color sold = Color(0xFF6B7280);
  static const Color alert = Color(0xFFF59E0B);

  static const double screenPadding = 16.0;
  static const double cardGap = 12.0;
  static const double sectionGap = 24.0;
  static const double radiusSmall = 8.0;
  static const double radiusMedium = 12.0;
  static const double radiusLarge = 16.0;
  static const double radiusFull = 9999.0;

  static ThemeData get darkTheme => ThemeData(
        useMaterial3: true,
        brightness: Brightness.dark,
        scaffoldBackgroundColor: background,
        colorScheme: const ColorScheme.dark(
          primary: primary,
          secondary: primaryLight,
          surface: surface,
          error: error,
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: background,
          foregroundColor: textPrimary,
          elevation: 0,
        ),
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: background,
          selectedItemColor: primary,
          unselectedItemColor: textSecondary,
          type: BottomNavigationBarType.fixed,
          selectedLabelStyle: TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
          unselectedLabelStyle: TextStyle(fontSize: 11, fontWeight: FontWeight.w600),
        ),
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: surface,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(radiusMedium),
            borderSide: const BorderSide(color: border),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(radiusMedium),
            borderSide: const BorderSide(color: border),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(radiusMedium),
            borderSide: const BorderSide(color: primary),
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 14),
          labelStyle: const TextStyle(color: textSecondary, fontSize: 13, fontWeight: FontWeight.w600),
        ),
        cardTheme: CardThemeData(
          color: surface,
          elevation: 4,
          shadowColor: Colors.black,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(radiusMedium),
          ),
          margin: EdgeInsets.zero,
        ),
        dividerTheme: const DividerThemeData(color: border, thickness: 1),
      );
}

class AppTypography {
  static const TextStyle heroLabel = TextStyle(
    fontSize: 11, fontWeight: FontWeight.w600, color: AppTheme.textSecondary, letterSpacing: 1,
  );
  static const TextStyle cardTitle = TextStyle(
    fontSize: 16, fontWeight: FontWeight.w600, color: AppTheme.textPrimary,
  );
  static const TextStyle caption = TextStyle(
    fontSize: 13, fontWeight: FontWeight.w400, color: AppTheme.textSecondary,
  );
  static const TextStyle body = TextStyle(
    fontSize: 15, fontWeight: FontWeight.w400, color: AppTheme.textPrimary,
  );
  static const TextStyle sectionHeader = TextStyle(
    fontSize: 14, fontWeight: FontWeight.w600, letterSpacing: 0.5, color: AppTheme.textSecondary,
  );
}
