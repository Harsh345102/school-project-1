import { useState, useEffect, useRef, lazy, Suspense, useMemo } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { 
  Shield, 
  LogOut, 
  Users, 
  BookOpen, 
  Calendar, 
  Settings, 
  FileText, 
  BarChart3,
  Bell,
  Edit,
  Eye,
  Plus,
  Search,
  X,
  Trophy,
  UserPlus,
  IdCard,
  DollarSign,
  Clock,
  GraduationCap,
  MessageSquare,
  Star,
  Send,
  Volume2,
  Mail,
  Copy,
  Image as ImageIcon,
  Trash2
} from "lucide-react";
import { Bus } from "lucide-react";
import { Button } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getSupabaseData, setSupabaseData, subscribeToSupabaseChanges } from "@/lib/supabaseHelpers";
import { supabase } from "@/lib/supabaseClient";
import RouteLoader from "@/components/RouteLoader";
import { toast } from "sonner";

const TeacherManager = lazy(() => import("@/components/TeacherManager"));
const HomepageEditor = lazy(() => import("@/components/HomepageEditor"));
const AnnouncementManager = lazy(() => import("@/components/AnnouncementManager"));
const GalleryManagerSimple = lazy(() => import("@/components/GalleryManagerSimple"));
const AboutPageManager = lazy(() => import("@/components/AboutPageManager"));
const CourseManager = lazy(() => import("@/components/CourseManager"));
const TopScorersManager = lazy(() => import("@/components/TopScorersManager"));
const AdmissionsPageManager = lazy(() => import("@/components/AdmissionsPageManager"));
const DocumentViewer = lazy(() => import("@/components/DocumentViewer"));
const BrandingManager = lazy(() => import("@/components/BrandingManager"));
const EventsManager = lazy(() => import("@/components/EventsManager"));
const CategoryManager = lazy(() => import("@/components/CategoryManager"));
const AcademicsManager = lazy(() => import("@/components/AcademicsManager"));
const FacilitiesManager = lazy(() => import("@/components/FacilitiesManager"));
const AudioMessageManager = lazy(() => import("@/components/AudioMessageManager"));
const YearlyBookManager = lazy(() => import("@/components/YearlyBookManager"));
const ExamRoutineManager = lazy(() => import("@/components/ExamRoutineManager"));
const TopScorersLearnMoreManager = lazy(() => import("@/components/TopScorersLearnMoreManager"));

// Notification interfaces
interface Notification {
  id: string;
  fromId: string;
  fromName: string;
  fromType: 'teacher' | 'principal';
  toId: string;
  toName: string;
  toType: 'teacher' | 'principal';
  subject: string;
  message: string;
  photo1?: string;
  photo2?: string;
  createdAt: string;
  status: 'unread' | 'read';
  replies?: NotificationReply[];
}

// Bus <-> Principal messaging
interface BusPrincipalMsg {
  id: string;
  owner: string; // principal email lowercased
  busUserId: string;
  busId: string;
  from: 'bus' | 'principal';
  type: 'good' | 'bad' | 'reply';
  text: string;
  images?: string[]; // up to 4
  createdAt: string;
  driverName?: string;
}

interface NotificationReply {
  id: string;
  fromId: string;
  fromName: string;
  fromType: 'teacher' | 'principal';
  message: string;
  createdAt: string;
}

interface PrincipalRemark {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  section: string;
  type: 'good' | 'bad';
  message: string;
  subject: string;
  principalId: string;
  principalName: string;
  createdAt: string;
}

interface FeeRecord {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  section: string;
  month: string;
  year: number;
  amount: number;
  status: 'paid' | 'pending' | 'overdue';
  paymentDate?: string;
  notes?: string;
  teacherId?: string;
}

interface AttendanceRecord {
  id: string;
  date: string;
  class: string;
  section: string;
  students: {
    studentId: string;
    status: 'present' | 'absent' | 'late';
    remarks?: string;
  }[];
  teacherId: string;
}

interface StudentReport {
  id: string;
  studentId: string;
  studentName: string;
  teacherId: string;
  teacherName: string;
  subject: string;
  reportImage: string;
  notes: string;
  createdAt: string;
  class: string;
  section: string;
}

// Admission record type for localStorage sync with Admissions page
interface AdmissionRecord {
  id: string;
  createdAt: string;
  paymentStatus: 'paid' | 'test';
  paymentMethod?: 'razorpay' | 'paypal' | 'stripe' | 'test' | null;
  subscriptionType: 'monthly' | 'yearly';
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  citizenship: string;
  level: string;
  term: string;
  program: string;
  essay: string;
  ref1: string;
  refEmail: string;
  // Additional properties for student records
  class?: string;
  rollNumber?: string;
  studentPhoto?: string | null;
  aadhaarCard?: string | null;
  birthCertificate?: string | null;
  // Additional properties that seem to be used in the code
  fatherName?: string;
  motherName?: string;
  studentAge?: number;
}

// Teacher record used for Principal teacher management
interface TeacherRecord {
  id: string;
  name: string;
  email: string;
  subject: string;
  employeeId?: string;
  phone?: string;
  assignedClass?: string;
  assignedSection?: string;
  classes?: string[]; // e.g. ["8A", "9B"]
  password?: string;
  status: 'active' | 'banned';
  joinDate?: string;
  createdAt?: string;
}

