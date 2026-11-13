/// Signed-in pages: Dashboard, Milestones, Tasks, Focus timer, Settings, and the Calendar placeholder.
/// Mirrors desktop_frontend/client/src/pages/*.
library;

import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import 'api.dart';
import 'model.dart';
import 'shell.dart';
import 'state.dart';
import 'ui.dart';

Widget _plusIcon({bool ink = true}) => AppIcon(ink ? 'plus-on-ink' : 'plus', size: ink ? 20 : 18);

String _greetingForNow() {
  final hour = DateTime.now().hour;
  return hour < 12
      ? 'Good morning'
      : hour < 18
      ? 'Good afternoon'
      : 'Good evening';
}

// =====================================================================
// Dashboard
// =====================================================================

enum DeadlineRange { week, threeWeeks, all }

const _rangeMaxDays = {DeadlineRange.week: 7, DeadlineRange.threeWeeks: 21, DeadlineRange.all: 1 << 30};

class DashboardPage extends StatefulWidget {
  const DashboardPage(this.ctx, {super.key});
  final PageCtx ctx;
  @override
  State<DashboardPage> createState() => _DashboardPageState();
}

class _DashboardPageState extends State<DashboardPage> {
  DeadlineRange range = DeadlineRange.threeWeeks;
  // Server-side search results for the current query: (query, taskIds, milestoneIds).
  (String, Set<String>, Set<String>)? match;
  Timer? _debounce;
  String _lastQuery = '';

  @override
  void dispose() {
    _debounce?.cancel();
    super.dispose();
  }

  /// Search is done by the server (partial, case-insensitive title match), debounced while typing.
  void _searchIfChanged(String query) {
    if (query == _lastQuery) return;
    _lastQuery = query;
    _debounce?.cancel();
    if (query.length < 2) return;
    _debounce = Timer(const Duration(milliseconds: 250), () async {
      try {
        final (taskIds, milestoneIds) = await DashboardApi.search(query);
        if (mounted && query == _lastQuery) setState(() => match = (query, taskIds, milestoneIds));
      } catch (_) {
        // keep showing the previous results while typing continues
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final ctx = widget.ctx;
    final data = ctx.data;
    final query = ctx.search.trim();
    _searchIfChanged(query);
    final active = query.length >= 2 ? match : null;

    final summary = data.summary;
    if (summary == null) {
      return Panel(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 48),
        child: data.error != null
            ? Gap(16, [
                const Text('Couldn’t load your dashboard', style: T.heading, textAlign: TextAlign.center),
                Text(data.error!, style: T.muted(T.body), textAlign: TextAlign.center),
                Center(child: PillButton('Try again', ink: true, onPressed: data.refresh)),
              ])
            : Gap(16, [
                const Center(child: CircularProgressIndicator()),
                Text('Loading your dashboard…', style: T.muted(T.body), textAlign: TextAlign.center),
              ]),
      );
    }

    final tasks = data.uiTasks;
    final milestones = data.uiMilestones;
    final deadlines = data.deadlines;
    final stats = buildStats(data.tasks, milestones, summary);

    final visibleTasks = active == null ? tasks : tasks.where((t) => active.$2.contains(t.id)).toList();
    final visibleMilestones = active == null ? milestones : milestones.where((m) => active.$3.contains(m.id)).toList();
    final visibleDeadlines = deadlines.where((d) {
      if (d.daysUntil > _rangeMaxDays[range]!) return false;
      if (active == null) return true;
      return d.milestoneId != null ? active.$3.contains(d.milestoneId) : active.$2.contains(d.id);
    }).toList();

    final upcoming = deadlines.where((d) => d.daysUntil <= 7).length;
    final user = ctx.user;
    final name = user.displayName.isNotEmpty ? user.displayName : user.email.split('@').first;

    return Gap(24, [
      PageHeader(
        ctx,
        title: '${_greetingForNow()}, $name',
        subtitle: '${todayLabel()} · ${plural(upcoming, 'deadline')} in the next 7 days',
        action: PillButton('New task', ink: true, icon: _plusIcon(), onPressed: ctx.openNewTask),
      ),
      if (data.error != null) NoticeBox(Notice(NoticeKind.danger, data.error!)),
      StatCard('Due this week', plural(stats.dueThisWeek, 'task'), stats.dueThisWeekNote, 'clock'),
      StatCard('Milestones on track', stats.milestonesOnTrack, stats.milestonesNote, 'flag-stat'),
      StatCard('Focus time this week', stats.focusTime, stats.focusNote, 'timer', noteMuted: true),
      StatCard('Tasks done this week', plural(stats.doneThisWeek, 'task'), stats.doneNote, 'list-checks', noteMuted: true),
      _deadlinesCard(visibleDeadlines),
      FocusTimerCard(ctx),
      Panel(
        child: Gap(22, [
          CardHeader('Milestone progress', trailing: LinkText('View all', onTap: () => ctx.navigate(AppPage.milestones))),
          for (final m in visibleMilestones) MilestoneRow(m),
          if (visibleMilestones.isEmpty) const EmptyText('No milestones match.'),
        ]),
      ),
      Panel(
        child: Gap(14, [
          CardHeader(
            'Today’s tasks',
            trailing: Text('${tasks.where((t) => t.done).length} of ${tasks.length} done', style: T.muted(T.bodyBold)),
          ),
          Column(
            children: [
              for (final (i, t) in visibleTasks.indexed)
                TaskRow(
                  label: t.label,
                  tag: t.tag,
                  done: t.done,
                  ruled: i < visibleTasks.length - 1,
                  onToggle: () => data.toggleTask(t.id),
                ),
              if (visibleTasks.isEmpty) const EmptyText('No tasks match.'),
            ],
          ),
          Align(
            alignment: Alignment.centerLeft,
            child: PillButton(
              'Add task',
              icon: _plusIcon(ink: false),
              onPressed: ctx.openNewTask,
              padding: const EdgeInsets.fromLTRB(14, 9, 20, 9),
            ),
          ),
        ]),
      ),
    ]);
  }

  Widget _deadlinesCard(List<Deadline> deadlines) => Panel(
    child: Gap(20, [
      Wrap(
        spacing: 12,
        runSpacing: 12,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text('Upcoming deadlines', style: T.heading),
              const SizedBox(width: 10),
              CountPill(deadlines.length),
            ],
          ),
          RangeTabs<DeadlineRange>(
            options: const {DeadlineRange.week: 'This week', DeadlineRange.threeWeeks: 'Next 3 weeks', DeadlineRange.all: 'All'},
            selected: range,
            onChanged: (r) => setState(() => range = r),
          ),
        ],
      ),
      Gap(12, [for (final d in deadlines) DeadlineRow(d), if (deadlines.isEmpty) const EmptyText('No deadlines match.')]),
    ]),
  );
}

