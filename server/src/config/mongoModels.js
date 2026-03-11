import crypto from 'crypto';
import mongoose from './mongodb.js';

const { Schema } = mongoose;
const Mixed = Schema.Types.Mixed;

const createId = () => crypto.randomUUID();

function defineModel(name, schema) {
  return mongoose.models[name] || mongoose.model(name, schema);
}

const userSchema = new Schema(
  {
    id: { type: String, default: createId, unique: true, index: true },
    username: { type: String, required: true, trim: true, index: true },
    email: { type: String, required: true, trim: true, lowercase: true, index: true },
    password_hash: { type: String, required: true },
    name: { type: String, default: null },
    profileImageUrl: { type: String, default: null },
    avatarUrl: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

const taskSchema = new Schema(
  {
    id: { type: String, default: createId, unique: true, index: true },
    user_id: { type: String, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    department: { type: String, default: 'Compliance' },
    priority: { type: String, default: 'medium' },
    status: { type: String, default: 'pending' },
    due_date: { type: String, default: null },
    completed_at: { type: Date, default: null },
    ai_generated: { type: Boolean, default: false },
    source_rule_key: { type: String, default: null },
    source_circular_ref: { type: String, default: null },
    source_circular_title: { type: String, default: null },
    source_hash: { type: String, default: null },
    meta: { type: Mixed, default: {} },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

const conversationSchema = new Schema(
  {
    id: { type: String, default: createId, unique: true, index: true },
    user_id: { type: String, default: null, index: true },
    title: { type: String, default: 'New conversation' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

const messageSchema = new Schema(
  {
    id: { type: String, default: createId, unique: true, index: true },
    conversation_id: { type: String, required: true, index: true },
    role: { type: String, required: true },
    content: { type: String, default: '' },
    sources: { type: [Mixed], default: [] },
    charts: { type: Mixed, default: null },
    images: { type: [Mixed], default: null },
    videos: { type: [Mixed], default: null },
    excalidraw: { type: [Mixed], default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

const feedbackSchema = new Schema(
  {
    id: { type: String, default: createId, unique: true, index: true },
    title: { type: String, required: true, trim: true },
    message: { type: String, default: null },
    source_url: { type: String, default: null },
    email: { type: String, default: null },
    image_url: { type: String, default: null },
    user_id: { type: String, default: null, index: true },
    conversation_id: { type: String, default: null, index: true },
    session_id: { type: String, default: null, index: true },
    status: { type: String, default: 'new' },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

const rbiRuleSnapshotSchema = new Schema(
  {
    id: { type: String, default: createId, unique: true, index: true },
    rule_key: { type: String, required: true, unique: true, index: true },
    rule_title: { type: String, default: null },
    source_ref: { type: String, default: null },
    rule_hash: { type: String, required: true },
    last_effective_date: { type: String, default: null },
  },
  { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } },
);

const userProfileSchema = new Schema({
  id: { type: String, default: createId, unique: true, index: true },
  userId: { type: String, default: null, index: true },
  name: { type: String, required: true, trim: true },
  education: { type: String, default: '' },
  skills: { type: [String], default: [] },
  interests: { type: [String], default: [] },
  careerGoals: { type: String, default: '' },
  riskTolerance: { type: String, default: '' },
  lifestylePreference: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now },
});

const futureSimulationSchema = new Schema({
  id: { type: String, default: createId, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  scenarios: { type: [Mixed], default: [] },
  createdAt: { type: Date, default: Date.now },
});

const skillAnalysisSchema = new Schema({
  id: { type: String, default: createId, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  currentSkills: { type: [String], default: [] },
  missingSkills: { type: [String], default: [] },
  recommendedSkills: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

const chatHistorySchema = new Schema({
  id: { type: String, default: createId, unique: true, index: true },
  userId: { type: String, required: true, index: true },
  messages: { type: [Mixed], default: [] },
  createdAt: { type: Date, default: Date.now },
});

export const User = defineModel('User', userSchema);
export const Task = defineModel('Task', taskSchema);
export const Conversation = defineModel('Conversation', conversationSchema);
export const Message = defineModel('Message', messageSchema);
export const Feedback = defineModel('Feedback', feedbackSchema);
export const RbiRuleSnapshot = defineModel('RbiRuleSnapshot', rbiRuleSnapshotSchema);

export const UserProfile = defineModel('UserProfile', userProfileSchema);
export const FutureSimulation = defineModel('FutureSimulation', futureSimulationSchema);
export const SkillAnalysis = defineModel('SkillAnalysis', skillAnalysisSchema);
export const ChatHistory = defineModel('ChatHistory', chatHistorySchema);

export const tableToModelMap = {
  users: User,
  tasks: Task,
  conversations: Conversation,
  messages: Message,
  feedback: Feedback,
  rbi_rule_snapshots: RbiRuleSnapshot,
};
