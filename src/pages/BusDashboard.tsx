import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bus, Edit, Trash2, AlertCircle, Eye } from 'lucide-react';
import { getSupabaseData, setSupabaseData, subscribeToSupabaseChanges } from '@/lib/supabaseHelpers';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import Compass from '@/components/Compass';
import { lazy, Suspense } from 'react';
import RouteLoader from '@/components/RouteLoader';

const DocumentViewer = lazy(() => import('@/components/DocumentViewer'));

interface BusUser {
  id: string;
  busId: string;
  username: string;
  password: string;
  status: 'active' | 'banned' | 'suspended';
  createdAt: string;
  lastLogin?: string;
  routeName?: string;
  busNumber?: string;
  driverName?: string;
  driverPhone?: string;
  owner?: string;
}

interface BusPrincipalMsg {
  id: string;
  owner: string;
  busUserId: string;
  busId: string;
  from: 'bus' | 'principal';
  type: 'good' | 'bad' | 'reply';
  text: string;
  images?: string[]; // up to 4
  createdAt: string;
  driverName?: string;
}

interface Student {
  id: string;
  name: string;
  class: string;
  section: string;
  rollNumber: string | number;
}

interface Assignment {
  studentId: string;
  busUserId: string;
  busId: string;
  assignedAt: string;
  trackingStatus?: 'active' | 'reached_home' | 'absent'; // New field for tracking status
  reachedHomeAt?: string; // New field for timestamp when reached home
}

interface BusMsg {
  id: string;
  owner: string;
  busUserId: string;
  busId: string;
  type: 'good' | 'bad';
  text: string;
  image1?: string;
  image2?: string;
  createdAt: string;
  to: 'all' | 'student';
  studentIds?: string[];
}

const BUS_KEY = 'royal-academy-auth-buses';
const STUDENTS_KEY = 'royal-academy-students';
const ASSIGNMENTS_GLOBAL_KEY = 'royal-academy-bus-assignments-global';
const BUS_LOCATIONS_KEY = 'royal-academy-bus-locations';
const BUS_MESSAGES_GLOBAL_KEY = 'royal-academy-bus-messages-global';
const BUS_PRINCIPAL_MSG_KEY = 'royal-academy-bus-principal-messages';