class StatCard extends StatelessWidget {
  const StatCard(this.label, this.value, this.note, this.icon, {super.key, this.noteMuted = false});
  final String label;
  final String value;
  final String note;
  final String icon;
  final bool noteMuted;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 20),
    decoration: BoxDecoration(
      border: Border.all(color: Ink2.ink, width: 2),
      borderRadius: BorderRadius.circular(24),
    ),
    child: Gap(6, [
      Row(
        children: [
          Expanded(child: Text(label, style: T.muted(T.bodyBold))),
          Container(
            width: 40,
            height: 40,
            decoration: const BoxDecoration(
              shape: BoxShape.circle,
              border: Border.fromBorderSide(BorderSide(color: Ink2.ink, width: 2)),
            ),
            child: Center(child: AppIcon(icon)),
          ),
        ],
      ),
      Text(value, style: T.stat),
      Text(note, style: noteMuted ? T.muted(T.captionBold) : T.captionBold),
    ]),
  );
}

class DeadlineRow extends StatelessWidget {
  const DeadlineRow(this.d, {super.key});
  final Deadline d;

  String get _dueLabel => d.daysUntil <= 0
      ? 'Due today'
      : d.daysUntil == 1
      ? 'Due tomorrow'
      : 'In ${d.daysUntil} days';

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.fromLTRB(8, 8, 10, 8),
    decoration: BoxDecoration(
      border: Border.all(color: Ink2.ink, width: 2),
      borderRadius: BorderRadius.circular(26),
    ),
    child: Row(
      children: [
        DateCircle(d.month, d.day),
        const SizedBox(width: 10),
        Expanded(
          child: Gap(2, [Text(d.title, style: T.title), Text(d.context, style: T.muted(T.caption))]),
        ),
        const SizedBox(width: 10),
        Badge2(_dueLabel, urgent: d.daysUntil <= 1),
      ],
    ),
  );
}

