/// The signed-in app: top nav, page header (mascot, search, bell), and the New task / New milestone dialogs.
/// Mirrors AuthenticatedApp in App.tsx plus components/TopNav, PageHeader, SearchPill, NotificationsMenu.
library;

import 'package:flutter/material.dart';

import 'api.dart';
import 'calendar_page.dart';
import 'model.dart';
import 'pages.dart';
import 'state.dart';
import 'ui.dart';

enum AppPage { dashboard, milestones, tasks, focus, calendar, settings }

const pageNames = {
  AppPage.dashboard: 'Dashboard',
  AppPage.milestones: 'Milestones',
  AppPage.tasks: 'Tasks',
  AppPage.focus: 'Focus timer',
  AppPage.calendar: 'Calendar',
  AppPage.settings: 'Settings',
};

/// Everything a page needs from the shell.
class PageCtx {
  PageCtx(this.shell);
  final SignedInShellState shell;

  ApiUser get user => shell.widget.user;
  DashboardData get data => shell.data;
  FocusTimerController get timer => shell.timer;
  UserSettings get settings => shell.settings;
  String get search => shell.search;
  void setSearch(String v) => shell.setSearch(v);
  void navigate(AppPage p) => shell.navigate(p);
  void notify(String message) => showToast(shell.context, message);

  /// Opens New task. Completes with the day the task landed on (its due date, or today), or null if cancelled.
  Future<DateTime?> openNewTask() => shell.openNewTask();
  Future<void> saveSettings(UserSettings s) => shell.saveSettings(s);

  /// The first open task: what the focus timer says you're working on.
  UiTask? get currentTask => data.uiTasks.where((t) => !t.done).firstOrNull;
}

class SignedInShell extends StatefulWidget {
  const SignedInShell({super.key, required this.user, required this.settings, required this.onLogout, required this.onSessionExpired});
  final ApiUser user;
  final UserSettings settings;
  final VoidCallback onLogout;
  final VoidCallback onSessionExpired;

  @override
  State<SignedInShell> createState() => SignedInShellState();
}

class SignedInShellState extends State<SignedInShell> {
  AppPage page = AppPage.dashboard;
  bool navOpen = false;
  String search = '';
  final dismissed = <String>{};
  bool hasUnread = true;

  late final DashboardData data = DashboardData(widget.onSessionExpired);
  late UserSettings settings = widget.settings;
  late final FocusTimerController timer = FocusTimerController(data, settings);
  final _scroll = ScrollController();

  @override
  void initState() {
    super.initState();
    data.addListener(_changed);
    data.refresh().then((_) => timer.reload());
  }

