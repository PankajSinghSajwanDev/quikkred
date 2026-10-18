const mongoose = require('mongoose');

const TEAM_ROLES = [
  'developer',
  'tester',
  'project_manager',
  'designer',
  'devops',
  'qa_lead',
  'tech_lead',
  'business_analyst',
];

const teamMemberSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    number: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
    },
    role: {
      type: String,
      required: true,
      enum: TEAM_ROLES,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
  },
  { timestamps: true },
);

teamMemberSchema.set('toJSON', {
  transform(_doc, ret) {
    ret.id = String(ret._id);
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    return ret;
  },
});

module.exports = {
  TeamMember: mongoose.model('TeamMember', teamMemberSchema),
  TEAM_ROLES,
};