/// "WORKING ON" pill with the flag icon.
class WorkingOn extends StatelessWidget {
  const WorkingOn(this.task, {super.key});
  final UiTask? task;
  @override
  Widget build(BuildContext context) => Gap(8, [
    const Text('WORKING ON', style: T.overline),
    Container(
      padding: const EdgeInsets.fromLTRB(14, 10, 20, 10),
      decoration: BoxDecoration(
        border: Border.all(color: Ink2.ink, width: 2),
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        children: [
          const AppIcon('flag'),
          const SizedBox(width: 12),
          Expanded(
            child: Gap(1, [
              Text(task?.label ?? 'Nothing left for today', style: T.bodyBold, overflow: TextOverflow.ellipsis),
              Text(task?.context ?? 'Add a task to keep the streak going', style: T.muted(T.caption), overflow: TextOverflow.ellipsis),
            ]),
          ),
        ],
      ),
    ),
  ]);
}

/// Start / Pause / Resume and the round reset button.
class TimerControls extends StatelessWidget {
  const TimerControls(this.ctx, {super.key});
  final PageCtx ctx;
  @override
  Widget build(BuildContext context) {
    final timer = ctx.timer;
    return Gap(6, [
      Row(
        children: [
          Expanded(
            child: PillButton(
              timer.running ? 'Pause' : (timer.started ? 'Resume' : 'Start'),
              ink: true,
              expand: true,
              icon: timer.running ? const AppIcon('pause') : const Icon(Icons.play_arrow_rounded, color: Ink2.bg, size: 22),
              padding: const EdgeInsets.symmetric(vertical: 13),
              onPressed: () => timer.running ? timer.pause() : timer.start(ctx.currentTask?.id),
            ),
          ),
          const SizedBox(width: 10),
          CircleIconButton(size: 48, tooltip: 'Reset timer', onPressed: timer.reset, child: const AppIcon('reset')),
        ],
      ),
      if (timer.syncError != null) Text(timer.syncError!, style: T.caption.copyWith(color: Ink2.risk)),
    ]);
  }
}

class FocusTimerCard extends StatelessWidget {
  const FocusTimerCard(this.ctx, {super.key});
  final PageCtx ctx;
  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: ctx.timer,
    builder: (context, _) {
      final timer = ctx.timer;
      final s = ctx.settings;
      final isBreak = timer.mode != TimerMode.focus;
      return Panel(
        child: Gap(24, [
          CardHeader(
            'Focus timer',
            trailing: Badge2(isBreak ? 'Break · ${timer.duration ~/ 60} min' : 'Pomodoro · ${s.focusMinutes} / ${s.shortBreakMinutes}'),
          ),
          Center(
            child: TimerRing(remaining: timer.remaining, duration: timer.duration, isBreak: isBreak),
          ),
          WorkingOn(ctx.currentTask),
          Row(
            children: [
              Expanded(child: Text(timer.sessionLabel, style: T.bodyBold)),
              SessionDots(total: timer.sessionsPerDay, completed: timer.completedSessions),
            ],
          ),
          TimerControls(ctx),
        ]),
      );
    },
  );
}

// =====================================================================
// Milestones
// =====================================================================

enum _MilestoneFilter { all, active, completed }

class MilestonesPage extends StatefulWidget {
  const MilestonesPage(this.ctx, {super.key});
  final PageCtx ctx;
  @override
  State<MilestonesPage> createState() => _MilestonesPageState();
}

class _MilestonesPageState extends State<MilestonesPage> {
  _MilestoneFilter filter = _MilestoneFilter.all;
  // Tasks checked off on this page stay in the Remaining list (ticked) until you leave.
  final checkedHere = <String>{};

  Future<void> _newMilestone() async {
    final title = await showPanelDialog<String>(context, (_) => NewMilestoneForm(onCreate: widget.ctx.data.createMilestone));
    if (title != null) widget.ctx.notify('Added the “$title” milestone');
  }