  @override
  void dispose() {
    data.removeListener(_changed);
    data.dispose();
    timer.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _changed() => setState(() {});

  /// Built here so the bell on every page shows the same list.
  List<AppNotification> get notifications =>
      buildNotifications(data.deadlines, data.uiMilestones).where((n) => !dismissed.contains(n.id)).toList();

  void setSearch(String v) => setState(() => search = v);
  void markNotificationsRead() => setState(() => hasUnread = false);
  void dismissNotification(String id) => setState(() => dismissed.add(id));

  void navigate(AppPage p) {
    setState(() {
      page = p;
      navOpen = false;
    });
    if (_scroll.hasClients) _scroll.jumpTo(0);
  }

  Future<void> saveSettings(UserSettings s) async {
    setState(() => settings = s);
    timer.updateSettings(s);
    await s.save(widget.user);
    if (mounted) showToast(context, 'Settings saved');
  }

  Future<DateTime?> openNewTask() async {
    final added = await showPanelDialog<(String, DateTime?)>(
      context,
      (ctx) => NewTaskForm(milestones: data.milestones, onCreate: data.createTask),
    );
    if (added == null || !mounted) return null;
    final (title, due) = added;
    showToast(context, due == null ? 'Added “$title” to today’s tasks' : 'Added “$title” to ${formatShortDate(dateToIso(due))}');
    return due ?? DateTime.now();
  }

  Widget _content() {
    final ctx = PageCtx(this);
    return switch (page) {
      AppPage.dashboard => DashboardPage(ctx),
      AppPage.milestones => MilestonesPage(ctx),
      AppPage.tasks => TasksPage(ctx),
      AppPage.focus => FocusPage(ctx),
      AppPage.settings => SettingsPage(ctx),
      AppPage.calendar => CalendarPage(ctx),
    };
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      // Android back: go to the dashboard first, then leave the app.
      canPop: page == AppPage.dashboard && !navOpen,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) navOpen ? setState(() => navOpen = false) : navigate(AppPage.dashboard);
      },
      child: Scaffold(
        body: SafeArea(
          child: Column(
            children: [
              _topNav(),
              Expanded(
                child: RefreshIndicator(
                  color: Ink2.ink,
                  onRefresh: () async {
                    await data.refresh();
                    await timer.reload();
                  },
                  child: ListView(
                    controller: _scroll,
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(16, 20, 16, 32),
                    children: [_content()],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// TopNav as Bootstrap shows it on a phone: wordmark + round toggler that opens the page links and Log out.
  Widget _topNav() => Container(
    padding: const EdgeInsets.fromLTRB(16, 10, 16, 10),
    decoration: BoxDecoration(
      color: Ink2.bg,
      border: navOpen ? const Border(bottom: BorderSide(color: Ink2.line)) : null,
    ),
    child: AnimatedSize(
      duration: const Duration(milliseconds: 200),
      alignment: Alignment.topCenter,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              GestureDetector(
                onTap: () => navigate(AppPage.dashboard),
                child: const Text('Erm Actually', style: T.wordmark),
              ),
              const Spacer(),
              Material(
                color: Ink2.bg,
                shape: const StadiumBorder(side: BorderSide(color: Ink2.ink, width: 2)),
                child: InkWell(
                  customBorder: const StadiumBorder(),
                  onTap: () => setState(() => navOpen = !navOpen),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                    child: Icon(navOpen ? Icons.close_rounded : Icons.menu_rounded, size: 26, semanticLabel: 'Menu'),
                  ),
                ),
              ),
            ],
          ),
          if (navOpen) ...[
            const SizedBox(height: 12),
            for (final p in AppPage.values)
              InkWell(
                onTap: () => navigate(p),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 9),
                  child: Text(
                    pageNames[p]!,
                    style: T.body.copyWith(
                      fontSize: 18,
                      fontWeight: p == page ? FontWeight.w800 : FontWeight.w600,
                      decoration: p == page ? TextDecoration.underline : null,
                      decorationThickness: 2,
                    ),
                  ),
                ),
              ),
            const SizedBox(height: 10),
            PillButton('Log out', onPressed: widget.onLogout, padding: const EdgeInsets.symmetric(horizontal: 26, vertical: 9)),
            const SizedBox(height: 6),
          ],
        ],
      ),
    ),
  );
}

// ---------------- page header ----------------

/// Mascot + title block with search, the bell and a primary button underneath (wraps like the web header on a phone).
class PageHeader extends StatelessWidget {
  const PageHeader(this.ctx, {super.key, required this.title, required this.subtitle, required this.action, this.onSearchSubmit});
  final PageCtx ctx;
  final String title;
  final String subtitle;
  final Widget action;

  /// Enter in the search box. Leave out when results filter live on the same page.
  final VoidCallback? onSearchSubmit;

