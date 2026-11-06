/// App state shared by the signed-in pages: API data, settings, and the focus timer.
/// Mirrors hooks/useDashboardData.ts and the timer logic in pages/dashboard/FocusTimer.tsx.
library;

import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

import 'api.dart';
import 'model.dart';

String errorText(Object e) => e is ApiError ? e.message : 'Something went wrong';

/// Loads the signed-in user's tasks, milestones and dashboard summary, and exposes the mutations the pages need.
class DashboardData extends ChangeNotifier {
  DashboardData(this.onSessionExpired);

  bool _disposed = false;

  // Requests can finish after logout has disposed this object; ignore them then.
  @override
  void notifyListeners() {
    if (!_disposed) super.notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    super.dispose();
  }

  /// Called on a 401 so the app can go back to Log In.
  final VoidCallback onSessionExpired;

  List<ApiTask> tasks = [];
  List<ApiMilestone> milestones = [];
  DashboardSummary? summary;
  bool loading = true;
  String? error;

  Map<String, String> get titles => milestoneTitles(milestones);
  List<UiTask> get uiTasks => toUiTasks(tasks, titles);
  List<UiMilestone> get uiMilestones => toUiMilestones(summary?.milestones ?? []);
  List<Deadline> get deadlines => toDeadlines(tasks, summary?.milestones ?? [], titles);

  /// Handles an error from the API. Returns false if the session expired.
  bool _fail(Object e) {
    if (e is ApiError && e.status == 401) {
      onSessionExpired();
      return false;
    }
    error = errorText(e);
    notifyListeners();
    return true;
  }

  Future<void> refresh() async {
    try {
      final results = await Future.wait([TasksApi.list(), MilestonesApi.list(), DashboardApi.summary()]);
      tasks = results[0] as List<ApiTask>;
      milestones = results[1] as List<ApiMilestone>;
      summary = results[2] as DashboardSummary;
      error = null;
    } catch (e) {
      _fail(e);
    }
    loading = false;
    notifyListeners();
  }

  Future<void> refreshSummary() async {
    try {
      summary = await DashboardApi.summary();
      notifyListeners();
    } catch (e) {
      _fail(e);
    }
  }

  /// Checks a task off (or back on). Optimistic; the server is the source of truth if it fails.
  Future<void> toggleTask(String id) async {
    final task = tasks.where((t) => t.id == id).firstOrNull;
    if (task == null) return;
    final status = task.done ? 'todo' : 'done';
    task.status = status;
    task.completedAt = status == 'done' ? DateTime.now().toUtc().toIso8601String() : null;
    notifyListeners();
    try {
      await TasksApi.setStatus(id, status);
      await refreshSummary();
    } catch (e) {
      if (_fail(e)) await refresh();
    }
  }

  /// Files the task under `milestoneId`, or creates `newMilestoneTitle` first when it is null. Throws on failure.
  Future<void> createTask({required String title, String? milestoneId, String newMilestoneTitle = '', String? dueAt}) async {
    try {
      final id = milestoneId ?? (await MilestonesApi.create(newMilestoneTitle)).id;
      await TasksApi.create(id, title, dueAt);
      await refresh();
    } catch (e) {
      if (e is ApiError && e.status == 401) onSessionExpired();
      rethrow;
    }
  }

  Future<void> createMilestone(String title, String? dueAt) async {
    try {
      await MilestonesApi.create(title, dueAt: dueAt);
      await refresh();
    } catch (e) {
      if (e is ApiError && e.status == 401) onSessionExpired();
      rethrow;
    }
  }
}

// ---------------- settings ----------------

const reminderOptions = ['1 hour before', '3 hours before', '1 day before', '2 days before', '1 week before'];
const weekStartOptions = ['Sunday', 'Monday'];
const calendarViewOptions = ['Month', 'Week', 'Day'];
const timeZoneOptions = {
  'America/New_York': 'Eastern Time (New York)',
  'America/Chicago': 'Central Time (Chicago)',
  'America/Denver': 'Mountain Time (Denver)',
  'America/Phoenix': 'Mountain Time (Phoenix)',
  'America/Los_Angeles': 'Pacific Time (Los Angeles)',
  'America/Anchorage': 'Alaska Time (Anchorage)',
  'Pacific/Honolulu': 'Hawaii Time (Honolulu)',
  'UTC': 'Coordinated Universal Time (UTC)',
};

