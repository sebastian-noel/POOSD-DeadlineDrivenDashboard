/// Signed-out screens: Home, About Us, FAQ, Privacy Policy & ToS, Contact, Log In, Sign Up, Forgot Password.
/// Mirrors desktop_frontend/client/src/pages/home/* and components/HomeTopNav.tsx.
library;

import 'package:flutter/material.dart';

import 'api.dart';
import 'state.dart';
import 'ui.dart';

enum PublicView { home, about, faq, privacy, contact, login, signUp, forgot }

const publicTabs = {
  PublicView.home: 'Home',
  PublicView.about: 'About Us',
  PublicView.faq: 'FAQ',
  PublicView.privacy: 'Privacy Policy & ToS',
  PublicView.contact: 'Contact',
};

class PublicShell extends StatefulWidget {
  const PublicShell({super.key, required this.onLoggedIn, this.notice, this.startOn = PublicView.home});
  final void Function(ApiUser user) onLoggedIn;
  final Notice? notice;
  final PublicView startOn;
  @override
  State<PublicShell> createState() => _PublicShellState();
}

class _PublicShellState extends State<PublicShell> {
  late PublicView view = widget.startOn;
  late Notice? loginNotice = widget.notice;
  bool navOpen = false;

  void go(PublicView v) => setState(() {
    view = v;
    navOpen = false;
  });