  @override
  Widget build(BuildContext context) {
    final ctx = widget.ctx;
    final data = ctx.data;
    final milestones = data.uiMilestones;
    final atRisk = milestones.where((m) => m.status == MilestoneStatus.atRisk).length;
    final query = ctx.search.trim().toLowerCase();
    final visible = milestones
        .where(
          (m) =>
              (filter == _MilestoneFilter.all || (filter == _MilestoneFilter.completed) == (m.status == MilestoneStatus.completed)) &&
              (query.isEmpty || m.title.toLowerCase().contains(query)),
        )
        .toList();
    final emptyText = query.isNotEmpty
        ? 'No milestones match “${ctx.search.trim()}”.'
        : filter == _MilestoneFilter.completed
        ? 'No completed milestones yet.'
        : filter == _MilestoneFilter.active
        ? 'Every milestone is finished.'
        : 'No milestones yet. Add one with New milestone.';

    return Gap(24, [
      PageHeader(
        ctx,
        title: 'Milestones',
        subtitle: '${plural(milestones.length, 'milestone')} across your projects · ${atRisk == 0 ? 'none' : atRisk} at risk',
        action: PillButton('New milestone', ink: true, icon: _plusIcon(), onPressed: _newMilestone),
      ),
      Panel(
        child: Gap(24, [
          Wrap(
            spacing: 12,
            runSpacing: 12,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              const Text('Milestone progress', style: T.heading),
              RangeTabs<_MilestoneFilter>(
                small: true,
                options: const {_MilestoneFilter.all: 'All', _MilestoneFilter.active: 'Active', _MilestoneFilter.completed: 'Completed'},
                selected: filter,
                onChanged: (f) => setState(() => filter = f),
              ),
            ],
          ),
          if (visible.isEmpty)
            EmptyText(emptyText)
          else
            Column(
              children: [
                for (final (i, m) in visible.indexed) ...[
                  if (i > 0) const Padding(padding: EdgeInsets.symmetric(vertical: 18), child: SubtleDivider()),
                  MilestoneRow(m),
                ],
              ],
            ),
        ]),
      ),
      _nextDue(ctx),
    ]);
  }

  /// The unfinished milestone with the soonest due date.
  Widget _nextDue(PageCtx ctx) {
    final data = ctx.data;
    final dated = (data.summary?.milestones ?? []).where((m) => m.dueAt != null).toList()
      ..sort((a, b) => local(a.dueAt!).compareTo(local(b.dueAt!)));
    final next = dated.where((m) => milestoneStatus(m) != MilestoneStatus.completed).firstOrNull;
    if (next == null) {
      return const Panel(child: Gap(12, [Text('Next due', style: T.heading), EmptyText('No upcoming milestone with a due date.')]));
    }
    final days = daysUntil(next.dueAt!);
    final dueLabel = days < 0
        ? 'Overdue'
        : days == 0
        ? 'Due today'
        : days == 1
        ? 'Due tomorrow'
        : 'Due in $days days';
    final remaining = data.tasks.where((t) => t.milestoneId == next.id && (!t.done || checkedHere.contains(t.id))).toList();

    return Panel(
      child: Gap(20, [
        CardHeader('Next due', trailing: Badge2(dueLabel, urgent: days <= 1)),
        Row(
          children: [
            DateCircle(monthAbbrev(next.dueAt!), dayOfMonth(next.dueAt!), large: true),
            const SizedBox(width: 14),
            Expanded(
              child: Gap(2, [
                Text(next.title, style: T.heading, overflow: TextOverflow.ellipsis),
                Text('Milestone ${dated.indexOf(next) + 1} of ${dated.length}', style: T.muted(T.body)),
              ]),
            ),
          ],
        ),
        const SubtleDivider(),
        InfoRow('Due date', formatWeekdayDate(next.dueAt!)),
        InfoRow('Tasks finished', '${next.completedTasks} of ${next.totalTasks}'),
        const SubtleDivider(),
        Gap(8, [
          const Text('Remaining tasks', style: T.title),
          Column(
            children: [
              for (final t in remaining)
                TaskRow(
                  label: t.title,
                  tag: next.title,
                  done: t.done,
                  onToggle: () {
                    setState(() => checkedHere.add(t.id));
                    data.toggleTask(t.id);
                  },
                ),
              if (remaining.isEmpty) const EmptyText('Nothing left on this milestone.'),
            ],
          ),
        ]),
        Align(
          alignment: Alignment.centerLeft,
          child: LinkText('Open task list', onTap: () => ctx.navigate(AppPage.tasks)),
        ),
      ]),
    );
  }
}

// =====================================================================
// Tasks
// =====================================================================

