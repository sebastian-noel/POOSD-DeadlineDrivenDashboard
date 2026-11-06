/// Client for the Erm Actually API (see ../api). Mirrors desktop_frontend/client/src/lib/api.ts.
library;

import 'dart:async';
import 'dart:convert';
import 'dart:io';

import 'package:shared_preferences/shared_preferences.dart';

/// Where the API lives. Override when building:
///   flutter run --dart-define=API_URL=http://10.0.2.2:4000   (local API from the Android emulator)
const String apiBaseUrl = String.fromEnvironment('API_URL', defaultValue: 'https://ermactually.kirugames.com');

class ApiError implements Exception {
  ApiError(this.status, this.code, this.message);
  final int status;
  final String code;
  final String message;

  @override
  String toString() => message;
}

/// The login JWT, kept on the device so reopening the app keeps you signed in.
class Session {
  static const _key = 'token';
  static String? token;

  static Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    token = prefs.getString(_key);
  }

  static Future<void> save(String value) async {
    token = value;
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, value);
  }

  static Future<void> clear() async {
    token = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_key);
  }
}

const _statusMessages = {
  401: 'Your session has expired. Please log in again.',
  404: 'Not found.',
  429: 'Too many requests. Please wait a moment and try again.',
};

final HttpClient _client = HttpClient()..connectionTimeout = const Duration(seconds: 15);

/// Sends one request to `/api/v1<path>` and returns the decoded JSON (or null for an empty body).
Future<dynamic> api(String path, {String method = 'GET', Object? body, bool auth = true}) async {
  final uri = Uri.parse('${apiBaseUrl.replaceAll(RegExp(r'/$'), '')}/api/v1$path');
  int status;
  String text;
  try {
    final request = await _client.openUrl(method, uri);
    request.headers.set(HttpHeaders.acceptHeader, 'application/json');
    if (auth && Session.token != null) {
      request.headers.set(HttpHeaders.authorizationHeader, 'Bearer ${Session.token}');
    }
    if (body != null) {
      request.headers.contentType = ContentType.json;
      request.write(jsonEncode(body));
    }
    final response = await request.close().timeout(const Duration(seconds: 20));
    status = response.statusCode;
    text = await response.transform(utf8.decoder).join();
  } catch (_) {
    throw ApiError(0, 'NETWORK_ERROR', 'Could not reach the server. Check your connection.');
  }

  dynamic data;
  if (text.isNotEmpty) {
    try {
      data = jsonDecode(text);
    } catch (_) {
      data = null;
    }
  }
  if (status < 200 || status >= 300) {
    final map = data is Map ? data : const {};
    final code = map['error'] is String ? map['error'] as String : 'REQUEST_FAILED';
    final message = map['message'] is String ? map['message'] as String : (_statusMessages[status] ?? 'Request failed ($status)');
    throw ApiError(status, code, message);
  }
  return data;
}

// ---- Response shapes (mirror api/src/routes) ----

String? _date(dynamic v) => v is String ? v : null;
int _int(dynamic v) => v is num ? v.toInt() : 0;

class ApiUser {
  ApiUser(this.id, this.email, this.displayName);
  factory ApiUser.fromJson(Map<String, dynamic> j) => ApiUser(j['id'] as String, j['email'] as String, (j['displayName'] ?? '') as String);
  final String id;
  final String email;
  final String displayName;
}

class ApiMilestone {
  ApiMilestone(this.id, this.title, this.description, this.dueAt);
  factory ApiMilestone.fromJson(Map<String, dynamic> j) =>
      ApiMilestone(j['id'] as String, j['title'] as String, (j['description'] ?? '') as String, _date(j['dueAt']));
  final String id;
  final String title;
  final String description;
  final String? dueAt;
}

/// 'todo' | 'in_progress' | 'done'
class ApiTask {
  ApiTask(this.id, this.milestoneId, this.title, this.notes, this.status, this.dueAt, this.completedAt);
  factory ApiTask.fromJson(Map<String, dynamic> j) => ApiTask(
    j['id'] as String,
    j['milestoneId'] as String,
    j['title'] as String,
    (j['notes'] ?? '') as String,
    j['status'] as String,
    _date(j['dueAt']),
    _date(j['completedAt']),
  );
  final String id;
  final String milestoneId;
  final String title;
  final String notes;
  String status;
  final String? dueAt;
  String? completedAt;

  bool get done => status == 'done';
}

class MilestoneProgress {
  MilestoneProgress(this.id, this.title, this.dueAt, this.totalTasks, this.completedTasks, this.progressPercent);
  factory MilestoneProgress.fromJson(Map<String, dynamic> j) => MilestoneProgress(
    j['id'] as String,
    j['title'] as String,
    _date(j['dueAt']),
    _int(j['totalTasks']),
    _int(j['completedTasks']),
    _int(j['progressPercent']),
  );
  final String id;
  final String title;
  final String? dueAt;
  final int totalTasks;
  final int completedTasks;
  final int progressPercent;
}