// Custom Leaflet icon for bus location
const busSvgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="48" height="48"><circle cx="24" cy="24" r="22" fill="#dc2626" stroke="white" stroke-width="3"/><path d="M16 32c0 .88.39 1.67 1 2.22V36c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h8v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1.78c.61-.55 1-1.34 1-2.22V22c0-3.5-3.58-4-8-4s-8 .5-8 4v10zm3.5 1c-.83 0-1.5-.67-1.5-1.5S18.67 30 19.5 30s1.5.67 1.5 1.5S20.33 33 19.5 33zm9 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm1.5-6H18v-5h12v5z" fill="white"/></svg>`;

const busIcon = new L.Icon({
  iconUrl: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(busSvgString),
  iconSize: [48, 48],
  iconAnchor: [24, 48],
  popupAnchor: [0, -48]
});

// Component to update map view when bus moves
const MapUpdater = ({ position }: { position: { lat: number; lng: number } }) => {
  const map = useMap();
  const initialZoomSet = useRef(false);
  
  useEffect(() => {
    // Check if map is properly initialized
    if (!map || !map.getSize().x || !map.getSize().y) return;
    
    if (!initialZoomSet.current) {
      // Set initial view with zoom
      map.setView([position.lat, position.lng], 16);
      initialZoomSet.current = true;
    } else {
      // Only pan to new position, preserve user's zoom level
      if (map && map.getSize().x && map.getSize().y) {
        map.panTo([position.lat, position.lng], { animate: true });
      }
    }
  }, [map, position]);
  
  return null;
};

const BusDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [busUser, setBusUser] = useState<BusUser | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [availSearch, setAvailSearch] = useState('');
  const [selectedSearch, setSelectedSearch] = useState('');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [availMode, setAvailMode] = useState<'all' | 'not_selected' | 'selected_only'>('all');
  const [tracking, setTracking] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [myLatLng, setMyLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [previousLatLng, setPreviousLatLng] = useState<{ lat: number; lng: number } | null>(null);
  const [locationSet, setLocationSet] = useState(false);
  const [messages, setMessages] = useState<BusMsg[]>([]);
  const [msgType, setMsgType] = useState<'good'|'bad'>('good');
  const [msgText, setMsgText] = useState('');
  const [msgAudience, setMsgAudience] = useState<'all'|'individual'>('all');
  const [recipientIds, setRecipientIds] = useState<Set<string>>(new Set());
  const [img1, setImg1] = useState<string | null>(null);
  const [img2, setImg2] = useState<string | null>(null);
  // Principal messaging
  const [principalMsgs, setPrincipalMsgs] = useState<BusPrincipalMsg[]>([]);
  const [pMsgType, setPMsgType] = useState<'good'|'bad'>('good');
  const [pMsgText, setPMsgText] = useState('');
  const [pImgs, setPImgs] = useState<(string | null)[]>([null, null, null, null]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingPrincipalMessageId, setEditingPrincipalMessageId] = useState<string | null>(null);
  // Document viewer state
  const [documentViewer, setDocumentViewer] = useState<{ show: boolean; url: string; name: string }>({ show: false, url: '', name: '' });

  const assignmentsKey = useMemo(() => {
    const owner = busUser?.owner?.toLowerCase() || (localStorage.getItem('principalEmail') || 'principal.1025@gmail.com').toLowerCase();
    return `royal-academy-bus-assignments:${owner}`;
  }, [busUser]);

  useEffect(() => {
    const init = async () => {
      const userId = localStorage.getItem('busUserId');
      const auth = localStorage.getItem('busAuth');
      if (auth !== 'true' || !userId) {
        // Not logged in
        navigate('/buses', { replace: true });
        return;
      }
      const accounts = await getSupabaseData<BusUser[]>(BUS_KEY, []);
      const me = (accounts || []).find((a) => a.id === userId) || null;
      if (!me || me.status !== 'active') {
        localStorage.removeItem('busAuth');
        localStorage.removeItem('busUsername');
        localStorage.removeItem('busId');
        localStorage.removeItem('busUserId');
        navigate('/buses', { replace: true });
        return;
      }
      setBusUser(me);
      const studs = await getSupabaseData<Student[]>(STUDENTS_KEY, []);
      setStudents(studs);
      const asg = await getSupabaseData<Assignment[]>(`royal-academy-bus-assignments:${(me.owner || '').toLowerCase()}`, []);
      setAssignments(asg);
      // Fallback last known location
      const locs = await getSupabaseData<any[]>(BUS_LOCATIONS_KEY, []);
      const mineLoc = (locs || []).find(l => l.busUserId === me.id);
      if (mineLoc) setMyLatLng({ lat: mineLoc.lat, lng: mineLoc.lng });

      // Load existing messages for this bus
      const allMsgs = await getSupabaseData<BusMsg[]>(BUS_MESSAGES_GLOBAL_KEY, []);
      setMessages((allMsgs || []).filter(m => m.busUserId === me.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

      // Load existing principal messages for this bus
      const allPrincipalMsgs = await getSupabaseData<BusPrincipalMsg[]>(BUS_PRINCIPAL_MSG_KEY, []);
      setPrincipalMsgs((allPrincipalMsgs || []).filter(m => m.busUserId === me.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    };

    init();
  }, [navigate]);

  // PICK PRINCIPAL MESSAGE IMAGE (max 4)
  const onPickPImage = async (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const b64 = await toBase64(f);
    setPImgs(prev => prev.map((v, i) => (i === idx ? b64 : v)) as (string|null)[]);
  };

  // SEND MESSAGE TO PRINCIPAL
  const sendPrincipalMessage = async () => {
    if (!busUser) return;
    if (!pMsgText.trim()) return;
    const owner = (busUser.owner || '').toLowerCase();
    const id = `BUSPRN${Date.now()}`;
    const payload: BusPrincipalMsg = {
      id,
      owner,
      busUserId: busUser.id,
      busId: busUser.busId,
      from: 'bus',
      type: pMsgType,
      text: pMsgText.trim(),
      images: pImgs.filter(Boolean) as string[],
      createdAt: new Date().toISOString(),
      driverName: busUser.driverName || busUser.username,
    };
    try {
      const list = await getSupabaseData<BusPrincipalMsg[]>(BUS_PRINCIPAL_MSG_KEY, []);
      const updated = [...(list || []), payload];
      await setSupabaseData(BUS_PRINCIPAL_MSG_KEY, updated);
      setPrincipalMsgs(updated.filter(m => m.busUserId === busUser.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setPMsgText('');
      setPImgs([null, null, null, null]);
      toast.success('Sent to principal');
    } catch (e) {
      toast.error('Failed to send');
    }
  };

  // EDIT MESSAGE TO PRINCIPAL
  const editPrincipalMessage = async () => {
    if (!busUser || !editingPrincipalMessageId) return;
    if (!pMsgText.trim()) return;
    try {
      const list = await getSupabaseData<BusPrincipalMsg[]>(BUS_PRINCIPAL_MSG_KEY, []);
      const updated = (list || []).map(m =>
        m.id === editingPrincipalMessageId ? {
          ...m,
          type: pMsgType,
          text: pMsgText.trim(),
          images: pImgs.filter(Boolean) as string[],
        } : m
      );
      await setSupabaseData(BUS_PRINCIPAL_MSG_KEY, updated);
      setPrincipalMsgs(updated.filter(m => m.busUserId === busUser.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setPMsgText('');
      setPImgs([null, null, null, null]);
      setEditingPrincipalMessageId(null);
      toast.success('Message updated');
    } catch (e) {
      toast.error('Failed to update message');
    }
  };

  // DELETE MESSAGE TO PRINCIPAL
  const deletePrincipalMessage = async (id: string) => {
    if (!busUser) return;
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
      const list = await getSupabaseData<BusPrincipalMsg[]>(BUS_PRINCIPAL_MSG_KEY, []);
      const updated = (list || []).filter(m => m.id !== id);
      await setSupabaseData(BUS_PRINCIPAL_MSG_KEY, updated);
      setPrincipalMsgs(updated.filter(m => m.busUserId === busUser.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      toast.success('Message deleted');
    } catch (e) {
      toast.error('Failed to delete message');
    }
  };

  // START EDITING PRINCIPAL MESSAGE
  const startEditPrincipalMessage = (msg: BusPrincipalMsg) => {
    setEditingPrincipalMessageId(msg.id);
    setPMsgType(msg.type === 'reply' ? 'good' : msg.type);
    setPMsgText(msg.text);
    setPImgs(msg.images && msg.images.length > 0 ? [...msg.images, null, null, null].slice(0, 4) : [null, null, null, null]);
  };

  

  useEffect(() => {
    if (!assignmentsKey) return;
    const unsub = subscribeToSupabaseChanges<Assignment[]>(assignmentsKey, (val) => {
      setAssignments(Array.isArray(val) ? val : []);
    });
    return () => {
      unsub?.();
    };
  }, [assignmentsKey]);

  // Subscribe to messages
  useEffect(() => {
    const unsub = subscribeToSupabaseChanges<BusMsg[]>(BUS_MESSAGES_GLOBAL_KEY, (val) => {
      if (!busUser) return;
      const list = Array.isArray(val) ? val : [];
      setMessages(list.filter(m => m.busUserId === busUser.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });
    return () => { try { unsub(); } catch {} };
  }, [busUser]);

  // Subscribe to principal <-> bus messages
  useEffect(() => {
    const unsub = subscribeToSupabaseChanges<BusPrincipalMsg[]>(BUS_PRINCIPAL_MSG_KEY, (val) => {
      if (!busUser) return;
      const list = Array.isArray(val) ? val : [];
      setPrincipalMsgs(list.filter(m => m.busUserId === busUser.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    });
    return () => { try { unsub(); } catch {} };
  }, [busUser]);

  // Ensure global mapping is populated for this owner's assignments
  useEffect(() => {
    const syncGlobal = async () => {
      if (!busUser) return;
      try {
        const owner = (busUser.owner || '').toLowerCase();
        const globalList = await getSupabaseData<any[]>(ASSIGNMENTS_GLOBAL_KEY, []);
        const map = new Map<string, any>();
        (globalList || []).forEach(r => map.set(`${r.owner}::${r.studentId}`, r));
        assignments.forEach(a => {
          // attach student details if available
          const s = students.find(st => st.id === a.studentId);
          const key = `${owner}::${a.studentId}`;
          map.set(key, {
            owner,
            studentId: a.studentId,
            busUserId: a.busUserId,
            busId: a.busId,
            assignedAt: a.assignedAt,
            studentName: s?.name || '',
            class: s?.class ?? '',
            section: (s?.section ?? '').toString().toUpperCase(),
            rollNumber: s?.rollNumber ?? '',
            // Preserve existing trackingStatus and reachedHomeAt if present, otherwise default
            trackingStatus: a.trackingStatus || 'active',
            reachedHomeAt: a.reachedHomeAt || undefined,
          });
        });
        await setSupabaseData(ASSIGNMENTS_GLOBAL_KEY, Array.from(map.values()));
      } catch {}
    };
    syncGlobal();
  }, [assignments, busUser, students]);

  const logout = () => {
    localStorage.removeItem('busAuth');
    localStorage.removeItem('busUsername');
    localStorage.removeItem('busId');
    localStorage.removeItem('busUserId');
    navigate('/buses', { replace: true });
  };

  const myAssigned = useMemo(() => {
    if (!busUser) return [] as Assignment[];
    const mine = assignments.filter(a => a.busUserId === busUser.id);
    const seen = new Set<string>();
    return mine.filter(a => {
      if (seen.has(a.studentId)) return false;
      seen.add(a.studentId);
      return true;
    });
  }, [assignments, busUser]);

  const assignedStudentIds = useMemo(() => new Set(assignments.map(a => a.studentId)), [assignments]);
  const myAssignedIds = useMemo(() => new Set(myAssigned.map(a => a.studentId)), [myAssigned]);

  const classOptions = useMemo(() => {
    return ['all','1','2','3','4','5','6','7','8','9','10','11','12'];
  }, []);

  const sectionOptions = useMemo(() => {
    return ['all','A','B','C','D','E'];
  }, []);

  const availableStudents = useMemo(() => {
    const q = availSearch.trim().toLowerCase();
    return students
      // respect class/section filters
      .filter(s => classFilter === 'all' || String(s.class) === classFilter)
      .filter(s => sectionFilter === 'all' || String(s.section).toUpperCase() === sectionFilter)
      // availability mode
      .filter(s => {
        if (availMode === 'not_selected') return !assignedStudentIds.has(s.id);
        if (availMode === 'selected_only') return myAssignedIds.has(s.id);
        // 'all': show only unassigned to avoid duplicates in Available and Selected
        return !assignedStudentIds.has(s.id);
      })
      // text search
      .filter(s => !q ||
        s.name.toLowerCase().includes(q) ||
        (s.class || '').toString().toLowerCase().includes(q) ||
        (s.section || '').toString().toLowerCase().includes(q) ||
        String(s.rollNumber).toLowerCase().includes(q)
      );
  }, [students, assignedStudentIds, myAssignedIds, availSearch, classFilter, sectionFilter, availMode]);

  const selectedItems = useMemo(() => {
    const q = selectedSearch.trim().toLowerCase();
    return myAssigned
      .map(a => ({ a, s: students.find(st => st.id === a.studentId) }))
      .filter((x): x is { a: Assignment, s: Student } => Boolean(x.s))
      .filter(({ s }) => classFilter === 'all' || String(s.class) === classFilter)
      .filter(({ s }) => sectionFilter === 'all' || String(s.section).toUpperCase() === sectionFilter)
      .filter(({ s }) => !q ||
        s.name.toLowerCase().includes(q) ||
        (s.class || '').toString().toLowerCase().includes(q) ||
        (s.section || '').toString().toLowerCase().includes(q) ||
        String(s.rollNumber).toLowerCase().includes(q)
      );
  }, [myAssigned, students, selectedSearch, classFilter, sectionFilter]);

  const addStudent = async (student: Student) => {
    if (!busUser) return;
    if (myAssignedIds.has(student.id)) {
      toast.success('Already added');
      return;
    }
    const exists = assignments.some(a => a.studentId === student.id);
    if (exists && !myAssigned.some(a => a.studentId === student.id)) {
      toast.error('Student already assigned to another bus');
      return;
    }
    const next: Assignment[] = assignments
      .filter(a => !(a.studentId === student.id && a.busUserId !== busUser.id))
      .concat([{ studentId: student.id, busUserId: busUser.id, busId: busUser.busId, assignedAt: new Date().toISOString(), trackingStatus: 'active' }]); // Default to active
    const ok = await setSupabaseData(assignmentsKey, next);
    if (ok) setAssignments(next);
    try {
      const globalList = await getSupabaseData<({ owner: string } & Assignment)[]>(ASSIGNMENTS_GLOBAL_KEY, []);
      const owner = (busUser.owner || '').toLowerCase();
      const filtered = (globalList || []).filter(a => !(a.studentId === student.id && (a as any).owner === owner));
      const updated = [...filtered, {
        owner,
        studentId: student.id,
        busUserId: busUser.id,
        busId: busUser.busId,
        assignedAt: new Date().toISOString(),
        studentName: (student as any).name,
        class: (student as any).class,
        section: String((student as any).section ?? '').toUpperCase(),
        rollNumber: (student as any).rollNumber,
        trackingStatus: 'active', // Default to active
      }];
      await setSupabaseData(ASSIGNMENTS_GLOBAL_KEY, updated);
    } catch {}
  };

  const removeStudent = async (studentId: string) => {
    if (!busUser) return;
    const next = assignments.filter(a => !(a.studentId === studentId && a.busUserId === busUser.id));
    const ok = await setSupabaseData(assignmentsKey, next);
    if (ok) setAssignments(next);
    try {
      const globalList = await getSupabaseData<({ owner: string } & Assignment)[]>(ASSIGNMENTS_GLOBAL_KEY, []);
      const owner = (busUser.owner || '').toLowerCase();
      const updated = (globalList || []).filter(a => !(a.studentId === studentId && (a as any).owner === owner));
      await setSupabaseData(ASSIGNMENTS_GLOBAL_KEY, updated);
    } catch {}
  };

  // Function to update tracking status of a student
  const toggleStudentTracking = async (studentId: string, status: 'active' | 'reached_home' | 'absent') => {
    if (!busUser) return;
    const currentAssignment = assignments.find(a => a.studentId === studentId && a.busUserId === busUser.id);
    if (!currentAssignment) return;

    const updatedAssignment: Assignment = {
      ...currentAssignment,
      trackingStatus: status,
      reachedHomeAt: status === 'reached_home' ? new Date().toISOString() : currentAssignment.reachedHomeAt,
    };

    const next = assignments.map(a =>
      a.studentId === studentId && a.busUserId === busUser.id ? updatedAssignment : a
    );

    const ok = await setSupabaseData(assignmentsKey, next);
    if (ok) setAssignments(next);

    // Update global assignments as well
    try {
      const globalList = await getSupabaseData<({ owner: string } & Assignment)[]>(ASSIGNMENTS_GLOBAL_KEY, []);
      const owner = (busUser.owner || '').toLowerCase();
      const updatedGlobal = (globalList || []).map(a =>
        a.studentId === studentId && a.owner === owner ? {
          ...a,
          trackingStatus: status,
          reachedHomeAt: status === 'reached_home' ? new Date().toISOString() : a.reachedHomeAt,
        } : a
      );
      await setSupabaseData(ASSIGNMENTS_GLOBAL_KEY, updatedGlobal);
      toast.success(`Student ${status === 'reached_home' ? 'marked as reached home' : status === 'absent' ? 'marked as absent' : 'tracking activated'}`);
    } catch (e) {
      console.error("Failed to update global assignments:", e);
      toast.error("Failed to update tracking status globally.");
    }
  };

  const useCurrentLocation = () => {
    console.log('🔵 Use Current Location button clicked');
    
    if (!('geolocation' in navigator)) {
      console.error('❌ Geolocation not supported');
      setGpsError('Geolocation not supported');
      toast.error('Geolocation not supported by your browser');
      return;
    }
    
    console.log('📍 Requesting current location...');
    setGpsError(null);
    toast.info('Getting your location...');
    
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude, accuracy } = pos.coords;
        console.log('✅ Location obtained:', { latitude, longitude, accuracy });
        setMyLatLng({ lat: latitude, lng: longitude });
        setLocationSet(true);
        setGpsError(null);
        toast.success(`Location set successfully! (±${Math.round(accuracy)}m accuracy)`);
      },
      (err) => {
        console.error('❌ Geolocation error:', err);
        if (err.code === 3) {
          setGpsError('GPS timeout - trying again...');
          toast.warning('Timeout, trying again with lower accuracy...');
          setTimeout(() => {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const { latitude, longitude, accuracy } = pos.coords;
                console.log('✅ Location obtained (retry):', { latitude, longitude, accuracy });
                setMyLatLng({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                setLocationSet(true);
                setGpsError(null);
                toast.success(`Location set! (±${Math.round(accuracy)}m accuracy)`);
              },
              (retryErr) => {
                console.error('❌ Retry failed:', retryErr);
                setGpsError('Unable to get location. Please check GPS settings.');
                toast.error('Unable to get location. Please enable GPS.');
              },
              { enableHighAccuracy: false, timeout: 10000 }
            );
          }, 1000);
        } else if (err.code === 1) {
          setGpsError('Location permission denied');
          toast.error('Please allow location access in your browser settings');
        } else {
          setGpsError('Location error. Please enable GPS and try again.');
          toast.error('Location error. Please enable GPS and try again.');
        }
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 }
    );
  };

  const startTracking = async () => {
    if (!busUser) return;
    if (!('geolocation' in navigator)) {
      setGpsError('Geolocation not supported');
      return;
    }
    setGpsError(null);
    const id = navigator.geolocation.watchPosition(async (pos) => {
      const { latitude, longitude } = pos.coords;
      
      // Update previous location before updating current
      if (myLatLng) {
        setPreviousLatLng({ ...myLatLng });
      }
      
      setMyLatLng({ lat: latitude, lng: longitude });
      setGpsError(null); // Clear any previous errors
      try {
        const list = await getSupabaseData<any[]>(BUS_LOCATIONS_KEY, []);
        const owner = (busUser.owner || '').toLowerCase();
        const keyMatch = (r: any) => r.busUserId === busUser.id && r.owner === owner;
        const others = (list || []).filter((r) => !keyMatch(r));
        const updated = [
          ...others,
          { owner, busUserId: busUser.id, busId: busUser.busId, lat: latitude, lng: longitude, updatedAt: new Date().toISOString() }
        ];
        await setSupabaseData(BUS_LOCATIONS_KEY, updated);
        setTracking(true);
      } catch (e) {
        setGpsError('Failed to update location');
      }
    }, (err) => {
      if (err.code === 3) {
        setGpsError('GPS timeout - trying again...');
        // Retry once with lower accuracy
        setTimeout(() => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setMyLatLng({ lat: pos.coords.latitude, lng: pos.coords.longitude });
              setGpsError(null);
            },
            () => setGpsError('Unable to get location. Please check GPS settings.'),
            { enableHighAccuracy: false, timeout: 10000 }
          );
        }, 1000);
      } else {
        setGpsError('Location error. Please enable GPS and try again.');
      }
    }, { enableHighAccuracy: true, maximumAge: 50, timeout: 30000 });
    setWatchId(id as unknown as number);
  };

  const stopTracking = async () => {
    if (watchId != null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setTracking(false);
    setGpsError(null);
    
    // Remove bus location from tracking when stopped
    if (!busUser) return;
    try {
      const list = await getSupabaseData<any[]>(BUS_LOCATIONS_KEY, []);
      const owner = (busUser.owner || '').toLowerCase();
      const updated = (list || []).filter(r => !(r.busUserId === busUser.id && r.owner === owner));
      await setSupabaseData(BUS_LOCATIONS_KEY, updated);
    } catch (e) {
      console.error('Failed to remove location:', e);
    }
  };

  const toBase64 = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>, idx: 1 | 2) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const b64 = await toBase64(f);
    if (idx === 1) setImg1(b64); else setImg2(b64);
  };

  const toggleRecipient = (id: string, checked: boolean) => {
    setRecipientIds(prev => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const sendMessage = async () => {
    if (!busUser) return;
    if (!msgText.trim()) return;
    const owner = (busUser.owner || '').toLowerCase();
    const id = `BUSMSG${Date.now()}`;
    const payload: BusMsg = {
      id,
      owner,
      busUserId: busUser.id,
      busId: busUser.busId,
      type: msgType,
      text: msgText.trim(),
      image1: img1 || undefined,
      image2: img2 || undefined,
      createdAt: new Date().toISOString(),
      to: msgAudience === 'all' ? 'all' : 'student',
      studentIds: msgAudience === 'individual' ? Array.from(recipientIds) : undefined,
    };
    try {
      const list = await getSupabaseData<BusMsg[]>(BUS_MESSAGES_GLOBAL_KEY, []);
      const updated = [...(list || []), payload];
      await setSupabaseData(BUS_MESSAGES_GLOBAL_KEY, updated);
      setMessages(updated.filter(m => m.busUserId === busUser.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setMsgText(''); setImg1(null); setImg2(null); setRecipientIds(new Set());
      toast.success('Message sent');
    } catch (e) {
      toast.error('Failed to send');
    }
  };

  // EDIT MESSAGE TO STUDENT
  const editMessage = async () => {
    if (!busUser || !editingMessageId) return;
    if (!msgText.trim()) return;
    try {
      const list = await getSupabaseData<BusMsg[]>(BUS_MESSAGES_GLOBAL_KEY, []);
      const updated = (list || []).map(m =>
        m.id === editingMessageId ? {
          ...m,
          type: msgType,
          text: msgText.trim(),
          image1: img1 || undefined,
          image2: img2 || undefined,
          to: msgAudience === 'all' ? ('all' as const) : ('student' as const),
          studentIds: msgAudience === 'individual' ? Array.from(recipientIds) : undefined,
        } : m
      );
      await setSupabaseData(BUS_MESSAGES_GLOBAL_KEY, updated);
      // Force localStorage update to ensure sync
      localStorage.setItem(BUS_MESSAGES_GLOBAL_KEY, JSON.stringify(updated));
      setMessages(updated.filter(m => m.busUserId === busUser.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      setMsgText(''); setImg1(null); setImg2(null); setRecipientIds(new Set());
      setEditingMessageId(null);
      toast.success('Message updated');
    } catch (e) {
      toast.error('Failed to update message');
    }
  };

  // DELETE MESSAGE TO STUDENT
  const deleteMessage = async (id: string) => {
    if (!busUser) return;
    if (!confirm('Are you sure you want to delete this message?')) return;
    try {
      const list = await getSupabaseData<BusMsg[]>(BUS_MESSAGES_GLOBAL_KEY, []);
      const updated = (list || []).filter(m => m.id !== id);
      await setSupabaseData(BUS_MESSAGES_GLOBAL_KEY, updated);
      // Force localStorage update to ensure sync
      localStorage.setItem(BUS_MESSAGES_GLOBAL_KEY, JSON.stringify(updated));
      setMessages(updated.filter(m => m.busUserId === busUser.id).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      toast.success('Message deleted');
    } catch (e) {
      toast.error('Failed to delete message');
    }
  };

  const handleEditMessage = (msg: BusMsg) => {
    setEditingMessageId(msg.id);
    setMsgType(msg.type);
    setMsgText(msg.text);
    setImg1(msg.image1 || null);
    setImg2(msg.image2 || null);
    setMsgAudience(msg.to === 'all' ? 'all' : 'individual');
    if (msg.studentIds) {
      setRecipientIds(new Set(msg.studentIds));
    } else {
      setRecipientIds(new Set());
    }
  };

  const handleEditPrincipalMessage = (msg: BusPrincipalMsg) => {
    setEditingPrincipalMessageId(msg.id);
    setPMsgType(msg.type === 'reply' ? 'good' : msg.type);
    setPMsgText(msg.text);
    setPImgs(msg.images && msg.images.length > 0 ? [...msg.images, null, null, null].slice(0, 4) : [null, null, null, null]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-royal via-royal/90 to-gold/20 p-4">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-6"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-r from-royal to-gold flex items-center justify-center">
              <Bus className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold text-white">Bus Dashboard</h1>
              <p className="text-white/80 text-xs sm:text-sm">Welcome {busUser?.username || ''}</p>
            </div>
          </div>
          <Button onClick={logout} variant="outline" className="w-full sm:w-auto text-white border-white/20 hover:bg-white/10">Logout</Button>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.135 }} className="mt-4">
          <Card className="bg-card/95 backdrop-blur-md border-border/50">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Message Principal</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Send a good/bad message to the principal (max 4 images)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-3 sm:p-6">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant={pMsgType === 'good' ? 'default' : 'outline'} onClick={() => setPMsgType('good')} className="text-xs sm:text-sm">Good ★</Button>
                <Button size="sm" variant={pMsgType === 'bad' ? 'default' : 'outline'} onClick={() => setPMsgType('bad')} className="text-xs sm:text-sm">Bad ⭕</Button>
              </div>
              <Textarea placeholder="Type your message to principal..." value={pMsgText} onChange={(e) => setPMsgText(e.target.value)} className="text-sm min-h-[80px]" />
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {[0,1,2,3].map(i => (
                  <div key={i}>
                    <Input type="file" accept="image/*" onChange={(e) => onPickPImage(e, i)} className="text-xs" />
                    {pImgs[i] && <img src={pImgs[i] as string} className="mt-1 h-12 w-12 sm:h-16 sm:w-16 object-cover rounded border" />}
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                {editingPrincipalMessageId && (
                  <Button onClick={() => {
                    setEditingPrincipalMessageId(null);
                    setPMsgText('');
                    setPImgs([null, null, null, null]);
                  }} variant="outline" size="sm" className="text-xs sm:text-sm">Cancel</Button>
                )}
                <Button onClick={editingPrincipalMessageId ? editPrincipalMessage : sendPrincipalMessage} disabled={!pMsgText.trim()} size="sm" className="text-xs sm:text-sm w-full sm:w-auto">{editingPrincipalMessageId ? 'Update' : 'Send'} to Principal</Button>
              </div>

              {/* Message History */}
              <div className="pt-4 border-t border-border/50">
                <div className="text-xs sm:text-sm font-medium mb-3">Message History</div>
                <div className="space-y-3 max-h-96 overflow-auto pr-1">
                  {principalMsgs.length === 0 ? (
                    <div className="text-center text-muted-foreground text-xs sm:text-sm py-4">No messages yet</div>
                  ) : (
                    principalMsgs.slice(0, 20).map(m => (
                      <div key={m.id} className={`border rounded p-2 sm:p-3 ${m.from === 'bus' ? 'bg-blue-500/5 border-blue-500/20' : 'bg-green-500/5 border-green-500/20'}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded ${m.from === 'bus' ? 'bg-blue-500/20 text-blue-600' : 'bg-green-500/20 text-green-600'}`}>
                                {m.from === 'bus' ? 'You' : 'Principal'}
                              </span>
                              <span className={`text-[10px] sm:text-xs px-2 py-0.5 rounded ${m.type === 'good' ? 'bg-green-500/20 text-green-600' : m.type === 'bad' ? 'bg-red-500/20 text-red-600' : 'bg-gray-500/20 text-gray-600'}`}>
                                {m.type === 'good' ? '★ Good' : m.type === 'bad' ? '⭕ Bad' : '↩ Reply'}
                              </span>
                            </div>
                            <div className="text-[10px] sm:text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleString()}</div>
                          </div>
                          {m.from === 'bus' && (
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => startEditPrincipalMessage(m)}><Edit className="h-3 w-3"/></Button>
                              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-red-600" onClick={() => deletePrincipalMessage(m.id)}><Trash2 className="h-3 w-3"/></Button>
                            </div>
                          )}
                        </div>
                        <div className="text-xs sm:text-sm">{m.text}</div>
                        {m.images && m.images.length > 0 && (
                          <div className="flex gap-1 sm:gap-2 mt-2 flex-wrap">
                            {m.images.map((src, idx) => (
                              <div 
                                key={idx} 
                                className="relative group cursor-pointer"
                                onClick={() => setDocumentViewer({ show: true, url: src, name: `Principal Reply Photo ${idx + 1}` })}
                              >
                                <img src={src} className="h-12 w-12 sm:h-16 sm:w-16 object-cover rounded border" />
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded">
                                  <Eye className="h-4 w-4 text-white" />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-4">
          <Card className="bg-card/95 backdrop-blur-md border-border/50">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Current Assignment</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Basic details of your route and bus</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              {busUser ? (
                <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                  <div>
                    <div className="text-xs sm:text-sm text-muted-foreground">Bus ID</div>
                    <div className="font-mono text-xs sm:text-base">{busUser.busId}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Status</div>
                    <Badge variant={busUser.status === 'active' ? 'default' : 'destructive'}>
                      {busUser.status}
                    </Badge>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Route</div>
                    <div className="font-medium">{busUser.routeName || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Bus Number</div>
                    <div className="font-medium">{busUser.busNumber || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Driver</div>
                    <div className="font-medium">{busUser.driverName || 'N/A'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Driver Phone</div>
                    <div className="font-medium">{busUser.driverPhone || 'N/A'}</div>
                  </div>
                </div>
              ) : (
                <div className="text-muted-foreground">Loading your details…</div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.13 }} className="mt-4">
          <Card className="bg-card/95 backdrop-blur-md border-border/50">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Send Messages</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Send good/bad messages to your selected students</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 p-3 sm:p-6">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant={msgType === 'good' ? 'default' : 'outline'} onClick={() => setMsgType('good')} className="text-xs sm:text-sm">Good ★</Button>
                <Button size="sm" variant={msgType === 'bad' ? 'default' : 'outline'} onClick={() => setMsgType('bad')} className="text-xs sm:text-sm">Bad ⭕</Button>
                <Select value={msgAudience} onValueChange={(v) => setMsgAudience(v as any)}>
                  <SelectTrigger className="w-48"><SelectValue placeholder="Audience" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All selected students</SelectItem>
                    <SelectItem value="individual">Individual students</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {msgAudience === 'individual' && (
                <div className="grid sm:grid-cols-2 gap-2 max-h-44 overflow-auto pr-1">
                  {myAssigned.map(a => {
                    const s = students.find(st => st.id === a.studentId);
                    if (!s) return null;
                    const checked = recipientIds.has(s.id);
                    return (
                      <label key={s.id} className="flex items-center gap-2 border rounded p-2">
                        <Checkbox checked={checked} onCheckedChange={(v: any) => toggleRecipient(s.id, Boolean(v))} />
                        <div>
                          <div className="text-sm font-medium">{s.name}</div>
                          <div className="text-xs text-muted-foreground">Class {s.class} • Section {s.section} • Roll {s.rollNumber}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
              <div>
                <Textarea placeholder="Type your message..." value={msgText} onChange={(e) => setMsgText(e.target.value)} className="text-sm min-h-[80px]" />
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
                <div>
                  <Input type="file" accept="image/*" onChange={(e) => onPickImage(e, 1)} className="text-xs" />
                  {img1 && <img src={img1} alt="img1" className="mt-1 h-12 w-12 sm:h-16 sm:w-16 object-cover rounded border" />}
                </div>
                <div>
                  <Input type="file" accept="image/*" onChange={(e) => onPickImage(e, 2)} className="text-xs" />
                  {img2 && <img src={img2} alt="img2" className="mt-1 h-12 w-12 sm:h-16 sm:w-16 object-cover rounded border" />}
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={editingMessageId ? editMessage : sendMessage} size="sm" className="text-xs sm:text-sm w-full sm:w-auto">{editingMessageId ? 'Update' : 'Send'}</Button>
              </div>

              {messages.length > 0 && (
                <div className="pt-3">
                  <div className="text-xs sm:text-sm font-medium mb-2">Recent Messages</div>
                  <div className="space-y-2 max-h-64 overflow-auto pr-1">
                    {messages.slice(0, 10).map(m => (
                      <div key={m.id} className="border rounded p-2 flex items-start gap-2">
                        <div className={m.type === 'good' ? 'text-green-500' : 'text-red-500'}>{m.type === 'good' ? '★' : '⭕'}</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs sm:text-sm flex items-center justify-between">
                            <div>{m.text}</div>
                            <div className="flex gap-1">
                              <Button size="sm" variant="outline" className="h-6 w-6 p-0" onClick={() => handleEditMessage(m)}><Edit className="h-3 w-3"/></Button>
                              <Button size="sm" variant="destructive" className="h-6 w-6 p-0" onClick={() => deleteMessage(m.id)}><Trash2 className="h-3 w-3"/></Button>
                            </div>
                          </div>
                          <div className="text-[10px] sm:text-xs text-muted-foreground">{new Date(m.createdAt).toLocaleString()}</div>
                          <div className="flex gap-1 sm:gap-2 mt-1">
                            {m.image1 && <img src={m.image1} className="h-12 w-12 sm:h-14 sm:w-14 object-cover rounded border" />}
                            {m.image2 && <img src={m.image2} className="h-12 w-12 sm:h-14 sm:w-14 object-cover rounded border" />}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="mt-4">
          <Card className="bg-card/95 backdrop-blur-md border-border/50">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Live Tracking</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Share your live location with students</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              {/* Location Accuracy Warning Notice */}
              <Card className="mb-4 bg-yellow-50 border-yellow-200">
                <CardContent className="py-3">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-medium text-yellow-800">Warning: Location Accuracy Notice</h3>
                      <p className="text-sm text-yellow-700 mt-1">
                        <strong>Use mobile/phone for better accuracy.</strong> If you use a computer or laptop, you may get false accuracy, meaning a false location. That's why use a mobile phone for a better experience. Mobile phones have built-in GPS, but computers/laptops do not have built-in GPS.
                      </p>
                      <p className="text-sm text-yellow-700 mt-2 font-medium">
                        चेतावनी: स्थान सटीकता सूचना - बेहतर सटीकता के लिए मोबाइल/फोन का उपयोग करें। यदि आप कंप्यूटर या लैपटॉप का उपयोग करते हैं, तो आपको गलत सटीकता मिल सकती है, जिसका अर्थ है गलत स्थान। इसीलिए बेहतर अनुभव के लिए मोबाइल फोन का उपयोग करें। मोबाइल फोन में अंतर्निहित जीपीएस होता है, लेकिन कंप्यूटर/लैपटॉप में अंतर्निहित जीपीएस नहीं होता है।
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {!locationSet && !tracking && (
                  <Button 
                    onClick={useCurrentLocation} 
                    size="sm" 
                    className="text-xs sm:text-sm bg-blue-600 hover:bg-blue-700"
                    disabled={false}
                  >
                    📍 Use Current Location
                  </Button>
                )}
                {!tracking ? (
                  <Button onClick={startTracking} size="sm" className="text-xs sm:text-sm" disabled={!locationSet}>
                    {locationSet ? 'Start Tracking' : 'Set Location First'}
                  </Button>
                ) : (
                  <Button variant="outline" onClick={stopTracking} size="sm" className="text-xs sm:text-sm">Stop Tracking</Button>
                )}
                {gpsError && <span className="text-destructive text-[10px] sm:text-sm">{gpsError}</span>}
                {locationSet && !tracking && (
                  <span className="text-green-600 text-[10px] sm:text-sm">✓ Location set</span>
                )}
              </div>
              
              {/* Compass Component */}
              <div className="mt-4">
                <Compass busLocation={myLatLng} previousLocation={previousLatLng} />
              </div>
              
              <div className="mt-3 w-full h-48 sm:h-64 rounded-lg overflow-hidden border border-border/50 bg-muted">
                {tracking && myLatLng ? (
                  <MapContainer
                    center={[myLatLng.lat, myLatLng.lng]}
                    zoom={16}
                    style={{ height: '100%', width: '100%' }}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={[myLatLng.lat, myLatLng.lng]} icon={busIcon} />
                    <MapUpdater position={myLatLng} />
                  </MapContainer>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
                    {myLatLng && !tracking ? 'Tracking stopped' : 'Start tracking to show your live map'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mt-4">
          <Card className="bg-card/95 backdrop-blur-md border-border/50">
            <CardHeader className="p-3 sm:p-6">
              <CardTitle className="text-base sm:text-lg">Students</CardTitle>
              <CardDescription className="text-xs sm:text-sm">Select valid students created by teachers</CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground">Class</label>
                  <Select value={classFilter} onValueChange={setClassFilter}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      {classOptions.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt === 'all' ? 'All' : opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Section</label>
                  <Select value={sectionFilter} onValueChange={setSectionFilter}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      {sectionOptions.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt === 'all' ? 'All' : opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground">Show</label>
                  <Select value={availMode} onValueChange={(v) => setAvailMode(v as any)}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="not_selected">Not Selected</SelectItem>
                      <SelectItem value="selected_only">Selected (mine)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="outline" className="w-full" onClick={() => { setClassFilter('all'); setSectionFilter('all'); setAvailMode('all'); setAvailSearch(''); setSelectedSearch(''); }}>Clear Filters</Button>
                </div>
              </div>

              <div className="grid gap-4 sm:gap-6 sm:grid-cols-2">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium">Available</div>
                    <Input placeholder="Search name, class, section, roll" value={availSearch} onChange={(e) => setAvailSearch(e.target.value)} className="w-full sm:w-56" />
                  </div>
                  <div className="space-y-2 max-h-80 overflow-auto pr-1">
                    {availableStudents.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No students found</div>
                    ) : (
                      availableStudents.map((s) => {
                        const mine = myAssigned.some(a => a.studentId === s.id);
                        const taken = assignments.some(a => a.studentId === s.id && a.busUserId !== busUser?.id);
                        return (
                          <div key={s.id} className="flex items-center justify-between rounded border border-border/50 p-2">
                            <div>
                              <div className="font-medium">{s.name}</div>
                              <div className="text-xs text-muted-foreground">Class {s.class} • Section {s.section} • Roll {s.rollNumber}</div>
                            </div>
                            <Button size="sm" disabled={taken} onClick={() => addStudent(s)}>
                              {mine ? 'Added' : taken ? 'Assigned' : 'Add'}
                            </Button>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="font-medium">Selected</div>
                    <Input placeholder="Search selected..." value={selectedSearch} onChange={(e) => setSelectedSearch(e.target.value)} className="w-full sm:w-56" />
                  </div>
                  <div className="space-y-2 max-h-80 overflow-auto pr-1">
                    {selectedItems.length === 0 ? (
                      <div className="text-sm text-muted-foreground">No students selected</div>
                    ) : (
                      selectedItems.map(({ a, s }) => (
                        <div key={a.studentId} className="rounded border border-border/50 p-3">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <div className="font-medium">{s.name}</div>
                              <div className="text-xs text-muted-foreground">Class {s.class} • Section {s.section} • Roll {s.rollNumber}</div>
                              {a.trackingStatus && (
                                <div className={`text-xs mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full ${
                                  a.trackingStatus === 'reached_home' ? 'bg-green-500/20 text-green-400' :
                                  a.trackingStatus === 'absent' ? 'bg-gray-500/20 text-gray-400' :
                                  'bg-blue-500/20 text-blue-400'
                                }`}>
                                  {a.trackingStatus === 'reached_home' && '🏠 Reached Home'}
                                  {a.trackingStatus === 'absent' && '❌ Absent'}
                                  {a.trackingStatus === 'active' && '🚌 On Bus'}
                                </div>
                              )}
                              {a.reachedHomeAt && (
                                <div className="text-[10px] text-muted-foreground mt-1">
                                  Reached at {new Date(a.reachedHomeAt).toLocaleTimeString()}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            <Button 
                              size="sm" 
                              variant={a.trackingStatus === 'active' ? 'default' : 'outline'}
                              onClick={() => toggleStudentTracking(s.id, 'active')}
                              className="text-xs"
                            >
                              On Bus
                            </Button>
                            <Button 
                              size="sm" 
                              variant={a.trackingStatus === 'reached_home' ? 'default' : 'outline'}
                              onClick={() => toggleStudentTracking(s.id, 'reached_home')}
                              className="text-xs bg-green-600 hover:bg-green-700"
                            >
                              Reached Home
                            </Button>
                            <Button 
                              size="sm" 
                              variant={a.trackingStatus === 'absent' ? 'default' : 'outline'}
                              onClick={() => toggleStudentTracking(s.id, 'absent')}
                              className="text-xs"
                            >
                              Absent
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => removeStudent(s.id)} className="text-xs text-red-400">
                              Remove
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
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
    </div>
  );
};

export default BusDashboard;