enum _TaskFilter { all, todo, done }

class TasksPage extends StatefulWidget {
  const TasksPage(this.ctx, {super.key});
  final PageCtx ctx;
  @override
  State<TasksPage> createState() => _TasksPageState();
}

class _TasksPageState extends State<TasksPage> {
  _TaskFilter filter = _TaskFilter.all;

  @override
  Widget build(BuildContext context) {
    final ctx = widget.ctx;
    final data = ctx.data;
    final titles = data.titles;
    final dueDates = {for (final m in data.milestones) m.id: m.dueAt};

    // Today: no due date, or due today / overdue. Upcoming: due later, soonest first.
    final today = data.tasks.where((t) => t.dueAt == null || daysUntil(t.dueAt!) <= 0).toList();
    final upcoming = data.tasks.where((t) => t.dueAt != null && daysUntil(t.dueAt!) > 0).toList()
      ..sort((a, b) => local(a.dueAt!).compareTo(local(b.dueAt!)));
    final doneToday = today.where((t) => t.done).length;
    final focusNext = today.where((t) => !t.done).firstOrNull ?? upcoming.where((t) => !t.done).firstOrNull;

    final query = ctx.search.trim().toLowerCase();
    bool shows(ApiTask t) =>
        (filter == _TaskFilter.all || (filter == _TaskFilter.done) == t.done) &&
        (query.isEmpty || [t.title, titles[t.milestoneId] ?? ''].any((s) => s.toLowerCase().contains(query)));
    final todayVisible = today.where(shows).toList();
    final upcomingVisible = upcoming.where(shows).toList();
    final emptyText = query.isNotEmpty
        ? 'No tasks match “${ctx.search.trim()}”.'
        : filter == _TaskFilter.done
        ? 'Nothing checked off yet.'
        : filter == _TaskFilter.todo
        ? 'All caught up.'
        : 'No tasks yet. Add one with New task.';
    final now = DateTime.now();
    final todayShort = todayLabel(now).replaceFirstMapped(RegExp(r', (\w{3})\w* '), (m) => ', ${m[1]} ');

    TaskRow row(ApiTask t, {Widget? trailing}) => TaskRow(
      label: t.title,
      tag: titles[t.milestoneId] ?? 'General',
      done: t.done,
      trailing: trailing,
      onToggle: () => data.toggleTask(t.id),
    );

    return Gap(24, [
      PageHeader(
        ctx,
        title: 'Tasks',
        subtitle: '${plural(today.length, 'task')} planned today · $doneToday already complete',
        action: PillButton('New task', ink: true, icon: _plusIcon(), onPressed: ctx.openNewTask),
      ),
      Panel(
        child: Gap(22, [
          Wrap(
            spacing: 12,
            runSpacing: 12,
            crossAxisAlignment: WrapCrossAlignment.center,
            children: [
              const Text('My tasks', style: T.heading),
              RangeTabs<_TaskFilter>(
                small: true,
                options: const {_TaskFilter.all: 'All', _TaskFilter.todo: 'To do', _TaskFilter.done: 'Done'},
                selected: filter,
                onChanged: (f) => setState(() => filter = f),
              ),
            ],
          ),
          if (todayVisible.isNotEmpty)
            Gap(7, [
              Row(
                children: [
                  const Expanded(child: Text('Today', style: T.title)),
                  Text(todayShort, style: T.muted(T.captionBold)),
                ],
              ),
              Column(children: [for (final t in todayVisible) row(t)]),
            ]),
          if (upcomingVisible.isNotEmpty)
            Gap(8, [
              Row(
                children: [
                  const Expanded(child: Text('Upcoming', style: T.title)),
                  Text('Due date', style: T.muted(T.captionBold)),
                ],
              ),
              Column(
                children: [
                  for (final (i, t) in upcomingVisible.indexed)
                    TaskRow(
                      label: t.title,
                      tag: titles[t.milestoneId] ?? 'General',
                      done: t.done,
                      ruled: i < upcomingVisible.length - 1,
                      onToggle: () => data.toggleTask(t.id),
                      trailing: SizedBox(
                        width: 52,
                        child: Text(formatShortDate(t.dueAt!), style: T.muted(T.captionBold), textAlign: TextAlign.right),
                      ),
                    ),
                ],
              ),
            ]),
          if (todayVisible.isEmpty && upcomingVisible.isEmpty) EmptyText(emptyText),
        ]),
      ),
      Panel(
        child: Gap(14, [
          const Text('Today’s progress', style: T.heading),
          Row(
            crossAxisAlignment: CrossAxisAlignment.baseline,
            textBaseline: TextBaseline.alphabetic,
            children: [
              Text('$doneToday of ${today.length}', style: T.stat),
              const SizedBox(width: 10),
              Text('tasks complete', style: T.muted(T.body)),
            ],
          ),
          // One segment per task planned today, finished ones filled in from the left.
          if (today.isNotEmpty)
            Row(
              children: [
                for (var i = 0; i < today.length; i++) ...[
                  if (i > 0) const SizedBox(width: 6),
                  Expanded(
                    child: Container(
                      height: 12,
                      decoration: BoxDecoration(color: i < doneToday ? Ink2.ink : Ink2.line, borderRadius: BorderRadius.circular(99)),
                    ),
                  ),
                ],
              ],
            ),
          const SubtleDivider(),
          InfoRow('This week', '${plural(data.summary?.completedLast7Days ?? 0, 'task')} done'),
        ]),
      ),
      Panel(
        child: focusNext == null
            ? Gap(19, [
                const Text('Focus next', style: T.heading),
                Text('All caught up. Add a task to plan your next focus block.', style: T.muted(T.body)),
              ])
            : Gap(19, [
                CardHeader('Focus next', trailing: Badge2(titles[focusNext.milestoneId] ?? 'General')),
                Gap(4, [
                  Text(focusNext.title, style: T.heading, overflow: TextOverflow.ellipsis),
                  Text(titles[focusNext.milestoneId] ?? 'General', style: T.muted(T.body)),
                ]),
                const SubtleDivider(),
                InfoRow(
                  'Milestone due',
                  dueDates[focusNext.milestoneId] == null ? 'No due date' : formatWeekdayDate(dueDates[focusNext.milestoneId]!),
                ),
                InfoRow('Focus block', '${ctx.settings.focusMinutes} minutes'),
                PillButton(
                  'Open focus timer',
                  ink: true,
                  expand: true,
                  onPressed: () => ctx.navigate(AppPage.focus),
                  padding: const EdgeInsets.symmetric(vertical: 11),
                ),
              ]),
      ),
    ]);
  }
}

