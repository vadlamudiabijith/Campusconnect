export type UserRole = 'student' | 'faculty' | 'admin' | 'visitor' | 'security' | 'parent';

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  student_id?: string;
  faculty_id?: string;
  avatar_url?: string;
  department?: string;
  bio?: string;
  parent_of?: string;
  created_at: string;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  description: string;
  faculty_id: string;
  credits: number;
  semester: string;
  color: string;
  cover_url: string;
  created_at: string;
  faculty?: Profile;
  enrolled?: boolean;
  enrollment_count?: number;
}

export interface Announcement {
  id: string;
  course_id: string;
  author_id: string;
  title: string;
  content: string;
  pinned: boolean;
  created_at: string;
  author?: Profile;
}

export interface Assignment {
  id: string;
  course_id: string;
  created_by: string;
  title: string;
  description: string;
  due_date: string;
  max_marks: number;
  type: 'assignment' | 'quiz' | 'project' | 'exam';
  created_at: string;
  submission?: AssignmentSubmission;
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  student_id: string;
  status: 'pending' | 'submitted' | 'graded';
  marks?: number;
  notes?: string;
  submitted_at?: string;
}

export interface Material {
  id: string;
  course_id: string;
  uploaded_by: string;
  title: string;
  description: string;
  file_url: string;
  file_type: string;
  module: string;
  created_at: string;
  uploader?: Profile;
}

export interface Message {
  id: string;
  course_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: Profile;
}

export interface Grade {
  id: string;
  course_id: string;
  student_id: string;
  assignment_id: string;
  marks: number;
  max_marks: number;
  feedback: string;
  graded_by: string;
  graded_at: string;
  assignment?: Assignment;
}

export interface AttendanceRecord {
  id: string;
  course_id: string;
  student_id: string;
  date: string;
  status: 'present' | 'absent' | 'late';
  marked_by: string;
}

export interface Issue {
  id: string;
  reporter_id: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  location: string;
  image_url: string;
  upvotes: number;
  created_at: string;
  updated_at: string;
  reporter?: Profile;
}

export interface IssueTimeline {
  id: string;
  issue_id: string;
  actor_id: string;
  action: string;
  note: string;
  created_at: string;
  actor?: Profile;
}

export interface Club {
  id: string;
  name: string;
  description: string;
  category: string;
  logo_url: string;
  banner_url: string;
  president_id: string;
  member_count: number;
  is_active: boolean;
  created_at: string;
  is_member?: boolean;
  president?: Profile;
}

export interface Event {
  id: string;
  club_id?: string;
  organizer_id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  start_date: string;
  end_date: string;
  is_paid: boolean;
  fee: number;
  max_capacity?: number;
  registered_count: number;
  banner_url: string;
  tags: string[];
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  created_at: string;
  club?: Club;
  is_registered?: boolean;
}

export interface Payment {
  id: string;
  user_id: string;
  reference_id?: string;
  reference_type: 'event' | 'fee' | 'other';
  amount: number;
  description: string;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  transaction_id?: string;
  payment_method: string;
  created_at: string;
}

export interface Visitor {
  id: string;
  name: string;
  email: string;
  phone: string;
  purpose: string;
  host_id: string;
  host_name: string;
  qr_code: string;
  check_in?: string;
  check_out?: string;
  status: 'pending' | 'checked_in' | 'checked_out' | 'expired';
  created_at: string;
  host?: Profile;
}

export interface TimetableEntry {
  id: string;
  course_id: string;
  day_of_week: string;
  start_time: string;
  end_time: string;
  room: string;
  week_topic: string;
  course?: Course;
}

export interface Feedback {
  id: string;
  user_id: string;
  target_type: 'course' | 'faculty' | 'campus' | 'event';
  target_id?: string;
  rating: number;
  comment: string;
  is_anonymous: boolean;
  created_at: string;
  user?: Profile;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'assignment' | 'event' | 'message' | 'issue';
  is_read: boolean;
  link: string;
  created_at: string;
}
