/// Design system: the Figma tokens from styles/theme.css as Flutter widgets
/// (black ink on white, Nunito, 2px outlines, pill shapes).
library;

import 'dart:math' as math;

import 'package:flutter/material.dart';

import 'model.dart';

// ---------------- tokens ----------------

class Ink2 {
  static const ink = Color(0xFF000000);
  static const bg = Color(0xFFFFFFFF);
  static const secondary = Color(0xFF5C5C5C);
  static const line = Color(0xFFE5E5E5);
  static const link = Color(0xFF3C51FF);
  static const risk = Color(0xFFDC2626);
  static const onTrack = Color(0xFF0D99FF);
  static const complete = Color(0xFF16A34A);
  static const warning = Color(0xFFD97706);
}

class T {
  static const _f = 'Nunito';
  static const wordmark = TextStyle(fontFamily: _f, fontSize: 22, fontWeight: FontWeight.w900, color: Ink2.ink);
  static const display = TextStyle(fontFamily: _f, fontSize: 30, fontWeight: FontWeight.w900, height: 1.1, color: Ink2.ink);
  static const lead = TextStyle(fontFamily: _f, fontSize: 17, fontWeight: FontWeight.w600, color: Ink2.secondary);
  static const heading = TextStyle(fontFamily: _f, fontSize: 24, fontWeight: FontWeight.w900, height: 1.2, color: Ink2.ink);
  static const stat = TextStyle(fontFamily: _f, fontSize: 36, fontWeight: FontWeight.w900, height: 1.1, color: Ink2.ink);
  static const title = TextStyle(fontFamily: _f, fontSize: 16, fontWeight: FontWeight.w800, color: Ink2.ink);
  static const body = TextStyle(fontFamily: _f, fontSize: 15, fontWeight: FontWeight.w600, color: Ink2.ink);
  static const bodyBold = TextStyle(fontFamily: _f, fontSize: 15, fontWeight: FontWeight.w800, color: Ink2.ink);
  static const caption = TextStyle(fontFamily: _f, fontSize: 13, fontWeight: FontWeight.w600, color: Ink2.ink);
  static const captionBold = TextStyle(fontFamily: _f, fontSize: 13, fontWeight: FontWeight.w800, color: Ink2.ink);
  static const overline = TextStyle(fontFamily: _f, fontSize: 12, fontWeight: FontWeight.w800, letterSpacing: 0.96, color: Ink2.secondary);

  static TextStyle muted(TextStyle s) => s.copyWith(color: Ink2.secondary);
}

ThemeData buildTheme() => ThemeData(
  useMaterial3: true,
  fontFamily: 'Nunito',
  scaffoldBackgroundColor: Ink2.bg,
  colorScheme: const ColorScheme.light(primary: Ink2.ink, onPrimary: Ink2.bg, surface: Ink2.bg, onSurface: Ink2.ink, error: Ink2.risk),
  textTheme: const TextTheme(bodyMedium: T.body),
  textSelectionTheme: const TextSelectionThemeData(cursorColor: Ink2.ink),
  progressIndicatorTheme: const ProgressIndicatorThemeData(color: Ink2.ink),
);

const _outline = BorderSide(color: Ink2.ink, width: 2);
const gap = SizedBox(height: 16);

// ---------------- assets ----------------

class AppIcon extends StatelessWidget {
  const AppIcon(this.name, {super.key, this.size = 20});
  final String name;
  final double size;
  @override
  Widget build(BuildContext context) => Image.asset('assets/icons/$name.png', width: size, height: size);
}

class Mascot extends StatelessWidget {
  const Mascot({super.key, this.width = 210});
  final double width;
  @override
  Widget build(BuildContext context) =>
      Image.asset('assets/images/mascot.png', width: width, semanticLabel: 'Erm Actually cat mascot', fit: BoxFit.contain);
}

// ---------------- surfaces ----------------

/// `.panel`: white card, 2px ink outline, 28px corners.
class Panel extends StatelessWidget {
  const Panel({super.key, required this.child, this.padding = const EdgeInsets.fromLTRB(16, 22, 16, 22)});
  final Widget child;
  final EdgeInsets padding;
  @override
  Widget build(BuildContext context) => Container(
    width: double.infinity,
    padding: padding,
    decoration: BoxDecoration(color: Ink2.bg, border: Border.fromBorderSide(_outline), borderRadius: BorderRadius.circular(28)),
    child: child,
  );
}

