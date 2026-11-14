import 'dart:async';
import 'dart:io';
import 'dart:ui' as ui;

import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'package:erm_actually/api.dart';
import 'package:erm_actually/main.dart';
import 'package:erm_actually/pages.dart';
import 'package:erm_actually/shell.dart';
import 'package:erm_actually/state.dart';
import 'package:erm_actually/ui.dart';
import 'profile_server.dart';

final evidenceKey = GlobalKey();

Future<void> boot(WidgetTester tester, {String token = 'alice-token'}) async {
  await tester.pumpWidget(const SizedBox());
  await Session.save(token);
  await tester.pumpWidget(RepaintBoundary(key: evidenceKey, child: const ErmActuallyApp()));
  await tester.pumpAndSettle();
  expect(find.byType(SignedInShell), findsOneWidget);
}

SignedInShellState shell(WidgetTester tester) => tester.state<SignedInShellState>(find.byType(SignedInShell));

Future<void> navigate(WidgetTester tester, AppPage page) async {
  shell(tester).navigate(page);
  await tester.pumpAndSettle();
}

Finder field(String label) => find.descendant(of: find.widgetWithText(Labeled, label), matching: find.byType(TextFormField));
String value(WidgetTester tester, String label) => tester.widget<TextFormField>(field(label)).initialValue!;

Future<void> edit(WidgetTester tester, String label, String text) async {
  await tester.ensureVisible(field(label));
  await tester.enterText(field(label), text);
  await tester.pump();
}

Future<void> save(WidgetTester tester) async {
  FocusManager.instance.primaryFocus?.unfocus();
  await tester.pumpAndSettle();
  final button = find.widgetWithText(PillButton, 'Save changes');
  await tester.ensureVisible(button);
  await tester.pumpAndSettle();
  await tester.tap(button);
  await tester.pumpAndSettle();
}