  @override
  Widget build(BuildContext context) {
    final page = switch (view) {
      PublicView.home => const HomeView(),
      PublicView.about => const AboutView(),
      PublicView.faq => const FaqView(),
      PublicView.privacy => PrivacyView(onContact: () => go(PublicView.contact)),
      PublicView.contact => const ContactView(),
      PublicView.login => LoginView(
        notice: loginNotice,
        onSignUp: () => go(PublicView.signUp),
        onForgot: () => go(PublicView.forgot),
        onLoggedIn: widget.onLoggedIn,
      ),
      PublicView.signUp => SignUpView(onLogin: () => go(PublicView.login)),
      PublicView.forgot => ForgotView(onLogin: () => go(PublicView.login)),
    };
    return PopScope(
      canPop: view == PublicView.home && !navOpen,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) navOpen ? setState(() => navOpen = false) : go(PublicView.home);
      },
      child: Scaffold(
        body: SafeArea(
          child: Column(
            children: [
              _nav(),
              Expanded(
                child: SingleChildScrollView(key: ValueKey(view), padding: const EdgeInsets.fromLTRB(16, 32, 16, 40), child: page),
              ),
            ],
          ),
        ),
      ),
    );
  }

  /// HomeTopNav on a phone: centered mascot, hamburger, then links and stacked Log In / Sign Up buttons.
  Widget _nav() => Container(
    padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
    decoration: const BoxDecoration(
      border: Border(bottom: BorderSide(color: Ink2.ink)),
    ),
    child: AnimatedSize(
      duration: const Duration(milliseconds: 200),
      alignment: Alignment.topCenter,
      child: Column(
        children: [
          Row(
            children: [
              const SizedBox(width: 52),
              Expanded(
                child: Center(
                  child: GestureDetector(onTap: () => go(PublicView.home), child: const Mascot(width: 115)),
                ),
              ),
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
            const SizedBox(height: 8),
            for (final e in publicTabs.entries)
              InkWell(
                onTap: () => go(e.key),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 9),
                  child: Center(
                    child: Opacity(
                      opacity: e.key == view ? 1 : 0.75,
                      child: Text(
                        e.value,
                        style: T.body.copyWith(
                          fontSize: 16,
                          fontWeight: e.key == view ? FontWeight.w800 : FontWeight.w600,
                          decoration: e.key == view ? TextDecoration.underline : null,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            const SizedBox(height: 12),
            PillButton('Log In', expand: true, onPressed: () => go(PublicView.login), padding: const EdgeInsets.symmetric(vertical: 10)),
            const SizedBox(height: 8),
            PillButton(
              'Sign Up',
              ink: true,
              expand: true,
              onPressed: () => go(PublicView.signUp),
              padding: const EdgeInsets.symmetric(vertical: 10),
            ),
            const SizedBox(height: 8),
          ],
        ],
      ),
    ),
  );
}

// ---------------- marketing pages ----------------

class HomeView extends StatelessWidget {
  const HomeView({super.key});

  Widget _feature(String image, String label) => Padding(
    padding: const EdgeInsets.only(top: 40),
    child: Gap(16, [
      ClipRRect(
        borderRadius: BorderRadius.circular(4),
        child: Image.asset('assets/images/$image.jpg', fit: BoxFit.cover),
      ),
      Text(label, style: T.display, textAlign: TextAlign.center),
    ]),
  );

  @override
  Widget build(BuildContext context) => Gap(0, [
    const SizedBox(height: 16),
    const Center(child: Mascot(width: 300)),
    const SizedBox(height: 16),
    const Center(
      child: Text(
        'LOCK\nTF IN.',
        style: TextStyle(fontFamily: 'Nunito', fontSize: 56, fontWeight: FontWeight.w900, height: 1),
      ),
    ),
    const SizedBox(height: 40),
    Text('PROJECT MADE BY TEAM 8 FOR COP4331', style: T.muted(T.wordmark).copyWith(fontSize: 18), textAlign: TextAlign.center),
    const SizedBox(height: 32),
    Text(
      'Making every hour purposeful. So you never submit another late assignment. Making sure you focus on one thing at a time.',
      style: T.muted(T.body).copyWith(fontSize: 18),
      textAlign: TextAlign.center,
    ),
    const SizedBox(height: 20),
    Text('MADE BY STUDENTS. FOR STUDENTS.', style: T.bodyBold.copyWith(fontSize: 18), textAlign: TextAlign.center),
    _feature('checklist', 'DAILY REMINDERS.'),
    _feature('clock', 'TIME BLOCKING.'),
    _feature('calendar', 'DEADLINE BASED.'),
  ]);
}

/// Mascot, small grey kicker and big heading shared by About / FAQ / Privacy.
class _Hero extends StatelessWidget {
  const _Hero(this.kicker, this.title);
  final String kicker;
  final String title;
  @override
  Widget build(BuildContext context) => Gap(4, cross: CrossAxisAlignment.center, [
    const Mascot(width: 250),
    const SizedBox(height: 12),
    Text(kicker, style: T.muted(T.wordmark), textAlign: TextAlign.center),
    Text(title, style: T.display, textAlign: TextAlign.center),
  ]);
}

class AboutView extends StatelessWidget {
  const AboutView({super.key});
  @override
  Widget build(BuildContext context) => Gap(16, [
    const _Hero('WHAT THE HECK IS', '"ERM ACTUALLY"?'),
    const SizedBox(height: 24),
    Text(
      "Well, firstly, this is a school project, we had to make something. BUT, we wanted to make something we'd actually use. "
      "What's more important to a student than having an academic comeback?",
      style: T.muted(T.body),
    ),
    Text(
      "We procrastinate, we forget assignments, and we end up getting overwhelmed once exams come around... so why not create "
      "something that'll automate a sane time block schedule and lower our cortisol without sacrificing our grades in the process?",
      style: T.muted(T.body),
    ),
    const Text(
      "That's where Erm Actually comes along, making our lives easier, prioritizing ease of use and function over everything else.",
      style: T.bodyBold,
    ),
    const SizedBox(height: 32),
    const Text('Thank you for supporting our project!', style: T.bodyBold, textAlign: TextAlign.center),
    Text('Built by UCF students for COP4331.', style: T.muted(T.caption), textAlign: TextAlign.center),
  ]);
}

class FaqView extends StatefulWidget {
  const FaqView({super.key});
  @override
  State<FaqView> createState() => _FaqViewState();
}

class _FaqViewState extends State<FaqView> {
  int? open = 0;

  static const faqs = [
    (
      'What if I end up having the time to complete only one of the time blocks?',
      "That's in the nature of students! Simply remove or reschedule that time block and the other time blocks will adapt with adaptive scheduling accordingly!",
    ),
    (
      'How does Erm Actually generate my schedule?',
      'Our algorithm takes your pending assignments, exams, and personal habits into account to automatically chunk your study sessions into sane, bite-sized time blocks.',
    ),
    (
      'Is this application completely free for students?',
      'Yes! Built by UCF students for COP4331, Erm Actually is designed to help everyone manage academic stress without breaking the bank.',
    ),
    (
      'Can I sync my calendar with Google or Canvas?',
      'We are actively working on robust integration features so you can pull assignments directly from your classes and push focus blocks straight to your calendar.',
    ),
  ];

  @override
  Widget build(BuildContext context) => Gap(16, [
    const _Hero("HERE'S OUR", 'FREQUENTLY ASKED QUESTIONS'),
    const SizedBox(height: 8),
    for (final (i, (q, a)) in faqs.indexed)
      Container(
        decoration: BoxDecoration(
          border: Border.all(color: Ink2.ink),
          borderRadius: BorderRadius.circular(6),
        ),
        clipBehavior: Clip.antiAlias,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            InkWell(
              onTap: () => setState(() => open = open == i ? null : i),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Expanded(child: Text(q, style: T.bodyBold)),
                    AnimatedRotation(
                      turns: open == i ? 0.5 : 0,
                      duration: const Duration(milliseconds: 200),
                      child: const Icon(Icons.expand_more),
                    ),
                  ],
                ),
              ),
            ),
            if (open == i)
              Container(
                decoration: const BoxDecoration(
                  border: Border(top: BorderSide(color: Ink2.line)),
                ),
                padding: const EdgeInsets.all(16),
                child: Text(a, style: T.muted(T.body)),
              ),
          ],
        ),
      ),
  ]);
}

