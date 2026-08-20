import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:syncro_flow/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: SyncroFlowApp(),
      ),
    );
    expect(find.byType(SyncroFlowApp), findsOneWidget);
  });
}
