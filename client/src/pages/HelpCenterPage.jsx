import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  HelpCircle, ChevronDown, ChevronUp, Plus, MessageSquare,
  Bug, Star, Shield, Send, Paperclip, X, CheckCircle2,
  AlertTriangle, Clock, TicketCheck, ArrowLeft,
} from 'lucide-react';
import api from '../api/axios';
import Topbar from '../components/Topbar';

// ─── FAQ DATA ────────────────────────────────────────────────────────────────
const FAQ_SECTIONS = [
  {
    category: 'Account & Login',
    faqs: [
      { q: 'How do I create a Parola Bolt account?', a: 'Go to the Sign Up page, fill in your details, complete biometric verification, and your account is ready. You must be 18 or older to join.' },
      { q: 'What login methods are available?', a: 'You can log in with your email, username, or mobile number + password. You can also use Face ID (biometric) login or OTP (one-time password) sent to your email or mobile.' },
      { q: 'Can I have multiple accounts?', a: 'No. Parola Bolt uses biometric verification to prevent duplicate accounts. Each person is allowed exactly one verified account.' },
      { q: 'How do I get a verified badge?', a: 'Go to your Profile → tap "Get verified" → upload a government-issued ID and optionally a selfie. Our team reviews within 24–48 hours.' },
    ],
  },
  {
    category: 'OTP Issues',
    faqs: [
      { q: 'I didn\'t receive my OTP. What should I do?', a: 'Check your spam folder for email OTPs. For SMS OTPs, ensure your mobile number is correct. You can request a new OTP after 60 seconds. If the problem persists, try the email OTP option instead.' },
      { q: 'My OTP expired. What now?', a: 'OTPs are valid for 5 minutes. Simply click "Resend OTP" (available after 60 seconds) to get a fresh code.' },
      { q: 'I\'m entering the right OTP but it\'s not working.', a: 'Ensure you\'re using the most recent OTP (each resend invalidates the previous one). You have 5 attempts before the OTP is blocked — request a new one if blocked.' },
    ],
  },
  {
    category: 'Password Reset',
    faqs: [
      { q: 'How do I reset my forgotten password?', a: 'On the Login page, tap "Forgot Password?" → enter your email or mobile → verify the OTP → set your new password. The process takes under 2 minutes.' },
      { q: 'What are the password requirements?', a: 'Passwords must be at least 12 characters and include: one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&* etc.).' },
      { q: 'I don\'t have access to my email or phone anymore.', a: 'Please raise a support ticket with your account details (full name, username). Our team will verify your identity manually and assist with account recovery.' },
    ],
  },
  {
    category: 'Biometric Authentication',
    faqs: [
      { q: 'What biometric data does Parola Bolt store?', a: 'Parola Bolt never stores raw biometric images. Only a one-way cryptographic hash (a secure fingerprint) is stored — it cannot be reversed to recreate your face image.' },
      { q: 'I switched phones. How do I re-register biometrics?', a: 'Log in with your email/password or OTP, then go to Settings → Security → Re-register biometric. Your old biometric record will be replaced.' },
      { q: 'Biometric login is failing. What do I do?', a: 'Ensure you\'re using the same device you registered with. If you changed devices, use password or OTP login instead, then update your biometric in Settings.' },
    ],
  },
  {
    category: 'Posts & Comments',
    faqs: [
      { q: 'Why was my post rejected?', a: 'Our content verification system automatically flags posts containing offensive language, spam patterns, or potential misinformation. Edit the content and repost, or contact support if you believe it was a mistake.' },
      { q: 'Can I edit a post after publishing?', a: 'Yes — tap the three-dot menu on your post → Edit. Note that edited posts go back through content verification.' },
      { q: 'How do I delete a comment on my post?', a: 'Tap the comment → tap the delete (trash) icon. As a post owner you can delete any comment on your posts.' },
    ],
  },
  {
    category: 'Messaging',
    faqs: [
      { q: 'What is SMS Fallback Mode?', a: 'When your internet connection drops, Parola Bolt automatically queues your messages and delivers them via simulated SMS to the recipient\'s phone. Messages sync back to the app when you reconnect.' },
      { q: 'Can I send voice notes?', a: 'Yes — tap the microphone icon in any chat to record a voice note. Tap again to stop and send.' },
    ],
  },
  {
    category: 'Privacy & Security',
    faqs: [
      { q: 'Who can see my profile?', a: 'By default, your profile is public. Go to Settings → Privacy to change visibility to "Followers only" or "Private".' },
      { q: 'Can I block someone?', a: 'Block functionality is coming soon. For now, you can report users via their profile or report abusive messages.' },
      { q: 'How is my data protected?', a: 'All data is encrypted in transit (TLS) and at rest. Passwords are hashed with bcrypt (cost 12). Biometric data is stored as a one-way hash only.' },
    ],
  },
  {
    category: 'Account Recovery',
    faqs: [
      { q: 'My account was suspended. What do I do?', a: 'Submit a support ticket from a different account or email support directly. Include your username and reason you believe the suspension is incorrect.' },
      { q: 'I think my account was hacked.', a: 'Immediately: 1) Try to log in and change your password. 2) Check your account settings for any changes. 3) Submit an "Account Issue" support ticket. We\'ll investigate within 24 hours.' },
    ],
  },
];