  @override
  Widget build(BuildContext context) => Gap(20, [
    Wrap(
      spacing: 24,
      runSpacing: 12,
      crossAxisAlignment: WrapCrossAlignment.center,
      children: [
        const Mascot(width: 168),
        Gap(6, [Text(title, style: T.display), Text(subtitle, style: T.lead)], cross: CrossAxisAlignment.start),
      ],
    ),
    SearchPill(value: ctx.search, onChanged: ctx.setSearch, onSubmitted: onSearchSubmit),
    Row(
      children: [
        NotificationsButton(ctx.shell),
        const SizedBox(width: 12),
        Expanded(
          child: Align(alignment: Alignment.centerLeft, child: action),
        ),
      ],
    ),
  ]);
}

class SearchPill extends StatefulWidget {
  const SearchPill({super.key, required this.value, required this.onChanged, this.onSubmitted});
  final String value;
  final ValueChanged<String> onChanged;
  final VoidCallback? onSubmitted;
  @override
  State<SearchPill> createState() => _SearchPillState();
}

class _SearchPillState extends State<SearchPill> {
  late final _controller = TextEditingController(text: widget.value);

  @override
  void didUpdateWidget(SearchPill old) {
    super.didUpdateWidget(old);
    if (widget.value != _controller.text) _controller.text = widget.value;
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => TextField(
    controller: _controller,
    onChanged: widget.onChanged,
    onSubmitted: (_) => widget.onSubmitted?.call(),
    textInputAction: TextInputAction.search,
    style: T.body,
    decoration: InputDecoration(
      hintText: 'Search tasks and milestones',
      hintStyle: T.muted(T.body),
      isDense: true,
      prefixIcon: const Padding(padding: EdgeInsets.only(left: 16, right: 10), child: AppIcon('search')),
      prefixIconConstraints: const BoxConstraints(minWidth: 0, minHeight: 0),
      suffixIcon: widget.value.isEmpty
          ? null
          : IconButton(
              icon: const Icon(Icons.close_rounded, size: 18),
              onPressed: () {
                _controller.clear();
                widget.onChanged('');
              },
            ),
      contentPadding: const EdgeInsets.symmetric(vertical: 14),
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(999),
        borderSide: const BorderSide(color: Ink2.ink, width: 2),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(999),
        borderSide: const BorderSide(color: Ink2.onTrack, width: 2),
      ),
    ),
  );
}

/// The bell. Opens the notification list; each item can be cleared.
class NotificationsButton extends StatelessWidget {
  const NotificationsButton(this.shell, {super.key});
  final SignedInShellState shell;

  @override
  Widget build(BuildContext context) {
    final items = shell.notifications;
    return CircleIconButton(
      tooltip: 'Notifications',
      dot: shell.hasUnread && items.isNotEmpty,
      onPressed: () {
        shell.markNotificationsRead();
        showModalBottomSheet<void>(
          context: context,
          backgroundColor: Ink2.bg,
          shape: const RoundedRectangleBorder(
            borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
            side: BorderSide(color: Ink2.ink, width: 2),
          ),
          builder: (_) => StatefulBuilder(
            builder: (ctx, setSheet) {
              final list = shell.notifications;
              return SafeArea(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 20, 12, 12),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text('NOTIFICATIONS', style: T.overline),
                      const SizedBox(height: 8),
                      if (list.isEmpty)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          child: Text("You're all caught up", style: T.muted(T.body)),
                        ),
                      for (final n in list)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 8),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Expanded(
                                child: Gap(2, [Text(n.text, style: T.bodyBold), Text(n.time, style: T.muted(T.caption))]),
                              ),
                              IconButton(
                                tooltip: 'Clear',
                                icon: const Icon(Icons.close_rounded, size: 18, color: Ink2.secondary),
                                onPressed: () {
                                  shell.dismissNotification(n.id);
                                  setSheet(() {});
                                },
                              ),
                            ],
                          ),
                        ),
                    ],
                  ),
                ),
              );
            },
          ),
        );
      },
      child: const AppIcon('bell'),
    );
  }
}

// ---------------- dialogs ----------------

const _newMilestoneChoice = '__new__';

