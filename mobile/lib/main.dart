/// Erm Actually: Android app for the Deadline Driven Dashboard (COP 4331C Large Project, Team 8).
/// Mirrors App.tsx: restores the session from the saved token, then shows either the public pages or the dashboard.
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'api.dart';
import 'public_pages.dart';
import 'shell.dart';
import 'state.dart';
import 'ui.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.white,
      statusBarIconBrightness: Brightness.dark,
      systemNavigationBarColor: Colors.white,
      systemNavigationBarIconBrightness: Brightness.dark,
    ),
  );
  runApp(const ErmActuallyApp());
}

class ErmActuallyApp extends StatelessWidget {
  const ErmActuallyApp({super.key});
  @override
  Widget build(BuildContext context) =>
      MaterialApp(title: 'Erm Actually', debugShowCheckedModeBanner: false, theme: buildTheme(), home: const AuthGate());
}

class AuthGate extends StatefulWidget {
  const AuthGate({super.key});
  @override
  State<AuthGate> createState() => _AuthGateState();
}

class _AuthGateState extends State<AuthGate> {
  bool _checked = false;
  ApiUser? _user;
  UserSettings? _settings;
  Notice? _loginNotice;
  PublicView _publicStart = PublicView.home;
  int _publicKey = 0;

  @override
  void initState() {
    super.initState();
    _restore();
  }

  /// Restore the session from the stored JWT.
  Future<void> _restore() async {
    await Session.load();
    if (Session.token != null) {
      try {
        await _signIn(await AuthApi.me(), welcome: false);
      } on ApiError catch (e) {
        // Only a rejected token logs you out; being offline keeps it for next time.
        if (e.status == 401) await Session.clear();
        _loginNotice = Notice(NoticeKind.info, e.status == 401 ? 'Your session expired. Please log in again.' : e.message);
        _publicStart = PublicView.login;
      }
    }
    if (mounted) setState(() => _checked = true);
  }

  Future<void> _signIn(ApiUser user, {bool welcome = true}) async {
    final settings = await UserSettings.load(user);
    if (!mounted) return;
    setState(() {
      _user = user;
      _settings = settings;
      _loginNotice = null;
    });
    if (welcome) showToast(context, 'Welcome back${user.displayName.isNotEmpty ? ', ${user.displayName}' : ''}!');
  }

  Future<void> _signOut({Notice? notice, String? toast}) async {
    await Session.clear();
    if (!mounted) return;
    setState(() {
      _user = null;
      _loginNotice = notice;
      _publicStart = PublicView.login;
      _publicKey++;
    });
    if (toast != null) showToast(context, toast);
  }

  @override
  Widget build(BuildContext context) {
    if (!_checked) return const Scaffold(body: Center(child: CircularProgressIndicator()));
    final user = _user;
    if (user == null) {
      return PublicShell(key: ValueKey(_publicKey), startOn: _publicStart, notice: _loginNotice, onLoggedIn: _signIn);
    }
    return SignedInShell(
      key: ValueKey(user.id),
      user: user,
      settings: _settings!,
      onLogout: () => _signOut(toast: 'Logged out successfully'),
      onSessionExpired: () => _signOut(notice: const Notice(NoticeKind.info, 'Your session expired. Please log in again.')),
    );
  }
}