/// Column with a fixed gap between children.
class Gap extends StatelessWidget {
  const Gap(this.space, this.children, {super.key, this.cross = CrossAxisAlignment.stretch});
  final double space;
  final List<Widget> children;
  final CrossAxisAlignment cross;
  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: cross,
    mainAxisSize: MainAxisSize.min,
    children: [
      for (var i = 0; i < children.length; i++) ...[if (i > 0) SizedBox(height: space), children[i]],
    ],
  );
}

class SubtleDivider extends StatelessWidget {
  const SubtleDivider({super.key});
  @override
  Widget build(BuildContext context) => const Divider(height: 1, thickness: 1, color: Ink2.line);
}

/// Panel header: heading on the left, something on the right.
class CardHeader extends StatelessWidget {
  const CardHeader(this.title, {super.key, this.trailing, this.leadingExtra});
  final String title;
  final Widget? trailing;
  final Widget? leadingExtra;
  @override
  Widget build(BuildContext context) => Row(
    children: [
      Flexible(child: Text(title, style: T.heading)),
      if (leadingExtra != null) ...[const SizedBox(width: 10), leadingExtra!],
      const Spacer(),
      ?trailing,
    ],
  );
}

/// Label on the left, bold value on the right (the `<dl>` rows).
class InfoRow extends StatelessWidget {
  const InfoRow(this.label, this.value, {super.key});
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) => Row(
    children: [
      Text(label, style: T.muted(T.body)),
      const SizedBox(width: 12),
      Expanded(
        child: Text(value, style: T.bodyBold, textAlign: TextAlign.right),
      ),
    ],
  );
}

// ---------------- buttons & pills ----------------

/// `.btn-pill` (outline) and `.btn-pill-ink` (filled black).
class PillButton extends StatelessWidget {
  const PillButton(
    this.label, {
    super.key,
    required this.onPressed,
    this.ink = false,
    this.icon,
    this.loading = false,
    this.expand = false,
    this.padding,
  });
  final String label;
  final VoidCallback? onPressed;
  final bool ink;
  final Widget? icon;
  final bool loading;
  final bool expand;
  final EdgeInsets? padding;

  @override
  Widget build(BuildContext context) {
    final fg = ink ? Ink2.bg : Ink2.ink;
    final disabled = onPressed == null || loading;
    final content = Row(
      mainAxisSize: expand ? MainAxisSize.max : MainAxisSize.min,
      mainAxisAlignment: MainAxisAlignment.center,
      children: loading
          ? [SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2.5, color: fg))]
          : [
              if (icon != null) ...[icon!, const SizedBox(width: 8)],
              Text(label, style: T.bodyBold.copyWith(fontSize: 16, color: fg)),
            ],
    );
    return Opacity(
      opacity: onPressed == null ? 0.4 : 1,
      child: Material(
        color: ink ? Ink2.ink : Ink2.bg,
        shape: const StadiumBorder(side: _outline),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: disabled ? null : onPressed,
          child: Padding(padding: padding ?? const EdgeInsets.symmetric(horizontal: 22, vertical: 12), child: content),
        ),
      ),
    );
  }
}

/// Underlined blue text button (`.link-ea`).
class LinkText extends StatelessWidget {
  const LinkText(this.label, {super.key, required this.onTap, this.style = T.bodyBold});
  final String label;
  final VoidCallback onTap;
  final TextStyle style;
  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    behavior: HitTestBehavior.opaque,
    child: Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Text(
        label,
        style: style.copyWith(color: Ink2.link, decoration: TextDecoration.underline, decorationColor: Ink2.link),
      ),
    ),
  );
}

/// Round outlined icon button (`.icon-btn`), with the red unread dot for the bell.
class CircleIconButton extends StatelessWidget {
  const CircleIconButton({super.key, required this.child, required this.onPressed, this.size = 44, this.dot = false, this.tooltip});
  final Widget child;
  final VoidCallback onPressed;
  final double size;
  final bool dot;
  final String? tooltip;
  @override
  Widget build(BuildContext context) => Tooltip(
    message: tooltip ?? '',
    child: SizedBox(
      width: size,
      height: size,
      child: Stack(
        clipBehavior: Clip.none,
        children: [
          Material(
            color: Ink2.bg,
            shape: const CircleBorder(side: _outline),
            clipBehavior: Clip.antiAlias,
            child: InkWell(
              onTap: onPressed,
              child: SizedBox(
                width: size,
                height: size,
                child: Center(child: child),
              ),
            ),
          ),
          if (dot)
            Positioned(
              left: 21,
              top: 5,
              child: Container(
                width: 14,
                height: 14,
                decoration: BoxDecoration(
                  color: Ink2.risk,
                  shape: BoxShape.circle,
                  border: Border.all(color: Ink2.bg, width: 2),
                ),
              ),
            ),
        ],
      ),
    ),
  );
}