/// Settings page values. Like the web app, these stay on the device (the API has no settings route yet).
class UserSettings {
  UserSettings(this.values);

  factory UserSettings.defaults(ApiUser user) => UserSettings({
    'displayName': user.displayName,
    'email': user.email,
    'deadlineReminders': true,
    'remindBefore': '1 day before',
    'dailySummary': false,
    'focusMinutes': 25,
    'shortBreakMinutes': 5,
    'longBreakMinutes': 15,
    'longBreakAfterSessions': 4,
    'weekStartsOn': 'Sunday',
    'defaultCalendarView': 'Month',
    'timeZone': 'America/New_York',
  });

  final Map<String, dynamic> values;

  T get<T>(String key) => values[key] as T;
  UserSettings copy() => UserSettings(Map.of(values));

  int get focusMinutes => get<int>('focusMinutes');
  int get shortBreakMinutes => get<int>('shortBreakMinutes');
  int get longBreakMinutes => get<int>('longBreakMinutes');
  int get longBreakAfterSessions => get<int>('longBreakAfterSessions');

  static Future<UserSettings> load(ApiUser user) async {
    final settings = UserSettings.defaults(user);
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('settings:${user.id}');
    if (saved != null) {
      final map = jsonDecode(saved) as Map<String, dynamic>;
      for (final key in settings.values.keys) {
        final v = map[key];
        if (v != null && v.runtimeType == settings.values[key].runtimeType) settings.values[key] = v;
      }
    }
    return settings;
  }

  Future<void> save(ApiUser user) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('settings:${user.id}', jsonEncode(values));
  }
}

// ---------------- focus timer ----------------

enum TimerMode { focus, short, long }

class FocusLog {
  FocusLog(this.title, this.when, this.minutes);
  final String title;
  final String when;
  final int minutes;
}

/// Pomodoro timer shared by the dashboard card and the Focus timer page, so it keeps running while you
/// switch pages. Focus blocks are recorded as focus sessions on the API (start / pause / resume /
/// complete / cancel); breaks are local only. The countdown runs on the phone.
class FocusTimerController extends ChangeNotifier {
  FocusTimerController(this.data, this.settings) {
    remaining = duration;
    reload();
  }

  final DashboardData data;
  UserSettings settings;

  TimerMode mode = TimerMode.focus;
  late int remaining;
  bool running = false;
  int completedSessions = 0;
  String? syncError;
  List<FocusLog> recent = [];

  String? _sessionId;
  DateTime? _endsAt;
  Timer? _ticker;

  int get sessionsPerDay => settings.longBreakAfterSessions;
  int durationOf(TimerMode m) =>
      60 *
      switch (m) {
        TimerMode.focus => settings.focusMinutes,
        TimerMode.short => settings.shortBreakMinutes,
        TimerMode.long => settings.longBreakMinutes,
      };
  int get duration => durationOf(mode);
  bool get started => remaining < duration;

  String get sessionLabel => completedSessions >= sessionsPerDay
      ? 'All $sessionsPerDay sessions done'
      : 'Session ${completedSessions + 1} of $sessionsPerDay today';

  String get status => running ? (mode == TimerMode.focus ? 'In progress' : 'On break') : (started ? 'Paused' : 'Ready');

  void updateSettings(UserSettings next) {
    settings = next;
    if (!running && !started) remaining = duration;
    notifyListeners();
  }