const TICKET_CATEGORIES = [
  { value: 'account_issue', label: 'Account Issue' },
  { value: 'login_problem', label: 'Login Problem' },
  { value: 'otp_problem', label: 'OTP Problem' },
  { value: 'technical_bug', label: 'Technical Bug' },
  { value: 'feature_request', label: 'Feature Request' },
  { value: 'report_abuse', label: 'Report Abuse' },
  { value: 'privacy_concern', label: 'Privacy Concern' },
  { value: 'other', label: 'Other' },
];

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low', color: 'text-mint' },
  { value: 'medium', label: 'Medium', color: 'text-amber' },
  { value: 'high', label: 'High', color: 'text-red-500' },
];

const STATUS_CONFIG = {
  open: { label: 'Open', classes: 'bg-bolt-100 dark:bg-bolt-900/30 text-bolt-700 dark:text-bolt-300' },
  in_progress: { label: 'In Progress', classes: 'bg-amber/15 text-amber-dark dark:text-amber' },
  resolved: { label: 'Resolved', classes: 'bg-mint/15 text-mint-dark dark:text-mint' },
  closed: { label: 'Closed', classes: 'bg-ink-700/10 dark:bg-ink-700/30 text-ink-700/60 dark:text-cream/40' },
};

const SAFETY_CONTENT = [
  {
    title: 'Community Guidelines',
    content: 'Parola Bolt is built on respect, authenticity, and positive communication. We prohibit: hate speech, harassment, spam, nudity, graphic violence, misinformation, and fake accounts. Violations result in content removal, account suspension, or permanent bans.',
  },
  {
    title: 'Privacy Policy',
    content: 'We collect only the data necessary to provide our services. We never sell your personal data to advertisers. Your biometric data is stored as a one-way hash and cannot be reconstructed. You can request data deletion at any time via a support ticket.',
  },
  {
    title: 'Terms & Conditions',
    content: 'By using Parola Bolt, you confirm you are 18 or older, agree not to misuse the platform, and accept that verified identity is required for full access. We reserve the right to suspend accounts that violate our guidelines.',
  },
  {
    title: 'Account Security Tips',
    content: '1) Use a unique, strong password (12+ characters). 2) Enable biometric login. 3) Never share your OTP with anyone — Parola Bolt staff will never ask for it. 4) Log out from shared devices. 5) Report suspicious activity immediately.',
  },
  {
    title: 'Anti-Fake Account Policy',
    content: 'Every Parola Bolt account requires biometric verification to prevent duplicates. AI-powered content moderation flags and removes fake engagement. Verified accounts receive a blue badge to signal authenticity to other users.',
  },
];

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