/// `.badge-ea`: small outlined pill; `urgent` draws a red border, `filled` is black.
class Badge2 extends StatelessWidget {
  const Badge2(this.text, {super.key, this.urgent = false, this.filled = false});
  final String text;
  final bool urgent;
  final bool filled;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
    decoration: BoxDecoration(
      color: filled ? Ink2.ink : Ink2.bg,
      border: Border.all(color: urgent ? Ink2.risk : Ink2.ink, width: 2),
      borderRadius: BorderRadius.circular(999),
    ),
    child: Text(text, style: T.captionBold.copyWith(color: filled ? Ink2.bg : Ink2.ink)),
  );
}

class CountPill extends StatelessWidget {
  const CountPill(this.count, {super.key});
  final int count;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 3),
    decoration: BoxDecoration(border: Border.fromBorderSide(_outline), borderRadius: BorderRadius.circular(999)),
    child: Text('$count', style: T.captionBold),
  );
}

/// `.range-tabs`: segmented pill with the selected tab filled black.
class RangeTabs<V> extends StatelessWidget {
  const RangeTabs({super.key, required this.options, required this.selected, required this.onChanged, this.small = false});
  final Map<V, String> options;
  final V selected;
  final ValueChanged<V> onChanged;
  final bool small;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(3),
    decoration: BoxDecoration(border: Border.fromBorderSide(_outline), borderRadius: BorderRadius.circular(999)),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        for (final entry in options.entries)
          GestureDetector(
            onTap: () => onChanged(entry.key),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              padding: EdgeInsets.symmetric(horizontal: small ? 14 : 16, vertical: small ? 6 : 7),
              margin: const EdgeInsets.symmetric(horizontal: 1),
              decoration: BoxDecoration(
                color: entry.key == selected ? Ink2.ink : Colors.transparent,
                borderRadius: BorderRadius.circular(999),
              ),
              child: Text(
                entry.value,
                style: T.captionBold.copyWith(fontSize: small ? 12 : 13, color: entry.key == selected ? Ink2.bg : Ink2.ink),
              ),
            ),
          ),
      ],
    ),
  );
}

// ---------------- data bits ----------------

class DateCircle extends StatelessWidget {
  const DateCircle(this.month, this.day, {super.key, this.large = false});
  final String month;
  final int day;
  final bool large;
  @override
  Widget build(BuildContext context) => Container(
    width: large ? 56 : 52,
    height: large ? 56 : 52,
    decoration: const BoxDecoration(shape: BoxShape.circle, border: Border.fromBorderSide(_outline)),
    child: Column(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        Text(month, style: T.captionBold.copyWith(fontSize: 10, letterSpacing: 0.8)),
        Text('$day', style: T.title.copyWith(fontSize: 19, fontWeight: FontWeight.w900, height: 1)),
      ],
    ),
  );
}

/// `.progress-ea`: outlined track with a coloured fill.
class ProgressBar2 extends StatelessWidget {
  const ProgressBar2({super.key, required this.percent, required this.color});
  final int percent;
  final Color color;
  @override
  Widget build(BuildContext context) => Container(
    height: 16,
    padding: const EdgeInsets.all(2),
    decoration: BoxDecoration(border: Border.fromBorderSide(_outline), borderRadius: BorderRadius.circular(999)),
    child: Align(
      alignment: Alignment.centerLeft,
      child: FractionallySizedBox(
        widthFactor: (percent.clamp(0, 100)) / 100,
        child: Container(
          height: 8,
          decoration: BoxDecoration(color: color, borderRadius: BorderRadius.circular(999)),
        ),
      ),
    ),
  );
}

Color statusColor(MilestoneStatus s) => switch (s) {
  MilestoneStatus.completed => Ink2.complete,
  MilestoneStatus.atRisk => Ink2.risk,
  MilestoneStatus.onTrack => Ink2.onTrack,
};

class MilestoneRow extends StatelessWidget {
  const MilestoneRow(this.m, {super.key});
  final UiMilestone m;
  @override
  Widget build(BuildContext context) => Gap(8, [
    Row(
      children: [
        Expanded(child: Text(m.title, style: T.title)),
        const SizedBox(width: 8),
        Badge2(m.status.label),
      ],
    ),
    ProgressBar2(percent: m.percent, color: statusColor(m.status)),
    Row(
      children: [
        Expanded(child: Text(m.detail, style: T.muted(T.caption))),
        Text('${m.percent}%', style: T.captionBold),
      ],
    ),
  ]);
}

