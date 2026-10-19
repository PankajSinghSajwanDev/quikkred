const mongoose = require('mongoose');

const taskUpdateSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
      index: true,
    },
    actorType: {
      type: String,
      enum: ['member', 'admin'],
      required: true,
    },
    actorId: {
      type: String,
      required: true,
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
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 2000,
    },
    etaMinutes: {
      type: Number,
      default: null,
      min: 1,
    },
  },
  { timestamps: true },
);

taskUpdateSchema.index({ task: 1, createdAt: -1 });

taskUpdateSchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = {
  TaskUpdate: mongoose.model('TaskUpdate', taskUpdateSchema),
};