class DashboardSummary {
  DashboardSummary(this.json)
    : milestones = (json['milestones'] as List).map((m) => MilestoneProgress.fromJson(m as Map<String, dynamic>)).toList();
  final Map<String, dynamic> json;
  final List<MilestoneProgress> milestones;

  Map<String, dynamic> get _tasks => json['tasks'] as Map<String, dynamic>;
  int get completedLast7Days => _int(_tasks['completedLast7Days']);
  int get completedPrevious7Days => _int(_tasks['completedPrevious7Days']);
  int get focusMinutesLast7Days => _int(json['focusMinutesLast7Days']);
  int get focusMinutesPrevious7Days => _int(json['focusMinutesPrevious7Days']);
}

class ApiFocusSession {
  ApiFocusSession(this.id, this.taskId, this.status, this.targetSeconds, this.elapsedSeconds, this.completedAt);
  factory ApiFocusSession.fromJson(Map<String, dynamic> j) => ApiFocusSession(
    j['id'] as String,
    j['taskId'] as String?,
    j['status'] as String,
    _int(j['targetSeconds']),
    _int(j['elapsedSeconds']),
    _date(j['completedAt']),
  );
  final String id;
  final String? taskId;

  /// 'running' | 'paused' | 'completed' | 'cancelled'
  final String status;
  final int targetSeconds;
  final int elapsedSeconds;
  final String? completedAt;
}

List<Map<String, dynamic>> _items(dynamic page) => ((page as Map)['items'] as List).cast<Map<String, dynamic>>();

// ---- Endpoints ----

class AuthApi {
  static Future<String> register(String email, String password) async =>
      (await api('/auth/register', method: 'POST', body: {'email': email, 'password': password}, auth: false))['message'] as String;

  /// Returns the user and stores the token.
  static Future<ApiUser> login(String email, String password) async {
    final data = await api('/auth/login', method: 'POST', body: {'email': email, 'password': password}, auth: false);
    await Session.save(data['accessToken'] as String);
    return ApiUser.fromJson(data['user'] as Map<String, dynamic>);
  }

  static Future<String> resendVerification(String email) async =>
      (await api('/auth/resend-verification', method: 'POST', body: {'email': email}, auth: false))['message'] as String;

  static Future<String> forgotPassword(String email) async =>
      (await api('/auth/forgot-password', method: 'POST', body: {'email': email}, auth: false))['message'] as String;

  static Future<ApiUser> me() async => ApiUser.fromJson(await api('/me') as Map<String, dynamic>);
}

class ContactApi {
  static Future<void> send(String email, String subject, String message) =>
      api('/contact', method: 'POST', body: {'email': email, 'subject': subject, 'message': message}, auth: false);
}

class MilestonesApi {
  static Future<List<ApiMilestone>> list() async => _items(await api('/milestones?limit=100')).map(ApiMilestone.fromJson).toList();

  static Future<ApiMilestone> create(String title, {String? dueAt}) async =>
      ApiMilestone.fromJson(await api('/milestones', method: 'POST', body: {'title': title, 'dueAt': dueAt}) as Map<String, dynamic>);
}

class TasksApi {
  static Future<List<ApiTask>> list() async => _items(await api('/tasks?limit=100')).map(ApiTask.fromJson).toList();

  static Future<void> create(String milestoneId, String title, String? dueAt) =>
      api('/tasks', method: 'POST', body: {'milestoneId': milestoneId, 'title': title, 'dueAt': dueAt});

  static Future<void> setStatus(String id, String status) => api('/tasks/$id', method: 'PATCH', body: {'status': status});
}

class DashboardApi {
  static Future<DashboardSummary> summary() async => DashboardSummary(await api('/dashboard') as Map<String, dynamic>);

  /// Server-side, case-insensitive partial match on task and milestone titles (q must be 2+ characters).
  /// Returns (taskIds, milestoneIds).
  static Future<(Set<String>, Set<String>)> search(String q) async {
    final data = await api('/search?q=${Uri.encodeQueryComponent(q)}');
    Set<String> ids(String key) => ((data[key] as List).map((e) => (e as Map)['id'] as String)).toSet();
    return (ids('tasks'), ids('milestones'));
  }
}

class FocusApi {
  static Future<ApiFocusSession?> active() async {
    final s = (await api('/focus-sessions/active'))['session'];
    return s == null ? null : ApiFocusSession.fromJson(s as Map<String, dynamic>);
  }

  static Future<List<ApiFocusSession>> list() async => _items(await api('/focus-sessions?limit=50')).map(ApiFocusSession.fromJson).toList();

  static Future<ApiFocusSession> start(String? taskId, int targetSeconds) async => ApiFocusSession.fromJson(
    await api('/focus-sessions', method: 'POST', body: {'taskId': taskId, 'targetSeconds': targetSeconds}) as Map<String, dynamic>,
  );

  /// action: 'pause' | 'resume' | 'complete' | 'cancel'
  static Future<ApiFocusSession> act(String id, String action) async =>
      ApiFocusSession.fromJson(await api('/focus-sessions/$id', method: 'PATCH', body: {'action': action}) as Map<String, dynamic>);
}
