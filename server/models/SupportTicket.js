const mongoose = require('mongoose');

const TicketMessageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    senderRole: { type: String, enum: ['user', 'support', 'admin'], default: 'user' },
    text: { type: String, required: true, maxlength: 5000 },
    attachment: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
      originalName: { type: String, default: '' },
    },
  },
  { timestamps: true }
);

const SupportTicketSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    subject: { type: String, required: true, maxlength: 200 },
    category: {
      type: String,
      enum: ['account_issue', 'login_problem', 'otp_problem', 'technical_bug', 'feature_request', 'report_abuse', 'privacy_concern', 'other'],
      required: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium',
    },
    description: { type: String, required: true, maxlength: 5000 },
    attachment: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },

    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'closed'],
      default: 'open',
      index: true,
    },

    messages: [TicketMessageSchema],

    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },

    // Notification flag: user hasn't seen new support reply
    hasUnreadUserReply: { type: Boolean, default: false },
    hasUnreadSupportReply: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Auto-generate ticket number before save
SupportTicketSchema.pre('save', async function (next) {
  if (!this.ticketNumber) {
    const count = await mongoose.model('SupportTicket').countDocuments();
    this.ticketNumber = `PB-${String(count + 1).padStart(5, '0')}`;
  }
  next();
});

SupportTicketSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SupportTicket', SupportTicketSchema);