const PrincipalDashboard = () => {
  const [principalEmail, setPrincipalEmail] = useState("");
  // Restore active section from sessionStorage on mount
  const [activeSection, setActiveSection] = useState<"dashboard" | "teachers" | "homepage" | "courses" | "gallery" | "about" | "announcements" | "admissions" | "topscorers" | "createteacherid" | "manageteachers" | "manageteacherid" | "pricemanagement" | "timetable" | "admissionsmanager" | "branding" | "events" | "categories" | "academicsmanager" | "facilitiesmanager" | "audiomessages" | "booksmanager" | "examroutine" | "contactforms" | "topscorerslearnmore">(() => {
    const saved = sessionStorage.getItem('principalActiveSection');
    return (saved as any) || "dashboard";
  });

  // Teacher creation form state
  const [teacherForm, setTeacherForm] = useState({
    fullName: "",
    email: "",
    subject: "",
    employeeId: "",
    phone: "",
    assignedClass: "",
    assignedSection: "",
    password: "",
    sendCredentials: false
  });

  const [admissions, setAdmissions] = useState<AdmissionRecord[]>([]);
  const [admissionsSearch, setAdmissionsSearch] = useState("");
  const [contentManagementSearch, setContentManagementSearch] = useState("");
  const [quickActionsSearch, setQuickActionsSearch] = useState("");
  const [admissionStatus, setAdmissionStatus] = useState(true); // true = ON, false = OFF
  const [contactForms, setContactForms] = useState<any[]>([]);
  const [contactFormsSearch, setContactFormsSearch] = useState("");
  const [selectedContactForms, setSelectedContactForms] = useState<string[]>([]); // Add this line
  const [deleteConfirmModal, setDeleteConfirmModal] = useState<{ show: boolean; admissionId: string | null; studentName: string }>({ show: false, admissionId: null, studentName: '' });
  const [neverAskAgain, setNeverAskAgain] = useState(false);
  const [documentViewer, setDocumentViewer] = useState<{ show: boolean; url: string; name: string }>({ show: false, url: '', name: '' });

  // Timetable management state
  const [selectedTimetableClass, setSelectedTimetableClass] = useState("1");
  const [selectedTimetableSection, setSelectedTimetableSection] = useState("A");
  const [currentTimetable, setCurrentTimetable] = useState<any[]>([]);
  const [editingPeriod, setEditingPeriod] = useState<any>(null);
  const [showPeriodModal, setShowPeriodModal] = useState(false);

  const navigate = useNavigate();
  // Teachers state (for Manage Teachers section)
  const [teachers, setTeachers] = useState<TeacherRecord[]>([]);
  const [teacherSearch, setTeacherSearch] = useState("");
  // Price management state
  const [pricing, setPricing] = useState({
    monthly: 5000,
    yearly: 50000
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teacherSubjectFilter, setTeacherSubjectFilter] = useState("");
  const [teacherStatusFilter, setTeacherStatusFilter] = useState("");
  const [editTeacher, setEditTeacher] = useState<TeacherRecord | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Bus inbox state
  const [showBusInbox, setShowBusInbox] = useState(false);
  const [busInbox, setBusInbox] = useState<BusPrincipalMsg[]>([]);
  const [selectedBusUserId, setSelectedBusUserId] = useState<string | null>(null);
  const [busReplyText, setBusReplyText] = useState('');
  const [busReplyImgs, setBusReplyImgs] = useState<(string | null)[]>([null, null, null, null]);

  // Principal remarks state
  const [showPrincipalRemarksModal, setShowPrincipalRemarksModal] = useState(false);
  const [principalRemarksForm, setPrincipalRemarksForm] = useState({
    studentId: '',
    type: 'good' as 'good' | 'bad',
    message: '',
    subject: ''
  });
  const [principalRemarkFilters, setPrincipalRemarkFilters] = useState({
    class: '',
    section: '',
    roll: ''
  });
  const [students, setStudents] = useState<any[]>([]);
  const [feeRecords, setFeeRecords] = useState<FeeRecord[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [studentReports, setStudentReports] = useState<StudentReport[]>([]);
  const [authStudentRecords, setAuthStudentRecords] = useState<any[]>([]);
  const [principalRemarksData, setPrincipalRemarksData] = useState<PrincipalRemark[]>([]);
  const [showStudentLookupModal, setShowStudentLookupModal] = useState(false);
  const [studentLookupFilters, setStudentLookupFilters] = useState({
    class: '',
    section: '',
    roll: '',
    studentId: ''
  });
  const [studentLookupResults, setStudentLookupResults] = useState<any[]>([]);
  const [selectedLookupStudent, setSelectedLookupStudent] = useState<any | null>(null);

  // Notification reply state
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);
  const [showNotificationReplyModal, setShowNotificationReplyModal] = useState(false);
  const [replyMessage, setReplyMessage] = useState('');

  // Student notification state
  const [showStudentNotificationModal, setShowStudentNotificationModal] = useState(false);
  const [studentNotificationForm, setStudentNotificationForm] = useState({
    subject: '',
    message: '',
    targetType: 'all' as 'all' | 'class' | 'section' | 'student',
    targetClass: '',
    targetSection: '',
    targetStudentId: '',
    photo1: '',
    photo2: ''
  });
  const [sentStudentNotifications, setSentStudentNotifications] = useState<any[]>([]);
  const [showSentNotificationsModal, setShowSentNotificationsModal] = useState(false);
  const [editingStudentNotification, setEditingStudentNotification] = useState<any>(null);
  const [showEditStudentNotificationModal, setShowEditStudentNotificationModal] = useState(false);

  // Load realtime bus principal messages
  useEffect(() => {
    const owner = (principalEmail || localStorage.getItem('principalEmail') || 'principal.1025@gmail.com').toLowerCase();
    const unsubscribe = subscribeToSupabaseChanges<BusPrincipalMsg[]>(
      'royal-academy-bus-principal-messages',
      (list) => {
        const arr = Array.isArray(list) ? list : [];
        setBusInbox(arr.filter(m => m.owner === owner).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      }
    );
    // Initial load
    (async () => {
      const all = await getSupabaseData<BusPrincipalMsg[]>('royal-academy-bus-principal-messages', []);
      const arr = Array.isArray(all) ? all : [];
      setBusInbox(arr.filter(m => m.owner === owner).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    })();
    return () => unsubscribe();
  }, [principalEmail]);

  const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const [editingBusReplyId, setEditingBusReplyId] = useState<string | null>(null);

  const onPickBusReplyImage = async (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const b64 = await toBase64(f);
    setBusReplyImgs(prev => prev.map((v, i) => (i === idx ? b64 : v)) as (string|null)[]);
  };

  const sendBusReply = async () => {
    if (!selectedBusUserId || !busReplyText.trim()) return;
    const owner = (principalEmail || localStorage.getItem('principalEmail') || 'principal.1025@gmail.com').toLowerCase();
    const thread = busInbox.filter(m => m.busUserId === selectedBusUserId).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const last = thread[0];
    const payload: BusPrincipalMsg = {
      id: `BUSPRN${Date.now()}`,
      owner,
      busUserId: selectedBusUserId,
      busId: last?.busId || '',
      from: 'principal',
      type: 'reply',
      text: busReplyText.trim(),
      images: busReplyImgs.filter(Boolean) as string[],
      createdAt: new Date().toISOString(),
    };
    const list = await getSupabaseData<BusPrincipalMsg[]>('royal-academy-bus-principal-messages', []);
    const updated = [...(list || []), payload];
    await setSupabaseData('royal-academy-bus-principal-messages', updated);
    setBusReplyText('');
    setBusReplyImgs([null, null, null, null]);
    toast.success('Reply sent');
  };

  const editBusReply = async () => {
    if (!editingBusReplyId || !busReplyText.trim()) return;
    try {
      const list = await getSupabaseData<BusPrincipalMsg[]>('royal-academy-bus-principal-messages', []);
      const updated = (list || []).map(m =>
        m.id === editingBusReplyId ? {
          ...m,
          text: busReplyText.trim(),
          images: busReplyImgs.filter(Boolean) as string[],
        } : m
      );
      await setSupabaseData('royal-academy-bus-principal-messages', updated);
      setBusReplyText('');
      setBusReplyImgs([null, null, null, null]);
      setEditingBusReplyId(null);
      toast.success('Reply updated');
    } catch (e) {
      toast.error('Failed to update reply');
    }
  };

  const deleteBusReply = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reply?')) return;
    try {
      const list = await getSupabaseData<BusPrincipalMsg[]>('royal-academy-bus-principal-messages', []);
      const updated = (list || []).filter(m => m.id !== id);
      await setSupabaseData('royal-academy-bus-principal-messages', updated);
      toast.success('Reply deleted');
    } catch (e) {
      toast.error('Failed to delete reply');
    }
  };

  const startEditBusReply = (msg: BusPrincipalMsg) => {
    setEditingBusReplyId(msg.id);
    setBusReplyText(msg.text);
    setBusReplyImgs(msg.images && msg.images.length > 0 ? [...msg.images, null, null, null].slice(0, 4) : [null, null, null, null]);
  };

  // Student lookup helpers
  const resetStudentLookup = () => {
    setStudentLookupFilters({ class: '', section: '', roll: '', studentId: '' });
    setSelectedLookupStudent(null);
    setStudentLookupResults([]);
  };

  const closeStudentLookupModal = () => {
    setShowStudentLookupModal(false);
    resetStudentLookup();
  };

  const handleSelectLookupStudent = (student: any) => {
    setSelectedLookupStudent(student);
  };

  const updateStudentLookupFilter = (field: keyof typeof studentLookupFilters, value: string) => {
    setStudentLookupFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle teacher account creation
  const handleCreateTeacher = async () => {
    // Validation
    if (!teacherForm.fullName || !teacherForm.email || !teacherForm.subject || !teacherForm.assignedClass || !teacherForm.assignedSection) {
      alert("Please fill all required fields");
      return;
    }

    try {
      const teacherId = teacherForm.employeeId || `TCH${Date.now().toString().slice(-6)}`;
      const defaultPassword = `${teacherForm.fullName.split(' ')[0].toLowerCase()}123`;
      const newTeacher: TeacherRecord = {
        id: teacherId,
        name: teacherForm.fullName,
        email: teacherForm.email,
        subject: teacherForm.subject,
        employeeId: teacherId,
        phone: teacherForm.phone,
        assignedClass: teacherForm.assignedClass,
        assignedSection: teacherForm.assignedSection,
        password: defaultPassword,
        status: 'active',
        joinDate: new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      };

      // Save to Supabase
      const existingTeachers = await getSupabaseData<TeacherRecord[]>('royal-academy-teachers', []);
      await setSupabaseData('royal-academy-teachers', [...existingTeachers, newTeacher]);

      const existingAuthTeachers = await getSupabaseData<any[]>('royal-academy-auth-teachers', []);
      const authTeacher = { ...newTeacher, username: teacherForm.fullName, teacherId, type: 'teacher' } as any;
      await setSupabaseData('royal-academy-auth-teachers', [...existingAuthTeachers, authTeacher]);

      alert(`Teacher account created successfully!

Login Credentials:
Email: ${teacherForm.email}
Password: ${defaultPassword}
Teacher ID: ${teacherId}`);
      setTeachers(prev => [...prev, newTeacher]);
      setActiveSection('manageteachers');
      setTeacherForm({ fullName: "", email: "", subject: "", employeeId: "", phone: "", assignedClass: "", assignedSection: "", password: "", sendCredentials: false });
    } catch (error) {
      alert("Failed to create teacher account. Please try again.");
      console.error("[PrincipalDashboard] Error creating teacher:", error);
    }
  };

  // Save edited teacher (updates both teachers and auth lists)
  const handleSaveTeacherEdit = async () => {
    if (!editTeacher) return;
    const updated = teachers.map(t => (t.id === editTeacher.id ? editTeacher : t));
    setTeachers(updated);

    // Save to Supabase
    await setSupabaseData('royal-academy-teachers', updated);

    try {
      const auth = await getSupabaseData<any[]>('royal-academy-auth-teachers', []);
      const updatedAuth = (auth || []).map((a: any) =>
        (a.id === editTeacher.id || a.teacherId === editTeacher.id)
          ? { ...a, username: editTeacher.name, name: editTeacher.name, email: editTeacher.email, subject: editTeacher.subject, phone: editTeacher.phone, assignedClass: editTeacher.assignedClass, assignedSection: editTeacher.assignedSection, status: editTeacher.status }
          : a
      );
      await setSupabaseData('royal-academy-auth-teachers', updatedAuth);
    } catch (err) {
      console.error('[PrincipalDashboard] Error updating auth teachers:', err);
    }

    setEditTeacher(null);
  };

  // Load teachers from Supabase (with localStorage fallback)
  const loadTeachers = async () => {
    try {
      console.log('[PrincipalDashboard] Loading teachers from Supabase...');
      const data = await getSupabaseData<TeacherRecord[]>('royal-academy-teachers', []);
      console.log('[PrincipalDashboard] Loaded teachers:', data.length);
      setTeachers(data);
    } catch (e) {
      console.error('[PrincipalDashboard] Error loading teachers:', e);
      setTeachers([]);
    }
  };

  // Toggle ban/unban teacher
  const handleToggleBan = async (teacherId: string) => {
    const updated: TeacherRecord[] = teachers.map(t =>
      t.id === teacherId ? { ...t, status: (t.status === 'active' ? 'banned' : 'active') as 'active' | 'banned' } : t
    );
    setTeachers(updated);
    await setSupabaseData('royal-academy-teachers', updated);
  };

  // Delete teacher
  const handleDeleteTeacher = async (teacherId: string) => {
    if (!window.confirm('Are you sure you want to delete this teacher?')) return;
    const updated: TeacherRecord[] = teachers.filter(t => t.id !== teacherId);
    setTeachers(updated);
    await setSupabaseData('royal-academy-teachers', updated);

    try {
      const existingAuth = await getSupabaseData<any[]>('royal-academy-auth-teachers', []);
      const updatedAuth = existingAuth.filter((t: any) => t.id !== teacherId && t.teacherId !== teacherId);
      await setSupabaseData('royal-academy-auth-teachers', updatedAuth);
    } catch (err) {
      console.error('[PrincipalDashboard] Error deleting from auth teachers:', err);
    }
  };

  // Persist active section to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('principalActiveSection', activeSection);
  }, [activeSection]);

  useEffect(() => {
    if (!showStudentLookupModal) return;

    let filtered = [...students];

    if (studentLookupFilters.studentId.trim()) {
      const search = studentLookupFilters.studentId.trim().toLowerCase();
      filtered = filtered.filter(student =>
        (student.id && student.id.toLowerCase().includes(search)) ||
        (student.studentId && student.studentId.toLowerCase().includes(search)) ||
        (student.rollNumber && student.rollNumber.toLowerCase().includes(search))
      );
    } else {
      if (studentLookupFilters.class) {
        filtered = filtered.filter(student => (student.class || '').toString() === studentLookupFilters.class);
      }
      if (studentLookupFilters.section) {
        filtered = filtered.filter(student => (student.section || '').toString().toLowerCase() === studentLookupFilters.section.toLowerCase());
      }
      if (studentLookupFilters.roll) {
        const rollQuery = studentLookupFilters.roll.trim().toLowerCase();
        filtered = filtered.filter(student => (student.rollNumber || '').toLowerCase().includes(rollQuery));
      }
    }

    filtered.sort((a, b) => (a.fullName || a.name || '').localeCompare(b.fullName || b.name || ''));
    setStudentLookupResults(filtered);
  }, [showStudentLookupModal, studentLookupFilters, students]);

  useEffect(() => {
    // Check authentication
    const isAuth = localStorage.getItem("principalAuth");
    const email = localStorage.getItem("principalEmail");

    console.log("Auth check:", { isAuth, email });

    if (!isAuth || isAuth !== "true") {
      console.log("Not authenticated, setting default for testing");
      // For testing - set default credentials
      localStorage.setItem("principalAuth", "true");
      localStorage.setItem("principalEmail", "principal.1025@gmail.com");
      setPrincipalEmail("principal.1025@gmail.com");
      return;
    }

    if (email) {
      setPrincipalEmail(email);
    }

    // Load notifications from localStorage
    const storedNotifications = localStorage.getItem('royal-academy-notifications');
    if (storedNotifications) {
      const allNotifications: Notification[] = JSON.parse(storedNotifications);
      // Filter notifications for principal
      const principalNotifications = allNotifications.filter(n => n.toType === 'principal');
      setNotifications(principalNotifications);
    }

    // Load students for principal remarks
    const storedStudents = localStorage.getItem('royal-academy-students');
    if (storedStudents) {
      setStudents(JSON.parse(storedStudents));
    }

    const storedFeeRecords = localStorage.getItem('royal-academy-fee-records');
    if (storedFeeRecords) {
      try {
        setFeeRecords(JSON.parse(storedFeeRecords));
      } catch (err) {
        console.error('Failed to parse fee records', err);
      }
    }

    const storedAttendance = localStorage.getItem('royal-academy-attendance');
    if (storedAttendance) {
      try {
        setAttendanceRecords(JSON.parse(storedAttendance));
      } catch (err) {
        console.error('Failed to parse attendance records', err);
      }
    }

    const storedReports = localStorage.getItem('royal-academy-student-reports');
    if (storedReports) {
      try {
        setStudentReports(JSON.parse(storedReports));
      } catch (err) {
        console.error('Failed to parse student reports', err);
      }
    }

    const storedAuthStudents = localStorage.getItem('royal-academy-auth-students');
    if (storedAuthStudents) {
      try {
        setAuthStudentRecords(JSON.parse(storedAuthStudents));
      } catch (err) {
        console.error('Failed to parse auth student records', err);
      }
    }

    const storedPrincipalRemarks = localStorage.getItem('royal-academy-principal-remarks');
    if (storedPrincipalRemarks) {
      try {
        setPrincipalRemarksData(JSON.parse(storedPrincipalRemarks));
      } catch (err) {
        console.error('Failed to parse principal remarks', err);
      }
    }

    // Load sent student notifications
    const storedStudentNotifications = localStorage.getItem('royal-academy-student-notifications');
    if (storedStudentNotifications) {
      const allStudentNotifications = JSON.parse(storedStudentNotifications);
      // Filter notifications sent by this principal
      const mySentNotifications = allStudentNotifications.filter((n: any) => n.senderId === principalEmail);
      setSentStudentNotifications(mySentNotifications);
    }

    console.log("Authentication successful, email set:", email);
  }, []);

  // Close notifications when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showNotifications && !target.closest('[data-notification-container]')) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  // Load admissions directly from Supabase (no localStorage fallback)
  const loadAdmissions = async () => {
    try {
      console.log('[PrincipalDashboard] Loading admissions directly from Supabase...');
      
      // Direct Supabase query without localStorage fallback
      const { data, error } = await supabase
        .from('app_state')
        .select('value')
        .eq('key', 'royal-academy-admissions')
        .maybeSingle();

      if (error) {
        console.error('[PrincipalDashboard] Supabase error:', error);
        setAdmissions([]);
        return;
      }

      if (data && data.value) {
        try {
          const parsedData = JSON.parse(data.value);
          console.log('[PrincipalDashboard] Raw Supabase data:', parsedData);
          console.log('[PrincipalDashboard] Data type:', typeof parsedData, 'Is array:', Array.isArray(parsedData));
          
          // Ensure data is always an array
          const safeData = Array.isArray(parsedData) ? parsedData : [];
          console.log('[PrincipalDashboard] Safe admission data length:', safeData.length);
          
          if (safeData.length > 0) {
            console.log('[PrincipalDashboard] First admission:', safeData[0]);
          }
          
          setAdmissions(safeData);
        } catch (parseError) {
          console.error('[PrincipalDashboard] Error parsing Supabase data:', parseError);
          setAdmissions([]);
        }
      } else {
        console.log('[PrincipalDashboard] No admission data found in Supabase');
        setAdmissions([]);
      }
    } catch (e) {
      console.error('[PrincipalDashboard] Error loading admissions from Supabase:', e);
      setAdmissions([]);
    }
  };

  // Load admission status from Supabase
  const loadAdmissionStatus = async () => {
    try {
      const status = await getSupabaseData<boolean>('royal-academy-admission-status', true);
      setAdmissionStatus(status);
    } catch (e) {
      console.error('[PrincipalDashboard] Error loading admission status:', e);
      setAdmissionStatus(true); // Default to ON
    }
  };

  // Toggle admission status
  const toggleAdmissionStatus = async () => {
    try {
      const newStatus = !admissionStatus;
      setAdmissionStatus(newStatus);
      await setSupabaseData('royal-academy-admission-status', newStatus);
      alert(`Admissions are now ${newStatus ? 'OPEN' : 'CLOSED'}`);
    } catch (e) {
      console.error('[PrincipalDashboard] Error toggling admission status:', e);
      alert('Failed to update admission status');
    }
  };

  // Load contact forms from Supabase
  const loadContactForms = async () => {
    try {
      const contactFormsData = await getSupabaseData<any[]>('royal-academy-contact-forms', []);
      setContactForms(contactFormsData);
    } catch (e) {
      console.error('[PrincipalDashboard] Error loading contact forms:', e);
      setContactForms([]);
    }
  };

  // Delete admission record
  const handleDeleteAdmission = async (admissionId: string) => {
    try {
      console.log('[PrincipalDashboard] Deleting admission:', admissionId);
      const safeAdmissions = Array.isArray(admissions) ? admissions : [];
      const updated = safeAdmissions.filter(a => a.id !== admissionId);
      setAdmissions(updated);
      await setSupabaseData('royal-academy-admissions', updated);
      alert('Admission record deleted successfully!');
    } catch (error) {
      console.error('[PrincipalDashboard] Error deleting admission:', error);
      alert('Failed to delete admission record');
    }
  };

  // Show delete confirmation
  const showDeleteConfirmation = (admissionId: string, studentName: string) => {
    // Check if user selected "never ask again"
    const neverAsk = localStorage.getItem('never-ask-delete-admission');
    if (neverAsk === 'true') {
      handleDeleteAdmission(admissionId);
      return;
    }

    setDeleteConfirmModal({ show: true, admissionId, studentName });
  };

  // Confirm deletion
  const confirmDelete = async () => {
    if (deleteConfirmModal.admissionId) {
      // Save preference if checked
      if (neverAskAgain) {
        localStorage.setItem('never-ask-delete-admission', 'true');
      }

      await handleDeleteAdmission(deleteConfirmModal.admissionId);
      setDeleteConfirmModal({ show: false, admissionId: null, studentName: '' });
      setNeverAskAgain(false);
    }
  };

  // Delete contact form
  const handleDeleteContactForm = async (formId: string) => {
    try {
      const updated = contactForms.filter(f => f.id !== formId);
      setContactForms(updated);
      await setSupabaseData('royal-academy-contact-forms', updated);
      // Also remove from selected forms if it was selected
      setSelectedContactForms(selectedContactForms.filter(id => id !== formId));
      alert('Contact form deleted successfully!');
    } catch (error) {
      console.error('[PrincipalDashboard] Error deleting contact form:', error);
      alert('Failed to delete contact form');
    }
  };

  // Delete selected contact forms
  const handleDeleteSelectedContactForms = async () => {
    if (selectedContactForms.length === 0) return;
    
    if (!window.confirm(`Are you sure you want to delete ${selectedContactForms.length} contact form(s)?`)) {
      return;
    }

    try {
      const updated = contactForms.filter(f => !selectedContactForms.includes(f.id));
      setContactForms(updated);
      await setSupabaseData('royal-academy-contact-forms', updated);
      setSelectedContactForms([]); // Clear selection
      alert(`${selectedContactForms.length} contact form(s) deleted successfully!`);
    } catch (error) {
      console.error('[PrincipalDashboard] Error deleting selected contact forms:', error);
      alert('Failed to delete selected contact forms');
    }
  };

  useEffect(() => {
    const initDashboard = async () => {
      try {
        await loadAdmissions();
        await loadTeachers();
        await loadAdmissionStatus();
        await loadContactForms();

        // Load pricing from Supabase
        const savedPricing = await getSupabaseData<typeof pricing>('royal-academy-pricing', { monthly: 5000, yearly: 50000 });
        setPricing(savedPricing);

        setIsLoading(false);
      } catch (error) {
        console.error('[PrincipalDashboard] Error initializing dashboard:', error);
        setError('Failed to load dashboard data');
        setIsLoading(false);
      }
    };

    initDashboard();

    // Subscribe to realtime changes using direct Supabase
    const unsubscribeAdmissions = subscribeToSupabaseChanges<AdmissionRecord[]>(
      'royal-academy-admissions',
      (newData) => {
        console.log('[PrincipalDashboard] Received realtime admissions update');
        console.log('[PrincipalDashboard] New data:', newData);
        const safeData = Array.isArray(newData) ? newData : [];
        console.log('[PrincipalDashboard] Setting safe data length:', safeData.length);
        setAdmissions(safeData);
      }
    );

    const unsubscribeTeachers = subscribeToSupabaseChanges<TeacherRecord[]>(
      'royal-academy-teachers',
      (newData) => {
        console.log('[PrincipalDashboard] Received realtime teachers update');
        setTeachers(newData);
      }
    );

    const unsubscribeAdmissionStatus = subscribeToSupabaseChanges<boolean>(
      'royal-academy-admission-status',
      (newData) => {
        console.log('[PrincipalDashboard] Received realtime admission status update:', newData);
        setAdmissionStatus(newData);
      }
    );

    const unsubscribeContactForms = subscribeToSupabaseChanges<any[]>(
      'royal-academy-contact-forms',
      (newData) => {
        console.log('[PrincipalDashboard] Received realtime contact forms update');
        setContactForms(newData || []);
      }
    );

    return () => {
      unsubscribeAdmissions();
      unsubscribeTeachers();
      unsubscribeAdmissionStatus();
      unsubscribeContactForms();
    };
  }, []);

  // Reload admissions when the Admissions section opens
  useEffect(() => {
    if (activeSection === 'admissions') {
      loadAdmissions();
    }
  }, [activeSection]);

  const handleLogout = () => {
    localStorage.removeItem("principalAuth");
    localStorage.removeItem("principalEmail");
    navigate("/");
  };

  const markAsRead = (notificationId: string) => {
    const updatedNotifications = notifications.map(notif => 
      notif.id === notificationId 
        ? { ...notif, status: 'read' as const }
        : notif
    );
    setNotifications(updatedNotifications);

    // Update localStorage
    const allNotifications = JSON.parse(localStorage.getItem('royal-academy-notifications') || '[]');
    const updatedAllNotifications = allNotifications.map((n: Notification) => 
      n.id === notificationId ? { ...n, status: 'read' as const } : n
    );
    localStorage.setItem('royal-academy-notifications', JSON.stringify(updatedAllNotifications));
  };

  const markAllAsRead = () => {
    const updatedNotifications = notifications.map(notif => ({ ...notif, status: 'read' as const }));
    setNotifications(updatedNotifications);

    // Update localStorage
    const allNotifications = JSON.parse(localStorage.getItem('royal-academy-notifications') || '[]');
    const updatedAllNotifications = allNotifications.map((n: Notification) => {
      const updated = updatedNotifications.find(un => un.id === n.id);
      return updated || n;
    });
    localStorage.setItem('royal-academy-notifications', JSON.stringify(updatedAllNotifications));
  };

  const deleteNotification = (notificationId: string) => {
    const updatedNotifications = notifications.filter(notif => notif.id !== notificationId);
    setNotifications(updatedNotifications);

    // Update localStorage
    const allNotifications = JSON.parse(localStorage.getItem('royal-academy-notifications') || '[]');
    const updatedAllNotifications = allNotifications.filter((n: Notification) => n.id !== notificationId);
    localStorage.setItem('royal-academy-notifications', JSON.stringify(updatedAllNotifications));
  };

  // Principal remarks functions
  const handleCreatePrincipalRemark = () => {
    if (!principalRemarksForm.studentId || !principalRemarksForm.message) {
      alert('Please select a student and enter a message');
      return;
    }

    const selectedStudent = students.find(s => s.id === principalRemarksForm.studentId);
    if (!selectedStudent) {
      alert('Student not found');
      return;
    }

    const newRemark: PrincipalRemark = {
      id: Date.now().toString(),
      studentId: selectedStudent.id,
      studentName: selectedStudent.name || selectedStudent.fullName,
      class: selectedStudent.class,
      section: selectedStudent.section,
      type: principalRemarksForm.type,
      message: principalRemarksForm.message,
      subject: principalRemarksForm.subject || 'General',
      principalId: principalEmail,
      principalName: 'Principal',
      createdAt: new Date().toISOString()
    };

    // Save to localStorage
    const existingRemarks = JSON.parse(localStorage.getItem('royal-academy-principal-remarks') || '[]');
    const updatedRemarks = [...existingRemarks, newRemark];
    localStorage.setItem('royal-academy-principal-remarks', JSON.stringify(updatedRemarks));
    setPrincipalRemarksData(updatedRemarks);

    alert(`${principalRemarksForm.type === 'good' ? 'Good' : 'Bad'} remark sent to ${selectedStudent.name} successfully!`);

    // Reset form
    setPrincipalRemarksForm({ studentId: '', type: 'good', message: '', subject: '' });
    setShowPrincipalRemarksModal(false);
  };

  // Notification reply functions
  const handleReplyToNotification = () => {
    if (!selectedNotification || !replyMessage) {
      alert('Please enter a reply message');
      return;
    }

    const newReply: NotificationReply = {
      id: Date.now().toString(),
      fromId: principalEmail,
      fromName: 'Principal',
      fromType: 'principal',
      message: replyMessage,
      createdAt: new Date().toISOString()
    };

    // Update notification with reply
    const updatedNotification = {
      ...selectedNotification,
      replies: [...(selectedNotification.replies || []), newReply]
    };

    // Update localStorage
    const allNotifications = JSON.parse(localStorage.getItem('royal-academy-notifications') || '[]');
    const updatedAllNotifications = allNotifications.map((n: Notification) => 
      n.id === selectedNotification.id ? updatedNotification : n
    );
    localStorage.setItem('royal-academy-notifications', JSON.stringify(updatedAllNotifications));

    // Update local state
    setNotifications(prev => prev.map(n => n.id === selectedNotification.id ? updatedNotification : n));

    alert('Reply sent successfully!');
    setReplyMessage('');
    setShowNotificationReplyModal(false);
    setSelectedNotification(null);
  };

  // Student notification functions
  const handleSendStudentNotification = () => {
    if (!studentNotificationForm.subject || !studentNotificationForm.message) {
      alert('Please fill in both subject and message');
      return;
    }

    // Validate target selection
    if (studentNotificationForm.targetType === 'class' && !studentNotificationForm.targetClass) {
      alert('Please select a class');
      return;
    }

    if (studentNotificationForm.targetType === 'section' && (!studentNotificationForm.targetClass || !studentNotificationForm.targetSection)) {
      alert('Please select both class and section');
      return;
    }

    if (studentNotificationForm.targetType === 'student' && !studentNotificationForm.targetStudentId) {
      alert('Please select a student');
      return;
    }
    if (studentNotificationForm.targetType === 'student' && !studentNotificationForm.targetStudentId) {
      alert('Please select a student');
      return;
    }

    const newStudentNotification = {
      id: Date.now().toString(),
      subject: studentNotificationForm.subject,
      message: studentNotificationForm.message,
      senderType: 'principal',
      senderId: principalEmail,
      senderName: 'Principal',
      targetType: studentNotificationForm.targetType,
      targetClass: studentNotificationForm.targetClass,
      targetSection: studentNotificationForm.targetSection,
      targetStudentId: studentNotificationForm.targetStudentId,
      photo1: studentNotificationForm.photo1,
      photo2: studentNotificationForm.photo2,
      createdAt: new Date().toISOString(),
      status: 'unread'
    };

    // Save to localStorage
    const existingNotifications = JSON.parse(localStorage.getItem('royal-academy-student-notifications') || '[]');
    const updatedNotifications = [...existingNotifications, newStudentNotification];
    localStorage.setItem('royal-academy-student-notifications', JSON.stringify(updatedNotifications));

    let targetDescription = '';
    switch (studentNotificationForm.targetType) {
      case 'all':
        targetDescription = 'all students';
        break;
      case 'class':
        targetDescription = `Class ${studentNotificationForm.targetClass}`;
        break;
      case 'section':
        targetDescription = `Class ${studentNotificationForm.targetClass}-${studentNotificationForm.targetSection}`;
        break;
      case 'student':
        const selectedStudent = students.find(s => s.id === studentNotificationForm.targetStudentId);
        targetDescription = selectedStudent ? selectedStudent.name : 'selected student';
        break;
    }

    alert(`Notification sent to ${targetDescription} successfully!\nSubject: ${studentNotificationForm.subject}`);

    // Reset form
    setStudentNotificationForm({
      subject: '',
      message: '',
      targetType: 'all',
      targetClass: '',
      targetSection: '',
      targetStudentId: '',
      photo1: '',
      photo2: ''
    });

    // Reload sent notifications
    const updatedSentNotifications = [...sentStudentNotifications, newStudentNotification];
    setSentStudentNotifications(updatedSentNotifications);
    setShowStudentNotificationModal(false);
  };

  const unreadCount = notifications.filter(n => n.status === 'unread').length;

  const getStudentPhoto = (student: any) => {
    if (!student) return "";
    return (
      student.image ||
      student.studentPhoto ||
      student.photo ||
      student.profilePhoto ||
      ""
    );
  };

  const getTeacherRemarksForStudent = (student: any) => {
    if (!student) return [];
    if (student.remarks && student.remarks.length > 0) {
      return student.remarks;
    }
    const fallback = authStudentRecords.find((auth: any) =>
      auth.studentId === student.id ||
      auth.id === student.id ||
      auth.email === student.email ||
      auth.rollNumber === student.rollNumber ||
      auth.name === student.name ||
      auth.fullName === student.fullName
    );
    if (fallback && fallback.remarks) {
      return fallback.remarks;
    }
    return [];
  };

  const getPrincipalRemarksForStudent = (student: any) => {
    if (!student) return [];
    return principalRemarksData.filter(remark => remark.studentId === student.id);
  };

  const getStudentReportsForStudent = (student: any) => {
    if (!student) return [];
    return studentReports.filter(report =>
      report.studentId === student.id ||
      report.studentName === student.name ||
      report.studentName === student.fullName
    );
  };

  const getStudentFeeSummary = (student: any) => {
    if (!student) {
      return { fees: [], pending: [], dueAmount: 0 };
    }
    const studentFees = feeRecords.filter(fee =>
      fee.studentId === student.id ||
      fee.studentName === student.name ||
      fee.studentName === student.fullName
    );
    const pendingFees = studentFees.filter(fee => fee.status !== 'paid');
    const dueAmount = pendingFees.reduce((sum, fee) => sum + (fee.amount || 0), 0);
    return { fees: studentFees, pending: pendingFees, dueAmount };
  };

  const getAttendanceSummaryForStudent = (student: any) => {
    const summary = { present: 0, absent: 0, late: 0, total: 0 };
    if (!student) return summary;

    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const statusByDate: Record<string, 'present' | 'absent' | 'late'> = {};

    attendanceRecords.forEach(record => {
      if (!record || !record.date) return;
      const recordDate = new Date(record.date);
      if (isNaN(recordDate.getTime())) return;
      if (recordDate.getMonth() !== month || recordDate.getFullYear() !== year) return;
      if (record.class !== (student.class || record.class) || record.section !== (student.section || record.section)) return;
      const entry = record.students?.find(s => s.studentId === student.id);
      if (entry) {
        statusByDate[record.date] = entry.status;
      }
    });

    if (student.attendance && Array.isArray(student.attendance)) {
      student.attendance.forEach((entry: any) => {
        if (!entry || !entry.date) return;
        const entryDate = new Date(entry.date);
        if (isNaN(entryDate.getTime())) return;
        if (entryDate.getMonth() === month && entryDate.getFullYear() === year) {
          statusByDate[entry.date] = entry.status;
        }
      });
    }

    Object.values(statusByDate).forEach(status => {
      if (status === 'present') summary.present += 1;
      if (status === 'absent') summary.absent += 1;
      if (status === 'late') summary.late += 1;
    });

    summary.total = summary.present + summary.absent + summary.late;
    return summary;
  };

  const classOptions = Array.from(
    new Set(
      students
        .map(student => (student.class || '').toString())
        .filter(Boolean)
    )
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const sectionOptions = Array.from(
    new Set(
      students
        .filter(student => !studentLookupFilters.class || (student.class || '').toString() === studentLookupFilters.class)
        .map(student => (student.section || '').toString())
        .filter(Boolean)
    )
  ).sort();

  const classFilterOptions = useMemo(
    () => Array.from({ length: 12 }, (_, index) => (index + 1).toString()),
    []
  );

  const sectionFilterOptions = useMemo(
    () => ['A', 'B', 'C', 'D', 'E'],
    []
  );

  const filteredPrincipalRemarkStudents = useMemo(() => {
    return students.filter(student => {
      const matchesClass = principalRemarkFilters.class
        ? (student.class || '').toString() === principalRemarkFilters.class
        : true;
      const matchesSection = principalRemarkFilters.section
        ? (student.section || '').toString().toUpperCase() === principalRemarkFilters.section.toUpperCase()
        : true;
      const rollValue = (student.rollNumber ?? student.roll ?? '').toString();
      const matchesRoll = principalRemarkFilters.roll
        ? rollValue === principalRemarkFilters.roll
        : true;
      return matchesClass && matchesSection && matchesRoll;
    });
  }, [students, principalRemarkFilters]);

  const stats = [
    { icon: Users, label: "Total Students", value: "1,247", change: "+12 this month" },
    { icon: BookOpen, label: "Active Courses", value: "45", change: "+3 new courses" },
    { icon: Calendar, label: "Upcoming Events", value: "8", change: "Next: Science Fair" },
    { icon: BarChart3, label: "Average Grade", value: "87.5%", change: "+2.3% improvement" }
  ];

  const selectedStudentAttendance = selectedLookupStudent ? getAttendanceSummaryForStudent(selectedLookupStudent) : null;
  const selectedTeacherRemarks = selectedLookupStudent ? getTeacherRemarksForStudent(selectedLookupStudent) : [];
  const selectedPrincipalRemarks = selectedLookupStudent ? getPrincipalRemarksForStudent(selectedLookupStudent) : [];
  const selectedStudentReports = selectedLookupStudent ? getStudentReportsForStudent(selectedLookupStudent) : [];
  const selectedStudentFees = selectedLookupStudent ? getStudentFeeSummary(selectedLookupStudent) : { fees: [], pending: [], dueAmount: 0 };

  const quickActions = [
    { icon: Bell, label: "Send Announcement", color: "from-blue-600 to-purple-600", action: () => setActiveSection("announcements") },
    { icon: Volume2, label: "Audio Messages", color: "from-sky-400 to-purple-600", action: () => setActiveSection("audiomessages") },
    { icon: MessageSquare, label: "Notify Students", color: "from-blue-600 to-purple-600", action: () => setShowStudentNotificationModal(true) },
    { icon: Star, label: "Principal Remarks", color: "from-sky-400 to-purple-600", action: () => setShowPrincipalRemarksModal(true) },
    { icon: Search, label: "Student Lookup", color: "from-blue-600 to-purple-600", action: () => setShowStudentLookupModal(true) },
    { icon: Mail, label: "See Contact Form", color: "from-sky-400 to-purple-600", action: () => setActiveSection("contactforms") },
    { icon: BookOpen, label: "Yearly Books", color: "from-blue-600 to-purple-600", action: () => setActiveSection("booksmanager") },
    { icon: Calendar, label: "Exam Routine", color: "from-sky-400 to-purple-600", action: () => setActiveSection("examroutine") },
    { icon: Settings, label: "Branding & Logo", color: "from-blue-600 to-purple-600", action: () => setActiveSection("branding") },
    { icon: Clock, label: "Manage Timetable", color: "from-sky-400 to-purple-600", action: () => setActiveSection("timetable") },
    { icon: GraduationCap, label: "Edit Admissions Page", color: "from-blue-600 to-purple-600", action: () => setActiveSection("admissionsmanager") },
    { icon: Trophy, label: "Top Scorers Content", color: "from-sky-400 to-purple-600", action: () => setActiveSection("topscorerslearnmore") },
    // New quick actions for Bus Tracking IDs
    { icon: IdCard, label: "Create Bus ID", color: "from-blue-600 to-purple-600", action: () => navigate('/create-bus-id') },
    { icon: IdCard, label: "Manage Bus IDs", color: "from-sky-400 to-purple-600", action: () => navigate('/manage-bus-id') }
  ];

  // Precompute filtered teachers list for Manage Teachers
  const filteredTeachers = teachers
    .filter(t => (teacherSubjectFilter ? (t.subject || '').toLowerCase() === teacherSubjectFilter.toLowerCase() : true))
    .filter(t => (teacherStatusFilter ? t.status === (teacherStatusFilter as 'active' | 'banned') : true))
    .filter(t => {
      const q = teacherSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        (t.name || '').toLowerCase().includes(q) ||
        (t.email || '').toLowerCase().includes(q) ||
        (t.subject || '').toLowerCase().includes(q)
      );
    });

  useEffect(() => {
    if (!principalRemarksForm.studentId) return;
    const exists = filteredPrincipalRemarkStudents.some(student => student.id === principalRemarksForm.studentId);
    if (!exists) {
      setPrincipalRemarksForm(prev => ({ ...prev, studentId: '' }));
    }
  }, [filteredPrincipalRemarkStudents, principalRemarksForm.studentId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading Principal Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">⚠️ Error</div>
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Reload Page</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 scroll-smooth overflow-x-hidden" style={{ scrollBehavior: 'smooth' }}>
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card/95 backdrop-blur-md border-b border-border/50 sticky top-0 z-50 will-change-transform"
      >
        <div className="container-wide py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-r from-royal to-gold flex items-center justify-center">
                <Shield className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-heading font-bold text-foreground">
                  Principal Dashboard
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                  Welcome back, {principalEmail}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="pl-10 w-48 lg:w-64"
                />
              </div>

              {/* Notification Bell */}
              <div className="relative" data-notification-container>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 bg-gradient-to-r from-blue-600/20 to-cyan-500/20 hover:from-blue-600/40 hover:to-cyan-500/40 border-blue-500/40 hover:border-blue-400/60 transition-all shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40"
                >
                  <Bell className="h-4 w-4 text-blue-400 hover:text-cyan-300 transition-colors drop-shadow-lg" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 h-5 w-5 bg-gradient-to-br from-red-500 to-red-600 text-white text-xs rounded-full flex items-center justify-center font-bold shadow-lg shadow-red-500/50 animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Button>

                {/* Notification Dropdown */}
                {showNotifications && (
                  <div className="z-[100] rounded-xl border border-border bg-card shadow-2xl
                  max-h-[70vh] overflow-y-auto p-3
                  fixed top-[56px] left-2 right-2 w-auto
                  md:absolute md:top-full md:right-0 md:left-auto md:w-96 md:mt-2 md:p-0">
                    <div className="p-4 border-b border-border">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-foreground">Notifications</h3>
                        {unreadCount > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={markAllAsRead}
                            className="text-xs"
                          >
                            Mark all as read
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="max-h-80 overflow-y-auto scroll-smooth">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-muted-foreground">
                          No notifications
                        </div>
                      ) : (
                        notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-4 border-b border-border hover:bg-muted/50 transition-colors ${
                              notification.status === 'unread' ? 'bg-muted/20' : ''
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <h4 className={`text-sm font-medium ${
                                    notification.status === 'unread' ? 'text-foreground' : 'text-muted-foreground'
                                  }`}>
                                    {notification.subject}
                                  </h4>
                                  {notification.status === 'unread' && (
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                  )}
                                </div>
                                <p className="text-xs text-blue-400 mb-1">
                                  From: {notification.fromName} ({notification.fromType})
                                </p>
                                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                                  {notification.message}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(notification.createdAt).toLocaleDateString()}
                                </p>
                                {(notification.photo1 || notification.photo2) && (
                                  <div className="flex gap-2 mt-2">
                                    {notification.photo1 && (
                                      <div className="relative group cursor-pointer" onClick={() => setDocumentViewer({ show: true, url: notification.photo1, name: `${notification.subject} - Photo 1` })}>
                                        <img 
                                          src={notification.photo1} 
                                          alt="Photo 1" 
                                          className="w-12 h-12 object-cover rounded border border-border/30 group-hover:opacity-80 transition-opacity"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded transition-colors flex items-center justify-center">
                                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="bg-white/90 rounded-full p-1">
                                              <ImageIcon className="h-3 w-3 text-gray-800" />
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                    {notification.photo2 && (
                                      <div className="relative group cursor-pointer" onClick={() => setDocumentViewer({ show: true, url: notification.photo2, name: `${notification.subject} - Photo 2` })}>
                                        <img 
                                          src={notification.photo2} 
                                          alt="Photo 2" 
                                          className="w-12 h-12 object-cover rounded border border-border/30 group-hover:opacity-80 transition-opacity"
                                        />
                                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 rounded transition-colors flex items-center justify-center">
                                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                            <div className="bg-white/90 rounded-full p-1">
                                              <ImageIcon className="h-3 w-3 text-gray-800" />
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {notification.replies && notification.replies.length > 0 && (
                                  <p className="text-xs text-green-400 mt-1">
                                    {notification.replies.length} reply(ies)
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center space-x-1 ml-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedNotification(notification);
                                    setShowNotificationReplyModal(true);
                                  }}
                                  className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                                  title="Reply"
                                >
                                  <Send className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedNotification(notification);
                                    setReplyMessage('');
                                    setShowNotificationReplyModal(true);
                                  }}
                                  className="h-6 w-6 p-0 text-green-600 hover:text-green-700"
                                  title="View & Reply"
                                >
                                  <MessageSquare className="h-3 w-3" />
                                </Button>
                                {notification.status === 'unread' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => markAsRead(notification.id)}
                                    className="h-6 w-6 p-0"
                                    title="Mark as read"
                                  >
                                    <Eye className="h-3 w-3" />
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => deleteNotification(notification.id)}
                                  className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                  title="Delete"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    {notifications.length > 0 && (
                      <div className="p-3 border-t border-border">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => setShowNotifications(false)}
                        >
                          View All Notifications
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bus Inbox */}
              <div className="relative" data-bus-inbox-container>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowBusInbox(!showBusInbox)}
                  className="relative p-2 bg-gradient-to-r from-purple-600/20 to-blue-600/20 hover:from-purple-600/40 hover:to-blue-600/40 border-purple-500/40 hover:border-purple-400/60 transition-all shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40"
                >
                  <Bus className="h-4 w-4 text-purple-400 hover:text-purple-300 transition-colors drop-shadow-lg" />
                </Button>

                {showBusInbox && (
                  <div className="z-[100] rounded-xl border border-border bg-card shadow-2xl overflow-hidden
                  fixed top-[56px] left-2 right-2 w-auto max-h-[75vh]
                  md:absolute md:top-full md:right-0 md:left-auto md:w-[720px] md:mt-2">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                      <h3 className="font-semibold text-foreground">Bus Messages</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3">
                      {/* Threads */}
                      <div className="md:col-span-1 border-r border-border max-h-[60vh] overflow-auto scroll-smooth">
                        {busInbox.length === 0 ? (
                          <div className="p-4 text-sm text-muted-foreground">No messages</div>
                        ) : (
                          busInbox
                            .reduce((acc: any[], m) => {
                              if (!acc.find(t => t.busUserId === m.busUserId)) acc.push(m);
                              return acc;
                            }, [])
                            .map((t) => (
                              <button
                                key={t.busUserId}
                                onClick={() => setSelectedBusUserId(t.busUserId)}
                                className={`w-full text-left p-3 border-b border-border hover:bg-muted/50 ${selectedBusUserId===t.busUserId? 'bg-muted/30':''}`}
                              >
                                <div className="text-sm font-medium">{t.driverName || 'Driver'}</div>
                                <div className="text-xs text-muted-foreground">Bus ID: {t.busId}</div>
                                <div className="text-[10px] text-muted-foreground">{new Date(t.createdAt).toLocaleString()}</div>
                              </button>
                            ))
                        )}
                      </div>

                      {/* Conversation */}
                      <div className="md:col-span-2 max-h-[60vh] overflow-auto scroll-smooth p-3 space-y-2">
                        {selectedBusUserId ? (
                          busInbox
                            .filter(m => m.busUserId === selectedBusUserId)
                            .sort((a,b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                            .map((m) => (
                              <div key={m.id} className={`border rounded p-2 ${m.from==='principal'?'bg-muted/20':''}`}>
                                <div className="flex items-start justify-between mb-1">
                                  <div className="text-xs text-muted-foreground">{m.from==='bus' ? (m.driverName || 'Driver') : 'You'} • {new Date(m.createdAt).toLocaleString()}</div>
                                  {m.from === 'principal' && (
                                    <div className="flex gap-1">
                                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => startEditBusReply(m)}><Edit className="h-3 w-3"/></Button>
                                      <Button size="sm" variant="ghost" className="h-5 w-5 p-0 text-red-600" onClick={() => deleteBusReply(m.id)}><Trash2 className="h-3 w-3"/></Button>
                                    </div>
                                  )}
                                </div>
                                <div className="text-sm">{m.text}</div>
                                <div className="flex gap-2 mt-1 flex-wrap">
                                  {(m.images || []).map((img, i) => (
                                    <div 
                                      key={i} 
                                      className="relative group cursor-pointer"
                                      onClick={() => setDocumentViewer({ show: true, url: img, name: `Bus Message Photo ${i + 1}` })}
                                    >
                                      <img src={img} className="h-14 w-14 object-cover rounded border" />
                                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded">
                                        <Eye className="h-4 w-4 text-white" />
                                      </div>
                                    </div>
                                  ))}
                                </div>

                              </div>
                            ))
                        ) : (
                          <div className="text-sm text-muted-foreground">Select a driver to view messages</div>
                        )}
                      </div>
                    </div>
                    {/* Reply */}
                    <div className="p-3 border-t border-border">
                      <div className="space-y-2">
                        <Textarea placeholder="Type your reply to driver..." value={busReplyText} onChange={(e)=>setBusReplyText(e.target.value)} />
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[0,1,2,3].map(i => (
                            <div key={i}>
                              <Input type="file" accept="image/*" onChange={(e)=>onPickBusReplyImage(e,i)} />
                              {busReplyImgs[i] && <img src={busReplyImgs[i] as string} className="mt-1 h-14 w-14 object-cover rounded border" />}
                            </div>
                          ))}
                        </div>
                        <div className="flex justify-end gap-2">
                          {editingBusReplyId && (
                            <Button onClick={() => {
                              setEditingBusReplyId(null);
                              setBusReplyText('');
                              setBusReplyImgs([null, null, null, null]);
                            }} variant="outline">Cancel</Button>
                          )}
                          <Button onClick={editingBusReplyId ? editBusReply : sendBusReply} disabled={!selectedBusUserId || !busReplyText.trim()}>{editingBusReplyId ? 'Update' : 'Send'} Reply</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 hover:from-indigo-600/40 hover:to-purple-600/40 border-indigo-500/40 hover:border-indigo-400/60 transition-all shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40"
              >
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-400 hover:text-purple-300 transition-colors drop-shadow-lg" />
                <span className="hidden sm:inline text-indigo-300">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="container-wide py-4 sm:py-8 px-4 sm:px-6 will-change-auto" style={{ willChange: 'auto' }}>
          {/* Main Dashboard Content */}
          {activeSection === "dashboard" && (
            <>
              {/* Stats Grid */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8"
              >
                {stats.map((stat, index) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + index * 0.1 }}
                    className="bg-card/95 backdrop-blur-md rounded-lg sm:rounded-xl p-3 sm:p-6 border border-border/50 hover:shadow-lg transition-all duration-200 will-change-transform"
                  >
                    <div className="flex items-center justify-between mb-2 sm:mb-4">
                      <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg bg-gradient-to-r from-royal/20 to-gold/20 flex items-center justify-center">
                        <stat.icon className="h-4 w-4 sm:h-6 sm:w-6 text-royal" />
                      </div>
                    </div>
                    <div>
                      <p className="text-lg sm:text-2xl font-bold text-foreground mb-1">{stat.value}</p>
                      <p className="text-xs sm:text-sm font-medium text-foreground mb-1">{stat.label}</p>
                      <p className="text-xs text-muted-foreground hidden sm:block">{stat.change}</p>
                    </div>
                  </motion.div>
                ))}
              </motion.div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8 will-change-auto" style={{ willChange: 'auto' }}>
                {/* Quick Actions */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="lg:col-span-2"
                >
                  <div className="bg-card/95 backdrop-blur-md rounded-lg sm:rounded-xl p-4 sm:p-6 border border-border/50 will-change-auto">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
                      <h2 className="text-base sm:text-lg font-heading font-bold text-foreground flex-1">
                        Quick Actions
                      </h2>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                          type="text"
                          placeholder="Search actions..."
                          value={quickActionsSearch}
                          onChange={(e) => setQuickActionsSearch(e.target.value)}
                          className="pl-10 pr-3 py-2 text-sm bg-background/50 border border-border/50 rounded-lg focus:outline-none focus:border-blue-500 focus:bg-background transition-all"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1 sm:gap-2 lg:grid-cols-3 lg:gap-3">
                      {quickActions
                        .filter(action => 
                          action.label.toLowerCase().includes(quickActionsSearch.toLowerCase())
                        )
                        .map((action, index) => (
                      <motion.button
                        key={action.label}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.4 + index * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={action.action}
                        className="relative p-2 sm:p-3 lg:p-4 rounded-2xl transition-all duration-200 text-white group touch-manipulation overflow-hidden will-change-transform"
                      >
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/25 via-transparent to-transparent opacity-0 group-hover:opacity-80 blur-xl transition duration-300 pointer-events-none" />
                        <div className={`relative bg-gradient-to-r ${action.color} p-3 sm:p-4 lg:p-5 rounded-2xl shadow-[0_8px_32px_rgba(88,28,135,0.3)] hover:shadow-[0_12px_48px_rgba(88,28,135,0.5)] border border-white/20 group-hover:border-white/40 transition-all duration-300`}>
                            <action.icon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-white mb-2 sm:mb-2 lg:mb-3 mx-auto" />
                            <p className="text-[11px] sm:text-sm lg:text-base font-semibold text-white text-center leading-tight px-1">
                              {action.label === "Audio Messages" ? (
                                <>
                                  <span className="sm:hidden">Audio</span>
                                  <span className="hidden sm:inline">{action.label}</span>
                                </>
                              ) : action.label === "Principal Remarks" ? (
                                <>
                                  <span className="sm:hidden">Remarks</span>
                                  <span className="hidden sm:inline">{action.label}</span>
                                </>
                              ) : action.label === "Edit Admissions Page" ? (
                                <>
                                  <span className="sm:hidden">Admissions</span>
                                  <span className="hidden sm:inline">{action.label}</span>
                                </>
                              ) : action.label === "Branding & Logo" ? (
                                <>
                                  <span className="sm:hidden">Logo</span>
                                  <span className="hidden sm:inline">{action.label}</span>
                                </>
                              ) : action.label === "Send Announcement" ? (
                                <>
                                  <span className="sm:hidden">Announce</span>
                                  <span className="hidden sm:inline">{action.label}</span>
                                </>
                              ) : action.label === "Notify Students" ? (
                                <>
                                  <span className="sm:hidden">Notify</span>
                                  <span className="hidden sm:inline">{action.label}</span>
                                </>
                              ) : action.label === "Manage Timetable" ? (
                                <>
                                  <span className="sm:hidden">Timetable</span>
                                  <span className="hidden sm:inline">{action.label}</span>
                                </>
                              ) : action.label === "Exam Routine" ? (
                                <>
                                  <span className="sm:hidden">Exams</span>
                                  <span className="hidden sm:inline">{action.label}</span>
                                </>
                              ) : action.label === "Yearly Books" ? (
                                <>
                                  <span className="sm:hidden">Books</span>
                                  <span className="hidden sm:inline">{action.label}</span>
                                </>
                              ) : (
                                action.label
                              )}                            </p>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Management Sections */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="mt-6 sm:mt-8"
              >
                <div className="bg-card/95 backdrop-blur-md rounded-lg sm:rounded-xl p-4 sm:p-6 border border-border/50">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                    <h2 className="text-base sm:text-lg font-heading font-bold text-foreground">
                      Content Management
                    </h2>
                    <input
                      type="text"
                      placeholder="Search features..."
                      value={contentManagementSearch}
                      onChange={(e) => setContentManagementSearch(e.target.value)}
                      className="w-full sm:w-64 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm bg-background border border-border/50 rounded-lg focus:outline-none focus:border-sky-400/50 focus:ring-1 focus:ring-sky-400/30 transition-all"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3 sm:gap-4">
                    {[
                      { title: "Edit Homepage", desc: "Update main page content", icon: Edit, action: () => setActiveSection("homepage") },
                      { title: "Manage Teachers", desc: "Add/edit teacher profiles", icon: Users, action: () => setActiveSection("teachers") },
                      { title: "Send Announcements", desc: "Create and manage announcements", icon: Bell, action: () => setActiveSection("announcements") },
                      { title: "Edit Admissions Page", desc: "Update admissions content and requirements", icon: GraduationCap, action: () => setActiveSection("admissionsmanager") },
                      { title: "Manage Events & News", desc: "Create and manage events", icon: Calendar, action: () => setActiveSection("events") },
                      { title: "Manage Categories", desc: "Create and manage event categories", icon: Settings, action: () => setActiveSection("categories") },
                      { title: "Manage Courses", desc: "Add/edit academic programs", icon: BookOpen, action: () => navigate('/courses-management') },
                      { title: "Update Gallery", desc: "Manage photo galleries", icon: Eye, action: () => setActiveSection("gallery") },
                      { title: "Edit About Page", desc: "Update school information", icon: FileText, action: () => setActiveSection("about") },
                      { title: "Academics Manager", desc: "Edit departments and achievements", icon: GraduationCap, action: () => setActiveSection("academicsmanager") },
                      { title: "Facilities Manager", desc: "Edit facilities and campus stats", icon: Settings, action: () => setActiveSection("facilitiesmanager") },
                      { title: "View Admissions", desc: "Review submitted applications", icon: FileText, action: () => setActiveSection("admissions") },
                      { title: "Manage Top Scorers", desc: "Edit students, rankings, and categories", icon: Trophy, action: () => setActiveSection("topscorers") },
                      { title: "Yearly Books Manager", desc: "Manage recommended books for classes", icon: BookOpen, action: () => setActiveSection("booksmanager") },
                      { title: "Create New Teacher ID", desc: "Generate teacher login credentials", icon: UserPlus, action: () => setActiveSection("createteacherid") },
                      { title: "Manage Teacher IDs", desc: "View and manage teacher login credentials", icon: IdCard, action: () => setActiveSection("manageteacherid") },
                      { title: "Price Management", desc: "Update admission fees and pricing", icon: DollarSign, action: () => setActiveSection("pricemanagement") }
                    ].filter(item => {
                      if (!contentManagementSearch.trim()) return true;
                      const searchLower = contentManagementSearch.toLowerCase();
                      const titleLower = item.title.toLowerCase();
                      const descLower = item.desc.toLowerCase();
                      return titleLower.includes(searchLower) || descLower.includes(searchLower);
                    }).map((item, index) => (
                      <motion.div
                        key={item.title}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 + index * 0.1 }}
                        onClick={item.action}
                        className="relative group cursor-pointer touch-manipulation"
                      >
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-500/10 via-transparent to-emerald-500/10 opacity-0 group-hover:opacity-100 blur-xl transition duration-300 pointer-events-none" />
                        <div className="relative p-3 sm:p-4 rounded-xl border border-cyan-400/20 bg-gradient-to-br from-background/90 to-background/60 shadow-[0_0_18px_rgba(6,182,212,0.15)] group-hover:border-cyan-200/60 group-hover:shadow-[0_0_30px_rgba(16,185,129,0.55)] transition-all duration-300">
                          <item.icon className="h-6 w-6 sm:h-8 sm:w-8 text-cyan-200 drop-shadow-[0_0_6px_rgba(34,211,238,0.8)] mb-2 sm:mb-3 group-hover:text-white group-hover:scale-110 transition-transform duration-300" />
                          <h3 className="font-semibold text-foreground mb-1 sm:mb-2 text-sm sm:text-base tracking-wide">
                            {item.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground leading-tight">
                            {item.desc}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </>
          )}

          {/* Conditional Content Sections */}
          {activeSection === "teachers" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-6 sm:mt-8"
            >
              <div className="bg-card/95 backdrop-blur-md rounded-lg sm:rounded-xl p-4 sm:p-6 border border-border/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
                  <h2 className="text-base sm:text-lg font-heading font-bold text-foreground">
                    Teacher Management
                  </h2>
                  <Button
                    variant="outline"
                    onClick={() => setActiveSection("dashboard")}
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    Back to Dashboard
                  </Button>
                </div>
                <Suspense fallback={<RouteLoader />}>
                  <TeacherManager />
                </Suspense>
              </div>
            </motion.div>
          )}

          {activeSection === "homepage" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-6 sm:mt-8"
            >
              <div className="bg-card/95 backdrop-blur-md rounded-lg sm:rounded-xl p-4 sm:p-6 border border-border/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
                  <h2 className="text-base sm:text-lg font-heading font-bold text-foreground">
                    Homepage Management
                  </h2>
                  <Button
                    variant="outline"
                    onClick={() => setActiveSection("dashboard")}
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    Back to Dashboard
                  </Button>
                </div>
                <Suspense fallback={<RouteLoader />}>
                  <HomepageEditor />
                </Suspense>
              </div>
            </motion.div>
          )}

          {activeSection === "announcements" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-6 sm:mt-8"
            >
              <div className="bg-card/95 backdrop-blur-md rounded-lg sm:rounded-xl p-4 sm:p-6 border border-border/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
                  <h2 className="text-base sm:text-lg font-heading font-bold text-foreground">
                    Announcement Management
                  </h2>
                  <Button
                    variant="outline"
                    onClick={() => setActiveSection("dashboard")}
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    Back to Dashboard
                  </Button>
                </div>
                <Suspense fallback={<RouteLoader />}>
                  <AnnouncementManager />
                </Suspense>
              </div>
            </motion.div>
          )}

          {activeSection === "courses" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8"
            >
              <div className="bg-card/95 backdrop-blur-md rounded-xl p-3 sm:p-6 border border-border/50">
                <div className="-mx-2 sm:mx-0 px-2 flex flex-col sm:flex-row items-center justify-between mb-4 sm:mb-6 gap-2">
                  <h2 className="text-lg font-heading font-bold text-foreground">
                    Course Management
                  </h2>
                  <Button
                    variant="outline"
                    onClick={() => setActiveSection("dashboard")}
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    Back to Dashboard
                  </Button>
                </div>
                <div className="overflow-x-auto sm:overflow-visible">
                  <Suspense fallback={<RouteLoader />}>
                    <CourseManager />
                  </Suspense>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === "gallery" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8"
            >
              <div className="bg-card/95 backdrop-blur-md rounded-xl p-6 border border-border/50">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-heading font-bold text-foreground">
                    Gallery Management
                  </h2>
                  <Button
                    variant="outline"
                    onClick={() => setActiveSection("dashboard")}
                    size="sm"
                  >
                    Back to Dashboard
                  </Button>
                </div>
                <Suspense fallback={<RouteLoader />}>
                  <GalleryManagerSimple />
                </Suspense>
              </div>
            </motion.div>
          )}

          {activeSection === "about" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8"
            >
              <div className="bg-card/95 backdrop-blur-md rounded-xl p-6 border border-border/50">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-heading font-bold text-foreground">
                    Update School Information
                  </h2>
                  <Button
                    variant="outline"
                    onClick={() => setActiveSection("dashboard")}
                    size="sm"
                  >
                    Back to Dashboard
                  </Button>
                </div>
                <Suspense fallback={<RouteLoader />}>
                  <AboutPageManager />
                </Suspense>
              </div>
            </motion.div>
          )}

          {activeSection === "admissions" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8"
            >
              <div className="bg-card/95 backdrop-blur-md rounded-xl p-6 border border-border/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-3">
                  <div>
                    <h2 className="text-lg font-heading font-bold text-foreground">Admissions</h2>
                    <p className="text-sm text-muted-foreground">
                      Total: {(admissions || []).length} • Paid: {(admissions || []).filter(a => a.paymentStatus === 'paid').length} • Test: {(admissions || []).filter(a => a.paymentStatus === 'test').length}
                    </p>
                  </div>
                  <div className="-mx-2 sm:mx-0 px-2 flex items-center gap-2 w-full sm:w-auto overflow-x-auto [&>*]:shrink-0">
                    {/* Admission Status Toggle */}
                    <Button
                      onClick={toggleAdmissionStatus}
                      className={`${admissionStatus 
                        ? 'bg-green-600 hover:bg-green-700 text-white'
                        : 'bg-red-600 hover:bg-red-700 text-white'
                      } font-medium`}
                      size="sm"
                    >
                      {admissionStatus ? '🟢 Admission ON' : '🔴 Admission OFF'}
                    </Button>
                    <Input
                      placeholder="Search by name, email, or program..."
                      value={admissionsSearch}
                      onChange={(e) => setAdmissionsSearch(e.target.value)}
                      className="w-full sm:w-72"
                    />
                    <Button variant="outline" onClick={loadAdmissions}>
                      Refresh
                    </Button>
                    <Button variant="outline" onClick={() => {
                      console.log('[DEBUG] Checking both localStorage and Supabase data...');
                      const localData = localStorage.getItem('royal-academy-admissions');
                      console.log('[DEBUG] localStorage data:', localData);
                      
                      // Also check Supabase directly
                      supabase.from('app_state').select('value').eq('key', 'royal-academy-admissions').then(({ data, error }) => {
                        console.log('[DEBUG] Supabase data:', data);
                        console.log('[DEBUG] Supabase error:', error);
                        
                        let localCount = 0;
                        let supabaseCount = 0;
                        
                        if (localData) {
                          try {
                            const parsed = JSON.parse(localData);
                            localCount = Array.isArray(parsed) ? parsed.length : 0;
                          } catch (e) {
                            console.error('[DEBUG] Parse error:', e);
                          }
                        }
                        
                        if (data && data.value) {
                          try {
                            const parsed = JSON.parse(data.value);
                            supabaseCount = Array.isArray(parsed) ? parsed.length : 0;
                          } catch (e) {
                            console.error('[DEBUG] Supabase parse error:', e);
                          }
                        }
                        
                        alert(`Data Status:\nLocalStorage: ${localCount} records\nSupabase: ${supabaseCount} records\nCurrent state: ${admissions.length} records`);
                      });
                    }} className="text-xs">
                      Debug Data
                    </Button>
                    <Button variant="outline" onClick={() => setActiveSection("dashboard")}>Back</Button>
                  </div>
                </div>

                <div className="overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left border-b border-border/50">
                        <th className="py-3 pr-4">Student</th>
                        <th className="py-3 pr-4">Contact</th>
                        <th className="py-3 pr-4">Family Details</th>
                        <th className="py-3 pr-4">Class/Age</th>
                        <th className="py-3 pr-4">Plan</th>
                        <th className="py-3 pr-4">Payment</th>
                        <th className="py-3 pr-4">Documents</th>
                        <th className="py-3 pr-4">Submitted</th>
                        <th className="py-3 pr-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(admissions || [])
                        .filter(a => {
                          const q = admissionsSearch.trim().toLowerCase();
                          if (!q) return true;
                          const name = `${a.firstName} ${a.lastName}`.toLowerCase();
                          return (
                            name.includes(q) ||
                            (a.email || '').toLowerCase().includes(q) ||
                            (a.program || '').toLowerCase().includes(q)
                          );
                        })
                        .map((a) => (
                          <tr key={a.id} className="border-b border-border/30 hover:bg-muted/20">
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-3">
                                {a.studentPhoto && (
                                  <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-gold/30 flex-shrink-0">
                                    {typeof a.studentPhoto === 'string' ? (
                                      <img 
                                        src={a.studentPhoto} 
                                        alt="Student" 
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                        }}
                                      />
                                    ) : (a.studentPhoto && typeof a.studentPhoto === 'object' && (a.studentPhoto as any) instanceof Blob) ? (
                                      <img 
                                        src={URL.createObjectURL(a.studentPhoto as Blob)} 
                                        alt="Student" 
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                        }}
                                      />
                                    ) : null}
                                  </div>
                                )}
                                <div>
                                  <div className="font-medium text-foreground">{a.firstName} {a.lastName}</div>
                                  <div className="text-xs text-muted-foreground">ID: {a.id.slice(0, 8)}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 pr-4">
                              <div className="text-muted-foreground">
                                <div>{a.email}</div>
                                {a.phone && <div className="text-xs">{a.phone}</div>}
                              </div>
                            </td>
                            <td className="py-3 pr-4 text-muted-foreground">
                              <div className="text-xs">
                                <div><strong>Father:</strong> {a.fatherName || 'N/A'}</div>
                                <div><strong>Mother:</strong> {a.motherName || 'N/A'}</div>
                              </div>
                            </td>
                            <td className="py-3 pr-4 text-muted-foreground">
                              <div>Class {a.class || 'N/A'}</div>
                              <div className="text-xs">Age: {a.studentAge || 'N/A'} years</div>
                            </td>
                            <td className="py-3 pr-4">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                a.subscriptionType === 'yearly' 
                                  ? 'bg-gold/10 text-gold border border-gold/30' 
                                  : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                              }`}>
                                {a.subscriptionType === 'yearly' ? 'Yearly' : 'Monthly'}
                              </span>
                            </td>
                            <td className="py-3 pr-4">
                              {a.paymentStatus === 'paid' ? (
                                <span className="px-2 py-1 text-xs rounded-full bg-green-500/10 text-green-400 border border-green-500/30">
                                  Paid{a.paymentMethod && a.paymentMethod !== 'test' ? ` (${a.paymentMethod})` : ''}
                                </span>
                              ) : (
                                <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/30">Test</span>
                              )}
                            </td>
                            <td className="py-3 pr-4">
                              <div className="flex flex-wrap gap-1">
                                {a.aadhaarCard && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      try {
                                        if (typeof a.aadhaarCard === 'string') {
                                          setDocumentViewer({ show: true, url: a.aadhaarCard, name: `Aadhaar Card - ${a.firstName} ${a.lastName}` });
                                        } else if (a.aadhaarCard && typeof a.aadhaarCard === 'object' && (a.aadhaarCard as any) instanceof Blob) {
                                          const url = URL.createObjectURL(a.aadhaarCard as Blob);
                                          setDocumentViewer({ show: true, url, name: `Aadhaar Card - ${a.firstName} ${a.lastName}` });
                                        } else {
                                          alert('Aadhaar card file not available');
                                        }
                                      } catch (error) {
                                        console.error('Error opening Aadhaar card:', error);
                                        alert('Error opening Aadhaar card');
                                      }
                                    }}
                                    title="View Aadhaar Card"
                                    className="h-7 px-2 text-xs bg-blue-500/10 hover:bg-blue-500/20 text-blue-600"
                                    data-testid={`button-view-aadhaar-${a.id}`}
                                  >
                                    📄 Aadhaar
                                  </Button>
                                )}
                                {a.birthCertificate && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      try {
                                        if (typeof a.birthCertificate === 'string') {
                                          setDocumentViewer({ show: true, url: a.birthCertificate, name: `Birth Certificate - ${a.firstName} ${a.lastName}` });
                                        } else if (a.birthCertificate && typeof a.birthCertificate === 'object' && (a.birthCertificate as any) instanceof Blob) {
                                          const url = URL.createObjectURL(a.birthCertificate as Blob);
                                          setDocumentViewer({ show: true, url, name: `Birth Certificate - ${a.firstName} ${a.lastName}` });
                                        } else {
                                          alert('Birth certificate file not available');
                                        }
                                      } catch (error) {
                                        console.error('Error opening birth certificate:', error);
                                        alert('Error opening birth certificate');
                                      }
                                    }}
                                    title="View Birth Certificate"
                                    className="h-7 px-2 text-xs bg-green-500/10 hover:bg-green-500/20 text-green-600"
                                    data-testid={`button-view-birth-cert-${a.id}`}
                                  >
                                    📄 Birth Cert
                                  </Button>
                                )}
                                {a.studentPhoto && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      try {
                                        if (typeof a.studentPhoto === 'string') {
                                          setDocumentViewer({ show: true, url: a.studentPhoto, name: `Student Photo - ${a.firstName} ${a.lastName}` });
                                        } else if (a.studentPhoto && typeof a.studentPhoto === 'object' && (a.studentPhoto as any) instanceof Blob) {
                                          const url = URL.createObjectURL(a.studentPhoto as Blob);
                                          setDocumentViewer({ show: true, url, name: `Student Photo - ${a.firstName} ${a.lastName}` });
                                        } else {
                                          alert('Student photo not available');
                                        }
                                      } catch (error) {
                                        console.error('Error opening student photo:', error);
                                        alert('Error opening student photo');
                                      }
                                    }}
                                    title="View Student Photo"
                                    className="h-7 px-2 text-xs bg-purple-500/10 hover:bg-purple-500/20 text-purple-600"
                                    data-testid={`button-view-photo-${a.id}`}
                                  >
                                    📷 Photo
                                  </Button>
                                )}
                                {!a.aadhaarCard && !a.birthCertificate && !a.studentPhoto && (
                                  <span className="text-xs text-muted-foreground italic">No documents</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 pr-4 text-muted-foreground text-xs">{new Date(a.createdAt).toLocaleString()}</td>
                            <td className="py-3 pr-4">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => showDeleteConfirmation(a.id, `${a.firstName} ${a.lastName}`)}
                                className="h-7 px-2 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-600"
                                title="Delete Admission"
                              >
                                <X className="h-3 w-3 mr-1" />
                                Delete
                              </Button>
                            </td>
                          </tr>
                        ))}
                      {(admissions || []).length === 0 && (
                        <tr>
                          <td className="py-6 text-center text-muted-foreground" colSpan={8}>No admissions yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === "topscorers" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8"
            >
              <div className="bg-card/95 backdrop-blur-md rounded-xl p-6 border border-border/50">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-heading font-bold text-foreground">
                    Top Scorers Management
                  </h2>
                  <Button
                    variant="outline"
                    onClick={() => setActiveSection("dashboard")}
                    size="sm"
                  >
                    Back to Dashboard
                  </Button>
                </div>
                <Suspense fallback={<RouteLoader />}>
                  <TopScorersManager />
                </Suspense>
              </div>
            </motion.div>
          )}

          {activeSection === "booksmanager" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8"
            >
              <div className="bg-card/95 backdrop-blur-md rounded-xl p-6 border border-border/50">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-heading font-bold text-foreground">
                    Yearly Books Management
                  </h2>
                  <Button
                    variant="outline"
                    onClick={() => setActiveSection("dashboard")}
                    size="sm"
                  >
                    Back to Dashboard
                  </Button>
                </div>
                <Suspense fallback={<RouteLoader />}>
                  <YearlyBookManager />
                </Suspense>
              </div>
            </motion.div>
          )}

          {activeSection === "examroutine" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8"
            >
              <div className="bg-card/95 backdrop-blur-md rounded-xl p-6 border border-border/50">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-heading font-bold text-foreground">
                    Exam Routine Management
                  </h2>
                  <Button
                    variant="outline"
                    onClick={() => setActiveSection("dashboard")}
                    size="sm"
                  >
                    Back to Dashboard
                  </Button>
                </div>
                <Suspense fallback={<RouteLoader />}>
                  <ExamRoutineManager />
                </Suspense>
              </div>
            </motion.div>
          )}

          {activeSection === "manageteachers" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8"
            >
              <div className="bg-card/95 backdrop-blur-md rounded-xl p-6 border border-border/50">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-heading font-bold text-foreground">
                      Teacher Management System
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      View, edit, ban/unban, and delete teacher accounts
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setActiveSection("dashboard")}
                    size="sm"
                  >
                    Back to Dashboard
                  </Button>
                </div>

                <div className="space-y-6">
                  {/* Search and Filter */}
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Search teachers by name, email, or subject..."
                        value={teacherSearch}
                        onChange={(e) => setTeacherSearch(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <select
                      value={teacherSubjectFilter}
                      onChange={(e) => setTeacherSubjectFilter(e.target.value)}
                      className="px-4 py-2 border border-border rounded-lg bg-background"
                    >
                      <option value="">All Subjects</option>
                      <option value="mathematics">Mathematics</option>
                      <option value="science">Science</option>
                      <option value="physics">Physics</option>
                      <option value="chemistry">Chemistry</option>
                      <option value="biology">Biology</option>
                      <option value="english literature">English Literature</option>
                      <option value="hindi">Hindi</option>
                      <option value="history">History</option>
                      <option value="geography">Geography</option>
                      <option value="civics/political science">Civics/Political Science</option>
                      <option value="economics">Economics</option>
                      <option value="computer science">Computer Science</option>
                      <option value="information technology">Information Technology</option>
                      <option value="physical education">Physical Education</option>
                      <option value="arts & crafts">Arts & Crafts</option>
                      <option value="music">Music</option>
                      <option value="dance">Dance</option>
                      <option value="drawing & painting">Drawing & Painting</option>
                      <option value="home science">Home Science</option>
                      <option value="agriculture">Agriculture</option>
                      <option value="commerce">Commerce</option>
                      <option value="accountancy">Accountancy</option>
                      <option value="business studies">Business Studies</option>
                      <option value="psychology">Psychology</option>
                      <option value="sociology">Sociology</option>
                      <option value="philosophy">Philosophy</option>
                      <option value="sanskrit">Sanskrit</option>
                      <option value="urdu">Urdu</option>
                      <option value="french">French</option>
                      <option value="german">German</option>
                      <option value="spanish">Spanish</option>
                    </select>
                    <select
                      value={teacherStatusFilter}
                      onChange={(e) => setTeacherStatusFilter(e.target.value)}
                      className="px-4 py-2 border border-border rounded-lg bg-background"
                    >
                      <option value="">All Status</option>
                      <option value="active">Active</option>
                      <option value="banned">Banned</option>
                    </select>
                  </div>

                  {/* Teachers List */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTeachers.map((teacher) => (
                      <motion.div
                        key={teacher.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-gradient-to-br from-card to-card/80 rounded-xl p-6 border border-border/50 shadow-lg"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-gold to-yellow-500 flex items-center justify-center">
                              <Users className="h-6 w-6 text-black" />
                            </div>
                            <div>
                              <h3 className="font-bold text-foreground">{teacher.name}</h3>
                              <p className="text-sm text-muted-foreground">{teacher.id}</p>
                            </div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            teacher.status === 'active' 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {teacher.status.toUpperCase()}
                          </span>
                        </div>

                        <div className="space-y-2 mb-4">
                          <p className="text-sm"><span className="font-medium">Subject:</span> {teacher.subject}</p>
                          <p className="text-sm"><span className="font-medium">Email:</span> {teacher.email}</p>
                          <p className="text-sm"><span className="font-medium">Phone:</span> {teacher.phone}</p>
                          <p className="text-sm"><span className="font-medium">Classes:</span> {teacher.classes && teacher.classes.length > 0 ? teacher.classes.join(", ") : (teacher.assignedClass && teacher.assignedSection ? `${teacher.assignedClass}${teacher.assignedSection}` : "-")}</p>
                          <p className="text-sm"><span className="font-medium">Joined:</span> {teacher.joinDate}</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => setEditTeacher(teacher)}>
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline"
                            className={`flex-1 ${
                              teacher.status === 'active' 
                                ? 'text-red-400 hover:text-red-300' 
                                : 'text-green-400 hover:text-green-300'
                            }`}
                            onClick={() => handleToggleBan(teacher.id)}
                          >
                            {teacher.status === 'active' ? (
                              <>
                                <X className="h-3 w-3 mr-1" />
                                Ban
                              </>
                            ) : (
                              <>
                                <Plus className="h-3 w-3 mr-1" />
                                Unban
                              </>
                            )}
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-400 hover:text-red-300" onClick={() => handleDeleteTeacher(teacher.id)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                    {filteredTeachers.length === 0 && (
                      <div className="col-span-full text-center text-muted-foreground py-8">No one is teacher for now.</div>
                    )}
                  </div>

                  {/* Add New Teacher Button */}
                  <div className="text-center">
                    <Button
                      onClick={() => setActiveSection("createteacherid")}
                      className="bg-gradient-to-r from-gold to-yellow-500 text-black"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add New Teacher
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Edit Teacher Modal */}
          {editTeacher && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setEditTeacher(null)}>
              <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <h3 className="text-lg font-heading font-bold">Edit Teacher</h3>
                  <Button variant="ghost" size="sm" onClick={() => setEditTeacher(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto scroll-smooth">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-1">Full Name</label>
                      <Input value={editTeacher.name} onChange={(e) => setEditTeacher({ ...editTeacher, name: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Email</label>
                      <Input type="email" value={editTeacher.email} onChange={(e) => setEditTeacher({ ...editTeacher, email: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Subject</label>
                      <Input value={editTeacher.subject || ''} onChange={(e) => setEditTeacher({ ...editTeacher, subject: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Phone</label>
                      <Input value={editTeacher.phone || ''} onChange={(e) => setEditTeacher({ ...editTeacher, phone: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Class</label>
                      <Input value={editTeacher.assignedClass || ''} onChange={(e) => setEditTeacher({ ...editTeacher, assignedClass: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Section</label>
                      <Input value={editTeacher.assignedSection || ''} onChange={(e) => setEditTeacher({ ...editTeacher, assignedSection: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Status</label>
                      <select
                        value={editTeacher.status}
                        onChange={(e) => setEditTeacher({ ...editTeacher, status: e.target.value as 'active' | 'banned' })}
                        className="w-full p-3 border border-border rounded-lg bg-background"
                      >
                        <option value="active">Active</option>
                        <option value="banned">Banned</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
                  <Button variant="outline" onClick={() => setEditTeacher(null)}>Cancel</Button>
                  <Button onClick={handleSaveTeacherEdit} className="bg-gradient-to-r from-gold to-yellow-500 text-black">Save Changes</Button>
                </div>
              </div>
            </div>
          )}

          {activeSection === "createteacherid" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8"
            >
              <div className="bg-card/95 backdrop-blur-md rounded-xl p-3 sm:p-4 md:p-6 border border-border/50">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4 sm:mb-6 gap-2 sm:gap-0">
                  <div>
                    <h2 className="text-base sm:text-lg font-heading font-bold text-foreground">
                      Create New Teacher ID
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      Generate login credentials for teachers to access their dashboard
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setActiveSection("dashboard")}
                    size="sm"
                    className="w-full sm:w-auto text-xs sm:text-sm"
                  >
                    Back to Dashboard
                  </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
                  {/* Teacher ID Creation Form */}
                  <div className="space-y-4 sm:space-y-6">
                    <div className="bg-gradient-to-r from-gold/10 to-yellow-500/10 border border-gold/30 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 mb-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-r from-gold to-yellow-500 flex items-center justify-center flex-shrink-0">
                          <IdCard className="h-5 w-5 sm:h-6 sm:w-6 text-black" />
                        </div>
                        <div>
                          <h3 className="text-base sm:text-lg font-heading font-bold text-gradient-gold">
                            Teacher Registration
                          </h3>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Create secure login credentials for new teachers
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3 sm:space-y-4">
                        <div>
                          <label className="block text-xs sm:text-sm font-medium mb-2">Full Name *</label>
                          <Input 
                            value={teacherForm.fullName}
                            onChange={(e) => setTeacherForm({...teacherForm, fullName: e.target.value})}
                            placeholder="Enter teacher's full name"
                            className="text-xs sm:text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-xs sm:text-sm font-medium mb-2">Email Address *</label>
                          <Input 
                            type="email" 
                            value={teacherForm.email}
                            onChange={(e) => setTeacherForm({...teacherForm, email: e.target.value})}
                            placeholder="teacher@royalacademy.edu"
                            className="text-xs sm:text-sm"
                          />
                        </div>

                        <div>
                          <label className="block text-xs sm:text-sm font-medium mb-2">Subject/Department *</label>
                          <select 
                            value={teacherForm.subject}
                            onChange={(e) => setTeacherForm({...teacherForm, subject: e.target.value})}
                            className="w-full p-2 sm:p-3 border border-border rounded-lg bg-background text-xs sm:text-sm"
                          >
                            <option value="">Select Department</option>
                            <option value="mathematics">Mathematics</option>
                            <option value="science">Science</option>
                            <option value="physics">Physics</option>
                            <option value="chemistry">Chemistry</option>
                            <option value="biology">Biology</option>
                            <option value="english">English Literature</option>
                            <option value="hindi">Hindi</option>
                            <option value="history">History</option>
                            <option value="geography">Geography</option>
                            <option value="civics">Civics/Political Science</option>
                            <option value="economics">Economics</option>
                            <option value="computer-science">Computer Science</option>
                            <option value="information-technology">Information Technology</option>
                            <option value="physical-education">Physical Education</option>
                            <option value="arts">Arts & Crafts</option>
                            <option value="music">Music</option>
                            <option value="dance">Dance</option>
                            <option value="drawing">Drawing & Painting</option>
                            <option value="home-science">Home Science</option>
                            <option value="agriculture">Agriculture</option>
                            <option value="commerce">Commerce</option>
                            <option value="accountancy">Accountancy</option>
                            <option value="business-studies">Business Studies</option>
                            <option value="psychology">Psychology</option>
                            <option value="sociology">Sociology</option>
                            <option value="philosophy">Philosophy</option>
                            <option value="sanskrit">Sanskrit</option>
                            <option value="urdu">Urdu</option>
                            <option value="french">French</option>
                            <option value="german">German</option>
                            <option value="spanish">Spanish</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs sm:text-sm font-medium mb-2">Employee ID</label>
                          <Input 
                            value={teacherForm.employeeId}
                            onChange={(e) => setTeacherForm({...teacherForm, employeeId: e.target.value})}
                            placeholder="Auto-generated (optional custom ID)"
                            className="text-xs sm:text-sm"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Leave blank for auto-generation
                          </p>
                        </div>

                        <div>
                          <label className="block text-xs sm:text-sm font-medium mb-2">Phone Number</label>
                          <Input 
                            type="tel" 
                            value={teacherForm.phone}
                            onChange={(e) => setTeacherForm({...teacherForm, phone: e.target.value})}
                            placeholder="Enter your phone number"
                            className="text-xs sm:text-sm"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div>
                            <label className="block text-xs sm:text-sm font-medium mb-2">Assigned Classes</label>
                            <select 
                              value={teacherForm.assignedClass}
                              onChange={(e) => setTeacherForm({...teacherForm, assignedClass: e.target.value})}
                              className="w-full p-2 sm:p-3 border border-border rounded-lg bg-background text-xs sm:text-sm"
                            >
                              <option value="">Select Class</option>
                              <option value="1">Class 1</option>
                              <option value="2">Class 2</option>
                              <option value="3">Class 3</option>
                              <option value="4">Class 4</option>
                              <option value="5">Class 5</option>
                              <option value="6">Class 6</option>
                              <option value="7">Class 7</option>
                              <option value="8">Class 8</option>
                              <option value="9">Class 9</option>
                              <option value="10">Class 10</option>
                              <option value="11">Class 11</option>
                              <option value="12">Class 12</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs sm:text-sm font-medium mb-2">Assigned Sections</label>
                            <select 
                              value={teacherForm.assignedSection}
                              onChange={(e) => setTeacherForm({...teacherForm, assignedSection: e.target.value})}
                              className="w-full p-2 sm:p-3 border border-border rounded-lg bg-background text-xs sm:text-sm"
                            >
                              <option value="">Select Section</option>
                              <option value="A">Section A</option>
                              <option value="B">Section B</option>
                              <option value="C">Section C</option>
                              <option value="D">Section D</option>
                              <option value="E">Section E</option>
                            </select>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          <input 
                            type="checkbox" 
                            id="sendCredentials" 
                            checked={teacherForm.sendCredentials}
                            onChange={(e) => setTeacherForm({...teacherForm, sendCredentials: e.target.checked})}
                            className="rounded" 
                          />
                          <label htmlFor="sendCredentials" className="text-xs sm:text-sm">
                            Send login credentials via email
                          </label>
                        </div>

                        <Button 
                          onClick={handleCreateTeacher}
                          className="w-full bg-gradient-to-r from-gold to-yellow-500 hover:from-gold/80 hover:to-yellow-500/80 text-white font-medium text-xs sm:text-sm"
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Create Teacher Account
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Information Panel */}
                  <div className="space-y-4 sm:space-y-6">
                    <div className="bg-royal/10 border border-royal/30 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6">
                      <h3 className="text-base sm:text-lg font-heading font-bold text-royal mb-4">
                        Teacher Dashboard Features
                      </h3>
                      <div className="space-y-2 sm:space-y-3">
                        {[
                          "Take student attendance",
                          "Manage class schedules",
                          "Grade assignments and exams",
                          "Communicate with students and parents",
                          "Access student performance analytics",
                          "Upload course materials",
                          "Generate progress reports"
                        ].map((feature, index) => (
                          <div key={index} className="flex items-start space-x-2 sm:space-x-3">
                            <div className="w-2 h-2 rounded-full bg-royal flex-shrink-0 mt-1 sm:mt-0.5"></div>
                            <span className="text-xs sm:text-sm text-muted-foreground">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-green-500/10 border border-green-500/30 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6">
                      <h3 className="text-base sm:text-lg font-heading font-bold text-green-400 mb-4">
                        Security Features
                      </h3>
                      <div className="space-y-2 sm:space-y-3">
                        {[
                          "Secure password generation",
                          "Two-factor authentication support",
                          "Role-based access control",
                          "Activity logging and monitoring",
                          "Automatic session timeout",
                          "Password reset functionality"
                        ].map((feature, index) => (
                          <div key={index} className="flex items-start space-x-2 sm:space-x-3">
                            <div className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0 mt-1 sm:mt-0.5"></div>
                            <span className="text-xs sm:text-sm text-muted-foreground">{feature}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg sm:rounded-xl p-3 sm:p-4 md:p-6">
                      <h3 className="text-base sm:text-lg font-heading font-bold text-amber-400 mb-4">
                        Quick Actions
                      </h3>
                      <div className="space-y-2">
                        <Button 
                          variant="outline" 
                          className="w-full justify-start text-xs sm:text-sm"
                          onClick={() => navigate('/manage-teachers')}
                        >
                          <Users className="h-4 w-4 mr-2" />
                          View All Teachers
                        </Button>
                        <Button variant="outline" className="w-full justify-start text-xs sm:text-sm">
                          <Settings className="h-4 w-4 mr-2" />
                          Manage Permissions
                        </Button>
                        <Button variant="outline" className="w-full justify-start text-xs sm:text-sm">
                          <FileText className="h-4 w-4 mr-2" />
                          Export Teacher List
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === "manageteacherid" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-4 sm:mt-8"
            >
              <div className="bg-card/95 backdrop-blur-md rounded-lg sm:rounded-xl p-4 sm:p-6 border border-border/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-0">
                  <div>
                    <h2 className="text-base sm:text-lg font-heading font-bold text-foreground">
                      Manage Teacher IDs
                    </h2>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                      View and manage teacher login credentials and access control
                    </p>
                  </div>
                  <Button
                    onClick={() => setActiveSection("dashboard")}
                    variant="outline"
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    Back to Dashboard
                  </Button>
                </div>

                {/* Redirect to Manage Teacher ID page */}
                <div className="text-center py-6 sm:py-8">
                  <IdCard className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-gold" />
                  <h3 className="text-lg sm:text-xl font-bold mb-2 text-foreground">Teacher ID Management</h3>
                  <p className="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 px-4">
                    Access the comprehensive teacher ID management system to view, edit, and control teacher login credentials.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4">
                    <Button
                      onClick={() => window.open('/manage-teacher-id', '_blank')}
                      className="bg-gradient-to-r from-gold to-yellow-500 text-black hover:from-gold/90 hover:to-yellow-500/90 w-full sm:w-auto"
                    >
                      <IdCard className="h-4 w-4 mr-2" />
                      <span className="text-sm sm:text-base">Open Teacher ID Manager</span>
                    </Button>
                    <Button
                      onClick={() => setActiveSection("createteacherid")}
                      variant="outline"
                      className="w-full sm:w-auto"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      <span className="text-sm sm:text-base">Create New Teacher ID</span>
                    </Button>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-6 sm:mt-8">
                  <div className="bg-muted/20 rounded-lg p-3 sm:p-4 text-center">
                    <div className="text-xl sm:text-2xl font-bold text-foreground">
                      {(() => {
                        try {
                          const authTeachers = JSON.parse(localStorage.getItem('royal-academy-auth-teachers') || '[]');
                          return authTeachers.length;
                        } catch {
                          return 0;
                        }
                      })()}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Total Teacher IDs</div>
                  </div>
                  <div className="bg-muted/20 rounded-lg p-3 sm:p-4 text-center">
                    <div className="text-xl sm:text-2xl font-bold text-green-500">
                      {(() => {
                        try {
                          const authTeachers = JSON.parse(localStorage.getItem('royal-academy-auth-teachers') || '[]');
                          return authTeachers.filter((t: any) => t.status === 'active' || !t.status).length;
                        } catch {
                          return 0;
                        }
                      })()}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Active IDs</div>
                  </div>
                  <div className="bg-muted/20 rounded-lg p-3 sm:p-4 text-center">
                    <div className="text-xl sm:text-2xl font-bold text-red-500">
                      {(() => {
                        try {
                          const authTeachers = JSON.parse(localStorage.getItem('royal-academy-auth-teachers') || '[]');
                          return authTeachers.filter((t: any) => t.status === 'banned').length;
                        } catch {
                          return 0;
                        }
                      })()}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Banned IDs</div>
                  </div>
                  <div className="bg-muted/20 rounded-lg p-3 sm:p-4 text-center">
                    <div className="text-xl sm:text-2xl font-bold text-yellow-500">
                      {(() => {
                        try {
                          const authTeachers = JSON.parse(localStorage.getItem('royal-academy-auth-teachers') || '[]');
                          return authTeachers.filter((t: any) => (t.loginAttempts || 0) > 3).length;
                        } catch {
                          return 0;
                        }
                      })()}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Login Issues</div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-muted/10 rounded-lg">
                  <h4 className="font-semibold mb-2 sm:mb-3 text-sm sm:text-base text-foreground">Quick Actions</h4>
                  <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => window.open('/manage-teacher-id', '_blank')}
                      className="w-full sm:w-auto text-xs sm:text-sm"
                    >
                      View All Teacher IDs
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveSection("createteacherid")}
                      className="w-full sm:w-auto text-xs sm:text-sm"
                    >
                      Create New ID
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveSection("manageteachers")}
                      className="w-full sm:w-auto text-xs sm:text-sm"
                    >
                      Manage Teachers
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeSection === "pricemanagement" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8"
            >
              <div className="bg-card/95 backdrop-blur-md rounded-xl p-6 border border-border/50">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-heading font-bold text-foreground">
                      Price Management
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      Update admission fees and subscription pricing
                    </p>
                  </div>
                  <Button
                    onClick={() => setActiveSection("dashboard")}
                    variant="outline"
                    size="sm"
                  >
                    Back to Dashboard
                  </Button>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  {/* Monthly Plan */}
                  <div className="p-6 border border-border/50 rounded-xl">
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-bold mb-2">Monthly Plan</h3>
                      <div className="text-3xl font-bold text-gold mb-2">₹{pricing.monthly.toLocaleString()}</div>
                      <p className="text-sm text-muted-foreground">Per month</p>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium">Monthly Price (₹)</label>
                      <Input
                        type="number"
                        value={pricing.monthly}
                        onChange={(e) => setPricing(prev => ({ ...prev, monthly: parseInt(e.target.value) || 0 }))}
                        min="0"
                        step="100"
                      />
                      <Button
                        onClick={() => {
                          localStorage.setItem('royal-academy-pricing', JSON.stringify(pricing));
                          alert('Monthly pricing updated successfully!');
                        }}
                        className="w-full"
                      >
                        Update Monthly Price
                      </Button>
                    </div>
                  </div>

                  {/* Yearly Plan */}
                  <div className="p-6 border border-border/50 rounded-xl">
                    <div className="text-center mb-4">
                      <h3 className="text-xl font-bold mb-2">Yearly Plan</h3>
                      <div className="text-3xl font-bold text-gold mb-2">₹{pricing.yearly.toLocaleString()}</div>
                      <p className="text-sm text-muted-foreground">Per year</p>
                      <p className="text-xs text-green-600">
                        Save ₹{((pricing.monthly * 12) - pricing.yearly).toLocaleString()}!
                      </p>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium">Yearly Price (₹)</label>
                      <Input
                        type="number"
                        value={pricing.yearly}
                        onChange={(e) => setPricing(prev => ({ ...prev, yearly: parseInt(e.target.value) || 0 }))}
                        min="0"
                        step="1000"
                      />
                      <Button
                        onClick={() => {
                          localStorage.setItem('royal-academy-pricing', JSON.stringify(pricing));
                          alert('Yearly pricing updated successfully!');
                        }}
                        className="w-full"
                      >
                        Update Yearly Price
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Bulk Update */}
                <div className="mt-6 p-4 bg-muted/10 rounded-lg">
                  <h4 className="font-semibold mb-3">Quick Actions</h4>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        localStorage.setItem('royal-academy-pricing', JSON.stringify(pricing));
                        alert('All pricing updated successfully!');
                      }}
                    >
                      Save All Changes
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const saved = localStorage.getItem('royal-academy-pricing');
                        if (saved) {
                          setPricing(JSON.parse(saved));
                          alert('Pricing loaded from saved settings!');
                        }
                      }}
                    >
                      Load Saved Pricing
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setPricing({ monthly: 5000, yearly: 50000 });
                        alert('Pricing reset to defaults!');
                      }}
                    >
                      Reset to Default
                    </Button>
                  </div>
                </div>

                {/* Current Statistics */}
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-muted/20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-primary">
                      {admissions.filter(a => a.subscriptionType === 'monthly').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Monthly Subscribers</div>
                  </div>
                  <div className="bg-muted/20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {admissions.filter(a => a.subscriptionType === 'yearly').length}
                    </div>
                    <div className="text-sm text-muted-foreground">Yearly Subscribers</div>
                  </div>
                  <div className="bg-muted/20 rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-gold">
                      ₹{(
                        admissions.filter(a => a.subscriptionType === 'monthly').length * pricing.monthly +
                        admissions.filter(a => a.subscriptionType === 'yearly').length * pricing.yearly
                      ).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Revenue</div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Timetable Management Section */}
          {activeSection === "timetable" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-card/95 backdrop-blur-md rounded-xl p-6 border border-border/50">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-heading font-bold text-foreground">Timetable Management</h2>
                    <p className="text-sm text-muted-foreground">Create and manage class timetables for different sections</p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setActiveSection("dashboard")}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Class and Section Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <label className="block text-sm font-medium mb-2">Select Class</label>
                    <select
                      value={selectedTimetableClass}
                      onChange={(e) => setSelectedTimetableClass(e.target.value)}
                      className="w-full p-3 border border-border rounded-lg bg-background"
                    >
                      <option value="1">Class 1</option>
                      <option value="2">Class 2</option>
                      <option value="3">Class 3</option>
                      <option value="4">Class 4</option>
                      <option value="5">Class 5</option>
                      <option value="6">Class 6</option>
                      <option value="7">Class 7</option>
                      <option value="8">Class 8</option>
                      <option value="9">Class 9</option>
                      <option value="10">Class 10</option>
                      <option value="11">Class 11</option>
                      <option value="12">Class 12</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Select Section</label>
                    <select
                      value={selectedTimetableSection}
                      onChange={(e) => setSelectedTimetableSection(e.target.value)}
                      className="w-full p-3 border border-border rounded-lg bg-background"
                    >
                      <option value="A">Section A</option>
                      <option value="B">Section B</option>
                      <option value="C">Section C</option>
                      <option value="D">Section D</option>
                      <option value="E">Section E</option>
                    </select>
                  </div>
                </div>

                {/* Timetable Creation Interface */}
                <div className="bg-gradient-to-r from-royal/10 to-gold/10 rounded-lg p-6 border border-border/30">
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Timetable for Class {selectedTimetableClass}{selectedTimetableSection}
                  </h3>

                  {/* Days of the week */}
                  <div className="space-y-4">
                    {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                      <div key={day} className="bg-card rounded-lg p-4 border border-border/30">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-foreground flex items-center">
                            <Calendar className="h-4 w-4 mr-2 text-gold" />
                            {day}
                          </h4>
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                // Add new period logic here
                                setEditingPeriod({ day, time: '', subject: '', teacher: '', room: '' });
                                setShowPeriodModal(true);
                              }}
                            >
                              <Plus className="h-4 w-4 mr-1" />
                              Add Period
                            </Button>

                            {(() => {
                              // Check if day has periods to show delete button
                              const timetableKey = `royal-academy-timetable-${selectedTimetableClass}${selectedTimetableSection}`;
                              const storedTimetable = localStorage.getItem(timetableKey);
                              let hasPeriods = false;

                              if (storedTimetable) {
                                try {
                                  const timetableData = JSON.parse(storedTimetable);
                                  // Add null check for timetableData and schedule
                                  if (timetableData && timetableData.schedule && Array.isArray(timetableData.schedule)) {
                                    const daySchedule = timetableData.schedule.find((d: any) => d.day === day);
                                    hasPeriods = daySchedule && daySchedule.periods && daySchedule.periods.length > 0;
                                  }
                                } catch (e) {
                                  console.error('Error parsing timetable data:', e);
                                }
                              }

                              if (hasPeriods) {
                                return (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      if (confirm(`Delete all periods for ${day}?`)) {
                                        const timetableKey = `royal-academy-timetable-${selectedTimetableClass}${selectedTimetableSection}`;
                                        const existingTimetable = localStorage.getItem(timetableKey);

                                        if (existingTimetable) {
                                          try {
                                            const timetableData = JSON.parse(existingTimetable);
                                            // Add null check for timetableData and schedule
                                            if (timetableData && timetableData.schedule && Array.isArray(timetableData.schedule)) {
                                              const daySchedule = timetableData.schedule.find((d: any) => d.day === day);

                                              if (daySchedule) {
                                                daySchedule.periods = [];
                                                localStorage.setItem(timetableKey, JSON.stringify(timetableData));
                                                alert(`All periods deleted for ${day}!`);
                                                // Force re-render
                                                setSelectedTimetableClass(selectedTimetableClass);
                                              }
                                            }
                                          } catch (e) {
                                            console.error('Error parsing or updating timetable data:', e);
                                            alert('Error deleting periods. Please try again.');
                                          }
                                        }
                                      }
                                    }}
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Clear Day
                                  </Button>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        </div>

                        {/* Time slots for the day */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {(() => {
                            // Load actual timetable data for this day
                            const timetableKey = `royal-academy-timetable-${selectedTimetableClass}${selectedTimetableSection}`;
                            const storedTimetable = localStorage.getItem(timetableKey);
                            let dayPeriods = [];

                            if (storedTimetable) {
                              try {
                                const timetableData = JSON.parse(storedTimetable);
                                // Add null check for timetableData and schedule
                                if (timetableData && timetableData.schedule && Array.isArray(timetableData.schedule)) {
                                  const daySchedule = timetableData.schedule.find((d: any) => d.day === day);
                                  dayPeriods = daySchedule && daySchedule.periods ? daySchedule.periods : [];
                                }
                              } catch (e) {
                                console.error('Error parsing timetable data:', e);
                                dayPeriods = [];
                              }
                            }

                            // If no periods exist, show empty state
                            if (dayPeriods.length === 0) {
                              return (
                                <div className="col-span-full text-center py-8 text-muted-foreground">
                                  <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                  <p>No periods scheduled for {day}</p>
                                  <p className="text-sm">Click "Add Period" to create the schedule</p>
                                </div>
                              );
                            }

                            return dayPeriods.map((period: any, index: number) => (
                              <div
                                key={index}
                                className={`p-3 rounded-lg border transition-colors relative group ${
                                  period.subject === 'Break' || period.subject === 'Lunch Break'
                                    ? 'bg-muted/20 border-muted/30' 
                                    : 'bg-background border-border/30 hover:border-gold/50'
                                }`}
                              >
                                {/* Delete Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (confirm(`Delete ${period.subject} period at ${period.time}?`)) {
                                      // Delete period from timetable
                                      const timetableKey = `royal-academy-timetable-${selectedTimetableClass}${selectedTimetableSection}`;
                                      const existingTimetable = localStorage.getItem(timetableKey);

                                      if (existingTimetable) {
                                        try {
                                          const timetableData = JSON.parse(existingTimetable);
                                          // Add null check for timetableData and schedule
                                          if (timetableData && timetableData.schedule && Array.isArray(timetableData.schedule)) {
                                            const daySchedule = timetableData.schedule.find((d: any) => d.day === day);

                                            if (daySchedule && daySchedule.periods) {
                                              // Remove the period at the specified index
                                              daySchedule.periods.splice(index, 1);
                                              localStorage.setItem(timetableKey, JSON.stringify(timetableData));
                                              alert('Period deleted successfully!');
                                              // Force re-render
                                              setSelectedTimetableClass(selectedTimetableClass);
                                            }
                                          }
                                        } catch (e) {
                                          console.error('Error parsing or updating timetable data:', e);
                                          alert('Error deleting period. Please try again.');
                                        }
                                      }
                                    }
                                  }}
                                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs"
                                  title="Delete Period"
                                >
                                  <X className="h-3 w-3" />
                                </button>

                                {/* Period Content - Click to Edit */}
                                <div
                                  onClick={() => {
                                    setEditingPeriod({ day, ...period, index });
                                    setShowPeriodModal(true);
                                  }}
                                  className="cursor-pointer"
                                >
                                  {/* Pencil icon to indicate editability */}
                                  <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity text-gold">
                                    <Edit className="h-4 w-4" />
                                  </div>
                                  
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-muted-foreground">
                                      {period.time}
                                    </span>
                                    {period.room && (
                                      <span className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded">
                                        {period.room}
                                      </span>
                                    )}
                                  </div>

                                  <h5 className={`font-semibold mb-1 ${
                                    period.subject === 'Break' 
                                      ? 'text-muted-foreground' 
                                      : 'text-foreground'
                                  }`}>
                                    {period.subject}
                                  </h5>

                                  {period.teacher && (
                                    <p className="text-sm text-muted-foreground">
                                      {period.teacher}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ));
                          })()}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Button 
                      className="bg-gradient-to-r from-gold to-yellow-500 text-black"
                      onClick={async () => {
                        // Save timetable to Supabase and localStorage
                        const timetableKey = `royal-academy-timetable-${selectedTimetableClass}${selectedTimetableSection}`;
                        const timetableData = {
                          class: selectedTimetableClass,
                          section: selectedTimetableSection,
                          schedule: [
                            { day: "Monday", periods: [
                              { time: "9:00-9:45", subject: "Mathematics", teacher: "Dr. Smith", room: "101" },
                              { time: "9:45-10:30", subject: "Physics", teacher: "Prof. Johnson", room: "Lab-1" },
                              { time: "10:30-10:45", subject: "Break", teacher: "", room: "" },
                              { time: "10:45-11:30", subject: "Chemistry", teacher: "Dr. Brown", room: "Lab-2" },
                              { time: "11:30-12:15", subject: "English", teacher: "Ms. Davis", room: "102" },
                              { time: "12:15-1:00", subject: "Computer Science", teacher: "Mr. Wilson", room: "Computer Lab" },
                              { time: "1:00-2:00", subject: "Lunch Break", teacher: "", room: "" },
                              { time: "2:00-2:45", subject: "Biology", teacher: "Dr. Taylor", room: "Lab-3" },
                              { time: "2:45-3:30", subject: "Physical Education", teacher: "Coach Miller", room: "Playground" }
                            ]},
                            { day: "Tuesday", periods: [
                              { time: "9:00-9:45", subject: "Physics", teacher: "Prof. Johnson", room: "Lab-1" },
                              { time: "9:45-10:30", subject: "Mathematics", teacher: "Dr. Smith", room: "101" },
                              { time: "10:30-10:45", subject: "Break", teacher: "", room: "" },
                              { time: "10:45-11:30", subject: "English", teacher: "Ms. Davis", room: "102" },
                              { time: "11:30-12:15", subject: "Chemistry", teacher: "Dr. Brown", room: "Lab-2" },
                              { time: "12:15-1:00", subject: "Hindi", teacher: "Mrs. Sharma", room: "103" },
                              { time: "1:00-2:00", subject: "Lunch Break", teacher: "", room: "" },
                              { time: "2:00-2:45", subject: "Computer Science", teacher: "Mr. Wilson", room: "Computer Lab" },
                              { time: "2:45-3:30", subject: "Art", teacher: "Ms. Anderson", room: "Art Room" }
                            ]},
                            { day: "Wednesday", periods: [
                              { time: "9:00-9:45", subject: "Chemistry", teacher: "Dr. Brown", room: "Lab-2" },
                              { time: "9:45-10:30", subject: "Biology", teacher: "Dr. Taylor", room: "Lab-3" },
                              { time: "10:30-10:45", subject: "Break", teacher: "", room: "" },
                              { time: "10:45-11:30", subject: "Mathematics", teacher: "Dr. Smith", room: "101" },
                              { time: "11:30-12:15", subject: "Physics", teacher: "Prof. Johnson", room: "Lab-1" },
                              { time: "12:15-1:00", subject: "English", teacher: "Ms. Davis", room: "102" },
                              { time: "1:00-2:00", subject: "Lunch Break", teacher: "", room: "" },
                              { time: "2:00-2:45", subject: "History", teacher: "Mr. Thompson", room: "104" },
                              { time: "2:45-3:30", subject: "Geography", teacher: "Ms. Clark", room: "105" }
                            ]},
                            { day: "Thursday", periods: [
                              { time: "9:00-9:45", subject: "English", teacher: "Ms. Davis", room: "102" },
                              { time: "9:45-10:30", subject: "Mathematics", teacher: "Dr. Smith", room: "101" },
                              { time: "10:30-10:45", subject: "Break", teacher: "", room: "" },
                              { time: "10:45-11:30", subject: "Physics", teacher: "Prof. Johnson", room: "Lab-1" },
                              { time: "11:30-12:15", subject: "Biology", teacher: "Dr. Taylor", room: "Lab-3" },
                              { time: "12:15-1:00", subject: "Computer Science", teacher: "Mr. Wilson", room: "Computer Lab" },
                              { time: "1:00-2:00", subject: "Lunch Break", teacher: "", room: "" },
                              { time: "2:00-2:45", subject: "Chemistry", teacher: "Dr. Brown", room: "Lab-2" },
                              { time: "2:45-3:30", subject: "Music", teacher: "Ms. Roberts", room: "Music Room" }
                            ]},
                            { day: "Friday", periods: [
                              { time: "9:00-9:45", subject: "Biology", teacher: "Dr. Taylor", room: "Lab-3" },
                              { time: "9:45-10:30", subject: "Chemistry", teacher: "Dr. Brown", room: "Lab-2" },
                              { time: "10:30-10:45", subject: "Break", teacher: "", room: "" },
                              { time: "10:45-11:30", subject: "English", teacher: "Ms. Davis", room: "102" },
                              { time: "11:30-12:15", subject: "Mathematics", teacher: "Dr. Smith", room: "101" },
                              { time: "12:15-1:00", subject: "Physical Education", teacher: "Coach Miller", room: "Playground" },
                              { time: "1:00-2:00", subject: "Lunch Break", teacher: "", room: "" },
                              { time: "2:00-2:45", subject: "Hindi", teacher: "Mrs. Sharma", room: "103" },
                              { time: "2:45-3:30", subject: "Library Period", teacher: "Librarian", room: "Library" }
                            ]},
                            { day: "Saturday", periods: [
                              { time: "9:00-9:45", subject: "Extra Classes", teacher: "Various Teachers", room: "Multiple Rooms" },
                              { time: "9:45-10:30", subject: "Sports", teacher: "Coach Miller", room: "Playground" },
                              { time: "10:30-10:45", subject: "Break", teacher: "", room: "" },
                              { time: "10:45-11:30", subject: "Art & Craft", teacher: "Ms. Anderson", room: "Art Room" },
                              { time: "11:30-12:15", subject: "Music", teacher: "Ms. Roberts", room: "Music Room" },
                              { time: "12:15-1:00", subject: "Library Period", teacher: "Librarian", room: "Library" }
                            ]}
                          ]
                        };
                        // Save to both Supabase and localStorage
                        await setSupabaseData(timetableKey, {
                          ...timetableData,
                          lastUpdated: new Date().toISOString()
                        });

                        alert('Sample timetable created successfully for Class ' + selectedTimetableClass + selectedTimetableSection + '!');
                      }}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Save Timetable
                    </Button>
                    {/* Delete All Periods Button */}
                    <Button 
                      variant="destructive"
                      onClick={() => {
                        if (confirm(`Delete all periods for Class ${selectedTimetableClass}${selectedTimetableSection}? This will clear the entire timetable but keep the structure.`)) {
                          const timetableKey = `royal-academy-timetable-${selectedTimetableClass}${selectedTimetableSection}`;
                          const existingTimetable = localStorage.getItem(timetableKey);

                          if (existingTimetable) {
                            try {
                              const timetableData = JSON.parse(existingTimetable);
                              
                              // Clear all periods for each day with proper null checks
                              if (timetableData && timetableData.schedule && Array.isArray(timetableData.schedule)) {
                                timetableData.schedule.forEach((daySchedule: any) => {
                                  if (daySchedule && daySchedule.periods) {
                                    daySchedule.periods = [];
                                  }
                                });
                                
                                // Update lastUpdated timestamp
                                timetableData.lastUpdated = new Date().toISOString();
                                
                                // Save back to localStorage
                                localStorage.setItem(timetableKey, JSON.stringify(timetableData));
                                
                                // Also save to Supabase
                                setSupabaseData(timetableKey, timetableData);
                                
                                alert(`All periods cleared for Class ${selectedTimetableClass}${selectedTimetableSection}!`);
                                // Force re-render to show empty state
                                setSelectedTimetableClass(selectedTimetableClass);
                              } else {
                                alert('Invalid timetable data structure.');
                              }
                            } catch (e) {
                              console.error('Error parsing or updating timetable data:', e);
                              alert('Error clearing periods. Please try again.');
                            }
                          } else {
                            alert('No timetable found to clear.');
                          }
                        }
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Clear All Periods
                    </Button>
                    {/* Delete Entire Timetable Button */}
                    <Button 
                      variant="outline"
                      onClick={() => {
                        if (confirm(`Delete entire timetable for Class ${selectedTimetableClass}${selectedTimetableSection}? This action cannot be undone.`)) {
                          const timetableKey = `royal-academy-timetable-${selectedTimetableClass}${selectedTimetableSection}`;
                          localStorage.removeItem(timetableKey);
                          
                          // Also remove from Supabase
                          setSupabaseData(timetableKey, null);
                          
                          alert(`Timetable deleted for Class ${selectedTimetableClass}${selectedTimetableSection}!`);
                          // Force re-render to show empty state
                          setSelectedTimetableClass(selectedTimetableClass);
                        }
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Delete Timetable
                    </Button>
                    {/* Edit Periods Button */}
                    <Button 
                      variant="outline"
                      onClick={() => {
                        alert('To edit any period, simply click on the period in the timetable below. You can also add new periods using the "Add Period" button for each day.');
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Periods
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Period Edit Modal */}
          {showPeriodModal && editingPeriod && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card rounded-xl p-6 w-full max-w-md border border-border/50"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    Edit Period - {editingPeriod.day}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPeriodModal(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Time Slot</label>
                    <Input
                      value={editingPeriod.time}
                      onChange={(e) => setEditingPeriod({ ...editingPeriod, time: e.target.value })}
                      placeholder="e.g., 9:00-9:45"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Subject</label>
                    <select
                      value={editingPeriod.subject}
                      onChange={(e) => setEditingPeriod({ ...editingPeriod, subject: e.target.value })}
                      className="w-full p-3 border border-border rounded-lg bg-background"
                    >
                      <option value="">Select Subject</option>
                      <option value="Mathematics">Mathematics</option>
                      <option value="Physics">Physics</option>
                      <option value="Chemistry">Chemistry</option>
                      <option value="Biology">Biology</option>
                      <option value="English">English</option>
                      <option value="Hindi">Hindi</option>
                      <option value="Computer Science">Computer Science</option>
                      <option value="Physical Education">Physical Education</option>
                      <option value="Art">Art</option>
                      <option value="Music">Music</option>
                      <option value="Break">Break</option>
                      <option value="Lunch Break">Lunch Break</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Teacher</label>
                    <Input
                      value={editingPeriod.teacher}
                      onChange={(e) => setEditingPeriod({ ...editingPeriod, teacher: e.target.value })}
                      placeholder="Teacher name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Room/Location</label>
                    <Input
                      value={editingPeriod.room}
                      onChange={(e) => setEditingPeriod({ ...editingPeriod, room: e.target.value })}
                      placeholder="e.g., Room 101, Lab-1, Playground"
                    />
                  </div>
                </div>

                <div className="flex space-x-3 mt-6">
                  <Button
                    onClick={() => {
                      // Save period changes to localStorage
                      const timetableKey = `royal-academy-timetable-${selectedTimetableClass}${selectedTimetableSection}`;
                      const existingTimetable = localStorage.getItem(timetableKey);

                      if (existingTimetable && editingPeriod) {
                        try {
                          const timetableData = JSON.parse(existingTimetable);
                          // Add null check for timetableData and schedule
                          if (timetableData && timetableData.schedule && Array.isArray(timetableData.schedule)) {
                            const daySchedule = timetableData.schedule.find((d: any) => d.day === editingPeriod.day);

                            if (daySchedule) {
                              if (editingPeriod.index !== undefined) {
                                // Edit existing period
                                daySchedule.periods[editingPeriod.index] = {
                                  time: editingPeriod.time,
                                  subject: editingPeriod.subject,
                                  teacher: editingPeriod.teacher,
                                  room: editingPeriod.room
                                };
                              } else {
                                // Add new period
                                daySchedule.periods.push({
                                  time: editingPeriod.time,
                                  subject: editingPeriod.subject,
                                  teacher: editingPeriod.teacher,
                                  room: editingPeriod.room
                                });
                              }

                              localStorage.setItem(timetableKey, JSON.stringify(timetableData));
                              alert('Period saved successfully!');
                            }
                          }
                        } catch (e) {
                          console.error('Error parsing or updating timetable data:', e);
                          alert('Error saving period. Please try again.');
                        }
                      }

                      setShowPeriodModal(false);
                      setEditingPeriod(null);
                      // Force re-render by updating a state
                      setSelectedTimetableClass(selectedTimetableClass);
                    }}
                    className="flex-1 bg-gradient-to-r from-gold to-yellow-500 text-black"
                  >
                    Save Period
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPeriodModal(false);
                      setEditingPeriod(null);
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            </div>
          )}

          {/* Admissions Page Manager Section */}
          {activeSection === "admissionsmanager" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-card/95 backdrop-blur-md rounded-xl p-6 border border-border/50">
                <div className="flex items-center justify-between mb-6">
                  <Button
                    variant="outline"
                    onClick={() => setActiveSection("dashboard")}
                    size="sm"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </div>

                <Suspense fallback={<RouteLoader />}>
                  <AdmissionsPageManager />
                </Suspense>
              </div>
            </motion.div>
          )}

          {/* Branding Manager Section */}
          {activeSection === "events" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8"
            >
              <div className="bg-card/95 backdrop-blur-md rounded-xl p-6 border border-border/50">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-heading font-bold text-foreground">
                    Events & News Management
                  </h2>
                  <Button
                    variant="outline"
                    onClick={() => setActiveSection("dashboard")}
                    size="sm"
                  >
                    Back to Dashboard
                  </Button>
                </div>
                <Suspense fallback={<RouteLoader />}>
                  <EventsManager />
                </Suspense>
              </div>
            </motion.div>
          )}

          {activeSection === "categories" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8"
            >
              <div className="bg-card/95 backdrop-blur-md rounded-xl p-6 border border-border/50">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-heading font-bold text-foreground">
                    Event Categories Management
                  </h2>
                  <Button
                    variant="outline"
                    onClick={() => setActiveSection("dashboard")}
                    size="sm"
                  >
                    Back to Dashboard
                  </Button>
                </div>
                <Suspense fallback={<RouteLoader />}>
                  <CategoryManager />
                </Suspense>
              </div>
            </motion.div>
          )}

          {activeSection === "branding" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              <div className="bg-card/95 backdrop-blur-md rounded-xl p-6 border border-border/50">
                <div className="flex items-center justify-between mb-6">
                  <Button
                    variant="outline"
                    onClick={() => setActiveSection("dashboard")}
                    size="sm"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </div>

                <Suspense fallback={<RouteLoader />}>
                  <BrandingManager />
                </Suspense>
              </div>
            </motion.div>
          )}

          {activeSection === "academicsmanager" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8"
            >
              <div className="bg-card/95 backdrop-blur-md rounded-xl p-6 border border-border/50">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-heading font-bold text-foreground">
                    Academic Content Management
                  </h2>
                  <Button
                    variant="outline"
                    onClick={() => setActiveSection("dashboard")}
                    size="sm"
                  >
                    Back to Dashboard
                  </Button>
                </div>
                <Suspense fallback={<RouteLoader />}>
                  <AcademicsManager />
                </Suspense>
              </div>
            </motion.div>
          )}

          {activeSection === "facilitiesmanager" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8"
            >
              <div className="bg-card/95 backdrop-blur-md rounded-xl p-6 border border-border/50">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-heading font-bold text-foreground">
                    Facilities Content Management
                  </h2>
                  <Button
                    variant="outline"
                    onClick={() => setActiveSection("dashboard")}
                    size="sm"
                  >
                    Back to Dashboard
                  </Button>
                </div>
                <Suspense fallback={<RouteLoader />}>
                  <FacilitiesManager />
                </Suspense>
              </div>
            </motion.div>
          )}

          {activeSection === "audiomessages" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-6 sm:mt-8"
            >
              <div className="bg-card/95 backdrop-blur-md rounded-lg sm:rounded-xl p-4 sm:p-6 border border-border/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
                  <h2 className="text-base sm:text-lg font-heading font-bold text-foreground">
                    Audio Messages Management
                  </h2>
                  <Button
                    variant="outline"
                    onClick={() => setActiveSection("dashboard")}
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </div>
                <Suspense fallback={<RouteLoader />}>
                  <AudioMessageManager principalEmail={principalEmail} />
                </Suspense>
              </div>
            </motion.div>
          )}

          {/* Contact Forms Section */}
          {activeSection === "contactforms" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-6 sm:mt-8"
            >
              <div className="bg-card/95 backdrop-blur-md rounded-lg sm:rounded-xl p-4 sm:p-6 border border-border/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 space-y-3 sm:space-y-0">
                  <h2 className="text-base sm:text-lg font-heading font-bold text-foreground">
                    Contact Forms Management
                  </h2>
                  <Button
                    variant="outline"
                    onClick={() => setActiveSection("dashboard")}
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Back to Dashboard
                  </Button>
                </div>
                
                {/* Search Bar and Actions */}
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search contact forms by name, email, phone..."
                      value={contactFormsSearch}
                      onChange={(e) => setContactFormsSearch(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  {/* Select All and Delete Buttons */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        // Select all contact forms
                        const allFormIds = contactForms.map(form => form.id);
                        setSelectedContactForms(allFormIds);
                      }}
                      className="text-xs sm:text-sm"
                    >
                      Select All
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleDeleteSelectedContactForms}
                      disabled={selectedContactForms.length === 0}
                      className="text-xs sm:text-sm"
                    >
                      <X className="h-4 w-4 mr-1" />
                      Delete Selected ({selectedContactForms.length})
                    </Button>
                  </div>
                </div>

                {/* Contact Forms Table */}
                <div className="bg-background rounded-lg border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={selectedContactForms.length > 0 && selectedContactForms.length === contactForms.filter(form => {
                                const search = contactFormsSearch.toLowerCase();
                                return !search || 
                                  form.name?.toLowerCase().includes(search) ||
                                  form.email?.toLowerCase().includes(search) ||
                                  form.phone?.toLowerCase().includes(search) ||
                                  form.class?.toLowerCase().includes(search);
                              }).length}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  // Select all visible forms
                                  const visibleFormIds = contactForms
                                    .filter(form => {
                                      const search = contactFormsSearch.toLowerCase();
                                      return !search || 
                                        form.name?.toLowerCase().includes(search) ||
                                        form.email?.toLowerCase().includes(search) ||
                                        form.phone?.toLowerCase().includes(search) ||
                                        form.class?.toLowerCase().includes(search);
                                    })
                                    .map(form => form.id);
                                  setSelectedContactForms(visibleFormIds);
                                } else {
                                  setSelectedContactForms([]);
                                }
                              }}
                              className="h-4 w-4 rounded border-border"
                            />
                          </th>
                          <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-muted-foreground">Name</th>
                          <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-muted-foreground">Class</th>
                          <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-muted-foreground">Phone</th>
                          <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-muted-foreground">Email</th>
                          <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-muted-foreground">Submitted</th>
                          <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-muted-foreground">Status</th>
                          <th className="px-2 sm:px-4 py-3 text-left text-xs sm:text-sm font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {contactForms
                          .filter(form => {
                            const search = contactFormsSearch.toLowerCase();
                            return !search || 
                              form.name?.toLowerCase().includes(search) ||
                              form.email?.toLowerCase().includes(search) ||
                              form.phone?.toLowerCase().includes(search) ||
                              form.class?.toLowerCase().includes(search);
                          })
                          .map((form) => (
                            <tr key={form.id} className="hover:bg-muted/30 transition-colors">
                              <td className="px-2 sm:px-4 py-3">
                                <input
                                  type="checkbox"
                                  checked={selectedContactForms.includes(form.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedContactForms([...selectedContactForms, form.id]);
                                    } else {
                                      setSelectedContactForms(selectedContactForms.filter(id => id !== form.id));
                                    }
                                  }}
                                  className="h-4 w-4 rounded border-border"
                                />
                              </td>
                              <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-foreground font-medium">
                                {form.name || 'N/A'}
                              </td>
                              <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-muted-foreground">
                                {form.class || 'Not specified'}
                              </td>
                              <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-muted-foreground">
                                <div className="flex items-center gap-1 sm:gap-2">
                                  <span className="truncate max-w-[80px] sm:max-w-none">{form.phone || 'N/A'}</span>
                                  {form.phone && (
                                    <button 
                                      onClick={() => {
                                        navigator.clipboard.writeText(form.phone);
                                        alert('Phone number copied to clipboard!');
                                      }}
                                      className="p-1 rounded hover:bg-muted transition-colors"
                                      title="Copy phone number"
                                    >
                                      <Copy className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-muted-foreground">
                                <div className="flex items-center gap-1 sm:gap-2">
                                  <span className="truncate max-w-[80px] sm:max-w-none">{form.email || 'N/A'}</span>
                                  {form.email && (
                                    <button 
                                      onClick={() => {
                                        navigator.clipboard.writeText(form.email);
                                        alert('Email copied to clipboard!');
                                      }}
                                      className="p-1 rounded hover:bg-muted transition-colors"
                                      title="Copy email address"
                                    >
                                      <Copy className="h-3 w-3 sm:h-4 sm:w-4 text-muted-foreground" />
                                    </button>
                                  )}
                                </div>
                              </td>
                              <td className="px-2 sm:px-4 py-3 text-xs sm:text-sm text-muted-foreground">
                                {form.submittedAt ? new Date(form.submittedAt).toLocaleDateString() : 'Unknown'}
                              </td>
                              <td className="px-2 sm:px-4 py-3">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  form.status === 'new' 
                                    ? 'bg-green-100 text-green-800 border border-green-200'
                                    : 'bg-gray-100 text-gray-800 border border-gray-200'
                                }`}>
                                  {form.status === 'new' ? 'New' : 'Processed'}
                                </span>
                              </td>
                              <td className="px-2 sm:px-4 py-3">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteContactForm(form.id)}
                                  className="h-7 px-2 text-xs bg-red-500/10 hover:bg-red-500/20 text-red-600"
                                  title="Delete Contact Form"
                                >
                                  <X className="h-3 w-3 sm:h-4 sm:w-4" />
                                  <span className="sr-only">Delete</span>
                                </Button>
                              </td>
                            </tr>
                          ))
                        }
                        {contactForms.length === 0 && (
                          <tr>
                            <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                              <div className="flex flex-col items-center space-y-3">
                                <Mail className="h-12 w-12 text-muted-foreground/50" />
                                <div>
                                  <h3 className="text-sm font-medium text-foreground mb-1">No contact forms yet</h3>
                                  <p className="text-xs text-muted-foreground">
                                    Contact forms submitted through the admissions page will appear here.
                                  </p>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Summary Stats */}
                {contactForms.length > 0 && (
                  <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="text-2xl font-bold text-green-600">
                        {contactForms.filter(f => f.status === 'new').length}
                      </div>
                      <div className="text-sm text-green-700">New Forms</div>
                    </div>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="text-2xl font-bold text-blue-600">
                        {contactForms.length}
                      </div>
                      <div className="text-sm text-blue-700">Total Forms</div>
                    </div>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="text-2xl font-bold text-yellow-600">
                        {contactForms.filter(f => f.submittedAt && new Date(f.submittedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length}
                      </div>
                      <div className="text-sm text-yellow-700">This Week</div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Principal Remarks Modal */}
          {showPrincipalRemarksModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card rounded-xl p-3 sm:p-6 w-full max-w-md border border-border/50 max-h-[90vh] overflow-y-auto scroll-smooth"
              >
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                  <h3 className="text-base sm:text-lg font-semibold text-foreground">
                    Send Principal Remark
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowPrincipalRemarksModal(false);
                      setPrincipalRemarksForm({ studentId: '', type: 'good', message: '', subject: '' });
                    }}
                    className="h-8 w-8 p-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  {/* Filters */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-2">Filter Students</label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div>
                        <select
                          value={principalRemarkFilters.class}
                          onChange={(e) => setPrincipalRemarkFilters(prev => ({ ...prev, class: e.target.value }))}
                          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground min-h-[44px]"
                        >
                          <option value="">Class (1-12)</option>
                          {classFilterOptions.map(option => (
                            <option key={option} value={option}>
                              Class {option}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <select
                          value={principalRemarkFilters.section}
                          onChange={(e) =>
                            setPrincipalRemarkFilters(prev => ({ ...prev, section: e.target.value.toUpperCase() }))
                          }
                          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground min-h-[44px]"
                        >
                          <option value="">Section (A-E)</option>
                          {sectionFilterOptions.map(option => (
                            <option key={option} value={option}>
                              Section {option}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Input
                          value={principalRemarkFilters.roll}
                          onChange={(e) => setPrincipalRemarkFilters(prev => ({ ...prev, roll: e.target.value }))}
                          placeholder="Roll no."
                          className="text-sm min-h-[44px]"
                          type="number"
                          min="1"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Student Selection */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-2">Select Student</label>
                    <select
                      value={principalRemarksForm.studentId}
                      onChange={(e) => setPrincipalRemarksForm({ ...principalRemarksForm, studentId: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground min-h-[44px]"
                      disabled={filteredPrincipalRemarkStudents.length === 0}
                    >
                      <option value="">Choose a student...</option>
                      {filteredPrincipalRemarkStudents.map(student => (
                        <option key={student.id} value={student.id}>
                          {student.name || student.fullName} - Class {student.class}-{student.section}
                        </option>
                      ))}
                    </select>
                    {filteredPrincipalRemarkStudents.length === 0 && (
                      <p className="text-xs text-muted-foreground mt-2">
                        No students match the selected filters.
                      </p>
                    )}
                  </div>

                  {/* Remark Type */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-2">Remark Type</label>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                      <label className="flex items-center space-x-2 cursor-pointer min-h-[44px] px-3 py-2 rounded-lg border border-border/30 hover:bg-muted/20 transition-colors">
                        <input
                          type="radio"
                          value="good"
                          checked={principalRemarksForm.type === 'good'}
                          onChange={(e) => setPrincipalRemarksForm({ ...principalRemarksForm, type: e.target.value as 'good' | 'bad' })}
                          className="text-green-500 w-4 h-4"
                        />
                        <span className="text-green-500 font-medium text-sm">Good Remark</span>
                      </label>
                      <label className="flex items-center space-x-2 cursor-pointer min-h-[44px] px-3 py-2 rounded-lg border border-border/30 hover:bg-muted/20 transition-colors">
                        <input
                          type="radio"
                          value="bad"
                          checked={principalRemarksForm.type === 'bad'}
                          onChange={(e) => setPrincipalRemarksForm({ ...principalRemarksForm, type: e.target.value as 'good' | 'bad' })}
                          className="text-red-500 w-4 h-4"
                        />
                        <span className="text-red-500 font-medium text-sm">Bad Remark</span>
                      </label>
                    </div>
                  </div>

                  {/* Subject */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-2">Subject (Optional)</label>
                    <Input
                      value={principalRemarksForm.subject}
                      onChange={(e) => setPrincipalRemarksForm({ ...principalRemarksForm, subject: e.target.value })}
                      placeholder="e.g., Behavior, Academic Performance"
                      className="min-h-[44px] text-sm"
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-2">Remark Message</label>
                    <textarea
                      value={principalRemarksForm.message}
                      onChange={(e) => setPrincipalRemarksForm({ ...principalRemarksForm, message: e.target.value })}
                      placeholder="Enter your remark message..."
                      rows={3}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground resize-none min-h-[88px]"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowPrincipalRemarksModal(false);
                        setPrincipalRemarksForm({ studentId: '', type: 'good', message: '', subject: '' });
                      }}
                      className="flex-1 min-h-[44px] text-sm"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreatePrincipalRemark}
                      className={`flex-1 min-h-[44px] text-sm text-white ${
                        principalRemarksForm.type === 'good' 
                          ? 'bg-gradient-to-r from-green-500 to-green-600'
                          : 'bg-gradient-to-r from-red-500 to-red-600'
                      }`}
                      disabled={!principalRemarksForm.studentId || !principalRemarksForm.message}
                    >
                      <Star className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">Send {principalRemarksForm.type === 'good' ? 'Good' : 'Bad'} Remark</span>
                      <span className="sm:hidden">Send Remark</span>
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* Student Lookup Modal */}
          {showStudentLookupModal && (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card rounded-2xl w-full max-w-6xl border border-border/50 max-h-[95vh] overflow-y-auto scroll-smooth p-4 sm:p-6"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg sm:text-xl font-heading font-bold text-foreground">
                      Student Look Up
                    </h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Filter by class, section, roll number or search by student ID created by teachers.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={resetStudentLookup}
                      className="min-w-[90px]"
                    >
                      Clear Filters
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={closeStudentLookupModal}
                      className="h-9 w-9"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mt-4">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Class
                    </label>
                    <select
                      value={studentLookupFilters.class}
                      onChange={(e) => updateStudentLookupFilter('class', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground"
                    >
                      <option value="">All Classes</option>
                      {classOptions.map(cls => (
                        <option key={cls} value={cls}>
                          Class {cls}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Section
                    </label>
                    <select
                      value={studentLookupFilters.section}
                      onChange={(e) => updateStudentLookupFilter('section', e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground"
                    >
                      <option value="">All Sections</option>
                      {sectionOptions.map(section => (
                        <option key={section} value={section}>
                          Section {section.toUpperCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Roll Number
                    </label>
                    <Input
                      value={studentLookupFilters.roll}
                      onChange={(e) => updateStudentLookupFilter('roll', e.target.value)}
                      placeholder="e.g., 23"
                      className="text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">
                      Student ID
                    </label>
                    <Input
                      value={studentLookupFilters.studentId}
                      onChange={(e) => updateStudentLookupFilter('studentId', e.target.value)}
                      placeholder="Search by ID"
                      className="text-sm"
                    />
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-2 mt-4">
                  <div className="border border-border/60 rounded-2xl p-4 bg-background/60">
                    <div className="flex items-center justify-between">
                      <h4 className="font-semibold text-sm text-foreground">
                        Matching Students ({studentLookupResults.length})
                      </h4>
                      <span className="text-xs text-muted-foreground">
                        Tap to view details
                      </span>
                    </div>
                    <div className="mt-3 space-y-2 max-h-[60vh] overflow-y-auto scroll-smooth pr-1">
                      {studentLookupResults.length > 0 ? (
                        studentLookupResults.map(student => {
                          const isActive = selectedLookupStudent?.id === student.id;
                          return (
                            <button
                              key={student.id}
                              onClick={() => handleSelectLookupStudent(student)}
                              className={`w-full text-left p-3 rounded-xl border transition-all duration-150 ${
                                isActive
                                  ? 'border-primary/70 bg-primary/10 shadow-inner'
                                  : 'border-border/60 hover:border-primary/40 hover:bg-muted/40'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-sm font-semibold text-foreground">
                                    {student.name || student.fullName || 'Unnamed Student'}
                                  </p>
                                  <p className="text-[11px] text-muted-foreground">
                                    ID: {student.id || 'N/A'}
                                  </p>
                                </div>
                                <div className="text-right text-[11px] text-muted-foreground">
                                  <div>Class {student.class || '—'}-{student.section || '—'}</div>
                                  <div>Roll {student.rollNumber || '—'}</div>
                                </div>
                              </div>
                            </button>
                          );
                        })
                      ) : (
                        <div className="text-sm text-muted-foreground text-center py-12">
                          No students match the selected filters.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="border border-border/60 rounded-2xl p-4 bg-background/60">
                    {selectedLookupStudent ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 rounded-full border border-border/60 overflow-hidden bg-muted/30 flex items-center justify-center">
                            {getStudentPhoto(selectedLookupStudent) ? (
                              <img
                                src={getStudentPhoto(selectedLookupStudent)}
                                alt={selectedLookupStudent.name || selectedLookupStudent.fullName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <span className="text-lg font-semibold text-foreground">
                                {(selectedLookupStudent.name || selectedLookupStudent.fullName || 'NA')
                                  .split(' ')
                                  .map((part: string) => part[0])
                                  .join('')
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="text-base font-semibold text-foreground">
                              {selectedLookupStudent.name || selectedLookupStudent.fullName}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Student ID: {selectedLookupStudent.id}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Class {selectedLookupStudent.class}-{selectedLookupStudent.section} · Roll {selectedLookupStudent.rollNumber || 'N/A'}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          <div className="p-3 rounded-xl border border-border/50 bg-gradient-to-br from-background to-muted/20">
                            <p className="text-[11px] text-muted-foreground">Pending Fees</p>
                            <p className="text-lg font-semibold text-foreground">
                              {selectedStudentFees.dueAmount > 0 ? `Rs ${selectedStudentFees.dueAmount.toLocaleString()}` : 'No Dues'}
                            </p>
                          </div>
                          <div className="p-3 rounded-xl border border-border/50 bg-gradient-to-br from-background to-muted/20">
                            <p className="text-[11px] text-muted-foreground">Attendance (Present)</p>
                            <p className="text-lg font-semibold text-green-500">
                              {selectedStudentAttendance?.present || 0} days
                            </p>
                          </div>
                          <div className="p-3 rounded-xl border border-border/50 bg-gradient-to-br from-background to-muted/20">
                            <p className="text-[11px] text-muted-foreground">Teacher Remarks</p>
                            <p className="text-lg font-semibold text-foreground">
                              {selectedTeacherRemarks.length} total
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                          <div className="rounded-lg border border-border/40 py-2">
                            <p className="text-muted-foreground">Absent</p>
                            <p className="text-base font-semibold text-red-400">
                              {selectedStudentAttendance?.absent || 0}
                            </p>
                          </div>
                          <div className="rounded-lg border border-border/40 py-2">
                            <p className="text-muted-foreground">Late</p>
                            <p className="text-base font-semibold text-yellow-400">
                              {selectedStudentAttendance?.late || 0}
                            </p>
                          </div>
                          <div className="rounded-lg border border-border/40 py-2">
                            <p className="text-muted-foreground">Total</p>
                            <p className="text-base font-semibold text-foreground">
                              {selectedStudentAttendance?.total || 0}
                            </p>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-2">Pending Fees</h4>
                          {selectedStudentFees.pending.length > 0 ? (
                            <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                              {selectedStudentFees.pending.map(fee => (
                                <div key={fee.id} className="p-2 rounded-lg border border-border/40 flex items-center justify-between text-xs">
                                  <div>
                                    <p className="font-semibold text-foreground">
                                      {fee.month} {fee.year}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground capitalize">{fee.status}</p>
                                  </div>
                                  <span className="font-semibold text-foreground">
                                    Rs {fee.amount?.toLocaleString()}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">No pending fee requests.</p>
                          )}
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-2">
                            Teacher Remarks ({selectedTeacherRemarks.length})
                          </h4>
                          {selectedTeacherRemarks.length > 0 ? (
                            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                              {selectedTeacherRemarks.slice().reverse().map((remark: any, index: number) => (
                                <div key={index} className="p-3 rounded-xl border border-border/40 bg-muted/10">
                                  <div className="flex items-center justify-between text-[11px] mb-1">
                                    <span className={`font-semibold ${remark.type === 'good' ? 'text-green-500' : 'text-red-500'}`}>
                                      {remark.type === 'good' ? 'Good' : 'Bad'} Remark
                                    </span>
                                    <span className="text-muted-foreground">
                                      {remark.date ? new Date(remark.date).toLocaleDateString() : '—'}
                                    </span>
                                  </div>
                                  <p className="text-xs font-medium text-foreground">
                                    {remark.subject || 'General'}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">
                                    {remark.message}
                                  </p>
                                  {remark.images && remark.images.length > 0 && (
                                    <div className="flex flex-wrap gap-2 mt-2">
                                      {remark.images.map((img: string, idx: number) => (
                                        <img
                                          key={idx}
                                          src={img}
                                          alt={`Remark attachment ${idx + 1}`}
                                          className="w-16 h-16 object-cover rounded-lg border border-border/40"
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              No teacher remarks have been recorded yet.
                            </p>
                          )}
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-2">
                            Principal Remarks ({selectedPrincipalRemarks.length})
                          </h4>
                          {selectedPrincipalRemarks.length > 0 ? (
                            <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                              {selectedPrincipalRemarks.slice().reverse().map(remark => (
                                <div key={remark.id} className="p-3 rounded-xl border border-border/40 bg-muted/5">
                                  <div className="flex items-center justify-between text-[11px] mb-1">
                                    <span className={`font-semibold ${remark.type === 'good' ? 'text-green-500' : 'text-red-500'}`}>
                                      {remark.type === 'good' ? 'Good' : 'Bad'} Remark
                                    </span>
                                    <span className="text-muted-foreground">
                                      {new Date(remark.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="text-xs font-medium text-foreground">
                                    {remark.subject || 'General'}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">
                                    {remark.message}
                                  </p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              No principal remarks yet.
                            </p>
                          )}
                        </div>

                        <div>
                          <h4 className="text-sm font-semibold text-foreground mb-2">
                            Report Cards ({selectedStudentReports.length})
                          </h4>
                          {selectedStudentReports.length > 0 ? (
                            <div className="space-y-2 max-h-32 overflow-y-auto pr-1">
                              {selectedStudentReports.slice().reverse().map(report => (
                                <div key={report.id} className="p-3 rounded-xl border border-border/40 bg-muted/5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-semibold text-foreground">
                                      {report.subject}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                      By {report.teacherName} · {new Date(report.createdAt).toLocaleDateString()}
                                    </p>
                                    {report.notes && (
                                      <p className="text-xs text-muted-foreground mt-1">
                                        {report.notes}
                                      </p>
                                    )}
                                  </div>
                                  {report.reportImage && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => window.open(report.reportImage, '_blank')}
                                    >
                                      View Report
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              No report cards have been uploaded for this student.
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-center text-sm text-muted-foreground py-12">
                        <Search className="h-6 w-6 mb-2 opacity-70" />
                        Select a student from the list to view their fees, attendance, remarks, and report cards.
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* Notification Reply Modal */}
          {showNotificationReplyModal && selectedNotification && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card rounded-xl p-6 w-full max-w-2xl border border-border/50 max-h-[80vh] overflow-y-auto scroll-smooth"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-foreground">
                    Reply to Notification
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowNotificationReplyModal(false);
                      setSelectedNotification(null);
                      setReplyMessage('');
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  {/* Original Notification */}
                  <div className="bg-muted/20 rounded-lg p-4">
                    <h4 className="font-semibold text-foreground mb-2">{selectedNotification.subject}</h4>
                    <p className="text-sm text-blue-400 mb-2">
                      From: {selectedNotification.fromName} ({selectedNotification.fromType})
                    </p>
                    <p className="text-sm text-muted-foreground mb-2">{selectedNotification.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(selectedNotification.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  {/* Previous Replies */}
                  {selectedNotification.replies && selectedNotification.replies.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Previous Replies:</h4>
                      <div className="space-y-2">
                        {selectedNotification.replies.map((reply) => (
                          <div key={reply.id} className="bg-muted/10 rounded-lg p-3 border-l-4 border-blue-500">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm text-blue-400 mb-1">
                                  {reply.fromName} ({reply.fromType})
                                </p>
                                <p className="text-sm text-foreground mb-1">{reply.message}</p>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(reply.createdAt).toLocaleDateString()}
                                </p>
                              </div>

                              {/* Edit/Delete buttons for principal's own replies */}
                              {reply.fromType === 'principal' && (
                                <div className="flex items-center space-x-1 ml-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setReplyMessage(reply.message);
                                      // Remove this reply and let user edit it
                                      const updatedReplies = selectedNotification.replies?.filter(r => r.id !== reply.id) || [];
                                      const updatedNotification = { ...selectedNotification, replies: updatedReplies };
                                      setSelectedNotification(updatedNotification);

                                      // Update localStorage
                                      const allNotifications = JSON.parse(localStorage.getItem('royal-academy-notifications') || '[]');
                                      const updatedAllNotifications = allNotifications.map((n: Notification) => 
                                        n.id === selectedNotification.id ? updatedNotification : n
                                      );
                                      localStorage.setItem('royal-academy-notifications', JSON.stringify(updatedAllNotifications));

                                      // Update local state
                                      setNotifications(prev => prev.map(n => n.id === selectedNotification.id ? updatedNotification : n));
                                    }}
                                    className="h-6 w-6 p-0 text-blue-600 hover:text-blue-700"
                                    title="Edit Reply"
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      if (confirm('Are you sure you want to delete this reply?')) {
                                        // Remove this reply
                                        const updatedReplies = selectedNotification.replies?.filter(r => r.id !== reply.id) || [];
                                        const updatedNotification = { ...selectedNotification, replies: updatedReplies };
                                        setSelectedNotification(updatedNotification);

                                        // Update localStorage
                                        const allNotifications = JSON.parse(localStorage.getItem('royal-academy-notifications') || '[]');
                                        const updatedAllNotifications = allNotifications.map((n: Notification) => 
                                          n.id === selectedNotification.id ? updatedNotification : n
                                        );
                                        localStorage.setItem('royal-academy-notifications', JSON.stringify(updatedAllNotifications));

                                        // Update local state
                                        setNotifications(prev => prev.map(n => n.id === selectedNotification.id ? updatedNotification : n));
                                      }
                                    }}
                                    className="h-6 w-6 p-0 text-red-600 hover:text-red-700"
                                    title="Delete Reply"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Reply Message */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Your Reply</label>
                    <textarea
                      value={replyMessage}
                      onChange={(e) => setReplyMessage(e.target.value)}
                      placeholder="Enter your reply message..."
                      rows={4}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground resize-none"
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-2 pt-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowNotificationReplyModal(false);
                        setSelectedNotification(null);
                        setReplyMessage('');
                      }}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleReplyToNotification}
                      className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 text-white"
                      disabled={!replyMessage}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Reply
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}

          {/* Send Student Notification Modal - Principal */}
          {showStudentNotificationModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-card rounded-lg sm:rounded-xl w-full max-w-[calc(100vw-24px)] sm:max-w-lg border border-border/50 flex flex-col max-h-[85vh] sm:max-h-[90vh] mx-3 sm:mx-0"
              >
                {/* Fixed Header */}
                <div className="flex items-center justify-between p-4 sm:p-6 border-b border-border/50 flex-shrink-0">
                  <h3 className="text-base sm:text-lg font-semibold text-foreground">
                    <span className="sm:hidden">Notify Students</span>
                    <span className="hidden sm:inline">Send Notification to Students</span>
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setShowStudentNotificationModal(false);
                      setStudentNotificationForm({
                        subject: '',
                        message: '',
                        targetType: 'all',
                        targetClass: '',
                        targetSection: '',
                        targetStudentId: '',
                        photo1: '',
                        photo2: ''
                      });
                    }}
                    className="h-8 w-8 p-0 sm:h-9 sm:w-9"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto flex-1 p-4 sm:p-6 space-y-3 sm:space-y-4">
                  {/* Target Type Selection */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-2">Send To</label>
                    <select
                      value={studentNotificationForm.targetType}
                      onChange={(e) => setStudentNotificationForm({ 
                        ...studentNotificationForm, 
                        targetType: e.target.value as 'all' | 'class' | 'section' | 'student',
                        targetClass: '',
                        targetSection: '',
                        targetStudentId: ''
                      })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
                    >
                      <option value="all">All Students</option>
                      <option value="class">Specific Class</option>
                      <option value="section">Specific Section</option>
                      <option value="student">Individual Student</option>
                    </select>
                  </div>

                  {/* Class Selection */}
                  {(studentNotificationForm.targetType === 'class' || studentNotificationForm.targetType === 'section' || studentNotificationForm.targetType === 'student') && (
                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-2">Select Class</label>
                      <select
                        value={studentNotificationForm.targetClass}
                        onChange={(e) => setStudentNotificationForm({ 
                          ...studentNotificationForm, 
                          targetClass: e.target.value,
                          targetSection: '',
                          targetStudentId: ''
                        })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
                      >
                        <option value="">Choose a class...</option>
                        {Array.from(new Set(students.map(s => s.class))).map(className => (
                          <option key={className} value={className}>Class {className}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Section Selection */}
                  {(studentNotificationForm.targetType === 'section' || studentNotificationForm.targetType === 'student') && studentNotificationForm.targetClass && (
                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-2">Select Section</label>
                      <select
                        value={studentNotificationForm.targetSection}
                        onChange={(e) => setStudentNotificationForm({ 
                          ...studentNotificationForm, 
                          targetSection: e.target.value,
                          targetStudentId: ''
                        })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
                      >
                        <option value="">Choose a section...</option>
                        {Array.from(new Set(
                          students
                            .filter(s => s.class === studentNotificationForm.targetClass)
                            .map(s => s.section)
                        )).map(section => (
                          <option key={section} value={section}>Section {section}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Student Selection */}
                  {studentNotificationForm.targetType === 'student' && studentNotificationForm.targetClass && studentNotificationForm.targetSection && (
                    <div>
                      <label className="block text-xs sm:text-sm font-medium mb-2">Select Student</label>
                      <select
                        value={studentNotificationForm.targetStudentId}
                        onChange={(e) => setStudentNotificationForm({ 
                          ...studentNotificationForm, 
                          targetStudentId: e.target.value
                        })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground text-sm"
                      >
                        <option value="">Choose a student...</option>
                        {students
                          .filter(s => s.class === studentNotificationForm.targetClass && s.section === studentNotificationForm.targetSection)
                          .map(student => (
                            <option key={student.id} value={student.id}>
                              {student.name} - Roll: {student.rollNumber}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}

                  {/* Subject */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-2">Subject</label>
                    <Input
                      value={studentNotificationForm.subject}
                      onChange={(e) => setStudentNotificationForm({ ...studentNotificationForm, subject: e.target.value })}
                      placeholder="Enter notification subject"
                      className="text-sm"
                    />
                  </div>

                  {/* Message */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-2">Message</label>
                    <textarea
                      value={studentNotificationForm.message}
                      onChange={(e) => setStudentNotificationForm({ ...studentNotificationForm, message: e.target.value })}
                      placeholder="Enter your message to students..."
                      rows={3}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground resize-none text-sm"
                    />
                  </div>

                  {/* Photo Attachments */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium mb-2">Photo Attachments (Optional)</label>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-[10px] sm:text-xs text-muted-foreground mb-1">Photo 1</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const base64 = event.target?.result as string;
                                setStudentNotificationForm({ ...studentNotificationForm, photo1: base64 });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-border rounded-lg bg-background text-foreground text-xs sm:text-sm file:mr-2 sm:file:mr-4 file:py-1 sm:file:py-2 file:px-2 sm:file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {studentNotificationForm.photo1 && (
                          <div className="mt-2 relative">
                            <img 
                              src={studentNotificationForm.photo1} 
                              alt="Photo 1 preview" 
                              className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded border"
                            />
                            <button
                              type="button"
                              onClick={() => setStudentNotificationForm({ ...studentNotificationForm, photo1: '' })}
                              className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 text-white rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-xs hover:bg-red-600"
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-[10px] sm:text-xs text-muted-foreground mb-1">Photo 2</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                const base64 = event.target?.result as string;
                                setStudentNotificationForm({ ...studentNotificationForm, photo2: base64 });
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="w-full px-2 sm:px-3 py-1.5 sm:py-2 border border-border rounded-lg bg-background text-foreground text-xs sm:text-sm file:mr-2 sm:file:mr-4 file:py-1 sm:file:py-2 file:px-2 sm:file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {studentNotificationForm.photo2 && (
                          <div className="mt-2 relative">
                            <img 
                              src={studentNotificationForm.photo2} 
                              alt="Photo 2 preview" 
                              className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded border"
                            />
                            <button
                              type="button"
                              onClick={() => setStudentNotificationForm({ ...studentNotificationForm, photo2: '' })}
                              className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 text-white rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center text-xs hover:bg-red-600"
                            >
                              ×
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-2 sm:p-3">
                    <div className="flex items-start space-x-2">
                      <Bell className="h-3 w-3 sm:h-4 sm:w-4 text-purple-400 mt-0.5 flex-shrink-0" />
                      <div className="text-xs sm:text-sm min-w-0">
                        <p className="font-medium text-foreground mb-1">Notification Target</p>
                        <p className="text-[10px] sm:text-xs text-muted-foreground break-words">
                          {studentNotificationForm.targetType === 'all' && 'This notification will be sent to all students in the school.'}
                          {studentNotificationForm.targetType === 'class' && studentNotificationForm.targetClass && `This notification will be sent to all students in Class ${studentNotificationForm.targetClass}.`}
                          {studentNotificationForm.targetType === 'section' && studentNotificationForm.targetClass && studentNotificationForm.targetSection && `This notification will be sent to all students in Class ${studentNotificationForm.targetClass}-${studentNotificationForm.targetSection}.`}
                          {studentNotificationForm.targetType === 'student' && studentNotificationForm.targetStudentId && 'This notification will be sent to the selected student only.'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fixed Footer */}
                <div className="flex-shrink-0 border-t border-border/50 p-4 sm:p-6">
                  <div className="flex flex-col-reverse sm:flex-row space-y-reverse space-y-2 sm:space-y-0 sm:space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowStudentNotificationModal(false);
                        setStudentNotificationForm({
                          subject: '',
                          message: '',
                          targetType: 'all',
                          targetClass: '',
                          targetSection: '',
                          targetStudentId: '',
                          photo1: '',
                          photo2: ''
                        });
                      }}
                      className="w-full sm:flex-1 h-10 sm:h-9 text-sm border-2 border-gold text-black hover:bg-gold/10 hover:border-gold/80"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSendStudentNotification}
                      className="w-full sm:flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white border-2 border-purple-500 h-10 sm:h-9 text-sm mb-2 sm:mb-0"
                      disabled={!studentNotificationForm.subject || !studentNotificationForm.message}
                    >
                      <Bell className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span className="sm:hidden">Send</span>
                      <span className="hidden sm:inline">Send Notification</span>
                    </Button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {deleteConfirmModal.show && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setDeleteConfirmModal({ show: false, admissionId: null, studentName: '' })}>
            <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="text-lg font-heading font-bold text-red-600">Confirm Deletion</h3>
                <Button variant="ghost" size="sm" onClick={() => setDeleteConfirmModal({ show: false, admissionId: null, studentName: '' })}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <div className="p-6">
                <p className="text-foreground mb-4">
                  Are you sure you want to delete the admission record for <strong>{deleteConfirmModal.studentName}</strong>?
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  This action cannot be undone. All information including documents will be permanently deleted from Supabase.
                </p>
                <div className="flex items-center space-x-2 mb-6">
                  <input
                    type="checkbox"
                    id="neverAskAgain"
                    checked={neverAskAgain}
                    onChange={(e) => setNeverAskAgain(e.target.checked)}
                    className="w-4 h-4 rounded border-border"
                  />
                  <label htmlFor="neverAskAgain" className="text-sm text-muted-foreground cursor-pointer">
                    Don't ask me again
                  </label>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
                <Button variant="outline" onClick={() => {
                  setDeleteConfirmModal({ show: false, admissionId: null, studentName: '' });
                  setNeverAskAgain(false);
                }}>
                  Cancel
                </Button>
                <Button onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white">
                  Delete Permanently
                </Button>
              </div>
            </div>
          </div>
        )}

          {activeSection === "topscorerslearnmore" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-8"
            >
              <div className="bg-card/95 backdrop-blur-md rounded-xl p-6 border border-border/50">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-heading font-bold text-foreground">
                    Top Scorers Learn More Content
                  </h2>
                  <Button
                    variant="outline"
                    onClick={() => setActiveSection("dashboard")}
                    size="sm"
                  >
                    Back to Dashboard
                  </Button>
                </div>
                <Suspense fallback={<RouteLoader />}>
                  <TopScorersLearnMoreManager />
                </Suspense>
              </div>
            </motion.div>
          )}

        {/* Document Viewer Modal */}
        {documentViewer.show && (
          <Suspense fallback={<RouteLoader />}>
            <DocumentViewer
              documentUrl={documentViewer.url}
              documentName={documentViewer.name}
              onClose={() => setDocumentViewer({ show: false, url: '', name: '' })}
            />
          </Suspense>
        )}
      </div>
    );
};

export default PrincipalDashboard;