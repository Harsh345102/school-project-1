import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, Mic, Upload, Trash2, Play, Pause, Send, X, Users, UserCheck, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getSupabaseData, setSupabaseData, subscribeToSupabaseChanges } from "@/lib/supabaseHelpers";

interface AudioMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderType: 'principal';
  subject: string;
  description: string;
  audioUrl: string;
  audioBlob?: string;
  recipientType: 'class' | 'section' | 'individual_student' | 'individual_teacher' | 'all_teachers' | 'all_students' | 'whole_school';
  recipientClass?: string;
  recipientSection?: string;
  recipientId?: string;
  recipientName?: string;
  createdAt: string;
  duration?: number;
}

const AudioMessageManager = ({ principalEmail }: { principalEmail: string }) => {
  const [messages, setMessages] = useState<AudioMessage[]>([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string>("");
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(1);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);

  const [messageForm, setMessageForm] = useState({
    subject: '',
    description: '',
    recipientType: 'whole_school' as AudioMessage['recipientType'],
    recipientClass: '',
    recipientSection: '',
    recipientId: '',
    recipientName: ''
  });

  const [students, setStudents] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    loadMessages();
    loadStudentsAndTeachers();

    // Real-time listener for receiving new messages
    const unsubMessages = subscribeToSupabaseChanges<AudioMessage[]>(
      'royal-academy-audio-messages',
      (newData) => {
        console.log('[AudioMessageManager] Received new audio message, updating UI');
        const myMessages = newData.filter(m => m.senderId === principalEmail);
        setMessages(myMessages);
      }
    );

    return () => {
      unsubMessages();
    };
  }, [principalEmail]);

  const loadMessages = async () => {
    try {
      const allMessages = await getSupabaseData<AudioMessage[]>('royal-academy-audio-messages', []);
      const myMessages = allMessages.filter(m => m.senderId === principalEmail);
      setMessages(myMessages);
    } catch (error) {
      console.error('[AudioMessageManager] Error loading messages:', error);
    }
  };

  const loadStudentsAndTeachers = async () => {
    try {
      const studentsData = await getSupabaseData<any[]>('royal-academy-students', []);
      const teachersData = await getSupabaseData<any[]>('royal-academy-teachers', []);
      setStudents(studentsData);
      setTeachers(teachersData);
    } catch (error) {
      console.error('[AudioMessageManager] Error loading students/teachers:', error);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('[AudioMessageManager] Error starting recording:', error);
      alert('Could not access microphone. Please grant permission and try again.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioBlob(file);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
    } else {
      alert('Please select a valid audio file');
    }
  };

  const handleSendMessage = async () => {
    if (!audioBlob || !messageForm.subject) {
      alert('Please record/upload audio and provide a subject');
      return;
    }

    if (messageForm.recipientType === 'class' && !messageForm.recipientClass) {
      alert('Please select a class');
      return;
    }

    if (messageForm.recipientType === 'section' && (!messageForm.recipientClass || !messageForm.recipientSection)) {
      alert('Please select a class and section');
      return;
    }

    if ((messageForm.recipientType === 'individual_student' || messageForm.recipientType === 'individual_teacher') && !messageForm.recipientId) {
      alert('Please select a recipient');
      return;
    }

    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Audio = reader.result as string;

        const newMessage: AudioMessage = {
          id: Date.now().toString(),
          senderId: principalEmail,
          senderName: 'Principal',
          senderType: 'principal',
          subject: messageForm.subject,
          description: messageForm.description,
          audioUrl: audioUrl,
          audioBlob: base64Audio,
          recipientType: messageForm.recipientType,
          recipientClass: messageForm.recipientClass || undefined,
          recipientSection: messageForm.recipientSection || undefined,
          recipientId: messageForm.recipientId || undefined,
          recipientName: messageForm.recipientName || undefined,
          createdAt: new Date().toISOString()
        };

        // Save to Supabase directly
        try {
          const allMessages = await getSupabaseData<AudioMessage[]>('royal-academy-audio-messages', []);
          const updated = [...allMessages, newMessage];
          const saved = await setSupabaseData('royal-academy-audio-messages', updated);
          if (!saved) {
            console.error('[AudioMessageManager] Error saving message');
            alert('Failed to send audio message');
            return;
          }
          // Optimistically update UI immediately
          setMessages(prev => [...prev, newMessage]);
          resetForm();
          setShowCreateModal(false);
          alert('Audio message sent successfully!');
          // Real-time listener will sync any changes from other sources
        } catch (error) {
          console.error('[AudioMessageManager] Error saving message:', error);
          alert('Failed to send audio message');
        }
      };
      reader.readAsDataURL(audioBlob);
    } catch (error) {
      console.error('[AudioMessageManager] Error sending message:', error);
      alert('Failed to send audio message');
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    if (!confirm('Are you sure you want to delete this audio message?')) return;

    try {
      // Optimistically remove from UI first
      setMessages(prev => prev.filter(m => m.id !== messageId));
      
      // Then delete from Supabase
      const allMessages = await getSupabaseData<AudioMessage[]>('royal-academy-audio-messages', []);
      const updated = allMessages.filter(m => m.id !== messageId);
      console.log('[AudioMessageManager] Deleting audio message from Supabase, syncing across ports');
      const saved = await setSupabaseData('royal-academy-audio-messages', updated);
      
      if (!saved) {
        console.error('[AudioMessageManager] Error deleting message');
        // Reload if delete failed
        await loadMessages();
        alert('Failed to delete audio message');
        return;
      }
      
      alert('Audio message deleted successfully!');
    } catch (error) {
      console.error('[AudioMessageManager] Error deleting message:', error);
      // Reload if error occurs
      await loadMessages();
      alert('Failed to delete audio message');
    }
  };

  const togglePlayPause = (messageId: string, audioSrc: string) => {
    if (playingMessageId === messageId) {
      audioPlayerRef.current?.pause();
      setPlayingMessageId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = audioSrc;
        audioPlayerRef.current.playbackRate = playbackSpeed;
        audioPlayerRef.current.volume = volume;
        audioPlayerRef.current.play();
        setPlayingMessageId(messageId);
      }
    }
  };

  const changePlaybackSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.playbackRate = speed;
    }
  };

  const changeVolume = (newVolume: number) => {
    setVolume(newVolume);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.volume = newVolume;
    }
  };

  const resetForm = () => {
    setMessageForm({
      subject: '',
      description: '',
      recipientType: 'whole_school',
      recipientClass: '',
      recipientSection: '',
      recipientId: '',
      recipientName: ''
    });
    setAudioBlob(null);
    setAudioUrl('');
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
  };

  const getRecipientDisplay = (message: AudioMessage) => {
    switch (message.recipientType) {
      case 'whole_school':
        return 'Whole School (All Teachers & Students)';
      case 'all_teachers':
        return 'All Teachers';
      case 'all_students':
        return 'All Students';
      case 'class':
        return `Class ${message.recipientClass}`;
      case 'section':
        return `Class ${message.recipientClass} Section ${message.recipientSection}`;
      case 'individual_student':
        return `Student: ${message.recipientName}`;
      case 'individual_teacher':
        return `Teacher: ${message.recipientName}`;
      default:
        return 'Unknown';
    }
  };

  const classes = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'];
  const sections = ['A', 'B', 'C', 'D', 'E'];

  return (
    <div className="space-y-6">
      <audio ref={audioPlayerRef} onEnded={() => setPlayingMessageId(null)} className="hidden" />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-3 sm:space-y-0">
        <div>
          <h2 className="text-lg sm:text-2xl font-bold flex items-center gap-2 text-white">
            <Volume2 className="h-5 w-5 sm:h-6 sm:w-6 text-gold" />
            <span className="hidden sm:inline">Principal Audio Messages</span>
            <span className="sm:hidden">Audio Messages</span>
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Send audio messages to students and teachers</p>
        </div>
        <Button onClick={() => setShowCreateModal(true)} className="bg-gradient-to-r from-gold to-yellow-500 text-white w-full sm:w-auto">
          <Mic className="h-4 w-4 mr-2" />
          <span className="sm:hidden">New Message</span>
          <span className="hidden sm:inline">New Audio Message</span>
        </Button>
      </div>

      {/* Playback Speed Control */}
      <div className="bg-muted rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
          <span className="text-xs sm:text-sm font-medium mb-2 sm:mb-0">Playback Speed:</span>
          <div className="grid grid-cols-3 sm:flex gap-1 sm:gap-2">
            {[0.5, 0.75, 1, 1.25, 1.5, 2].map(speed => (
              <Button
                key={speed}
                size="sm"
                variant={playbackSpeed === speed ? "default" : "outline"}
                onClick={() => changePlaybackSpeed(speed)}
                className="h-8 px-2 text-xs sm:h-9 sm:px-3 sm:text-sm"
              >
                {speed}x
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Volume Control */}
      <div className="bg-muted rounded-lg p-3 sm:p-4 space-y-2 sm:space-y-0">
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3">
          <span className="text-xs sm:text-sm font-medium flex items-center gap-2 mb-2 sm:mb-0">
            {volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            Volume:
          </span>
          <div className="flex items-center gap-2 flex-1">
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => changeVolume(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${volume * 100}%, hsl(var(--muted)) ${volume * 100}%, hsl(var(--muted)) 100%)`
              }}
            />
            <span className="text-xs sm:text-sm font-medium min-w-[3rem] text-right flex-shrink-0">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </div>
      </div>

      {/* Messages List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {messages.length === 0 ? (
          <div className="col-span-full text-center py-8 sm:py-12 text-muted-foreground">
            <Volume2 className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 opacity-50" />
            <h3 className="text-base sm:text-lg font-semibold mb-2">No Audio Messages</h3>
            <p className="text-sm px-4">
              No audio messages sent yet. Click "New Message" to get started.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 sm:p-4 border rounded-lg bg-card space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm sm:text-lg line-clamp-2 break-words">{message.subject}</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3 break-words">{message.description}</p>
                  <div className="flex items-center gap-2 mt-2 text-xs sm:text-sm text-gold">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="truncate">{getRecipientDisplay(message)}</span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">
                    Sent: {new Date(message.createdAt).toLocaleDateString()}, {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDeleteMessage(message.id)}
                  className="text-destructive hover:text-destructive flex-shrink-0 h-8 w-8 p-0 sm:h-9 sm:w-9"
                >
                  <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => togglePlayPause(message.id, message.audioBlob || message.audioUrl)}
                  className="flex-1 bg-gradient-to-r from-gold to-yellow-500 hover:from-gold/80 hover:to-yellow-500/80 text-black font-medium h-8 sm:h-9 text-xs sm:text-sm"
                >
                  {playingMessageId === message.id ? (
                    <>
                      <Pause className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" /> 
                      <span>Pause</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 flex-shrink-0" /> 
                      <span>Play</span>
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Create Message Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => { resetForm(); setShowCreateModal(false); }}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-card rounded-xl p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-3 sm:mx-0"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-lg sm:text-xl font-bold">New Audio Message</h3>
                <Button variant="ghost" size="sm" onClick={() => { resetForm(); setShowCreateModal(false); }}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="space-y-4">
                {/* Subject */}
                <div>
                  <label className="block text-sm font-medium mb-2">Subject *</label>
                  <Input
                    value={messageForm.subject}
                    onChange={(e) => setMessageForm({ ...messageForm, subject: e.target.value })}
                    placeholder="Important Announcement"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <Textarea
                    value={messageForm.description}
                    onChange={(e) => setMessageForm({ ...messageForm, description: e.target.value })}
                    placeholder="Additional details about this audio message..."
                    rows={2}
                  />
                </div>

                {/* Recipient Type */}
                <div>
                  <label className="block text-sm font-medium mb-2">Send To *</label>
                  <select
                    value={messageForm.recipientType}
                    onChange={(e) => setMessageForm({ ...messageForm, recipientType: e.target.value as AudioMessage['recipientType'], recipientClass: '', recipientSection: '', recipientId: '', recipientName: '' })}
                    className="w-full p-3 border border-border rounded-lg bg-background"
                  >
                    <option value="whole_school">Whole School (All Teachers & Students)</option>
                    <option value="all_teachers">All Teachers</option>
                    <option value="all_students">All Students</option>
                    <option value="class">Specific Class</option>
                    <option value="section">Specific Section</option>
                    <option value="individual_student">Individual Student</option>
                    <option value="individual_teacher">Individual Teacher</option>
                  </select>
                </div>

                {/* Class Selection */}
                {(messageForm.recipientType === 'class' || messageForm.recipientType === 'section') && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Class *</label>
                    <select
                      value={messageForm.recipientClass}
                      onChange={(e) => setMessageForm({ ...messageForm, recipientClass: e.target.value })}
                      className="w-full p-3 border border-border rounded-lg bg-background"
                    >
                      <option value="">Select Class</option>
                      {classes.map(cls => (
                        <option key={cls} value={cls}>Class {cls}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Section Selection */}
                {messageForm.recipientType === 'section' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Section *</label>
                    <select
                      value={messageForm.recipientSection}
                      onChange={(e) => setMessageForm({ ...messageForm, recipientSection: e.target.value })}
                      className="w-full p-3 border border-border rounded-lg bg-background"
                    >
                      <option value="">Select Section</option>
                      {sections.map(sec => (
                        <option key={sec} value={sec}>Section {sec}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Individual Student Selection */}
                {messageForm.recipientType === 'individual_student' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Student *</label>
                    <select
                      value={messageForm.recipientId}
                      onChange={(e) => {
                        const student = students.find(s => s.id === e.target.value);
                        // Store student email or ID for better matching
                        const studentId = student?.email || student?.id || e.target.value;
                        setMessageForm({ ...messageForm, recipientId: studentId, recipientName: student?.name || student?.fullName || '' });
                      }}
                      className="w-full p-3 border border-border rounded-lg bg-background"
                    >
                      <option value="">Select Student</option>
                      {students.map(student => (
                        <option key={student.id} value={student.id}>
                          {student.name || student.fullName} - Class {student.class} {student.section}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Individual Teacher Selection */}
                {messageForm.recipientType === 'individual_teacher' && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Teacher *</label>
                    <select
                      value={messageForm.recipientId}
                      onChange={(e) => {
                        const teacher = teachers.find(t => t.id === e.target.value);
                        // Store teacher email as primary ID for better matching
                        const teacherId = teacher?.email || teacher?.id || e.target.value;
                        setMessageForm({ ...messageForm, recipientId: teacherId, recipientName: teacher?.name || '' });
                      }}
                      className="w-full p-3 border border-border rounded-lg bg-background"
                    >
                      <option value="">Select Teacher</option>
                      {teachers.map(teacher => (
                        <option key={teacher.id} value={teacher.id}>
                          {teacher.name} - {teacher.subject}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Audio Recording/Upload */}
                <div className="border-2 border-dashed border-border rounded-lg p-3 sm:p-6 space-y-3 sm:space-y-4">
                  <p className="text-xs sm:text-sm font-medium">Audio Message *</p>

                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                    {!isRecording && !audioBlob && (
                      <>
                        <Button onClick={startRecording} className="flex-1 h-10 sm:h-auto text-sm">
                          <Mic className="h-4 w-4 mr-2" />
                          Start Recording
                        </Button>
                        <label className="flex-1">
                          <Button asChild className="w-full h-10 sm:h-auto text-sm">
                            <span>
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Audio
                            </span>
                          </Button>
                          <input
                            type="file"
                            accept="audio/*"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                      </>
                    )}

                    {isRecording && (
                      <Button onClick={stopRecording} variant="destructive" className="flex-1 h-10 sm:h-auto text-sm">
                        <Pause className="h-4 w-4 mr-2" />
                        Stop Recording
                      </Button>
                    )}

                    {audioBlob && !isRecording && (
                      <div className="flex-1 space-y-2">
                        <audio src={audioUrl} controls className="w-full h-8 sm:h-auto" />
                        <Button onClick={() => { setAudioBlob(null); setAudioUrl(''); }} variant="outline" className="w-full h-8 sm:h-auto text-xs sm:text-sm">
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                          Remove Audio
                        </Button>
                      </div>
                    )}
                  </div>

                  {isRecording && (
                    <div className="flex items-center justify-center gap-2 text-red-500 animate-pulse">
                      <div className="w-3 h-3 bg-red-500 rounded-full" />
                      <span className="text-xs sm:text-sm">Recording in progress...</span>
                    </div>
                  )}
                </div>

                {/* Send Button */}
                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-3 sm:pt-4">
                  <Button variant="outline" onClick={() => { resetForm(); setShowCreateModal(false); }} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button onClick={handleSendMessage} className="bg-gradient-to-r from-gold to-yellow-500 text-black w-full sm:w-auto">
                    <Send className="h-4 w-4 mr-2" />
                    <span className="sm:hidden">Send Message</span>
                    <span className="hidden sm:inline">Send Audio Message</span>
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AudioMessageManager;