/// A checkable task with its milestone tag (`.task-row`).
class TaskRow extends StatelessWidget {
  const TaskRow({
    super.key,
    required this.label,
    required this.tag,
    required this.done,
    required this.onToggle,
    this.ruled = true,
    this.trailing,
  });
  final String label;
  final String tag;
  final bool done;
  final VoidCallback onToggle;
  final bool ruled;
  final Widget? trailing;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(vertical: 10),
    decoration: BoxDecoration(
      border: ruled ? const Border(bottom: BorderSide(color: Ink2.line)) : null,
    ),
    child: Row(
      children: [
        Semantics(
          checked: done,
          label: 'Mark "$label" as ${done ? 'not done' : 'done'}',
          child: GestureDetector(
            onTap: onToggle,
            child: Container(
              width: 24,
              height: 24,
              decoration: BoxDecoration(color: done ? Ink2.ink : Ink2.bg, shape: BoxShape.circle, border: Border.fromBorderSide(_outline)),
              child: done ? const Center(child: AppIcon('check', size: 14)) : null,
            ),
          ),
        ),
        const SizedBox(width: 12),
        Expanded(child: Text(label, style: done ? T.muted(T.body) : T.bodyBold)),
        const SizedBox(width: 8),
        Container(
          height: 25,
          padding: const EdgeInsets.symmetric(horizontal: 10),
          alignment: Alignment.center,
          constraints: const BoxConstraints(maxWidth: 130),
          decoration: BoxDecoration(
            border: Border.all(color: Ink2.ink, width: 1.5),
            borderRadius: BorderRadius.circular(999),
          ),
          child: Text(tag, style: T.captionBold.copyWith(fontSize: 12), overflow: TextOverflow.ellipsis),
        ),
        if (trailing != null) ...[const SizedBox(width: 12), trailing!],
      ],
    ),
  );
}

class EmptyText extends StatelessWidget {
  const EmptyText(this.text, {super.key});
  final String text;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 24),
    child: Text(text, style: T.muted(T.body), textAlign: TextAlign.center),
  );
}

// ---------------- focus timer ring ----------------

/// Blue while more than half is left, amber past halfway, red under 20%, green during breaks.
Color ringColor(bool isBreak, double fractionLeft) {
  if (isBreak) return Ink2.complete;
  if (fractionLeft > 0.5) return Ink2.onTrack;
  if (fractionLeft > 0.2) return Ink2.warning;
  return Ink2.risk;
}

class TimerRing extends StatelessWidget {
  const TimerRing({super.key, required this.remaining, required this.duration, required this.isBreak, this.size = 216});
  final int remaining;
  final int duration;
  final bool isBreak;
  final double size;
  @override
  Widget build(BuildContext context) {
    final scale = size / 216;
    final fraction = duration == 0 ? 0.0 : remaining / duration;
    return SizedBox(
      width: size,
      height: size,
      child: TweenAnimationBuilder<double>(
        tween: Tween(end: fraction),
        duration: const Duration(milliseconds: 400),
        builder: (context, value, _) => CustomPaint(
          painter: _RingPainter(value, ringColor(isBreak, fraction), 12 * scale, remaining > 0),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                formatTime(remaining),
                style: T.stat.copyWith(fontSize: 52 * scale, height: 1, fontFeatures: const [FontFeature.tabularFigures()]),
              ),
              SizedBox(height: 2 * scale),
              Text('left of ${formatTime(duration)}${isBreak ? ' break' : ''}', style: T.muted(T.body).copyWith(fontSize: 15 * scale)),
            ],
          ),
        ),
      ),
    );
  }
}

class _RingPainter extends CustomPainter {
  _RingPainter(this.fraction, this.color, this.stroke, this.showProgress);
  final double fraction;
  final Color color;
  final double stroke;
  final bool showProgress;

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Rect.fromLTWH(stroke / 2, stroke / 2, size.width - stroke, size.height - stroke);
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke;
    canvas.drawArc(rect, 0, 2 * math.pi, false, paint..color = Ink2.line);
    if (showProgress && fraction > 0) {
      canvas.drawArc(
        rect,
        -math.pi / 2,
        2 * math.pi * fraction,
        false,
        paint
          ..color = color
          ..strokeCap = StrokeCap.round,
      );
    }
  }

  @override
  bool shouldRepaint(_RingPainter old) => old.fraction != fraction || old.color != color;
}