class PrivacyView extends StatelessWidget {
  const PrivacyView({super.key, required this.onContact});
  final VoidCallback onContact;

  Widget _section(String title, String intro, List<(String, String)> points) => Gap(12, [
    Container(
      padding: const EdgeInsets.only(bottom: 8),
      decoration: const BoxDecoration(
        border: Border(bottom: BorderSide(color: Ink2.ink)),
      ),
      child: Text(title, style: T.bodyBold.copyWith(fontSize: 22)),
    ),
    Text(intro, style: T.muted(T.body)),
    for (final (label, text) in points)
      Padding(
        padding: const EdgeInsets.only(left: 8),
        child: Text.rich(
          TextSpan(
            style: T.muted(T.body),
            children: [
              const TextSpan(text: '•  '),
              TextSpan(
                text: '$label: ',
                style: const TextStyle(fontWeight: FontWeight.w800),
              ),
              TextSpan(text: text),
            ],
          ),
        ),
      ),
  ]);

  @override
  Widget build(BuildContext context) => Gap(32, [
    Gap(8, cross: CrossAxisAlignment.center, [
      const _Hero('LEGAL STUFF', 'PRIVACY POLICY & TERMS OF SERVICE'),
      Text('Last updated: November 2026', style: T.muted(T.caption)),
    ]),
    _section(
      '1. Privacy Policy',
      'At Erm, Actually, we respect your privacy as students and developers. Because this is an academic project built for COP4331, '
          'we only collect the minimum information necessary to make the app function, such as your email address and authentication tokens.',
      const [
        ('Data Collection', 'We store your account credentials securely to let you log in and manage your study blocks.'),
        (
          'Data Sharing',
          'We do not sell, trade, or rent your personal information to third parties. Your data stays within the app ecosystem.',
        ),
        ('Security', 'We implement standard password hashing and token management to keep your account safe.'),
      ],
    ),
    _section(
      '2. Terms of Service',
      'By accessing or using Erm, Actually, you agree to be bound by these terms. If you disagree with any part of these terms, you may not access our service.',
      const [
        ('Acceptable Use', 'You agree to use this application solely for scheduling, task management, and personal productivity.'),
        (
          'Account Responsibility',
          'You are responsible for safeguarding the password that you use to access the service and for any activities under your account.',
        ),
        (
          'Project Disclaimer',
          'This software is provided "as is" without warranty of any kind, expressed or implied. As a student-built project, uptime and continuous availability are not guaranteed.',
        ),
      ],
    ),
    Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: const Color(0xFFF8F9FA),
        border: Border.all(color: Ink2.ink),
        borderRadius: BorderRadius.circular(6),
      ),
      child: Gap(4, cross: CrossAxisAlignment.center, [
        Text(
          'Have questions about our privacy practices or terms? Feel free to reach out via our',
          style: T.muted(T.caption),
          textAlign: TextAlign.center,
        ),
        LinkText('Contact page', onTap: onContact, style: T.captionBold),
      ]),
    ),
  ]);
}