Future<void> evidence(WidgetTester tester, String name) async {
  final directory = Platform.environment['MOBILE_EVIDENCE_DIR'];
  if (directory == null) return;
  await tester.binding.setSurfaceSize(const Size(430, 1900));
  shell(tester).navigate(AppPage.settings);
  await tester.pumpAndSettle();
  await tester.runAsync(() async {
    final manifest = await AssetManifest.loadFromAssetBundle(rootBundle);
    await Future.wait([
      for (final asset in manifest.listAssets().where((key) => key.endsWith('.png')))
        precacheImage(AssetImage(asset), evidenceKey.currentContext!),
    ]);
  });
  await tester.pumpAndSettle();
  await tester.runAsync(() async {
    final boundary = evidenceKey.currentContext!.findRenderObject()! as RenderRepaintBoundary;
    final image = await boundary.toImage();
    final bytes = await image.toByteData(format: ui.ImageByteFormat.png);
    await Directory(directory).create(recursive: true);
    await File('$directory/$name.png').writeAsBytes(bytes!.buffer.asUint8List());
    image.dispose();
  });
  await tester.binding.setSurfaceSize(const Size(430, 932));
  await tester.pumpAndSettle();
}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late ProfileServer server;

  setUpAll(() async {
    WidgetController.hitTestWarningShouldBeFatal = true;
    final fonts = FontLoader('Nunito');
    for (final weight in [400, 600, 700, 800, 900]) {
      fonts.addFont(rootBundle.load('assets/fonts/Nunito-$weight.ttf'));
    }
    await fonts.load();
    await (FontLoader('MaterialIcons')..addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'))).load();
  });
  setUp(() {
    server = ProfileServer();
    ProfileServer.current = server;
    HttpOverrides.global = server;
    SharedPreferences.setMockInitialValues({});
    Session.token = null;
  });
  tearDown(() => HttpOverrides.global = null);

  test('defaults cover older API responses and preference keys cannot replace account identity', () {
    final defaults = UserSettings.fromUser(ApiUser('id', 'login@example.com', 'Account name'));
    expect(defaults.focusMinutes, 25);
    final settings = UserSettings.fromUser(
      ApiUser(
        'id',
        'login@example.com',
        'Account name',
        settings: {'displayName': 'Injected name', 'email': 'wrong@example.com', 'focusMinutes': 40},
      ),
    );
    expect(settings.get<String>('displayName'), 'Account name');
    expect(settings.get<String>('email'), 'login@example.com');
    expect(settings.focusMinutes, 40);
    expect(settings.preferences.containsKey('displayName'), isFalse);
  });

  testWidgets('server settings override the obsolete phone cache and remain account scoped', (tester) async {
    await tester.binding.setSurfaceSize(const Size(430, 932));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    SharedPreferences.setMockInitialValues({'settings:alice': '{"focusMinutes":5,"displayName":"Old name"}'});
    await boot(tester);
    await navigate(tester, AppPage.settings);
    expect(value(tester, 'Display name'), 'Alice');
    expect(value(tester, 'Focus length'), '45');
    expect(shell(tester).timer.duration, 2700);
    final email = tester.widget<EditableText>(find.descendant(of: field('Email address'), matching: find.byType(EditableText)));
    expect(email.readOnly, isTrue);
    expect(tester.widgetList<SwitchRow>(find.byType(SwitchRow)).every((row) => !row.enabled), isTrue);
    await boot(tester, token: 'bob-token');
    await navigate(tester, AppPage.settings);
    expect(value(tester, 'Display name'), 'Bob');
    expect(value(tester, 'Focus length'), '25');
  });

  testWidgets('confirmed saves update profile timer calendar and survive reopening', (tester) async {
    await tester.binding.setSurfaceSize(const Size(430, 932));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await boot(tester);
    await navigate(tester, AppPage.settings);
    await edit(tester, 'Display name', '  Sebastian Planner  ');
    await edit(tester, 'Focus length', '35');
    final week = find.ancestor(of: find.text('Week starts on'), matching: find.byType(Labeled));
    await tester.ensureVisible(week);
    await tester.tap(find.descendant(of: week, matching: find.byType(DropdownButton<String>)));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Sunday').last);
    await tester.pumpAndSettle();
    await save(tester);
    expect(find.text('Settings saved'), findsOneWidget);
    expect(server.patches.single['displayName'], 'Sebastian Planner');
    expect(server.patches.single.containsKey('email'), isFalse);
    expect((server.patches.single['settings'] as Map).containsKey('email'), isFalse);
    expect(shell(tester).widget.user.displayName, 'Sebastian Planner');
    expect(shell(tester).timer.duration, 2100);
    expect(shell(tester).settings.get<String>('weekStartsOn'), 'Sunday');
    await boot(tester);
    await navigate(tester, AppPage.settings);
    expect(value(tester, 'Display name'), 'Sebastian Planner');
    expect(value(tester, 'Focus length'), '35');
    await evidence(tester, 'settings-saved');
    await navigate(tester, AppPage.calendar);
    expect(find.text('Sun'), findsOneWidget);
    expect(tester.getTopLeft(find.text('Sun')).dx, lessThan(tester.getTopLeft(find.text('Mon')).dx));
  });

  testWidgets('failed saves preserve drafts and saved values until retry succeeds', (tester) async {
    await tester.binding.setSurfaceSize(const Size(430, 932));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await boot(tester);
    await navigate(tester, AppPage.settings);
    await edit(tester, 'Focus length', '35');
    server.patch = (_) async => Reply(503, {'error': 'UNAVAILABLE', 'message': 'Could not save preferences.'});
    await save(tester);
    expect(find.textContaining('Your edits are still here'), findsOneWidget);
    final editable = find.descendant(of: field('Focus length'), matching: find.byType(EditableText));
    expect(tester.widget<EditableText>(editable).controller.text, '35');
    expect(shell(tester).settings.focusMinutes, 45);
    expect(shell(tester).timer.duration, 2700);
    expect(find.text('Settings saved'), findsNothing);
    await evidence(tester, 'settings-retry');
    server.patch = null;
    await save(tester);
    expect(find.text('Settings saved'), findsOneWidget);
    expect(find.textContaining('Your edits are still here'), findsNothing);
    expect(shell(tester).timer.duration, 2100);
  });

  testWidgets('pending save disables editing and a rejected token returns to login', (tester) async {
    await tester.binding.setSurfaceSize(const Size(430, 932));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await boot(tester);
    await navigate(tester, AppPage.settings);
    final response = Completer<Reply>();
    server.patch = (_) => response.future;
    await tester.tap(find.widgetWithText(PillButton, 'Save changes'));
    await tester.pump();
    expect(tester.widget<TextFormField>(field('Display name')).enabled, isFalse);
    expect(server.patches, hasLength(1));
    expect(shell(tester).savingSettings, isTrue);
    response.complete(Reply(401, {'error': 'UNAUTHORIZED'}));
    await tester.pumpAndSettle();
    expect(find.byType(SignedInShell), findsNothing);
    expect(Session.token, isNull);
    expect(find.text('Your session expired. Please log in again.'), findsOneWidget);
  });

  testWidgets('a late save cannot restore a logged out account', (tester) async {
    await tester.binding.setSurfaceSize(const Size(430, 932));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await boot(tester);
    await navigate(tester, AppPage.settings);
    final response = Completer<Reply>();
    server.patch = (_) => response.future;
    await tester.tap(find.widgetWithText(PillButton, 'Save changes'));
    await tester.pump();
    shell(tester).widget.onLogout();
    await tester.pumpAndSettle();
    response.complete(Reply(200, server.accounts['alice-token']!));
    await tester.pumpAndSettle();
    expect(Session.token, isNull);
    expect(find.byType(SignedInShell), findsNothing);
    expect(find.text('Settings saved'), findsNothing);
    expect(tester.takeException(), isNull);
  });

  testWidgets('invalid focus lengths are rejected before sending and a blank display name can be saved', (tester) async {
    await tester.binding.setSurfaceSize(const Size(430, 932));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await boot(tester);
    await navigate(tester, AppPage.settings);
    await edit(tester, 'Focus length', '0');
    await save(tester);
    expect(server.patches, isEmpty);
    expect(find.text('1–180'), findsOneWidget);
    await edit(tester, 'Focus length', '30');
    await edit(tester, 'Display name', '');
    await save(tester);
    expect(server.patches.single['displayName'], '');
    expect(shell(tester).widget.user.displayName, '');
    expect(shell(tester).timer.duration, 1800);
  });

  testWidgets('a late rejection from the old account cannot expire the newly signed-in account', (tester) async {
    await tester.binding.setSurfaceSize(const Size(430, 932));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    await boot(tester);
    await navigate(tester, AppPage.settings);
    final response = Completer<Reply>();
    server.patch = (_) => response.future;
    await tester.tap(find.widgetWithText(PillButton, 'Save changes'));
    await tester.pump();
    await boot(tester, token: 'bob-token');
    response.complete(Reply(401, {'error': 'UNAUTHORIZED'}));
    await tester.pumpAndSettle();
    expect(Session.token, 'bob-token');
    expect(shell(tester).widget.user.id, 'bob');
    expect(shell(tester).settings.focusMinutes, 25);
    expect(find.text('Your session expired. Please log in again.'), findsNothing);
  });

  testWidgets('updating preferences leaves an existing paused focus block at its server target', (tester) async {
    await tester.binding.setSurfaceSize(const Size(430, 932));
    addTearDown(() => tester.binding.setSurfaceSize(null));
    server.active = {
      'id': 'session',
      'taskId': null,
      'status': 'paused',
      'targetSeconds': 1500,
      'elapsedSeconds': 120,
      'completedAt': null,
    };
    await boot(tester);
    expect(shell(tester).timer.duration, 1500);
    expect(shell(tester).timer.remaining, 1380);
    await navigate(tester, AppPage.settings);
    await edit(tester, 'Focus length', '60');
    await save(tester);
    expect(shell(tester).settings.focusMinutes, 60);
    expect(shell(tester).timer.duration, 1500);
    expect(shell(tester).timer.remaining, 1380);
    expect(shell(tester).timer.running, isFalse);
  });
}
