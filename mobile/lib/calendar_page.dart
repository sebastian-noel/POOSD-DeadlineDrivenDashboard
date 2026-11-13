/// Calendar page (month view). Mirrors pages/calendar/CalendarPage.tsx and MonthGrid.tsx, but on real API data.
/// The web grid scrolls sideways on a phone; here each day shows markers and tapping it lists that day below the grid.
library;

import 'package:flutter/material.dart';

import 'model.dart';
import 'shell.dart';
import 'ui.dart';

const _weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/// A day shows this many markers; the rest fold into "+N".
const _maxMarkers = 3;

Color _chipColor(MilestoneStatus s) => statusColor(s);

Color _chipTint(MilestoneStatus s) => switch (s) {
  MilestoneStatus.completed => Ink2.completeTint,
  MilestoneStatus.atRisk => Ink2.riskTint,
  MilestoneStatus.onTrack => Ink2.onTrackTint,
};

class CalendarPage extends StatefulWidget {
  const CalendarPage(this.ctx, {super.key});
  final PageCtx ctx;
  @override
  State<CalendarPage> createState() => _CalendarPageState();
}

class _CalendarPageState extends State<CalendarPage> {
  final today = startOfDay(DateTime.now());
  late DateTime month = DateTime(today.year, today.month);
  late DateTime selected = today;

  /// Jump to the day the new task lands on so it's visible right away.
  Future<void> _newTask() async {
    final day = await widget.ctx.openNewTask();
    if (day == null || !mounted) return;
    setState(() {
      selected = startOfDay(day);
      month = DateTime(day.year, day.month);
    });
  }

  void _changeMonth(int by) => setState(() => month = DateTime(month.year, month.month + by));

  void _goToday() => setState(() {
    month = DateTime(today.year, today.month);
    selected = today;
  });

  @override
  Widget build(BuildContext context) {
    final ctx = widget.ctx;
    final data = ctx.data;
    final query = ctx.search.trim().toLowerCase();
    final events = toCalendarEvents(
      data.tasks,
      data.summary?.milestones ?? [],
      data.titles,
      today,
    ).where((e) => query.isEmpty || [e.title, e.project].any((s) => s.toLowerCase().contains(query))).toList();

    // Milestones first, then tasks, in API order within each group.
    final byDate = <String, List<CalendarEvent>>{};
    for (final e in [...events.where((e) => !e.isTask), ...events.where((e) => e.isTask)]) {
      byDate.putIfAbsent(e.date, () => []).add(e);
    }

    return Gap(24, [
      PageHeader(
        ctx,
        title: 'Calendar',
        subtitle: longDateLabel(today),
        action: PillButton('New task', ink: true, icon: const AppIcon('plus-on-ink'), onPressed: _newTask),
      ),
      Panel(
        child: Gap(18, [
          _toolbar(),
          const CalendarKey(),
          _grid(ctx.settings.get<String>('weekStartsOn'), byDate),
          const SubtleDivider(),
          _dayList(byDate[toDateKey(selected)] ?? []),
        ]),
      ),
      _nextDeadlines(ctx, events),
    ]);
  }

