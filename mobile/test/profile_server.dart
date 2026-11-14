import 'dart:async';
import 'dart:convert';
import 'dart:io';

/// In-memory HTTP responses for widget tests. Exercises the real API client without hosted credentials.
class ProfileServer extends HttpOverrides {
  static late ProfileServer current;
  final accounts = <String, Map<String, dynamic>>{
    'alice-token': {
      'id': 'alice',
      'email': 'alice@example.com',
      'displayName': 'Alice',
      'settings': {'focusMinutes': 45, 'weekStartsOn': 'Monday'},
    },
    'bob-token': {
      'id': 'bob',
      'email': 'bob@example.com',
      'displayName': 'Bob',
      'settings': {'focusMinutes': 25, 'weekStartsOn': 'Sunday'},
    },
  };
  final patches = <Map<String, dynamic>>[];
  Future<Reply> Function(Map<String, dynamic> body)? patch;
  Map<String, dynamic>? active;

  @override
  HttpClient createHttpClient(SecurityContext? context) => _Client();

  Future<Reply> _respond(String method, Uri uri, _Headers headers, String text) async {
    final user = accounts[headers.values['authorization']?.replaceFirst('Bearer ', '')];
    if (user == null) return Reply(401, {'error': 'UNAUTHORIZED'});
    final path = uri.path.replaceFirst('/api/v1', '');
    if (path == '/me') {
      if (method == 'PATCH') {
        final body = jsonDecode(text) as Map<String, dynamic>;
        patches.add(body);
        if (patch != null) return patch!(body);
        user['displayName'] = body['displayName'];
        user['settings'] = {...user['settings'] as Map, ...body['settings'] as Map};
      }
      return Reply(200, user);
    }
    if (path == '/focus-sessions/active') return Reply(200, {'session': active});
    if (path == '/dashboard') {
      return Reply(200, {
        'tasks': {'total': 0, 'completed': 0, 'completedLast7Days': 0, 'completedPrevious7Days': 0, 'overdue': 0, 'dueNext7Days': 0},
        'milestones': [],
        'upcomingTasks': [],
        'focusMinutesLast7Days': 0,
        'focusMinutesPrevious7Days': 0,
      });
    }
    if (['/tasks', '/milestones', '/focus-sessions'].contains(path)) return Reply(200, {'items': [], 'total': 0, 'page': 1, 'limit': 100});
    throw StateError('Unexpected request $method $uri');
  }
}

class Reply {
  Reply(this.status, this.body);
  final int status;
  final Map<String, dynamic> body;
}

class _Client implements HttpClient {
  @override
  set connectionTimeout(Duration? value) {}
  @override
  Future<HttpClientRequest> openUrl(String method, Uri uri) async => _Request(method, uri);
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Headers implements HttpHeaders {
  final values = <String, String>{};
  @override
  void set(String name, Object value, {bool preserveHeaderCase = false}) => values[name.toLowerCase()] = value.toString();
  @override
  set contentType(ContentType? value) {}
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Request implements HttpClientRequest {
  _Request(this.method, this.uri);
  @override
  final String method;
  @override
  final Uri uri;
  final buffer = StringBuffer();
  final _headers = _Headers();
  @override
  HttpHeaders get headers => _headers;
  @override
  void write(Object? object) => buffer.write(object);
  @override
  Future<HttpClientResponse> close() async => _Response(await ProfileServer.current._respond(method, uri, _headers, buffer.toString()));
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _Response extends Stream<List<int>> implements HttpClientResponse {
  _Response(Reply reply) : statusCode = reply.status, bytes = utf8.encode(jsonEncode(reply.body));
  final List<int> bytes;
  @override
  final int statusCode;
  @override
  StreamSubscription<List<int>> listen(
    void Function(List<int>)? onData, {
    Function? onError,
    void Function()? onDone,
    bool? cancelOnError,
  }) => Stream.value(bytes).listen(onData, onError: onError, onDone: onDone, cancelOnError: cancelOnError);
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}