class SessionDots extends StatelessWidget {
  const SessionDots({super.key, required this.total, required this.completed});
  final int total;
  final int completed;
  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      for (var i = 0; i < total; i++)
        Container(
          width: 12,
          height: 12,
          margin: EdgeInsets.only(left: i == 0 ? 0 : 6),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: i < completed ? Ink2.ink : Ink2.bg,
            border: Border.all(color: Ink2.ink, width: i == completed ? 4 : 2),
          ),
        ),
    ],
  );
}

// ---------------- forms ----------------

/// `.form-control-ea`: pill-shaped text input with a 2px ink border.
class PillField extends StatelessWidget {
  const PillField({
    super.key,
    required this.controller,
    this.hint,
    this.obscure = false,
    this.keyboard,
    this.maxLines = 1,
    this.autofill,
    this.onSubmitted,
    this.maxLength,
  });
  final TextEditingController controller;
  final String? hint;
  final bool obscure;
  final TextInputType? keyboard;
  final int maxLines;
  final Iterable<String>? autofill;
  final ValueChanged<String>? onSubmitted;
  final int? maxLength;

  @override
  Widget build(BuildContext context) {
    final radius = BorderRadius.circular(maxLines > 1 ? 24 : 999);
    return TextField(
      controller: controller,
      obscureText: obscure,
      keyboardType: keyboard,
      maxLines: maxLines,
      maxLength: maxLength,
      autofillHints: autofill,
      onSubmitted: onSubmitted,
      style: T.body,
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: T.muted(T.body),
        counterText: '',
        isDense: true,
        contentPadding: const EdgeInsets.symmetric(horizontal: 18, vertical: 13),
        enabledBorder: OutlineInputBorder(borderRadius: radius, borderSide: _outline),
        focusedBorder: OutlineInputBorder(
          borderRadius: radius,
          borderSide: const BorderSide(color: Ink2.onTrack, width: 2),
        ),
      ),
    );
  }
}

/// Bold label above a field.
class Labeled extends StatelessWidget {
  const Labeled(this.label, this.child, {super.key, this.overline = false});
  final String label;
  final Widget child;
  final bool overline;
  @override
  Widget build(BuildContext context) =>
      Gap(6, [Text(label, style: overline ? T.overline : T.bodyBold), child], cross: CrossAxisAlignment.stretch);
}

/// Bootstrap `.alert` boxes used on the auth screens.
enum NoticeKind { success, danger, info }

class Notice {
  const Notice(this.kind, this.text);
  final NoticeKind kind;
  final String text;
}

class NoticeBox extends StatelessWidget {
  const NoticeBox(this.notice, {super.key});
  final Notice notice;
  @override
  Widget build(BuildContext context) {
    final (bg, fg, border) = switch (notice.kind) {
      NoticeKind.success => (const Color(0xFFD1E7DD), const Color(0xFF0A3622), const Color(0xFFA3CFBB)),
      NoticeKind.danger => (const Color(0xFFF8D7DA), const Color(0xFF58151C), const Color(0xFFF1AEB5)),
      NoticeKind.info => (const Color(0xFFCFF4FC), const Color(0xFF055160), const Color(0xFF9EEAF9)),
    };
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: bg,
        border: Border.all(color: border),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Text(
        notice.text,
        style: T.caption.copyWith(color: fg),
        textAlign: TextAlign.center,
      ),
    );
  }
}

class ErrorText extends StatelessWidget {
  const ErrorText(this.text, {super.key});
  final String text;
  @override
  Widget build(BuildContext context) => Text(
    text,
    style: T.caption.copyWith(color: Ink2.risk),
    textAlign: TextAlign.center,
  );
}

/// `.toast-ea`: black pill at the bottom of the screen.
void showToast(BuildContext context, String message) {
  final messenger = ScaffoldMessenger.of(context);
  messenger.hideCurrentSnackBar();
  messenger.showSnackBar(
    SnackBar(
      content: Text(
        message,
        style: T.bodyBold.copyWith(color: Ink2.bg),
        textAlign: TextAlign.center,
      ),
      backgroundColor: Ink2.ink,
      behavior: SnackBarBehavior.floating,
      shape: const StadiumBorder(),
      margin: const EdgeInsets.fromLTRB(32, 0, 32, 24),
      duration: const Duration(milliseconds: 2500),
      elevation: 0,
    ),
  );
}

/// Rounded dialog with the panel look (`.modal-content`).
Future<R?> showPanelDialog<R>(BuildContext context, Widget Function(BuildContext) builder) => showDialog<R>(
  context: context,
  builder: (ctx) => Dialog(
    backgroundColor: Ink2.bg,
    surfaceTintColor: Colors.transparent,
    insetPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 24),
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(28), side: _outline),
    child: Padding(padding: const EdgeInsets.all(20), child: builder(ctx)),
  ),
);