const FaqItem = ({ q, a }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-bolt-100 dark:border-ink-700 last:border-0">
      <button onClick={() => setOpen((s) => !s)} className="flex w-full items-start justify-between py-3 text-left gap-3">
        <span className="text-sm font-medium">{q}</span>
        {open ? <ChevronUp size={16} className="shrink-0 text-bolt-500 mt-0.5" /> : <ChevronDown size={16} className="shrink-0 text-ink-700/40 dark:text-cream/30 mt-0.5" />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <p className="text-sm text-ink-700/70 dark:text-cream/60 pb-3 leading-relaxed">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const TicketBadge = ({ status }) => {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.open;
  return <span className={`text-xs font-medium rounded-full px-2.5 py-0.5 ${cfg.classes}`}>{cfg.label}</span>;
};

// ─── MAIN COMPONENT ──────────────────────────────────────────────────────────

const HelpCenterPage = () => {
  const navigate = useNavigate();
  const [section, setSection] = useState('faq'); // faq | new-ticket | my-tickets | ticket-detail | bug-report | feedback | safety
  const [faqSearch, setFaqSearch] = useState('');
  const [tickets, setTickets] = useState([]);
  const [activeTicket, setActiveTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');

  // New ticket form
  const [ticketForm, setTicketForm] = useState({ subject: '', category: 'account_issue', priority: 'medium', description: '' });
  const [ticketFile, setTicketFile] = useState(null);

  // Bug report form
  const [bugForm, setBugForm] = useState({ description: '', deviceInfo: navigator.userAgent, browserInfo: navigator.userAgent });
  const [bugFile, setBugFile] = useState(null);

  // Feedback form
  const [feedbackForm, setFeedbackForm] = useState({ type: 'general', rating: 0, title: '', description: '' });

  useEffect(() => {
    if (section === 'my-tickets') loadTickets();
  }, [section]);

  const loadTickets = async () => {
    try {
      const { data } = await api.get('/support/tickets');
      setTickets(data.tickets);
    } catch { /* ignore */ }
  };

  const loadTicket = async (id) => {
    try {
      const { data } = await api.get(`/support/tickets/${id}`);
      setActiveTicket(data.ticket);
      setSection('ticket-detail');
    } catch { /* ignore */ }
  };

  const submitTicket = async () => {
    if (!ticketForm.subject || !ticketForm.description) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(ticketForm).forEach(([k, v]) => fd.append(k, v));
      if (ticketFile) fd.append('attachment', ticketFile);
      await api.post('/support/tickets', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccess('Your support ticket has been submitted! We\'ll respond within 24 hours.');
      setTicketForm({ subject: '', category: 'account_issue', priority: 'medium', description: '' });
      setTicketFile(null);
    } catch (err) {
      setSuccess(err.response?.data?.message || 'Could not submit ticket.');
    } finally { setSubmitting(false); }
  };

  const submitReply = async () => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('text', replyText);
      const { data } = await api.post(`/support/tickets/${activeTicket._id}/reply`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setActiveTicket((t) => ({ ...t, messages: data.messages }));
      setReplyText('');
    } catch { /* ignore */ }
    finally { setSubmitting(false); }
  };

  const closeTicket = async () => {
    if (!window.confirm('Are you sure you want to close this ticket?')) return;
    try {
      await api.put(`/support/tickets/${activeTicket._id}/close`);
      setActiveTicket((t) => ({ ...t, status: 'closed' }));
    } catch { /* ignore */ }
  };

  const submitBug = async () => {
    if (!bugForm.description) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      Object.entries(bugForm).forEach(([k, v]) => fd.append(k, v));
      if (bugFile) fd.append('screenshot', bugFile);
      await api.post('/support/bug-report', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setSuccess('Bug report submitted! Thank you for helping us improve Parola Bolt.');
      setBugForm({ description: '', deviceInfo: navigator.userAgent, browserInfo: navigator.userAgent });
      setBugFile(null);
    } catch (err) {
      setSuccess(err.response?.data?.message || 'Could not submit bug report.');
    } finally { setSubmitting(false); }
  };

  const submitFeedback = async () => {
    if (!feedbackForm.description) return;
    setSubmitting(true);
    try {
      await api.post('/support/feedback', feedbackForm);
      setSuccess('Thank you for your feedback! We read every submission.');
      setFeedbackForm({ type: 'general', rating: 0, title: '', description: '' });
    } catch (err) {
      setSuccess(err.response?.data?.message || 'Could not submit feedback.');
    } finally { setSubmitting(false); }
  };

  const filteredFaqs = faqSearch.trim()
    ? FAQ_SECTIONS.map((s) => ({ ...s, faqs: s.faqs.filter((f) => f.q.toLowerCase().includes(faqSearch.toLowerCase()) || f.a.toLowerCase().includes(faqSearch.toLowerCase())) })).filter((s) => s.faqs.length > 0)
    : FAQ_SECTIONS;

  const navItems = [
    { key: 'faq', icon: HelpCircle, label: 'FAQs' },
    { key: 'new-ticket', icon: Plus, label: 'New Ticket' },
    { key: 'my-tickets', icon: TicketCheck, label: 'My Tickets' },
    { key: 'bug-report', icon: Bug, label: 'Report Bug' },
    { key: 'feedback', icon: Star, label: 'Feedback' },
    { key: 'safety', icon: Shield, label: 'Safety Center' },
  ];

  return (
    <div>
      <Topbar title="Help Center" />
      <div className="max-w-4xl mx-auto p-4 lg:p-8">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-bolt-500 mb-3">
            <HelpCircle size={28} className="text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold">How can we help?</h1>
          <p className="text-sm text-ink-700/60 dark:text-cream/50 mt-1">
            Find answers, submit tickets, or send us feedback.
          </p>
        </div>

        {/* Nav pills */}
        <div className="flex flex-wrap gap-2 justify-center mb-6">
          {navItems.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => { setSection(key); setSuccess(''); }}
              className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                section === key
                  ? 'bg-bolt-500 text-white'
                  : 'bg-bolt-50 dark:bg-ink-800 text-ink-700/70 dark:text-cream/60 hover:bg-bolt-100 dark:hover:bg-ink-700'
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* Success message */}
        <AnimatePresence>
          {success && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-4 flex items-start gap-2 rounded-xl bg-mint/10 border border-mint/30 px-4 py-3 text-sm text-mint-dark dark:text-mint">
              <CheckCircle2 size={16} className="mt-0.5 shrink-0" />{success}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── FAQ ── */}
        {section === 'faq' && (
          <div>
            <input value={faqSearch} onChange={(e) => setFaqSearch(e.target.value)}
              placeholder="Search FAQs…"
              className="input-field mb-5" />
            {filteredFaqs.length === 0 && (
              <p className="text-center text-sm text-ink-700/50 dark:text-cream/40 py-8">No FAQs match your search.</p>
            )}
            {filteredFaqs.map((section) => (
              <div key={section.category} className="card p-4 mb-4">
                <h3 className="font-display font-semibold mb-2 text-bolt-600 dark:text-bolt-300">{section.category}</h3>
                {section.faqs.map((faq) => <FaqItem key={faq.q} {...faq} />)}
              </div>
            ))}
            <div className="text-center mt-4">
              <p className="text-sm text-ink-700/60 dark:text-cream/50">
                Didn't find your answer?{' '}
                <button onClick={() => setSection('new-ticket')} className="text-bolt-500 font-semibold hover:underline">
                  Submit a support ticket
                </button>
              </p>
            </div>
          </div>
        )}

        {/* ── NEW TICKET ── */}
        {section === 'new-ticket' && (
          <div className="card p-5 space-y-4">
            <h3 className="font-display font-semibold flex items-center gap-2">
              <MessageSquare size={18} className="text-bolt-500" /> Create Support Ticket
            </h3>

            <div>
              <label className="block text-xs font-medium mb-1.5 text-ink-700/70 dark:text-cream/60">Subject *</label>
              <input value={ticketForm.subject} onChange={(e) => setTicketForm((f) => ({ ...f, subject: e.target.value }))}
                placeholder="Brief description of your issue" className="input-field" maxLength={200} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1.5 text-ink-700/70 dark:text-cream/60">Category *</label>
                <select value={ticketForm.category} onChange={(e) => setTicketForm((f) => ({ ...f, category: e.target.value }))} className="input-field">
                  {TICKET_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5 text-ink-700/70 dark:text-cream/60">Priority</label>
                <select value={ticketForm.priority} onChange={(e) => setTicketForm((f) => ({ ...f, priority: e.target.value }))} className="input-field">
                  {PRIORITY_OPTIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 text-ink-700/70 dark:text-cream/60">Description *</label>
              <textarea value={ticketForm.description} onChange={(e) => setTicketForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe your issue in detail…" rows={5} className="input-field resize-none" maxLength={5000} />
              <p className="text-xs text-right text-ink-700/40 dark:text-cream/30 mt-1">{ticketForm.description.length}/5000</p>
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 text-ink-700/70 dark:text-cream/60">Attachment (optional)</label>
              {ticketFile ? (
                <div className="flex items-center gap-2 rounded-xl border border-bolt-200 dark:border-ink-700 px-3 py-2 text-sm">
                  <Paperclip size={14} className="text-bolt-500" />
                  <span className="flex-1 truncate">{ticketFile.name}</span>
                  <button onClick={() => setTicketFile(null)}><X size={14} /></button>
                </div>
              ) : (
                <label className="flex items-center gap-2 rounded-xl border border-dashed border-bolt-200 dark:border-ink-700 px-4 py-3 text-sm cursor-pointer hover:bg-bolt-50 dark:hover:bg-ink-800">
                  <Paperclip size={16} className="text-bolt-500" /> Click to attach a screenshot or file
                  <input type="file" hidden accept="image/*,.pdf,.txt" onChange={(e) => setTicketFile(e.target.files[0])} />
                </label>
              )}
            </div>

            <button onClick={submitTicket} disabled={submitting || !ticketForm.subject || !ticketForm.description} className="btn-primary">
              <Send size={16} /> {submitting ? 'Submitting…' : 'Submit Ticket'}
            </button>
          </div>
        )}

        {/* ── MY TICKETS ── */}
        {section === 'my-tickets' && (
          <div>
            {tickets.length === 0 ? (
              <div className="card p-8 text-center">
                <TicketCheck size={40} className="text-bolt-200 dark:text-ink-700 mx-auto mb-3" />
                <p className="font-display font-semibold mb-1">No tickets yet</p>
                <p className="text-sm text-ink-700/60 dark:text-cream/50">Submit a support ticket and track it here.</p>
                <button onClick={() => setSection('new-ticket')} className="btn-primary mt-4 mx-auto">Create ticket</button>
              </div>
            ) : (
              <div className="space-y-3">
                {tickets.map((t) => (
                  <button key={t._id} onClick={() => loadTicket(t._id)}
                    className="card p-4 w-full text-left hover:bg-bolt-50 dark:hover:bg-ink-800 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold truncate">{t.subject}</p>
                        <p className="text-xs text-ink-700/50 dark:text-cream/40 mt-0.5">
                          #{t.ticketNumber} · {t.category.replace(/_/g, ' ')} · {new Date(t.updatedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <TicketBadge status={t.status} />
                    </div>
                    {t.hasUnreadSupportReply && (
                      <span className="mt-2 inline-flex items-center gap-1 text-xs text-bolt-500 font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-bolt-500" /> New reply from support
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TICKET DETAIL ── */}
        {section === 'ticket-detail' && activeTicket && (
          <div>
            <button onClick={() => { setSection('my-tickets'); loadTickets(); }}
              className="flex items-center gap-1.5 text-sm text-ink-700/60 dark:text-cream/50 hover:text-bolt-500 mb-4">
              <ArrowLeft size={16} /> Back to tickets
            </button>

            <div className="card p-4 mb-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div>
                  <h3 className="font-display font-semibold">{activeTicket.subject}</h3>
                  <p className="text-xs text-ink-700/50 dark:text-cream/40 mt-0.5">
                    #{activeTicket.ticketNumber} · {activeTicket.category.replace(/_/g, ' ')}
                  </p>
                </div>
                <TicketBadge status={activeTicket.status} />
              </div>
              <p className="text-sm text-ink-700/70 dark:text-cream/60 border-t border-bolt-100 dark:border-ink-700 pt-3 mt-2">{activeTicket.description}</p>
            </div>

            {/* Messages thread */}
            <div className="space-y-3 mb-4">
              {activeTicket.messages?.map((msg) => {
                const isSupport = ['admin', 'support'].includes(msg.senderRole);
                return (
                  <div key={msg._id} className={`flex gap-3 ${isSupport ? '' : 'flex-row-reverse'}`}>
                    <img src={msg.sender?.avatar?.url || `https://api.dicebear.com/7.x/initials/svg?seed=${msg.sender?.username}`}
                      alt="" className="h-8 w-8 rounded-full object-cover shrink-0" />
                    <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      isSupport ? 'bg-bolt-500 text-white rounded-tl-sm' : 'bg-bolt-50 dark:bg-ink-800 rounded-tr-sm'
                    }`}>
                      {isSupport && <p className="text-xs font-semibold text-bolt-200 mb-1">Parola Bolt Support</p>}
                      <p>{msg.text}</p>
                      <p className={`text-xs mt-1 ${isSupport ? 'text-bolt-200' : 'text-ink-700/40 dark:text-cream/30'}`}>
                        {new Date(msg.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                );
              })}
              {(!activeTicket.messages || activeTicket.messages.length === 0) && (
                <p className="text-sm text-center text-ink-700/50 dark:text-cream/40 py-4">No replies yet. Our team will respond soon.</p>
              )}
            </div>

            {activeTicket.status !== 'closed' && (
              <div className="card p-4 space-y-3">
                <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write your reply…" rows={3} className="input-field resize-none" />
                <div className="flex gap-2">
                  <button onClick={submitReply} disabled={submitting || !replyText.trim()} className="btn-primary flex-1">
                    <Send size={15} /> {submitting ? 'Sending…' : 'Send reply'}
                  </button>
                  <button onClick={closeTicket} className="btn-secondary text-sm px-4">
                    Close ticket
                  </button>
                </div>
              </div>
            )}
            {activeTicket.status === 'closed' && (
              <div className="card p-4 text-center text-sm text-ink-700/50 dark:text-cream/40">
                This ticket is closed.
              </div>
            )}
          </div>
        )}

        {/* ── BUG REPORT ── */}
        {section === 'bug-report' && (
          <div className="card p-5 space-y-4">
            <h3 className="font-display font-semibold flex items-center gap-2">
              <Bug size={18} className="text-red-500" /> Report a Bug
            </h3>

            <div>
              <label className="block text-xs font-medium mb-1.5 text-ink-700/70 dark:text-cream/60">What happened? *</label>
              <textarea value={bugForm.description} onChange={(e) => setBugForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Describe the bug — what you expected vs what actually happened…" rows={4} className="input-field resize-none" />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 text-ink-700/70 dark:text-cream/60">Device info (auto-filled)</label>
              <input value={bugForm.deviceInfo} onChange={(e) => setBugForm((f) => ({ ...f, deviceInfo: e.target.value }))}
                className="input-field text-xs" />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 text-ink-700/70 dark:text-cream/60">Screenshot (optional)</label>
              {bugFile ? (
                <div className="flex items-center gap-2 rounded-xl border border-bolt-200 dark:border-ink-700 px-3 py-2 text-sm">
                  <Paperclip size={14} className="text-bolt-500" /><span className="flex-1 truncate">{bugFile.name}</span>
                  <button onClick={() => setBugFile(null)}><X size={14} /></button>
                </div>
              ) : (
                <label className="flex items-center gap-2 rounded-xl border border-dashed border-bolt-200 dark:border-ink-700 px-4 py-3 text-sm cursor-pointer hover:bg-bolt-50 dark:hover:bg-ink-800">
                  <Paperclip size={16} className="text-bolt-500" /> Attach screenshot
                  <input type="file" hidden accept="image/*" onChange={(e) => setBugFile(e.target.files[0])} />
                </label>
              )}
            </div>

            <button onClick={submitBug} disabled={submitting || !bugForm.description} className="btn-primary">
              <Bug size={16} /> {submitting ? 'Submitting…' : 'Submit Bug Report'}
            </button>
          </div>
        )}

        {/* ── FEEDBACK ── */}
        {section === 'feedback' && (
          <div className="card p-5 space-y-4">
            <h3 className="font-display font-semibold flex items-center gap-2">
              <Star size={18} className="text-amber" /> Feedback & Suggestions
            </h3>

            <div>
              <label className="block text-xs font-medium mb-1.5 text-ink-700/70 dark:text-cream/60">Type</label>
              <div className="flex gap-2">
                {[{ v: 'general', l: 'General' }, { v: 'feature_request', l: 'Feature request' }, { v: 'rating', l: 'Rate app' }].map(({ v, l }) => (
                  <button key={v} onClick={() => setFeedbackForm((f) => ({ ...f, type: v }))}
                    className={`flex-1 rounded-xl py-2 text-sm font-medium transition-colors border ${
                      feedbackForm.type === v ? 'bg-bolt-500 text-white border-bolt-500' : 'border-bolt-200 dark:border-ink-700 text-ink-700/60 dark:text-cream/50 hover:border-bolt-300'
                    }`}>{l}</button>
                ))}
              </div>
            </div>

            {feedbackForm.type === 'rating' && (
              <div>
                <label className="block text-xs font-medium mb-2 text-ink-700/70 dark:text-cream/60">Your rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setFeedbackForm((f) => ({ ...f, rating: n }))}
                      className={`text-2xl transition-transform hover:scale-110 ${feedbackForm.rating >= n ? 'text-amber' : 'text-ink-700/20 dark:text-ink-700'}`}>
                      ★
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium mb-1.5 text-ink-700/70 dark:text-cream/60">Title (optional)</label>
              <input value={feedbackForm.title} onChange={(e) => setFeedbackForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="Short title for your feedback" className="input-field" maxLength={200} />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5 text-ink-700/70 dark:text-cream/60">Your feedback *</label>
              <textarea value={feedbackForm.description} onChange={(e) => setFeedbackForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="Share your thoughts, ideas, or feature requests…" rows={4} className="input-field resize-none" />
            </div>

            <button onClick={submitFeedback} disabled={submitting || !feedbackForm.description} className="btn-primary">
              <Send size={16} /> {submitting ? 'Sending…' : 'Submit Feedback'}
            </button>
          </div>
        )}

        {/* ── SAFETY CENTER ── */}
        {section === 'safety' && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-bolt-50 dark:bg-ink-900 mb-2">
              <Shield size={24} className="text-bolt-500 shrink-0" />
              <p className="text-sm text-ink-700/70 dark:text-cream/60">
                Parola Bolt is committed to creating a safe, verified, and positive environment for everyone.
              </p>
            </div>
            {SAFETY_CONTENT.map((item) => (
              <div key={item.title} className="card p-4">
                <h3 className="font-display font-semibold mb-2 flex items-center gap-2">
                  <Shield size={15} className="text-bolt-500" /> {item.title}
                </h3>
                <p className="text-sm text-ink-700/70 dark:text-cream/60 leading-relaxed">{item.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default HelpCenterPage;
