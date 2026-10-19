const mongoose = require('mongoose');

const ACTIONS = [
  'timer_start',
  'timer_stop',
  'task_create',
  'task_update',
  'task_delete',
];

const activityLogSchema = new mongoose.Schema(
  {
    actorType: {
      type: String,
      enum: ['member', 'admin'],
      required: true,
    },
    actorId: {
      type: String,
      required: true,
      index: true,
    },
    actorName: {
      type: String,
      required: true,
      trim: true,
    },
    actorEmail: {
      type: String,
      default: '',
      trim: true,
    },
    action: {
      type: String,
      enum: ACTIONS,
      required: true,
      index: true,
    },
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      default: null,
    },
    taskTitle: {
      type: String,
      default: '',
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true },
);

activityLogSchema.index({ createdAt: -1 });

activityLogSchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = {
  ActivityLog: mongoose.model('ActivityLog', activityLogSchema),
  LOG_ACTIONS: ACTIONS,
};