class ContactView extends StatefulWidget {
  const ContactView({super.key});
  @override
  State<ContactView> createState() => _ContactViewState();
}

class _ContactViewState extends State<ContactView> {
  final _email = TextEditingController();
  final _subject = TextEditingController();
  final _message = TextEditingController();
  Notice? _status;
  bool _loading = false;

  @override
  void dispose() {
    _email.dispose();
    _subject.dispose();
    _message.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (_email.text.trim().isEmpty || _subject.text.trim().isEmpty || _message.text.trim().isEmpty) {
      setState(() => _status = const Notice(NoticeKind.danger, 'Please fill in every field.'));
      return;
    }
    setState(() {
      _loading = true;
      _status = null;
    });
    try {
      await ContactApi.send(_email.text.trim(), _subject.text.trim(), _message.text.trim());
      _email.clear();
      _subject.clear();
      _message.clear();
      _status = const Notice(NoticeKind.success, 'Message sent successfully! We will reach out ASAP.');
    } catch (e) {
      _status = Notice(NoticeKind.danger, errorText(e));
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) => Panel(
    child: Gap(16, [
      Row(
        children: [
          const Mascot(width: 120),
          const SizedBox(width: 12),
          Expanded(
            child: Gap(2, [
              Text('ERM... ACTUALLY', style: T.muted(T.wordmark).copyWith(fontSize: 17)),
              Text('HOW DO YOU CONTACT US?', style: T.display.copyWith(fontSize: 26)),
            ]),
          ),
        ],
      ),
      Text("Contact us here and we'll reach out ASAP!", style: T.muted(T.body), textAlign: TextAlign.center),
      if (_status != null) NoticeBox(_status!),
      PillField(controller: _email, hint: 'Email', keyboard: TextInputType.emailAddress),
      PillField(controller: _subject, hint: 'Subject', maxLength: 150),
      PillField(controller: _message, hint: 'Write what you want to say here...', maxLines: 5, maxLength: 4000),
      PillButton('Send message', ink: true, expand: true, loading: _loading, onPressed: _send),
    ]),
  );
}

// ---------------- auth ----------------

/// The 400px auth card: mascot, big title, then the form.
class _AuthCard extends StatelessWidget {
  const _AuthCard({required this.title, required this.children, this.subtitle});
  final String title;
  final String? subtitle;
  final List<Widget> children;
  @override
  Widget build(BuildContext context) => Center(
    child: ConstrainedBox(
      constraints: const BoxConstraints(maxWidth: 400),
      child: Panel(
        child: Gap(16, [
          const SizedBox(height: 8),
          const Center(child: Mascot(width: 230)),
          const SizedBox(height: 4),
          Text(title, style: T.display.copyWith(fontSize: 36), textAlign: TextAlign.center),
          if (subtitle != null) Text(subtitle!, style: T.muted(T.caption), textAlign: TextAlign.center),
          const SizedBox(height: 4),
          ...children,
        ]),
      ),
    ),
  );
}

Widget _switchLine(String prompt, String link, VoidCallback onTap) => Wrap(
  alignment: WrapAlignment.center,
  crossAxisAlignment: WrapCrossAlignment.center,
  children: [
    Text('$prompt ', style: T.muted(T.caption)),
    LinkText(link, onTap: onTap, style: T.caption),
  ],
);

class LoginView extends StatefulWidget {
  const LoginView({super.key, required this.onSignUp, required this.onForgot, required this.onLoggedIn, this.notice});
  final VoidCallback onSignUp;
  final VoidCallback onForgot;
  final void Function(ApiUser) onLoggedIn;