Widget _dialogHeader(BuildContext context, String title) => Row(
  children: [
    Expanded(child: Text(title, style: T.heading)),
    IconButton(icon: const Icon(Icons.close_rounded), onPressed: () => Navigator.pop(context)),
  ],
);

/// Date picker field ("DUE DATE (OPTIONAL)").
class DueDateField extends StatelessWidget {
  const DueDateField({super.key, required this.value, required this.onChanged});
  final DateTime? value;
  final ValueChanged<DateTime?> onChanged;
  @override
  Widget build(BuildContext context) => Material(
    color: Ink2.bg,
    shape: const StadiumBorder(side: BorderSide(color: Ink2.ink, width: 2)),
    child: InkWell(
      customBorder: const StadiumBorder(),
      onTap: () async {
        final now = DateTime.now();
        final picked = await showDatePicker(
          context: context,
          initialDate: value ?? now,
          firstDate: DateTime(now.year - 1),
          lastDate: DateTime(now.year + 5),
        );
        if (picked != null) onChanged(picked);
      },
      child: Padding(
        padding: const EdgeInsets.fromLTRB(18, 6, 6, 6),
        child: Row(
          children: [
            Expanded(
              child: Text(
                value == null ? 'mm/dd/yyyy' : '${value!.month}/${value!.day}/${value!.year}',
                style: value == null ? T.muted(T.body) : T.body,
              ),
            ),
            IconButton(
              visualDensity: VisualDensity.compact,
              icon: Icon(value == null ? Icons.calendar_today_outlined : Icons.close_rounded, size: 18),
              onPressed: value == null ? null : () => onChanged(null),
            ),
          ],
        ),
      ),
    ),
  );
}

/// NewTaskModal: pops with the task title once it is saved.
class NewTaskForm extends StatefulWidget {
  const NewTaskForm({super.key, required this.milestones, required this.onCreate});
  final List<ApiMilestone> milestones;
  final Future<void> Function({required String title, String? milestoneId, String newMilestoneTitle, String? dueAt}) onCreate;
  @override
  State<NewTaskForm> createState() => _NewTaskFormState();
}

class _NewTaskFormState extends State<NewTaskForm> {
  final _label = TextEditingController();
  final _newMilestone = TextEditingController();
  late String _choice = widget.milestones.isEmpty ? _newMilestoneChoice : widget.milestones.first.id;
  DateTime? _due;
  String _error = '';
  bool _saving = false;

  bool get _creatingMilestone => _choice == _newMilestoneChoice;
  bool get _canSubmit => _label.text.trim().isNotEmpty && (!_creatingMilestone || _newMilestone.text.trim().isNotEmpty) && !_saving;

  @override
  void initState() {
    super.initState();
    _label.addListener(() => setState(() {}));
    _newMilestone.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _label.dispose();
    _newMilestone.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_canSubmit) return;
    setState(() {
      _saving = true;
      _error = '';
    });
    final title = _label.text.trim();
    try {
      await widget.onCreate(
        title: title,
        milestoneId: _creatingMilestone ? null : _choice,
        newMilestoneTitle: _newMilestone.text.trim(),
        dueAt: _due == null ? null : dateToIso(_due!),
      );
      if (mounted) Navigator.pop(context, (title, _due));
    } catch (e) {
      setState(() {
        _error = errorText(e);
        _saving = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    child: Gap(16, [
      _dialogHeader(context, 'New task'),
      if (_error.isNotEmpty) ErrorText(_error),
      Labeled('TASK', PillField(controller: _label, hint: 'e.g. Summarize 4 sources', maxLength: 120), overline: true),
      Labeled(
        'MILESTONE',
        PillDropdown<String>(
          value: _choice,
          items: {for (final m in widget.milestones) m.id: m.title, _newMilestoneChoice: '＋ New milestone…'},
          onChanged: (v) => setState(() => _choice = v),
        ),
        overline: true,
      ),
      if (_creatingMilestone)
        Labeled('MILESTONE NAME', PillField(controller: _newMilestone, hint: 'e.g. Literature review', maxLength: 120), overline: true),
      Labeled('DUE DATE (OPTIONAL)', DueDateField(value: _due, onChanged: (d) => setState(() => _due = d)), overline: true),
      Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          PillButton(
            'Cancel',
            onPressed: _saving ? null : () => Navigator.pop(context),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 9),
          ),
          const SizedBox(width: 8),
          PillButton(
            'Add task',
            ink: true,
            loading: _saving,
            onPressed: _canSubmit ? _submit : null,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 9),
          ),
        ],
      ),
    ]),
  );
}