  /// Picks up a session still open on the server (e.g. after the app was closed) and today's completed count.
  Future<void> reload() async {
    try {
      final results = await Future.wait([FocusApi.active(), FocusApi.list()]);
      final active = results[0] as ApiFocusSession?;
      final list = results[1] as List<ApiFocusSession>;
      if (active != null) _adopt(active);
      final today = startOfDay(DateTime.now());
      final done = list.where((s) => s.status == 'completed' && s.completedAt != null).toList();
      completedSessions = done.where((s) => !local(s.completedAt!).isBefore(today)).length.clamp(0, sessionsPerDay);
      final titles = {for (final t in data.tasks) t.id: t.title};
      recent = [
        for (final s in done.take(5))
          FocusLog(titles[s.taskId] ?? 'Focus session', formatWhen(s.completedAt!), (s.elapsedSeconds / 60).round().clamp(1, 999)),
      ];
      notifyListeners();
    } catch (e) {
      syncError = errorText(e);
      notifyListeners();
    }
  }

  void _adopt(ApiFocusSession s) {
    _sessionId = s.id;
    mode = TimerMode.focus;
    remaining = (s.targetSeconds - s.elapsedSeconds).clamp(0, 1 << 30);
    _setRunning(s.status == 'running');
  }

  void _setRunning(bool value) {
    running = value;
    _ticker?.cancel();
    if (value) {
      _endsAt = DateTime.now().add(Duration(seconds: remaining));
      _ticker = Timer.periodic(const Duration(milliseconds: 250), (_) => _tick());
    }
    notifyListeners();
  }

  void _tick() {
    final left = (_endsAt!.difference(DateTime.now()).inMilliseconds / 1000).ceil().clamp(0, 1 << 30);
    if (left != remaining) {
      remaining = left;
      notifyListeners();
    }
    if (left == 0) _finishPhase();
  }

  /// A finished focus block is recorded and rolls into a break; a finished break stops and waits for Start.
  void _finishPhase() {
    if (mode == TimerMode.focus) {
      completedSessions = (completedSessions + 1).clamp(0, sessionsPerDay);
      mode = completedSessions % sessionsPerDay == 0 ? TimerMode.long : TimerMode.short;
      remaining = duration;
      final id = _sessionId;
      _sessionId = null;
      if (id != null) {
        _sync(() => FocusApi.act(id, 'complete')).then((_) {
          data.refreshSummary();
          reload();
        });
      }
      _setRunning(true);
    } else {
      mode = TimerMode.focus;
      remaining = duration;
      _setRunning(false);
    }
  }

  Future<T?> _sync<T>(Future<T> Function() call) async {
    try {
      final value = await call();
      syncError = null;
      notifyListeners();
      return value;
    } catch (e) {
      syncError = errorText(e);
      notifyListeners();
      return null;
    }
  }

  Future<void> start(String? taskId) async {
    _setRunning(true);
    if (mode != TimerMode.focus) return;
    final id = _sessionId;
    if (id != null) {
      await _sync(() => FocusApi.act(id, 'resume'));
      return;
    }
    final session = await _sync(() async {
      try {
        return await FocusApi.start(taskId, duration);
      } on ApiError catch (e) {
        // Another device already has a session open; continue that one instead.
        if (e.code != 'ACTIVE_SESSION_EXISTS') rethrow;
        final existing = await FocusApi.active();
        if (existing == null) rethrow;
        if (existing.status == 'paused') return await FocusApi.act(existing.id, 'resume');
        return existing;
      }
    });
    if (session != null) _adopt(session);
  }

  Future<void> pause() async {
    _setRunning(false);
    final id = _sessionId;
    if (id != null && mode == TimerMode.focus) await _sync(() => FocusApi.act(id, 'pause'));
  }

  Future<void> reset() async {
    _setRunning(false);
    remaining = duration;
    notifyListeners();
    await _cancelSession();
  }

  /// The Focus / Short break / Long break tabs.
  Future<void> selectMode(TimerMode next) async {
    _setRunning(false);
    mode = next;
    remaining = duration;
    notifyListeners();
    await _cancelSession();
  }

  Future<void> _cancelSession() async {
    final id = _sessionId;
    if (id == null) return;
    _sessionId = null;
    await _sync(() => FocusApi.act(id, 'cancel'));
  }

  bool _disposed = false;

  @override
  void notifyListeners() {
    if (!_disposed) super.notifyListeners();
  }

  @override
  void dispose() {
    _disposed = true;
    _ticker?.cancel();
    super.dispose();
  }
}
