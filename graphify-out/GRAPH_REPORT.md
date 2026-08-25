# Graph Report - inventory  (2026-08-22)

## Corpus Check
- 189 files · ~124,731 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1918 nodes · 2981 edges · 220 communities (100 shown, 120 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `2a389b1b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Win32Window
- theme.ts
- expo
- automation_builder_screen.dart
- layout_config.dart
- app_typography.dart
- app_colors.dart
- package:flutter/material.dart
- package.json
- locationsProvider
- product.dart
- auth/index.ts
- inventory_provider.dart
- automation.dart
- home_screen.dart
- inventoryProvider
- add_product_screen.dart
- ConfigManager
- 📦 Modelli Dati Dart (Fase 1)
- DynamicFieldRenderer.tsx
- dependencies
- my_application.cc
- add.tsx
- custom_field.dart
- InventoryContext.tsx
- supabase/service.ts
- sound_service.dart
- timeline_event.dart
- gs1_config_screen.dart
- useInventory
- main.dart
- timeline_screen.dart
- app/_layout.tsx
- sector_templates.dart
- automation-builder.tsx
- product_detail_screen.dart
- scanner_screen.dart
- config.dart
- MockAuthService
- GeneratedPluginRegistrant.swift
- ui/context.tsx
- product/[id].tsx
- CustomFieldsContext.tsx
- quick_tag_screen.dart
- custom_fields_provider.dart
- supabase/context.tsx
- storageServiceProvider
- SoundService
- storage_service.dart
- library.dart
- Migrazione Syncro Flow: da Expo/React Native → Flutter
- wWinMain
- fields_screen.dart
- alert_model.dart
- Fase 6: Schermate Impostazioni
- nfc_service.dart
- include
- automations_provider.dart
- layout_provider.dart
- manifest.json
- MainActivity
- dynamic_field_renderer.dart
- app_shell.dart
- Welcome to
- locations_provider.dart
- MainApplication
- stat_card_widget.dart
- reset-project.js
- NfcService
- AppDelegate
- ios/RunnerTests/RunnerTests.swift
- gs1_config_provider.dart
- scan_sell_screen.dart
- FlutterMacOS
- Proposed Changes
- Fase 2: State Management (Providers → Riverpod)
- Fase 7: Schermate Automazioni
- List
- barcodeDecoder.ts
- StatelessWidget
- Fase 3: Servizi
- Fase 4: Schermate Tab (Core UI)
- AppDelegate
- RegisterGeneratedPlugins
- widget_test.dart
- useThemeColor.ts
- Cronologia e Stato della Migrazione: Syncro Flow (Expo → Flutter)
- Cronologia e Stato della Migrazione: Syncro Flow (Expo → Flutter)
- Analisi App Attuale
- Fase 1: Fondamenta (Core + Modelli + Tema)
- Fase 8: Widget Riutilizzabili
- _onItemTapped
- gradlew
- router.d.ts
- useLocations.ts
- +not-found.tsx
- eslint.config.js
- FlutterActivity
- graphify.js
- RunnerTests
- syncro_flow
- AGENTS.md
- @apollo/client
- es6-error
- expo
- expo-application
- expo-asset
- expo-audio
- expo-auth-session
- expo-av
- expo-battery
- expo-calendar
- expo-camera
- expo-clipboard
- expo-constants
- expo-contacts
- expo-crypto
- expo-dev-client
- expo-device
- expo-env.d.ts
- expo-file-system
- expo-font
- expo-gl
- @expo-google-fonts/inter
- expo-haptics
- expo-image
- expo-image-manipulator
- expo-image-picker
- expo-linear-gradient
- expo-linking
- expo-location
- expo-mail-composer
- expo-manifests
- expo-media-library
- @expo/metro-runtime
- expo-modules-autolinking
- expo-navigation-bar
- expo-network
- expo-notifications
- expo-print
- expo-screen-capture
- expo-screen-orientation
- expo-secure-store
- expo-sensors
- expo-sharing
- expo-speech
- expo-splash-screen
- expo-sqlite
- expo-status-bar
- expo-store-review
- @expo/styleguide-native
- expo-symbols
- expo-system-ui
- expo-task-manager
- @expo/vector-icons
- expo-video
- expo-web-browser
- @gorhom/bottom-sheet
- graphql
- @graphql-codegen/introspection
- immutable
- @lucide/lab
- path-to-regexp
- prop-types
- qrcode
- querystring
- react-dom
- react-native
- @react-native-async-storage/async-storage
- @react-native-clipboard/clipboard
- @react-native-community/datetimepicker
- @react-native-community/slider
- react-native-edge-to-edge
- react-native-gesture-handler
- @react-native-masked-view/masked-view
- react-native-nfc-manager
- @react-native-picker/picker
- react-native-qrcode-svg
- react-native-safe-area-context
- react-native-screens
- @react-native-segmented-control/segmented-control
- react-native-svg
- react-native-url-polyfill
- react-native-view-shot
- react-native-web
- react-native-webview
- react-native-worklets
- @react-navigation/bottom-tabs
- @react-navigation/core
- @react-navigation/drawer
- @react-navigation/elements
- @react-navigation/native
- @react-navigation/native-stack
- @react-navigation/routers
- @react-navigation/stack
- react-redux
- react-refresh
- react-string-replace
- redux
- redux-thunk
- semver
- @shopify/flash-list
- @shopify/react-native-skia
- snack-content
- @supabase/supabase-js
- tslib
- zustand
- LaunchImage.imageset/README.md
- bool?
- String?

## God Nodes (most connected - your core abstractions)
1. `inventoryProvider` - 45 edges
2. `useInventory()` - 31 edges
3. `expo-router` - 29 edges
4. `theme` - 29 edges
5. `borderRadius` - 28 edges
6. `Alert` - 27 edges
7. `spacing` - 26 edges
8. `storageServiceProvider` - 25 edges
9. `typography` - 24 edges
10. `Win32Window` - 24 edges

## Surprising Connections (you probably didn't know these)
- `CustomFieldsContextType` --references--> `CustomField`  [EXTRACTED]
  contexts/CustomFieldsContext.tsx → types/index.ts
- `AddProductScreen()` --calls--> `useInventory()`  [EXTRACTED]
  app/(tabs)/add.tsx → contexts/InventoryContext.tsx
- `AddProductScreen()` --calls--> `useLocations()`  [EXTRACTED]
  app/(tabs)/add.tsx → contexts/LocationsContext.tsx
- `AddProductScreen()` --references--> `Alert`  [EXTRACTED]
  app/(tabs)/add.tsx → types/index.ts
- `AutomationsScreen()` --references--> `Alert`  [EXTRACTED]
  app/(tabs)/automations.tsx → types/index.ts

## Import Cycles
- None detected.

## Communities (220 total, 120 thin omitted)

### Community 0 - "Win32Window"
Cohesion: 0.05
Nodes (57): PluginRegistry, RECT, RegisterPlugins(), DartProject, HWND, LPARAM, LRESULT, UINT (+49 more)

### Community 1 - "theme.ts"
Cohesion: 0.09
Nodes (36): AuditItem, AuditStatus, styles, Step, styles, styles, COMMON_TAGS, styles (+28 more)

### Community 2 - "expo"
Cohesion: 0.04
Nodes (45): backgroundColor, foregroundImage, adaptiveIcon, edgeToEdgeEnabled, package, permissions, projectId, com.apple.developer.nfc.readersession.formats (+37 more)

### Community 3 - "automation_builder_screen.dart"
Cohesion: 0.06
Nodes (40): automations/audit_screen.dart, automations/batch_move_screen.dart, automations/custom_runner_screen.dart, automations/quick_tag_screen.dart, automations/scan_sell_screen.dart, CustomAutomation?, MaterialPageRoute, ../../models/automation.dart (+32 more)

### Community 4 - "layout_config.dart"
Cohesion: 0.05
Nodes (41): FieldSize, int?, static const LayoutConfig, String get, baseUrl, copyWith, domain, enableLotto (+33 more)

### Community 5 - "app_typography.dart"
Cohesion: 0.05
Nodes (39): app_colors.dart, app_typography.dart, package:google_fonts/google_fonts.dart, static const double, static List, static TextStyle get, AppTheme, radiusFull (+31 more)

### Community 6 - "app_colors.dart"
Cohesion: 0.05
Nodes (39): bool get, ScanMode, static const Color, accentGold, accentGoldLight, alert, AppColors, available (+31 more)

### Community 7 - "package:flutter/material.dart"
Cohesion: 0.08
Nodes (30): ConsumerWidget, ../core/theme/app_colors.dart, package:flutter/material.dart, package:flutter_riverpod/flutter_riverpod.dart, package:share_plus/share_plus.dart, ../../providers/hardware_config_provider.dart, ../providers/inventory_provider.dart, ../services/sound_service.dart (+22 more)

### Community 8 - "package.json"
Cohesion: 0.06
Nodes (34): @babel/core, eslint, eslint-config-expo, expo-doctor, devDependencies, @babel/core, eslint, eslint-config-expo (+26 more)

### Community 9 - "locationsProvider"
Cohesion: 0.09
Nodes (32): ConsumerState, ConsumerStatefulWidget, Location?, ../../models/location.dart, ../providers/locations_provider.dart, Route /, Set, locationsProvider (+24 more)

### Community 10 - "product.dart"
Cohesion: 0.06
Nodes (34): Map, barcode, copyWith, createdAt, customData, customFields, deletedAt, fieldSnapshot (+26 more)

### Community 11 - "auth/index.ts"
Cohesion: 0.12
Nodes (25): MockAuthContext, MockAuthContextActions, MockAuthContextState, MockAuthContextType, MockAuthProvider(), MockAuthProviderProps, useMockAuthContext(), useMockAuth() (+17 more)

### Community 12 - "inventory_provider.dart"
Cohesion: 0.06
Nodes (32): ../models/alert_model.dart, addLibrary, addProduct, alerts, _alertsStorageKey, associateNfcTag, copyWith, deleteLibrary (+24 more)

### Community 13 - "automation.dart"
Cohesion: 0.06
Nodes (32): StepType, AutomationStep, AutomationStepConfig, color, config, copyWith, createdAt, CustomAutomation (+24 more)

### Community 14 - "home_screen.dart"
Cohesion: 0.07
Nodes (30): _FilterType, _activeFilter, _activeLibraryId, _buildActionModal, _buildEmptyState, _buildFilterChips, _buildImagePlaceholder, _buildLibraryChip (+22 more)

### Community 15 - "inventoryProvider"
Cohesion: 0.08
Nodes (28): ../../models/library.dart, product_detail_screen.dart, inventoryProvider, initState, build, _buildHeader, _confirmDelete, _handleMoveToLibrary (+20 more)

### Community 16 - "add_product_screen.dart"
Cohesion: 0.08
Nodes (27): ../core/theme/app_typography.dart, FormState, ../../models/layout_config.dart, ../../providers/layout_provider.dart, layoutProvider, _AddProductScreenState, build, _buildDynamicFieldWidget (+19 more)

### Community 17 - "ConfigManager"
Cohesion: 0.12
Nodes (13): getSharedSupabaseClient(), SupabaseManager, ConfigManager, createConfig(), CreateConfigOptions, AuthConfig, ModuleConfig, OnSpaceConfig (+5 more)

### Community 18 - "📦 Modelli Dati Dart (Fase 1)"
Cohesion: 0.07
Nodes (27): Automated Tests, Completamento Setup (Fase 0) e Fondamenta Core (Fase 1), 📱 Configurazione Permessi Hardware (Fase 0), 🎨 Design System e Costanti (Fase 1), Manual Verification, 📦 Modelli Dati Dart (Fase 1), [MODIFY] [AndroidManifest.xml](file:///c:/Users/Primo/Desktop/inventory/syncro_flow_flutter/android/app/src/main/AndroidManifest.xml), [MODIFY] [Info.plist](file:///c:/Users/Primo/Desktop/inventory/syncro_flow_flutter/ios/Runner/Info.plist) (+19 more)

### Community 19 - "DynamicFieldRenderer.tsx"
Cohesion: 0.12
Nodes (22): SectorTemplatesScreen(), styles, DynamicFieldRenderer(), DynamicFieldRendererProps, formatDateToInput(), FurType, SIZE_FLEX, styles (+14 more)

### Community 20 - "dependencies"
Cohesion: 0.07
Nodes (27): date-fns, dedent, expo-blur, expo-document-picker, expo-local-authentication, expo-localization, expo-router, lucide-react-native (+19 more)

### Community 21 - "my_application.cc"
Cohesion: 0.09
Nodes (22): FlPluginRegistry, FlView, GApplication, gboolean, gchar, GObject, GtkApplication, MyApplicationClass (+14 more)

### Community 22 - "add.tsx"
Cohesion: 0.19
Nodes (19): EditProductScreen(), styles, GS1ConfigScreen(), styles, LayoutBuilderScreen(), AddProductScreen(), styles, FUR_TYPES (+11 more)

### Community 23 - "custom_field.dart"
Cohesion: 0.08
Nodes (23): copyWith, CustomField, dataset, deletedAt, FieldUIType, fromJson, icon, id (+15 more)

### Community 24 - "InventoryContext.tsx"
Cohesion: 0.17
Nodes (18): FilterType, HomeScreen(), styles, DateFilter, FilterType, styles, DEFAULT_LIBRARIES, InventoryContext (+10 more)

### Community 25 - "supabase/service.ts"
Cohesion: 0.19
Nodes (9): AuthService, isAuthError(), isVisibilityTriggeredAuthEvent(), setupVisibilityMonitoring(), shouldIgnoreAuthEvent(), TIMEOUT_CONFIG, withTimeout(), SendOTPOptions (+1 more)

### Community 26 - "sound_service.dart"
Cohesion: 0.09
Nodes (21): AudioPlayer, package:audioplayers/audioplayers.dart, static final AudioPlayer, dispose, playAlarm, playAnomaly, _playAsset, playBatteryLow (+13 more)

### Community 27 - "timeline_event.dart"
Cohesion: 0.09
Nodes (21): double?, changes, details, field, finalPrice, from, fromJson, id (+13 more)

### Community 28 - "gs1_config_screen.dart"
Cohesion: 0.10
Nodes (20): ../models/gs1_config.dart, package:uuid/uuid.dart, ../../providers/gs1_config_provider.dart, static const Uuid, gs1ConfigProvider, _showQRModal, build, createState (+12 more)

### Community 29 - "useInventory"
Cohesion: 0.19
Nodes (19): AuditScreen(), BatchMoveScreen(), CustomRunnerScreen(), QuickTagScreen(), ScanSellScreen(), ProductDetailScreen(), ScannerActionScreen(), ScannerScreen() (+11 more)

### Community 30 - "main.dart"
Cohesion: 0.10
Nodes (19): ../core/theme/app_theme.dart, GoRouter, NavigatorState, package:flutter/services.dart, providers/storage_provider.dart, screens/add_product_screen.dart, screens/app_shell.dart, screens/automations_screen.dart (+11 more)

### Community 31 - "timeline_screen.dart"
Cohesion: 0.11
Nodes (19): ../models/timeline_event.dart, package:intl/intl.dart, build, _buildFilterChip, createState, dispose, event, _getEventColor (+11 more)

### Community 32 - "app/_layout.tsx"
Cohesion: 0.12
Nodes (14): HardwareSettingsScreen(), CustomFieldsProvider(), GS1ConfigProvider(), DEFAULT_HARDWARE_CONFIG, HardwareConfig, HardwareConfigContext, HardwareConfigContextType, HardwareConfigProvider() (+6 more)

### Community 33 - "sector_templates.dart"
Cohesion: 0.11
Nodes (18): FieldUIType, color, dataset, description, emoji, fields, icon, id (+10 more)

### Community 34 - "automation-builder.tsx"
Cohesion: 0.16
Nodes (15): AutomationFlowScreen(), styles, AVAILABLE_STEPS, COLOR_OPTIONS, ICON_OPTIONS, styles, AutomationsScreen(), AutomationsContext (+7 more)

### Community 35 - "product_detail_screen.dart"
Cohesion: 0.11
Nodes (17): package:qr_flutter/qr_flutter.dart, PageController, _buildInfoGrid, _buildSectionHeader, createState, _currentImageIndex, dispose, _generateClientText (+9 more)

### Community 36 - "scanner_screen.dart"
Cohesion: 0.12
Nodes (16): MobileScannerController, package:mobile_scanner/mobile_scanner.dart, scanner_action_screen.dart, build, _controller, createState, dispose, _handleScannedData (+8 more)

### Community 37 - "config.dart"
Cohesion: 0.12
Nodes (16): static const int, static const List, static const String, AppConfig, archived, available, client, dormantThresholdDays (+8 more)

### Community 39 - "GeneratedPluginRegistrant.swift"
Cohesion: 0.12
Nodes (15): audioplayers_darwin, battery_plus, connectivity_plus, file_selector_macos, flutter_secure_storage_darwin, Foundation, geolocator_apple, local_auth_darwin (+7 more)

### Community 40 - "ui/context.tsx"
Cohesion: 0.27
Nodes (10): AlertContext, AlertContextType, AlertProvider(), AlertProviderProps, styles, useAlertContext(), WebAlertModalProps, useAlert() (+2 more)

### Community 41 - "product/[id].tsx"
Cohesion: 0.14
Nodes (11): styles, Barcode(), BarcodeProps, CODE128_PATTERNS, DORMANT_THRESHOLD_DAYS, FIELD_TYPES, LOCATIONS, PROMOTION_THRESHOLD_DAYS (+3 more)

### Community 42 - "CustomFieldsContext.tsx"
Cohesion: 0.17
Nodes (12): COMMON_ICONS, CustomFieldsScreen(), styles, styles, CustomFieldOption, CustomFieldsContext, CustomFieldsContextType, DEFAULT_CUSTOM_FIELDS (+4 more)

### Community 43 - "quick_tag_screen.dart"
Cohesion: 0.14
Nodes (13): ../models/product.dart, Product, ../services/nfc_service.dart, build, createState, _selectedProduct, build, isSelected (+5 more)

### Community 44 - "custom_fields_provider.dart"
Cohesion: 0.13
Nodes (14): activeFields, addField, build, _customFieldsStorageKey, deletedFields, getField, permanentlyDeleteField, reorderFields (+6 more)

### Community 45 - "supabase/context.tsx"
Cohesion: 0.15
Nodes (11): AuthContext, AuthContextActions, AuthContextState, AuthContextType, AuthProvider(), AuthProviderProps, useAuthContext(), useAuth() (+3 more)

### Community 46 - "storageServiceProvider"
Cohesion: 0.16
Nodes (13): HardwareConfig, ../../models/hardware_config.dart, build, HardwareConfigNotifier, _hwConfigStorageKey, resetConfig, updateConfig, build (+5 more)

### Community 48 - "storage_service.dart"
Cohesion: 0.15
Nodes (12): dart:convert, package:shared_preferences/shared_preferences.dart, SharedPreferences, clear, getJson, getString, init, _prefs (+4 more)

### Community 49 - "library.dart"
Cohesion: 0.17
Nodes (11): custom_field.dart, DateTime, copyWith, createdAt, fields, fromJson, icon, id (+3 more)

### Community 50 - "Migrazione Syncro Flow: da Expo/React Native → Flutter"
Cohesion: 0.17
Nodes (11): Automated Tests, Dipendenze Flutter (`pubspec.yaml`), Manual Verification, Migrazione Syncro Flow: da Expo/React Native → Flutter, Motivazioni della migrazione, Open Questions, Ordine di Esecuzione Consigliato, Panoramica (+3 more)

### Community 51 - "wWinMain"
Cohesion: 0.24
Nodes (9): _In_, _In_opt_, wWinMain(), string, wchar_t, CreateAndAttachConsole(), GetCommandLineArguments(), Utf8FromUtf16() (+1 more)

### Community 52 - "fields_screen.dart"
Cohesion: 0.21
Nodes (11): ../providers/custom_fields_provider.dart, FieldDataType, customFieldsProvider, build, build, createState, FieldsScreen, _FieldsScreenState (+3 more)

### Community 53 - "alert_model.dart"
Cohesion: 0.17
Nodes (11): AlertModel, AlertType, copyWith, createdAt, dismissed, fromJson, id, message (+3 more)

### Community 54 - "Fase 6: Schermate Impostazioni"
Cohesion: 0.18
Nodes (11): Fase 6: Schermate Impostazioni, [NEW] `lib/screens/settings/automation_builder_screen.dart`, [NEW] `lib/screens/settings/fields_screen.dart`, [NEW] `lib/screens/settings/folders_screen.dart`, [NEW] `lib/screens/settings/gs1_config_screen.dart`, [NEW] `lib/screens/settings/hardware_screen.dart`, [NEW] `lib/screens/settings/layout_builder_screen.dart`, [NEW] `lib/screens/settings/locations_screen.dart` (+3 more)

### Community 55 - "nfc_service.dart"
Cohesion: 0.18
Nodes (10): package:nfc_manager/nfc_manager.dart, isNfcAvailable, isSupported, NfcService, readTag, startNfcSession, stopNfcSession, stopSession (+2 more)

### Community 56 - "include"
Cohesion: 0.18
Nodes (10): expo-env.d.ts, expo/tsconfig.base, .expo/types/**/*.ts, **/*.ts, **/*.tsx, compilerOptions, paths, strict (+2 more)

### Community 57 - "automations_provider.dart"
Cohesion: 0.18
Nodes (10): addAutomation, _automationsStorageKey, build, deleteAutomation, getAutomationById, getAutomationByQR, incrementUsageCount, recordUsage (+2 more)

### Community 58 - "layout_provider.dart"
Cohesion: 0.18
Nodes (10): addFieldToLayout, build, _layoutConfigStorageKey, removeFieldFromLayout, resetToDefault, _saveLayout, toggleFieldVisibility, updateFieldOrder (+2 more)

### Community 59 - "manifest.json"
Cohesion: 0.18
Nodes (10): background_color, description, display, icons, name, orientation, prefer_related_applications, short_name (+2 more)

### Community 60 - "MainActivity"
Cohesion: 0.31
Nodes (5): MainActivity, DefaultReactActivityDelegate, Bundle, ReactActivity, ReactActivityDelegate

### Community 61 - "dynamic_field_renderer.dart"
Cohesion: 0.20
Nodes (9): CustomField, DropdownMenuItem, ../models/custom_field.dart, build, _buildReadOnlyTile, field, onChanged, value (+1 more)

### Community 62 - "app_shell.dart"
Cohesion: 0.20
Nodes (9): package:go_router/go_router.dart, build, _calculateSelectedIndex, child, icon, isSelected, label, onTap (+1 more)

### Community 63 - "Welcome to"
Cohesion: 0.20
Nodes (9): 1. Install Dependencies, 2. Start the Project, 3. Lint the Code, Contributing, Development Tools, Getting Started, License, Main Dependencies (+1 more)

### Community 64 - "locations_provider.dart"
Cohesion: 0.20
Nodes (9): addLocation, build, defaultLocations, deleteLocation, getLocation, _locationsStorageKey, resetToDefaults, _saveLocations (+1 more)

### Community 65 - "MainApplication"
Cohesion: 0.36
Nodes (6): MainApplication, Application, Configuration, ReactApplication, ReactHost, ReactNativeHost

### Community 66 - "stat_card_widget.dart"
Cohesion: 0.22
Nodes (8): Color, IconData, build, color, icon, StatCardWidget, title, value

### Community 67 - "reset-project.js"
Cohesion: 0.22
Nodes (7): exampleDirPath, fs, oldDirs, path, readline, rl, root

### Community 69 - "AppDelegate"
Cohesion: 0.25
Nodes (6): Any, FlutterImplicitEngineBridge, FlutterImplicitEngineDelegate, AppDelegate, Bool, UIApplication

### Community 70 - "ios/RunnerTests/RunnerTests.swift"
Cohesion: 0.32
Nodes (5): Flutter, FlutterSceneDelegate, SceneDelegate, UIKit, XCTest

### Community 71 - "gs1_config_provider.dart"
Cohesion: 0.25
Nodes (7): GS1Config, storage_provider.dart, build, GS1ConfigNotifier, _gs1ConfigStorageKey, resetConfig, updateConfig

### Community 72 - "scan_sell_screen.dart"
Cohesion: 0.29
Nodes (7): ../scanner_screen.dart, createState, _recordSale, ScanSellScreen, _ScanSellScreenState, _soldProducts, _totalRevenue

### Community 73 - "FlutterMacOS"
Cohesion: 0.38
Nodes (3): Cocoa, FlutterMacOS, RunnerTests

### Community 74 - "Proposed Changes"
Cohesion: 0.29
Nodes (7): Fase 0: Setup Progetto Flutter, Fase 5: Schermate Dettaglio e Scanner, [NEW] `lib/screens/product/product_detail_screen.dart`, [NEW] `lib/screens/scanner/scanner_action_screen.dart`, [NEW] `lib/screens/scanner/scanner_screen.dart`, [NEW] Progetto Flutter `syncro_flow_flutter/`, Proposed Changes

### Community 75 - "Fase 2: State Management (Providers → Riverpod)"
Cohesion: 0.29
Nodes (7): Fase 2: State Management (Providers → Riverpod), [NEW] `lib/providers/automations_provider.dart`, [NEW] `lib/providers/custom_fields_provider.dart`, [NEW] `lib/providers/gs1_config_provider.dart` + `lib/providers/hardware_config_provider.dart`, [NEW] `lib/providers/inventory_provider.dart`, [NEW] `lib/providers/layout_provider.dart`, [NEW] `lib/providers/locations_provider.dart`

### Community 76 - "Fase 7: Schermate Automazioni"
Cohesion: 0.29
Nodes (7): Fase 7: Schermate Automazioni, [NEW] `lib/screens/automations/audit_screen.dart`, [NEW] `lib/screens/automations/automation_flow_screen.dart`, [NEW] `lib/screens/automations/batch_move_screen.dart`, [NEW] `lib/screens/automations/custom_runner_screen.dart`, [NEW] `lib/screens/automations/quick_tag_screen.dart`, [NEW] `lib/screens/automations/scan_sell_screen.dart`

### Community 77 - "List"
Cohesion: 0.38
Nodes (7): LayoutConfig, List, Notifier, AutomationsNotifier, CustomFieldsNotifier, LayoutNotifier, LocationsNotifier

### Community 78 - "barcodeDecoder.ts"
Cohesion: 0.43
Nodes (5): BarcodeDecodeResult, createImageVariations(), decodeBarcodeImage(), tryQRServer(), tryZXing()

### Community 79 - "StatelessWidget"
Cohesion: 0.29
Nodes (7): StatelessWidget, SyncroFlowApp, AppShell, _TabItem, _TimelineEventTile, DynamicFieldRenderer, ProductCardWidget

### Community 80 - "Fase 3: Servizi"
Cohesion: 0.33
Nodes (6): Fase 3: Servizi, [NEW] `lib/services/barcode_decoder_service.dart`, [NEW] `lib/services/gs1_service.dart`, [NEW] `lib/services/nfc_service.dart`, [NEW] `lib/services/sound_service.dart`, [NEW] `lib/services/storage_service.dart`

### Community 81 - "Fase 4: Schermate Tab (Core UI)"
Cohesion: 0.33
Nodes (6): Fase 4: Schermate Tab (Core UI), [NEW] `lib/screens/tabs/add_product_screen.dart`, [NEW] `lib/screens/tabs/automations_screen.dart`, [NEW] `lib/screens/tabs/home_screen.dart`, [NEW] `lib/screens/tabs/settings_screen.dart`, [NEW] `lib/screens/tabs/timeline_screen.dart`

### Community 82 - "AppDelegate"
Cohesion: 0.47
Nodes (4): FlutterAppDelegate, NSApplication, AppDelegate, Bool

### Community 83 - "RegisterGeneratedPlugins"
Cohesion: 0.33
Nodes (5): FlutterPluginRegistry, FlutterViewController, NSWindow, RegisterGeneratedPlugins(), MainFlutterWindow

### Community 84 - "widget_test.dart"
Cohesion: 0.33
Nodes (5): package:flutter_test/flutter_test.dart, package:syncro_flow/core/theme/app_colors.dart, package:syncro_flow/models/location.dart, package:syncro_flow/models/product.dart, main

### Community 86 - "Cronologia e Stato della Migrazione: Syncro Flow (Expo → Flutter)"
Cohesion: 0.40
Nodes (4): 🛠 Cosa Manca Ancora da Fare (I Prossimi Passi), 📂 Cosa è stato Fatto e Dove, 📅 Cronologia delle Attività Svolte, Cronologia e Stato della Migrazione: Syncro Flow (Expo → Flutter)

### Community 87 - "Cronologia e Stato della Migrazione: Syncro Flow (Expo → Flutter)"
Cohesion: 0.40
Nodes (4): 📅 Cronologia delle Attività Svolte, Cronologia e Stato della Migrazione: Syncro Flow (Expo → Flutter), **Stato Fasi di Migrazione:**, 🛠 Stato Finale del Progetto

### Community 88 - "Analisi App Attuale"
Cohesion: 0.40
Nodes (5): Analisi App Attuale, Funzionalità Speciali, Modelli Dati (da [types/index.ts](file:///c:/Users/Primo/Desktop/inventory/types/index.ts)), Schermate e Navigazione, State Management (7 Context Providers)

### Community 89 - "Fase 1: Fondamenta (Core + Modelli + Tema)"
Cohesion: 0.40
Nodes (5): Fase 1: Fondamenta (Core + Modelli + Tema), [NEW] `lib/core/constants/config.dart`, [NEW] `lib/core/theme/app_colors.dart`, [NEW] `lib/core/theme/app_theme.dart`, [NEW] `lib/models/*.dart`

### Community 90 - "Fase 8: Widget Riutilizzabili"
Cohesion: 0.40
Nodes (5): Fase 8: Widget Riutilizzabili, [NEW] `lib/widgets/barcode_widget.dart` + `barcode_scanner_widget.dart`, [NEW] `lib/widgets/dynamic_field_renderer.dart`, [NEW] `lib/widgets/product_card.dart`, [NEW] `lib/widgets/stat_card.dart`

### Community 91 - "_onItemTapped"
Cohesion: 0.40
Nodes (5): Route /add, Route /automations, Route /settings, Route /timeline, _onItemTapped

### Community 92 - "gradlew"
Cohesion: 0.83
Nodes (3): gradlew script, die(), warn()

### Community 93 - "router.d.ts"
Cohesion: 0.50
Nodes (3): expo-router, ExpoRouter, __routes

## Knowledge Gaps
- **957 isolated node(s):** `expo-router`, `ExpoRouter`, `__routes`, `name`, `slug` (+952 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **120 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `package.json`, `useInventory`, `@apollo/client`, `es6-error`, `expo`, `expo-application`, `expo-asset`, `expo-audio`, `expo-auth-session`, `expo-av`, `expo-battery`, `expo-calendar`, `expo-camera`, `expo-clipboard`, `expo-constants`, `expo-contacts`, `expo-crypto`, `expo-dev-client`, `expo-device`, `expo-file-system`, `expo-font`, `expo-gl`, `@expo-google-fonts/inter`, `expo-haptics`, `expo-image`, `expo-image-manipulator`, `expo-image-picker`, `expo-linear-gradient`, `expo-linking`, `expo-location`, `expo-mail-composer`, `expo-manifests`, `expo-media-library`, `@expo/metro-runtime`, `expo-modules-autolinking`, `expo-navigation-bar`, `expo-network`, `expo-notifications`, `expo-print`, `expo-screen-capture`, `expo-screen-orientation`, `expo-secure-store`, `expo-sensors`, `expo-sharing`, `expo-speech`, `expo-splash-screen`, `expo-sqlite`, `expo-status-bar`, `expo-store-review`, `@expo/styleguide-native`, `expo-symbols`, `expo-system-ui`, `expo-task-manager`, `@expo/vector-icons`, `expo-video`, `expo-web-browser`, `@gorhom/bottom-sheet`, `graphql`, `@graphql-codegen/introspection`, `immutable`, `@lucide/lab`, `path-to-regexp`, `prop-types`, `qrcode`, `querystring`, `react-dom`, `react-native`, `@react-native-async-storage/async-storage`, `@react-native-clipboard/clipboard`, `@react-native-community/datetimepicker`, `@react-native-community/slider`, `react-native-edge-to-edge`, `react-native-gesture-handler`, `@react-native-masked-view/masked-view`, `react-native-nfc-manager`, `@react-native-picker/picker`, `react-native-qrcode-svg`, `react-native-safe-area-context`, `react-native-screens`, `@react-native-segmented-control/segmented-control`, `react-native-svg`, `react-native-url-polyfill`, `react-native-view-shot`, `react-native-web`, `react-native-webview`, `react-native-worklets`, `@react-navigation/bottom-tabs`, `@react-navigation/core`, `@react-navigation/drawer`, `@react-navigation/elements`, `@react-navigation/native`, `@react-navigation/native-stack`, `@react-navigation/routers`, `@react-navigation/stack`, `react-redux`, `react-refresh`, `react-string-replace`, `redux`, `redux-thunk`, `semver`, `@shopify/flash-list`, `@shopify/react-native-skia`, `snack-content`, `@supabase/supabase-js`, `tslib`, `zustand`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Why does `react` connect `useInventory` to `InventoryContext.tsx`, `dependencies`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Why does `expo-router` connect `theme.ts` to `app/_layout.tsx`, `automation-builder.tsx`, `expo`, `product/[id].tsx`, `CustomFieldsContext.tsx`, `auth/index.ts`, `supabase/context.tsx`, `DynamicFieldRenderer.tsx`, `add.tsx`, `InventoryContext.tsx`, `router.d.ts`, `+not-found.tsx`?**
  _High betweenness centrality (0.051) - this node is a cross-community bridge._
- **What connects `expo-router`, `ExpoRouter`, `__routes` to the rest of the system?**
  _957 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Win32Window` be split into smaller, more focused modules?**
  _Cohesion score 0.05311676909569798 - nodes in this community are weakly interconnected._
- **Should `theme.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09398496240601503 - nodes in this community are weakly interconnected._
- **Should `expo` be split into smaller, more focused modules?**
  _Cohesion score 0.043478260869565216 - nodes in this community are weakly interconnected._