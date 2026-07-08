const SupportTicket = require('../models/SupportTicket');
const { Feedback, BugReport } = require('../models/Feedback');
const Notification = require('../models/Notification');

// ─── USER: CREATE TICKET ────────────────────────────────────────────────────
const createTicket = async (req, res, next) => {
  try {
    const { subject, category, priority = 'medium', description } = req.body;
    if (!subject || !category || !description) {
      return res.status(400).json({ success: false, message: 'Subject, category, and description are required.' });
    }

    const attachment = req.file
      ? { url: req.file.path, publicId: req.file.filename }
      : undefined;

    const ticket = await SupportTicket.create({
      user: req.user._id,
      subject,
      category,
      priority,
      description,
      ...(attachment && { attachment }),
    });

    res.status(201).json({ success: true, message: 'Support ticket created successfully.', ticket });
  } catch (err) { next(err); }
};

// ─── USER: GET MY TICKETS ───────────────────────────────────────────────────
const getMyTickets = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = { user: req.user._id };
    if (status) filter.status = status;

    const tickets = await SupportTicket.find(filter)
      .sort({ updatedAt: -1 })
      .select('-messages');

    res.status(200).json({ success: true, count: tickets.length, tickets });
  } catch (err) { next(err); }
};

// ─── USER: GET SINGLE TICKET WITH MESSAGES ─────────────────────────────────
const getTicket = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findById(req.params.ticketId)
      .populate('messages.sender', 'username fullName avatar role')
      .populate('assignedTo', 'username fullName avatar');

    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });

    const isOwner = String(ticket.user) === String(req.user._id);
    const isAdmin = ['admin', 'moderator'].includes(req.user.role);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    // Mark support replies as read for user
    if (isOwner) {
      ticket.hasUnreadSupportReply = false;
      await ticket.save();
    }

    res.status(200).json({ success: true, ticket });
  } catch (err) { next(err); }
};

// ─── USER/ADMIN: REPLY TO TICKET ───────────────────────────────────────────
const replyToTicket = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Reply text is required.' });
    }

    const ticket = await SupportTicket.findById(req.params.ticketId);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });

    const isOwner = String(ticket.user) === String(req.user._id);
    const isAdmin = ['admin', 'moderator'].includes(req.user.role);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    if (ticket.status === 'closed') {
      return res.status(400).json({ success: false, message: 'This ticket is closed.' });
    }

    const attachment = req.file
      ? { url: req.file.path, publicId: req.file.filename, originalName: req.file.originalname }
      : undefined;

    const senderRole = isAdmin ? (req.user.role === 'admin' ? 'admin' : 'support') : 'user';

    ticket.messages.push({
      sender: req.user._id,
      senderRole,
      text: text.trim(),
      ...(attachment && { attachment }),
    });

    // Update unread flags and status
    if (isAdmin) {
      ticket.hasUnreadSupportReply = true;
      if (ticket.status === 'open') ticket.status = 'in_progress';

      // Notify user
      await Notification.create({
        recipient: ticket.user,
        sender: req.user._id,
        type: 'system',
        text: `Support replied to your ticket: "${ticket.subject.slice(0, 50)}"`,
      });
    } else {
      ticket.hasUnreadUserReply = true;
    }

    await ticket.save();
    await ticket.populate('messages.sender', 'username fullName avatar role');

    res.status(201).json({ success: true, message: 'Reply added.', messages: ticket.messages });
  } catch (err) { next(err); }
};

// ─── USER: CLOSE TICKET ────────────────────────────────────────────────────
const closeTicket = async (req, res, next) => {
  try {
    const ticket = await SupportTicket.findById(req.params.ticketId);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });

    const isOwner = String(ticket.user) === String(req.user._id);
    const isAdmin = ['admin', 'moderator'].includes(req.user.role);
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    ticket.status = 'closed';
    ticket.closedAt = new Date();
    await ticket.save();

    res.status(200).json({ success: true, message: 'Ticket closed.' });
  } catch (err) { next(err); }
};

// ─── ADMIN: GET ALL TICKETS ─────────────────────────────────────────────────
const adminGetTickets = async (req, res, next) => {
  try {
    const { status, priority, category, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (category) filter.category = category;

    const skip = (Number(page) - 1) * Number(limit);
    const [tickets, total] = await Promise.all([
      SupportTicket.find(filter)
        .populate('user', 'username fullName avatar email')
        .populate('assignedTo', 'username fullName')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .select('-messages'),
      SupportTicket.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, total, page: Number(page), tickets });
  } catch (err) { next(err); }
};

// ─── ADMIN: UPDATE TICKET STATUS / ASSIGN ──────────────────────────────────
const adminUpdateTicket = async (req, res, next) => {
  try {
    const { status, priority, assignedTo } = req.body;
    const ticket = await SupportTicket.findById(req.params.ticketId);
    if (!ticket) return res.status(404).json({ success: false, message: 'Ticket not found.' });

    if (status) ticket.status = status;
    if (priority) ticket.priority = priority;
    if (assignedTo !== undefined) ticket.assignedTo = assignedTo || null;
    if (status === 'resolved') ticket.resolvedAt = new Date();
    if (status === 'closed') ticket.closedAt = new Date();

    await ticket.save();

    // Notify user of status change
    if (status) {
      await Notification.create({
        recipient: ticket.user,
        type: 'system',
        text: `Your support ticket "${ticket.subject.slice(0, 50)}" is now ${status.replace('_', ' ')}.`,
      });
    }

    res.status(200).json({ success: true, message: 'Ticket updated.', ticket });
  } catch (err) { next(err); }
};

// ─── ADMIN: TICKET ANALYTICS ────────────────────────────────────────────────
const adminTicketStats = async (req, res, next) => {
  try {
    const [total, open, inProgress, resolved, closed] = await Promise.all([
      SupportTicket.countDocuments(),
      SupportTicket.countDocuments({ status: 'open' }),
      SupportTicket.countDocuments({ status: 'in_progress' }),
      SupportTicket.countDocuments({ status: 'resolved' }),
      SupportTicket.countDocuments({ status: 'closed' }),
    ]);

    const byCategory = await SupportTicket.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    res.status(200).json({ success: true, stats: { total, open, inProgress, resolved, closed, byCategory } });
  } catch (err) { next(err); }
};

// ─── FEEDBACK ───────────────────────────────────────────────────────────────
const submitFeedback = async (req, res, next) => {
  try {
    const { type = 'general', rating, title, description } = req.body;
    if (!description) return res.status(400).json({ success: false, message: 'Description is required.' });

    const feedback = await Feedback.create({ user: req.user._id, type, rating, title, description });
    res.status(201).json({ success: true, message: 'Thank you for your feedback!', feedback });
  } catch (err) { next(err); }
};

// ─── BUG REPORT ─────────────────────────────────────────────────────────────
const submitBugReport = async (req, res, next) => {
  try {
    const { description, deviceInfo, browserInfo } = req.body;
    if (!description) return res.status(400).json({ success: false, message: 'Description is required.' });

    const screenshot = req.file
      ? { url: req.file.path, publicId: req.file.filename }
      : undefined;

    const bug = await BugReport.create({
      user: req.user._id,
      description,
      deviceInfo,
      browserInfo,
      ...(screenshot && { screenshot }),
    });

    res.status(201).json({ success: true, message: 'Bug report submitted. Thank you!', bug });
  } catch (err) { next(err); }
};

module.exports = {
  createTicket, getMyTickets, getTicket, replyToTicket, closeTicket,
  adminGetTickets, adminUpdateTicket, adminTicketStats,
  submitFeedback, submitBugReport,
};
