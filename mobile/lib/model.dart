/// Date helpers and the view models the cards are designed around.
/// Mirrors desktop_frontend/client/src/lib/dates.ts and lib/dashboardModel.ts.
library;

import 'api.dart';

// ---------------- dates ----------------

const _months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const _monthsLong = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
const _weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

DateTime local(String iso) => DateTime.parse(iso).toLocal();
DateTime startOfDay(DateTime d) => DateTime(d.year, d.month, d.day);

/// Whole calendar days from today until `iso` (negative when overdue).
int daysUntil(String iso) {
  final diff = startOfDay(local(iso)).difference(startOfDay(DateTime.now()));
  return (diff.inHours / 24).round();
}

String monthAbbrev(String iso) => _months[local(iso).month - 1].toUpperCase();
int dayOfMonth(String iso) => local(iso).day;

/// e.g. "Oct 28"
String formatShortDate(String iso) {
  final d = local(iso);
  return '${_months[d.month - 1]} ${d.day}';
}

/// e.g. "Wed, Oct 28"
String formatWeekdayDate(String iso) {
  final d = local(iso);
  return '${_weekdays[d.weekday - 1].substring(0, 3)}, ${_months[d.month - 1]} ${d.day}';
}

/// e.g. "Tuesday, October 27"
String todayLabel([DateTime? now]) {
  final d = now ?? DateTime.now();
  return '${_weekdays[d.weekday - 1]}, ${_monthsLong[d.month - 1]} ${d.day}';
}

/// e.g. "Today · 10:00 AM", "Yesterday · 3:00 PM", "Oct 20 · 9:15 AM"
String formatWhen(String iso) {
  final d = local(iso);
  final days = -daysUntil(iso);
  final day = days == 0
      ? 'Today'
      : days == 1
      ? 'Yesterday'
      : formatShortDate(iso);
  final hour = d.hour % 12 == 0 ? 12 : d.hour % 12;
  return '$day · $hour:${d.minute.toString().padLeft(2, '0')} ${d.hour < 12 ? 'AM' : 'PM'}';
}

/// 580 → "9h 40m"; 45 → "45m"
String formatMinutes(int minutes) {
  final h = minutes ~/ 60;
  final m = minutes % 60;
  return h == 0 ? '${m}m' : '${h}h ${m}m';
}

/// 1500 → "25:00"
String formatTime(int totalSeconds) =>
    '${(totalSeconds ~/ 60).toString().padLeft(2, '0')}:${(totalSeconds % 60).toString().padLeft(2, '0')}';

/// A picked date → ISO timestamp at the end of that local day (like the web date input).
String dateToIso(DateTime date) => DateTime(date.year, date.month, date.day, 23, 59).toUtc().toIso8601String();

String plural(int n, String word) => '$n $word${n == 1 ? '' : 's'}';

// ---------------- view models ----------------

class UiTask {
  UiTask(this.id, this.label, this.tag, this.context, this.done);
  final String id;
  final String label;
  final String tag;
  final String context;
  final bool done;
}

class Deadline {
  Deadline(this.id, this.title, this.context, this.month, this.day, this.daysUntil, this.progress, this.milestoneId);
  final String id;
  final String title;
  final String context;
  final String month;
  final int day;
  final int daysUntil;
  final String progress;

  /// Set when the row is a milestone rather than a task.
  final String? milestoneId;
}

enum MilestoneStatus { completed, atRisk, onTrack }

extension MilestoneStatusLabel on MilestoneStatus {
  String get label => switch (this) {
    MilestoneStatus.completed => 'Completed',
    MilestoneStatus.atRisk => 'At risk',
    MilestoneStatus.onTrack => 'On track',
  };
}

class UiMilestone {
  UiMilestone(this.id, this.title, this.status, this.detail, this.percent);
  final String id;
  final String title;
  final MilestoneStatus status;
  final String detail;
  final int percent;
}

class AppNotification {
  AppNotification(this.id, this.text, this.time);
  final String id;
  final String text;
  final String time;
}

Map<String, String> milestoneTitles(List<ApiMilestone> milestones) => {for (final m in milestones) m.id: m.title};

List<UiTask> toUiTasks(List<ApiTask> tasks, Map<String, String> titles) => [
  for (final t in tasks)
    UiTask(
      t.id,
      t.title,
      titles[t.milestoneId] ?? 'General',
      '${titles[t.milestoneId] ?? 'General'}${t.dueAt != null ? ' · due ${formatShortDate(t.dueAt!)}' : ''}',
      t.done,
    ),
];

const _statusProgress = {'todo': 'Not started', 'in_progress': 'In progress', 'done': 'Done'};

