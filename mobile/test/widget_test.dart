import 'package:chms_mobile/app.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('App loads splash screen', (WidgetTester tester) async {
    await tester.pumpWidget(const ChmsApp());
    await tester.pump();
    expect(find.text('ChMS'), findsOneWidget);
  });
}