/// NewMilestoneModal: pops with the milestone title once it is saved.
class NewMilestoneForm extends StatefulWidget {
  const NewMilestoneForm({super.key, required this.onCreate});
  final Future<void> Function(String title, String? dueAt) onCreate;
  @override
  State<NewMilestoneForm> createState() => _NewMilestoneFormState();
}

class _NewMilestoneFormState extends State<NewMilestoneForm> {
  final _title = TextEditingController();
  DateTime? _due;
  String _error = '';
  bool _saving = false;

  @override
  void initState() {
    super.initState();
    _title.addListener(() => setState(() {}));
  }

  @override
  void dispose() {
    _title.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final title = _title.text.trim();
    if (title.isEmpty || _saving) return;
    setState(() {
      _saving = true;
      _error = '';
    });
    try {
      await widget.onCreate(title, _due == null ? null : dateToIso(_due!));
      if (mounted) Navigator.pop(context, title);
    } catch (e) {
      setState(() {
        _error = errorText(e);
        _saving = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    child: Gap(16, [
      _dialogHeader(context, 'New milestone'),
      if (_error.isNotEmpty) ErrorText(_error),
      Labeled('MILESTONE', PillField(controller: _title, hint: 'e.g. Literature review', maxLength: 120), overline: true),
      Labeled('DUE DATE (OPTIONAL)', DueDateField(value: _due, onChanged: (d) => setState(() => _due = d)), overline: true),
      Row(
        mainAxisAlignment: MainAxisAlignment.end,
        children: [
          PillButton(
            'Cancel',
            onPressed: _saving ? null : () => Navigator.pop(context),
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 9),
          ),
          const SizedBox(width: 8),
          PillButton(
            'Add milestone',
            ink: true,
            loading: _saving,
            onPressed: _title.text.trim().isEmpty ? null : _submit,
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 9),
          ),
        ],
      ),
    ]),
  );
}

/// `.form-select-ea` / `.field-select`: dropdown inside an outlined box.
class PillDropdown<V> extends StatelessWidget {
  const PillDropdown({
    super.key,
    required this.value,
    required this.items,
    required this.onChanged,
    this.enabled = true,
    this.radius = 999,
  });
  final V value;
  final Map<V, String> items;
  final ValueChanged<V> onChanged;
  final bool enabled;
  final double radius;
  @override
  Widget build(BuildContext context) => Opacity(
    opacity: enabled ? 1 : 0.45,
    child: Container(
      height: 48,
      padding: const EdgeInsets.only(left: 18, right: 12),
      decoration: BoxDecoration(
        border: Border.all(color: Ink2.ink, width: 2),
        borderRadius: BorderRadius.circular(radius),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<V>(
          value: value,
          isExpanded: true,
          style: T.body,
          borderRadius: BorderRadius.circular(16),
          dropdownColor: Ink2.bg,
          icon: const AppIcon('chevron-down', size: 18),
          items: [
            for (final e in items.entries)
              DropdownMenuItem(
                value: e.key,
                child: Text(e.value, overflow: TextOverflow.ellipsis),
              ),
          ],
          onChanged: enabled ? (v) => v == null ? null : onChanged(v) : null,
        ),
      ),
    ),
  );
}