/// Open tasks and unfinished milestones that have a due date, soonest first.
List<Deadline> toDeadlines(List<ApiTask> tasks, List<MilestoneProgress> progress, Map<String, String> titles) {
  final rows = <(DateTime, Deadline)>[];
  for (final t in tasks) {
    if (t.dueAt == null || t.done) continue;
    final due = t.dueAt!;
    rows.add((
      local(due),
      Deadline(
        t.id,
        t.title,
        titles[t.milestoneId] ?? 'Task',
        monthAbbrev(due),
        dayOfMonth(due),
        daysUntil(due),
        _statusProgress[t.status] ?? '',
        null,
      ),
    ));
  }
  for (final m in progress) {
    if (m.dueAt == null || (m.totalTasks > 0 && m.completedTasks == m.totalTasks)) continue;
    final due = m.dueAt!;
    rows.add((
      local(due),
      Deadline(
        'milestone:${m.id}',
        m.title,
        'Milestone · ${m.completedTasks} of ${m.totalTasks} tasks',
        monthAbbrev(due),
        dayOfMonth(due),
        daysUntil(due),
        m.totalTasks > 0 ? '${m.progressPercent}% done' : 'Not started',
        m.id,
      ),
    ));
  }
  rows.sort((a, b) => a.$1.compareTo(b.$1));
  return [for (final r in rows) r.$2];
}

MilestoneStatus milestoneStatus(MilestoneProgress m) {
  if (m.totalTasks > 0 && m.completedTasks == m.totalTasks) return MilestoneStatus.completed;
  if (m.dueAt != null) {
    final days = daysUntil(m.dueAt!);
    if (days < 0 || (days <= 3 && m.progressPercent < 100)) return MilestoneStatus.atRisk;
  }
  return MilestoneStatus.onTrack;
}

List<UiMilestone> toUiMilestones(List<MilestoneProgress> progress) => [
  for (final m in progress)
    () {
      final status = milestoneStatus(m);
      final when = status == MilestoneStatus.completed
          ? 'Finished'
          : m.dueAt != null
          ? 'Due ${formatShortDate(m.dueAt!)}'
          : 'No due date';
      return UiMilestone(m.id, m.title, status, '$when · ${m.completedTasks} of ${m.totalTasks} tasks', m.progressPercent);
    }(),
];

class DashboardStats {
  DashboardStats(
    this.dueThisWeek,
    this.dueThisWeekNote,
    this.milestonesOnTrack,
    this.milestonesNote,
    this.focusTime,
    this.focusNote,
    this.doneThisWeek,
    this.doneNote,
  );
  final int dueThisWeek;
  final String dueThisWeekNote;
  final String milestonesOnTrack;
  final String milestonesNote;
  final String focusTime;
  final String focusNote;
  final int doneThisWeek;
  final String doneNote;
}

DashboardStats buildStats(List<ApiTask> tasks, List<UiMilestone> milestones, DashboardSummary summary) {
  final open = [
    for (final t in tasks)
      if (!t.done && t.dueAt != null) daysUntil(t.dueAt!),
  ];
  final dueThisWeek = open.where((d) => d <= 7).length;
  final overdue = open.where((d) => d < 0).length;
  final tomorrow = open.where((d) => d == 1).length;
  final atRisk = milestones.where((m) => m.status == MilestoneStatus.atRisk).length;
  final focusDiff = summary.focusMinutesLast7Days - summary.focusMinutesPrevious7Days;
  final doneDiff = summary.completedLast7Days - summary.completedPrevious7Days;
  return DashboardStats(
    dueThisWeek,
    overdue > 0
        ? '$overdue overdue'
        : tomorrow > 0
        ? '$tomorrow due tomorrow'
        : 'Nothing due tomorrow',
    '${milestones.length - atRisk} of ${milestones.length}',
    atRisk == 0 ? 'No milestones at risk' : '${plural(atRisk, 'milestone')} at risk',
    formatMinutes(summary.focusMinutesLast7Days),
    '${focusDiff >= 0 ? '+' : '-'}${formatMinutes(focusDiff.abs())} vs last week',
    summary.completedLast7Days,
    '${doneDiff.abs()} ${doneDiff >= 0 ? 'more' : 'fewer'} than last week',
  );
}

List<AppNotification> buildNotifications(List<Deadline> deadlines, List<UiMilestone> milestones) {
  final items = <AppNotification>[];
  for (final d in deadlines) {
    if (d.daysUntil < 0) {
      items.add(AppNotification('overdue-${d.id}', '${d.title} is overdue', '${plural(-d.daysUntil, 'day')} ago'));
    } else if (d.daysUntil == 0) {
      items.add(AppNotification('today-${d.id}', '${d.title} is due today', 'Today'));
    } else if (d.daysUntil == 1) {
      items.add(AppNotification('tomorrow-${d.id}', '${d.title} is due tomorrow', 'Tomorrow'));
    }
  }
  for (final m in milestones) {
    if (m.status == MilestoneStatus.atRisk) items.add(AppNotification('risk-${m.id}', '${m.title} milestone is at risk', 'Now'));
  }
  return items.take(6).toList();
}