  Widget _toolbar() => Wrap(
    spacing: 12,
    runSpacing: 12,
    crossAxisAlignment: WrapCrossAlignment.center,
    children: [
      Text(monthYearLabel(month), style: T.heading),
      Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircleIconButton(
            size: 34,
            tooltip: 'Previous month',
            onPressed: () => _changeMonth(-1),
            child: const AppIcon('chevron-left', size: 18),
          ),
          const SizedBox(width: 6),
          CircleIconButton(
            size: 34,
            tooltip: 'Next month',
            onPressed: () => _changeMonth(1),
            child: const AppIcon('chevron-right', size: 18),
          ),
          const SizedBox(width: 12),
          PillButton('Today', onPressed: _goToday, padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 5)),
        ],
      ),
    ],
  );

  /// Six-week grid. Each day shows its date and a marker per item: a status-colored bar for a milestone, a grey dot for an open task.
  Widget _grid(String weekStartsOn, Map<String, List<CalendarEvent>> byDate) {
    final days = calendarGridDays(month, weekStartsOn);
    final weekdays = weekStartsOn == 'Monday' ? [..._weekdays.skip(1), _weekdays.first] : _weekdays;
    final todayKey = toDateKey(today);
    final selectedKey = toDateKey(selected);

    return Container(
      decoration: BoxDecoration(
        border: Border.all(color: Ink2.line),
        borderRadius: BorderRadius.circular(15),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        children: [
          Row(
            children: [
              for (final d in weekdays)
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(vertical: 8),
                    child: Text(d, style: T.muted(T.captionBold).copyWith(fontSize: 12), textAlign: TextAlign.center),
                  ),
                ),
            ],
          ),
          for (var week = 0; week < 6; week++)
            Row(
              children: [
                for (var i = week * 7; i < week * 7 + 7; i++)
                  Expanded(
                    child: _DayCell(
                      day: days[i],
                      inMonth: days[i].month == month.month,
                      isToday: toDateKey(days[i]) == todayKey,
                      isPast: toDateKey(days[i]).compareTo(todayKey) < 0,
                      isSelected: toDateKey(days[i]) == selectedKey,
                      lastColumn: i % 7 == 6,
                      events: byDate[toDateKey(days[i])] ?? const [],
                      onTap: () => setState(() {
                        selected = days[i];
                        if (days[i].month != month.month) month = DateTime(days[i].year, days[i].month);
                      }),
                    ),
                  ),
              ],
            ),
        ],
      ),
    );
  }

  /// The selected day: its milestones, its open tasks, then how many tasks are done.
  Widget _dayList(List<CalendarEvent> items) {
    final open = items.where((e) => !e.isDoneTask).toList();
    final done = items.where((e) => e.isDoneTask).toList();
    final key = toDateKey(selected);
    return Gap(10, [
      Text(key == toDateKey(today) ? 'Today · ${todayLabel(selected)}' : todayLabel(selected), style: T.title),
      if (items.isEmpty) Text('Nothing due this day.', style: T.muted(T.body)),
      for (final e in open) e.isTask ? _TaskItem(e) : _MilestoneChip(e.title, e.status!),
      if (done.isNotEmpty)
        Row(
          children: [
            const Icon(Icons.check_rounded, size: 14, color: Ink2.complete),
            const SizedBox(width: 4),
            Expanded(
              child: Text(
                '${done.length} done · ${done.map((e) => e.title).join(', ')}',
                style: T.captionBold.copyWith(color: Ink2.secondary),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
    ]);
  }

  /// The next three unfinished milestones from today on.
  Widget _nextDeadlines(PageCtx ctx, List<CalendarEvent> events) {
    final todayKey = toDateKey(today);
    final upcoming = events.where((e) => !e.isTask && e.status != MilestoneStatus.completed && e.date.compareTo(todayKey) >= 0).toList()
      ..sort((a, b) => a.date.compareTo(b.date));
    return Panel(
      child: Gap(16, [
        CardHeader('Next deadlines', trailing: LinkText('Open task list', onTap: () => ctx.navigate(AppPage.tasks))),
        if (upcoming.isEmpty) Text('Nothing due soon.', style: T.muted(T.body)),
        for (final m in upcoming.take(3))
          () {
            final parts = m.date.split('-').map(int.parse).toList();
            final due = DateTime(parts[0], parts[1], parts[2]);
            final days = (due.difference(today).inHours / 24).round();
            return Row(
              children: [
                DateCircle(monthAbbrevOf(due), due.day, large: true),
                const SizedBox(width: 14),
                Expanded(
                  child: Gap(2, [
                    Text(m.title, style: T.title, overflow: TextOverflow.ellipsis),
                    Text('${m.project} · ${dueLabel(days)}', style: T.muted(T.caption), overflow: TextOverflow.ellipsis),
                  ]),
                ),
              ],
            );
          }(),
      ]),
    );
  }
}

class _DayCell extends StatelessWidget {
  const _DayCell({
    required this.day,
    required this.inMonth,
    required this.isToday,
    required this.isPast,
    required this.isSelected,
    required this.lastColumn,
    required this.events,
    required this.onTap,
  });
  final DateTime day;
  final bool inMonth;
  final bool isToday;
  final bool isPast;
  final bool isSelected;
  final bool lastColumn;
  final List<CalendarEvent> events;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final open = events.where((e) => !e.isDoneTask).toList();
    final doneCount = events.length - open.length;
    final shown = open.take(_maxMarkers).toList();
    final more = open.length - shown.length;

    return Semantics(
      button: true,
      selected: isSelected,
      label: '${todayLabel(day)}, ${plural(open.length, 'item')}${doneCount > 0 ? ', $doneCount done' : ''}',
      child: GestureDetector(
        onTap: onTap,
        behavior: HitTestBehavior.opaque,
        child: Container(
          height: 66,
          padding: const EdgeInsets.only(top: 5),
          decoration: BoxDecoration(
            color: isSelected && !isToday ? Ink2.onTrackTint : (inMonth ? Ink2.bg : Ink2.surfaceMuted),
            border: Border(
              top: const BorderSide(color: Ink2.line),
              right: lastColumn ? BorderSide.none : const BorderSide(color: Ink2.line),
            ),
          ),
          foregroundDecoration: isToday ? BoxDecoration(border: Border.all(color: Ink2.ink, width: 2)) : null,
          child: Column(
            children: [
              // Today's date sits in a black pill.
              Container(
                width: 26,
                height: 26,
                alignment: Alignment.center,
                decoration: isToday ? const BoxDecoration(color: Ink2.ink, shape: BoxShape.circle) : null,
                child: Text(
                  '${day.day}',
                  style: T.captionBold.copyWith(color: isToday ? Ink2.bg : (inMonth && !isPast ? Ink2.ink : Ink2.muted)),
                ),
              ),
              const SizedBox(height: 4),
              // Days before today step back so this week and what's next stand out.
              Opacity(
                opacity: isPast ? 0.6 : 1,
                child: Gap(3, cross: CrossAxisAlignment.center, [
                  Wrap(
                    alignment: WrapAlignment.center,
                    spacing: 3,
                    runSpacing: 3,
                    children: [
                      for (final e in shown)
                        e.isTask
                            ? Container(
                                width: 6,
                                height: 6,
                                decoration: const BoxDecoration(color: Ink2.muted, shape: BoxShape.circle),
                              )
                            : Container(
                                width: 14,
                                height: 6,
                                decoration: BoxDecoration(color: _chipColor(e.status!), borderRadius: BorderRadius.circular(3)),
                              ),
                    ],
                  ),
                  if (more > 0) Text('+$more', style: T.captionBold.copyWith(fontSize: 10, color: Ink2.secondary, height: 1)),
                  if (more == 0 && doneCount > 0) const Icon(Icons.check_rounded, size: 11, color: Ink2.complete),
                ]),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// A milestone: a chip with a status-colored bar and tint. At risk is also outlined; completed is crossed off.
class _MilestoneChip extends StatelessWidget {
  const _MilestoneChip(this.title, this.status, {this.small = false});
  final String title;
  final MilestoneStatus status;
  final bool small;
  @override
  Widget build(BuildContext context) {
    final color = _chipColor(status);
    final at = status == MilestoneStatus.atRisk;
    final side = BorderSide(color: at ? color : Colors.transparent, width: 1.5);
    return Container(
      padding: EdgeInsets.symmetric(horizontal: 6, vertical: small ? 0 : 3),
      decoration: BoxDecoration(
        color: _chipTint(status),
        borderRadius: BorderRadius.circular(5),
        border: Border(
          left: BorderSide(color: color, width: 3),
          top: side,
          right: side,
          bottom: side,
        ),
      ),
      child: Text(
        title,
        maxLines: 2,
        overflow: TextOverflow.ellipsis,
        style: T.captionBold.copyWith(
          fontSize: small ? 12 : 13,
          decoration: status == MilestoneStatus.completed ? TextDecoration.lineThrough : null,
          decorationColor: Ink2.muted,
          decorationThickness: 1.5,
        ),
      ),
    );
  }
}

/// A task: plain text with a grey dot and its milestone.
class _TaskItem extends StatelessWidget {
  const _TaskItem(this.e);
  final CalendarEvent e;
  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Container(
        width: 6,
        height: 6,
        margin: const EdgeInsets.only(top: 7, left: 2, right: 8),
        decoration: const BoxDecoration(color: Ink2.muted, shape: BoxShape.circle),
      ),
      Expanded(
        child: Text.rich(
          TextSpan(
            children: [
              TextSpan(text: e.title, style: T.body),
              TextSpan(text: '  ${e.project}', style: T.muted(T.caption)),
            ],
          ),
        ),
      ),
    ],
  );
}

/// The key above the grid: what a task looks like, and a sample chip for each milestone status.
class CalendarKey extends StatelessWidget {
  const CalendarKey({super.key});
  @override
  Widget build(BuildContext context) => Wrap(
    spacing: 16,
    runSpacing: 8,
    crossAxisAlignment: WrapCrossAlignment.center,
    children: [
      Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 6,
            height: 6,
            decoration: const BoxDecoration(color: Ink2.muted, shape: BoxShape.circle),
          ),
          const SizedBox(width: 6),
          Text('Task', style: T.muted(T.captionBold)),
        ],
      ),
      Wrap(
        spacing: 6,
        runSpacing: 6,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: [
          Text('Milestone', style: T.muted(T.captionBold)),
          for (final s in const [MilestoneStatus.onTrack, MilestoneStatus.atRisk, MilestoneStatus.completed])
            _MilestoneChip(s.label, s, small: true),
        ],
      ),
    ],
  );
}
