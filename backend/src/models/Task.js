const mongoose = require('mongoose');

const TASK_PRIORITIES = ['low', 'medium', 'high'];
const TASK_STATUSES = ['todo', 'in_progress', 'done'];

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
      trim: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    priority: {
      type: String,
      enum: TASK_PRIORITIES,
      default: 'medium',
    },
    status: {
      type: String,
      enum: TASK_STATUSES,
      default: 'todo',
    },
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeamMember',
      default: null,
    },
    /** Team member who created the task (null = created by admin) */
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TeamMember',
      default: null,
    },
    timerStartedAt: {
      type: Date,
      default: null,
    },
    timeSpentMs: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  { timestamps: true },
);

taskSchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = {
  Task: mongoose.model('Task', taskSchema),
  TASK_PRIORITIES,
  TASK_STATUSES,
};