// =====================================================================
// Focus timer
// =====================================================================

class FocusPage extends StatelessWidget {
  const FocusPage(this.ctx, {super.key});
  final PageCtx ctx;

  @override
  Widget build(BuildContext context) => ListenableBuilder(
    listenable: ctx.timer,
    builder: (context, _) {
      final timer = ctx.timer;
      final s = ctx.settings;
      return Gap(24, [
        PageHeader(
          ctx,
          title: 'Focus timer',
          subtitle: 'Pomodoro · ${timer.sessionLabel}',
          onSearchSubmit: () => ctx.navigate(AppPage.dashboard),
          action: PillButton('Timer settings', ink: true, onPressed: () => ctx.navigate(AppPage.settings)),
        ),
        Panel(
          child: Gap(24, [
            CardHeader('Focus session', trailing: Badge2(timer.status)),
            Center(
              child: RangeTabs<TimerMode>(
                small: true,
                options: const {TimerMode.focus: 'Focus', TimerMode.short: 'Short break', TimerMode.long: 'Long break'},
                selected: timer.mode,
                onChanged: timer.selectMode,
              ),
            ),
            Center(
              child: TimerRing(remaining: timer.remaining, duration: timer.duration, isBreak: timer.mode != TimerMode.focus, size: 260),
            ),
            Gap(18, [
              TimerControls(ctx),
              Row(
                children: [
                  Expanded(child: Text(timer.sessionLabel, style: T.bodyBold)),
                  SessionDots(total: timer.sessionsPerDay, completed: timer.completedSessions),
                ],
              ),
            ]),
          ]),
        ),
        Panel(
          child: Gap(18, [
            const Text('Session plan', style: T.heading),
            WorkingOn(ctx.currentTask),
            const SubtleDivider(),
            Gap(12, [
              InfoRow('Focus block', '${s.focusMinutes} min'),
              InfoRow('Short break', '${s.shortBreakMinutes} min'),
              InfoRow('Long break', '${s.longBreakMinutes} min'),
            ]),
          ]),
        ),
        Panel(
          child: Gap(14, [
            const Text('Recent sessions', style: T.heading),
            if (timer.recent.isEmpty) Text('No finished focus sessions yet.', style: T.muted(T.body)),
            for (final (i, r) in timer.recent.indexed) ...[
              if (i > 0) const SubtleDivider(),
              Row(
                children: [
                  Expanded(
                    child: Gap(2, [
                      Text(r.title, style: T.bodyBold, overflow: TextOverflow.ellipsis),
                      Text(r.when, style: T.muted(T.caption)),
                    ]),
                  ),
                  Text('${r.minutes} min', style: T.captionBold),
                ],
              ),
            ],
          ]),
        ),
      ]);
    },
  );
}