  /// Message from a previous step, e.g. "Your session expired".
  final Notice? notice;
  @override
  State<LoginView> createState() => _LoginViewState();
}

class _LoginViewState extends State<LoginView> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  String _error = '';
  String _resendStatus = '';
  bool _loading = false;
  bool _needsVerification = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _login() async {
    if (_email.text.trim().isEmpty || _password.text.isEmpty) {
      setState(() => _error = 'Enter your email and password');
      return;
    }
    setState(() {
      _error = '';
      _resendStatus = '';
      _loading = true;
    });
    try {
      final user = await AuthApi.login(_email.text.trim(), _password.text);
      widget.onLoggedIn(user);
      return;
    } on ApiError catch (e) {
      _needsVerification = e.code == 'EMAIL_NOT_VERIFIED';
      _error = e.message;
    } catch (e) {
      _error = errorText(e);
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _resend() async {
    try {
      final message = await AuthApi.resendVerification(_email.text.trim());
      setState(() => _resendStatus = message);
    } catch (e) {
      setState(() => _resendStatus = errorText(e));
    }
  }

  @override
  Widget build(BuildContext context) => AutofillGroup(
    child: _AuthCard(
      title: 'Log In',
      children: [
        if (widget.notice != null) NoticeBox(widget.notice!),
        if (_error.isNotEmpty) ErrorText(_error),
        if (_needsVerification && _error.isNotEmpty)
          Center(
            child: LinkText('Resend verification email', onTap: _resend, style: T.caption),
          ),
        if (_resendStatus.isNotEmpty) Text(_resendStatus, style: T.muted(T.caption), textAlign: TextAlign.center),
        Labeled(
          'Email',
          PillField(
            controller: _email,
            hint: 'student@ucf.edu',
            keyboard: TextInputType.emailAddress,
            autofill: const [AutofillHints.email],
          ),
        ),
        Labeled(
          'Password',
          PillField(
            controller: _password,
            hint: '••••••••',
            obscure: true,
            autofill: const [AutofillHints.password],
            onSubmitted: (_) => _login(),
          ),
        ),
        Align(
          alignment: Alignment.centerLeft,
          child: LinkText('Forgot Password?', onTap: widget.onForgot, style: T.caption),
        ),
        PillButton(
          'Log In',
          ink: true,
          expand: true,
          loading: _loading,
          onPressed: _login,
          padding: const EdgeInsets.symmetric(vertical: 10),
        ),
        const SizedBox(height: 8),
        _switchLine("Don't have an account?", 'Sign up', widget.onSignUp),
      ],
    ),
  );
}

const _minPassword = 8;

class SignUpView extends StatefulWidget {
  const SignUpView({super.key, required this.onLogin});
  final VoidCallback onLogin;
  @override
  State<SignUpView> createState() => _SignUpViewState();
}

class _SignUpViewState extends State<SignUpView> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _confirm = TextEditingController();
  String _error = '';
  String _resendStatus = '';
  bool _loading = false;
  bool _created = false;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    _confirm.dispose();
    super.dispose();
  }

  Future<void> _signUp() async {
    setState(() => _error = '');
    if (_email.text.trim().isEmpty) return setState(() => _error = 'Enter your email');
    if (_password.text.length < _minPassword) return setState(() => _error = 'Password must be at least $_minPassword characters');
    if (_password.text != _confirm.text) return setState(() => _error = 'Passwords do not match');
    setState(() => _loading = true);
    try {
      // The API emails a verification link; the account can log in once it is clicked.
      await AuthApi.register(_email.text.trim(), _password.text);
      _created = true;
    } catch (e) {
      _error = errorText(e);
    }
    if (mounted) setState(() => _loading = false);
  }