// =====================================================================
// Settings
// =====================================================================

class SettingsPage extends StatefulWidget {
  const SettingsPage(this.ctx, {super.key});
  final PageCtx ctx;
  @override
  State<SettingsPage> createState() => _SettingsPageState();
}

class _SettingsPageState extends State<SettingsPage> {
  // Edits stay local until "Save changes".
  late final UserSettings draft = widget.ctx.settings.copy();
  final _form = GlobalKey<FormState>();

  void _update(String key, Object value) => setState(() => draft.values[key] = value);

  void _save() {
    if (!(_form.currentState?.validate() ?? false)) return;
    draft.values['displayName'] = (draft.values['displayName'] as String).trim();
    draft.values['email'] = (draft.values['email'] as String).trim();
    widget.ctx.saveSettings(draft.copy());
  }

  @override
  Widget build(BuildContext context) {
    final d = draft;
    return Form(
      key: _form,
      child: Gap(24, [
        PageHeader(
          widget.ctx,
          title: 'Settings',
          subtitle: 'Your profile, reminders, and focus preferences',
          onSearchSubmit: () => widget.ctx.navigate(AppPage.dashboard),
          action: PillButton('Save changes', ink: true, onPressed: _save),
        ),
        _card('Profile', 18, [
          SettingsText('Display name', d.get('displayName'), (v) => _update('displayName', v)),
          SettingsText('Email address', d.get('email'), (v) => _update('email', v), email: true),
        ]),
        _card('Notifications', 15, [
          SwitchRow(
            'Deadline reminders',
            'Remind me when a task or milestone is almost due.',
            d.get('deadlineReminders'),
            (v) => _update('deadlineReminders', v),
          ),
          Labeled(
            'Remind me',
            PillDropdown<String>(
              radius: 16,
              value: d.get('remindBefore'),
              enabled: d.get<bool>('deadlineReminders'),
              items: {for (final o in reminderOptions) o: o},
              onChanged: (v) => _update('remindBefore', v),
            ),
          ),
          const SubtleDivider(),
          SwitchRow('Daily summary', 'Send a morning list of my open tasks.', d.get('dailySummary'), (v) => _update('dailySummary', v)),
        ]),
        _card('Focus preferences', 20, [
          _pair(
            SettingsNumber('Focus length', 'min', 1, 180, d.get('focusMinutes'), (v) => _update('focusMinutes', v)),
            SettingsNumber('Short break', 'min', 1, 60, d.get('shortBreakMinutes'), (v) => _update('shortBreakMinutes', v)),
          ),
          _pair(
            SettingsNumber('Long break', 'min', 1, 120, d.get('longBreakMinutes'), (v) => _update('longBreakMinutes', v)),
            SettingsNumber(
              'Long break after',
              'sessions',
              1,
              12,
              d.get('longBreakAfterSessions'),
              (v) => _update('longBreakAfterSessions', v),
            ),
          ),
        ]),
        _card('Calendar preferences', 20, [
          _pair(
            Labeled(
              'Week starts on',
              PillDropdown<String>(
                radius: 16,
                value: d.get('weekStartsOn'),
                items: {for (final o in weekStartOptions) o: o},
                onChanged: (v) => _update('weekStartsOn', v),
              ),
            ),
            Labeled(
              'Default view',
              PillDropdown<String>(
                radius: 16,
                value: d.get('defaultCalendarView'),
                items: {for (final o in calendarViewOptions) o: o},
                onChanged: (v) => _update('defaultCalendarView', v),
              ),
            ),
          ),
          Labeled(
            'Time zone',
            PillDropdown<String>(radius: 16, value: d.get('timeZone'), items: timeZoneOptions, onChanged: (v) => _update('timeZone', v)),
          ),
        ]),
      ]),
    );
  }

  Widget _card(String title, double gap, List<Widget> children) => Panel(child: Gap(gap, [Text(title, style: T.heading), ...children]));

  Widget _pair(Widget a, Widget b) => Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Expanded(child: a),
      const SizedBox(width: 16),
      Expanded(child: b),
    ],
  );
}

InputDecoration _fieldDecoration({String? suffix}) {
  const border = OutlineInputBorder(
    borderRadius: BorderRadius.all(Radius.circular(16)),
    borderSide: BorderSide(color: Ink2.ink, width: 2),
  );
  return InputDecoration(
    isDense: true,
    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 13),
    suffixText: suffix,
    suffixStyle: T.muted(T.captionBold),
    enabledBorder: border,
    focusedBorder: border.copyWith(borderSide: const BorderSide(color: Ink2.onTrack, width: 2)),
    errorBorder: border.copyWith(borderSide: const BorderSide(color: Ink2.risk, width: 2)),
    focusedErrorBorder: border.copyWith(borderSide: const BorderSide(color: Ink2.risk, width: 2)),
    errorStyle: T.caption.copyWith(color: Ink2.risk),
  );
}

class SettingsText extends StatelessWidget {
  const SettingsText(this.label, this.value, this.onChanged, {super.key, this.email = false});
  final String label;
  final String value;
  final ValueChanged<String> onChanged;
  final bool email;
  @override
  Widget build(BuildContext context) => Labeled(
    label,
    TextFormField(
      initialValue: value,
      style: T.body,
      keyboardType: email ? TextInputType.emailAddress : TextInputType.text,
      decoration: _fieldDecoration(),
      onChanged: onChanged,
      validator: (v) {
        final text = (v ?? '').trim();
        if (text.isEmpty) return 'Required';
        if (email && !RegExp(r'^[^@\s]+@[^@\s]+\.[^@\s]+$').hasMatch(text)) return 'Enter a valid email';
        return null;
      },
    ),
  );
}

class SettingsNumber extends StatelessWidget {
  const SettingsNumber(this.label, this.unit, this.min, this.max, this.value, this.onChanged, {super.key});
  final String label;
  final String unit;
  final int min;
  final int max;
  final int value;
  final ValueChanged<int> onChanged;
  @override
  Widget build(BuildContext context) => Labeled(
    label,
    TextFormField(
      initialValue: '$value',
      style: T.body,
      keyboardType: TextInputType.number,
      inputFormatters: [FilteringTextInputFormatter.digitsOnly],
      decoration: _fieldDecoration(suffix: unit),
      onChanged: (v) {
        final n = int.tryParse(v);
        if (n != null) onChanged(n);
      },
      validator: (v) {
        final n = int.tryParse(v ?? '');
        return n == null || n < min || n > max ? '$min–$max' : null;
      },
    ),
  );
}

/// Label + description with the black/white pill toggle from the Figma file.
class SwitchRow extends StatelessWidget {
  const SwitchRow(this.label, this.description, this.checked, this.onChanged, {super.key});
  final String label;
  final String description;
  final bool checked;
  final ValueChanged<bool> onChanged;
  @override
  Widget build(BuildContext context) => Semantics(
    toggled: checked,
    label: label,
    child: GestureDetector(
      behavior: HitTestBehavior.opaque,
      onTap: () => onChanged(!checked),
      child: Row(
        children: [
          Expanded(
            child: Gap(3, [Text(label, style: T.bodyBold), Text(description, style: T.muted(T.caption))]),
          ),
          const SizedBox(width: 16),
          AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            width: 46,
            height: 27,
            padding: const EdgeInsets.all(3),
            alignment: checked ? Alignment.centerRight : Alignment.centerLeft,
            decoration: BoxDecoration(
              color: checked ? Ink2.ink : Ink2.bg,
              border: Border.all(color: Ink2.ink, width: 2),
              borderRadius: BorderRadius.circular(99),
            ),
            child: Container(
              width: 17,
              height: 17,
              decoration: BoxDecoration(color: checked ? Ink2.bg : Ink2.ink, shape: BoxShape.circle),
            ),
          ),
        ],
      ),
    ),
  );
}