  Future<void> _resend() async {
    try {
      final message = await AuthApi.resendVerification(_email.text.trim());
      setState(() => _resendStatus = message);
    } catch (e) {
      setState(() => _resendStatus = errorText(e));
    }
  }

  @override
  Widget build(BuildContext context) => _AuthCard(
    title: _created ? 'Check your email' : 'Create Account',
    children: _created
        ? [
            NoticeBox(
              Notice(
                NoticeKind.success,
                'We sent a verification link to ${_email.text.trim()}. Open it to activate your account, then log in.',
              ),
            ),
            if (_resendStatus.isNotEmpty) Text(_resendStatus, style: T.muted(T.caption), textAlign: TextAlign.center),
            PillButton(
              'Go to Log In',
              ink: true,
              expand: true,
              onPressed: widget.onLogin,
              padding: const EdgeInsets.symmetric(vertical: 10),
            ),
            Center(
              child: LinkText("Didn't get it? Resend the email", onTap: _resend, style: T.caption),
            ),
          ]
        : [
            if (_error.isNotEmpty) ErrorText(_error),
            Labeled(
              'Email',
              PillField(
                controller: _email,
                hint: 'student@ucf.edu',
                keyboard: TextInputType.emailAddress,
                autofill: const [AutofillHints.email],
              ),
            ),
            Labeled(
              'Password',
              PillField(
                controller: _password,
                hint: 'At least $_minPassword characters',
                obscure: true,
                autofill: const [AutofillHints.newPassword],
              ),
            ),
            Labeled('Confirm Password', PillField(controller: _confirm, hint: '••••••••', obscure: true, onSubmitted: (_) => _signUp())),
            PillButton(
              'Sign Up',
              ink: true,
              expand: true,
              loading: _loading,
              onPressed: _signUp,
              padding: const EdgeInsets.symmetric(vertical: 10),
            ),
            const SizedBox(height: 8),
            _switchLine('Already have an account?', 'Log in', widget.onLogin),
          ],
  );
}

class ForgotView extends StatefulWidget {
  const ForgotView({super.key, required this.onLogin});
  final VoidCallback onLogin;
  @override
  State<ForgotView> createState() => _ForgotViewState();
}

class _ForgotViewState extends State<ForgotView> {
  final _email = TextEditingController();
  String _error = '';
  bool _loading = false;
  bool _sent = false;

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  /// Asks the API to email a reset link. The response is the same whether or not the account exists.
  Future<void> _submit() async {
    if (_email.text.trim().isEmpty) return setState(() => _error = 'Enter your email');
    setState(() {
      _error = '';
      _loading = true;
    });
    try {
      await AuthApi.forgotPassword(_email.text.trim());
      _sent = true;
    } catch (e) {
      _error = errorText(e);
    }
    if (mounted) setState(() => _loading = false);
  }

  @override
  Widget build(BuildContext context) => _AuthCard(
    title: 'Reset Password',
    subtitle: "Enter your email address and we'll send you a link to choose a new password.",
    children: _sent
        ? [
            NoticeBox(
              Notice(
                NoticeKind.success,
                'If an account exists for ${_email.text.trim()}, you will receive a reset link shortly. It expires in one hour.',
              ),
            ),
            PillButton(
              'Back to Log In',
              ink: true,
              expand: true,
              onPressed: widget.onLogin,
              padding: const EdgeInsets.symmetric(vertical: 10),
            ),
          ]
        : [
            if (_error.isNotEmpty) ErrorText(_error),
            Labeled(
              'Email',
              PillField(controller: _email, hint: 'student@ucf.edu', keyboard: TextInputType.emailAddress, onSubmitted: (_) => _submit()),
            ),
            PillButton(
              'Send Reset Link',
              ink: true,
              expand: true,
              loading: _loading,
              onPressed: _submit,
              padding: const EdgeInsets.symmetric(vertical: 10),
            ),
            Center(
              child: LinkText('← Back to Log In', onTap: widget.onLogin, style: T.caption),
            ),
          ],
  );
}
