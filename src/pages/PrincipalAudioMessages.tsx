import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Volume2, Play, Pause, ArrowLeft, Trash2, Users, Calendar, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabaseData, setSupabaseData, subscribeToSupabaseChanges } from "@/lib/supabaseHelpers";
import { supabase } from "@/lib/supabaseClient";

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

interface PrincipalAudioMessagesProps {
  userEmail: string;
  userType: 'teacher' | 'student';
  userClass?: string;
  userSection?: string;
  userId?: string;
}

const PrincipalAudioMessages = ({ userEmail, userType, userClass, userSection, userId }: PrincipalAudioMessagesProps) => {
  const [messages, setMessages] = useState<AudioMessage[]>([]);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [volume, setVolume] = useState<number>(1); // State for volume
  const navigate = useNavigate();

    // Delete audio message by id from Supabase
    const handleDeleteAudioMessage = async (id: string) => {
      if (!window.confirm("Are you sure you want to delete this audio message?")) return;
      try {
        // Optimistically remove from UI first
        setMessages(prev => prev.filter(msg => msg.id !== id));
        
        // Then delete from Supabase
        const allMessages = await getSupabaseData<AudioMessage[]>('royal-academy-audio-messages', []);
        const updated = allMessages.filter(msg => msg.id !== id);
        
        const saved = await setSupabaseData('royal-academy-audio-messages', updated);
        
        if (!saved) {
          alert("Failed to delete audio message");
          // Reload if failed
          loadMessages();
          return;
        }
        
        alert("Audio message deleted successfully!");
      } catch (err) {
        alert("Failed to delete audio message: " + (err instanceof Error ? err.message : String(err)));
        // Reload if error
        loadMessages();
      }
    };

  useEffect(() => {
    loadMessages();

    // Real-time listener for receiving new messages
    const unsubscribe = subscribeToSupabaseChanges<AudioMessage[]>(
      'royal-academy-audio-messages',
      (newData) => {
        console.log('[PrincipalAudioMessages] Received new audio message, updating UI');
        filterMessagesForUser(newData);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [userEmail, userType, userClass, userSection, userId]);

  const loadMessages = async () => {
    try {
      console.log('[PrincipalAudioMessages] Loading messages for:', { userEmail, userType, userClass, userSection, userId });
      const allMessages = await getSupabaseData<AudioMessage[]>('royal-academy-audio-messages', []);
      console.log('[PrincipalAudioMessages] All messages loaded:', allMessages);
      filterMessagesForUser(allMessages);
    } catch (error) {
      console.error('[PrincipalAudioMessages] Error loading messages:', error);
    }
  };

  const filterMessagesForUser = (allMessages: AudioMessage[]) => {
    // Get additional user info for better matching
    const teacherEmail = userType === 'teacher' ? userEmail : '';
    const teacherName = userType === 'teacher' ? localStorage.getItem('teacherName') || '' : '';
    const studentId = userType === 'student' ? userId : '';
    const studentName = userType === 'student' ? (JSON.parse(localStorage.getItem('currentStudent') || '{}').name || '') : '';

    console.log('[PrincipalAudioMessages] Filtering messages. User info:', { 
      userEmail, 
      userType, 
      userClass, 
      userSection, 
      userId,
      teacherName,
      studentName,
      totalMessages: allMessages.length 
    });

    const filtered = allMessages.filter(message => {
      // Whole school messages
      if (message.recipientType === 'whole_school') {
        console.log('[PrincipalAudioMessages] Whole school message matched:', message.id);
        return true;
      }

      // All teachers
      if (message.recipientType === 'all_teachers' && userType === 'teacher') {
        console.log('[PrincipalAudioMessages] All teachers message matched:', message.id);
        return true;
      }

      // All students
      if (message.recipientType === 'all_students' && userType === 'student') {
        console.log('[PrincipalAudioMessages] All students message matched:', message.id);
        return true;
      }

      // Specific class (for students)
      if (message.recipientType === 'class' && userType === 'student' && message.recipientClass === userClass) {
        console.log('[PrincipalAudioMessages] Class message matched:', message.id);
        return true;
      }

      // Specific section (for students)
      if (message.recipientType === 'section' && userType === 'student' && 
          message.recipientClass === userClass && message.recipientSection === userSection) {
        console.log('[PrincipalAudioMessages] Section message matched:', message.id);
        return true;
      }

      // Individual teacher - check all possible matching fields
      if (message.recipientType === 'individual_teacher' && userType === 'teacher') {
        const isMatch = message.recipientId === userEmail || 
                       message.recipientId === userId ||
                       message.recipientName === teacherEmail ||
                       message.recipientName === teacherName;
        if (isMatch) {
          console.log('[PrincipalAudioMessages] Individual teacher message matched:', message.id);
          return true;
        }
      }

      // Individual student - check all possible matching fields
      if (message.recipientType === 'individual_student' && userType === 'student') {
        const isMatch = message.recipientId === userId || 
                       message.recipientId === userEmail ||
                       message.recipientId === studentId ||
                       message.recipientName === studentName;
        if (isMatch) {
          console.log('[PrincipalAudioMessages] Individual student message matched:', message.id);
          return true;
        }
      }

      return false;
    });

    console.log('[PrincipalAudioMessages] Filtered messages:', filtered.length, 'out of', allMessages.length);
    setMessages(filtered);
  };

  const togglePlayPause = (messageId: string, audioSrc: string) => {
    if (playingMessageId === messageId) {
      audioPlayerRef.current?.pause();
      setPlayingMessageId(null);
    } else {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.src = audioSrc;
        audioPlayerRef.current.playbackRate = playbackSpeed;
        audioPlayerRef.current.volume = volume; // Set volume when playing
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

  const handleVolumeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(event.target.value);
    setVolume(newVolume);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.volume = newVolume;
    }
  };

  const getRecipientDisplay = (message: AudioMessage) => {
    switch (message.recipientType) {
      case 'whole_school':
        return 'Whole School';
      case 'all_teachers':
        return 'All Teachers';
      case 'all_students':
        return 'All Students';
      case 'class':
        return `Class ${message.recipientClass}`;
      case 'section':
        return `Class ${message.recipientClass} Section ${message.recipientSection}`;
      case 'individual_student':
        return userType === 'student' ? 'You (Personal)' : `Student: ${message.recipientName}`;
      case 'individual_teacher':
        return userType === 'teacher' ? 'You (Personal)' : `Teacher: ${message.recipientName}`;
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <audio ref={audioPlayerRef} onEnded={() => setPlayingMessageId(null)} className="hidden" />

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card/95 backdrop-blur-md border-b border-border/50 sticky top-0 z-50"
      >
        <div className="container-wide py-2 sm:py-4 px-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(userType === 'teacher' ? '/teacher-dashboard' : '/student-dashboard')}
                className="h-8 px-2 sm:h-9 sm:px-3"
              >
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="text-xs sm:text-sm">Back</span>
              </Button>
              <div>
                <h1 className="text-sm sm:text-xl font-heading font-bold text-foreground flex items-center gap-1 sm:gap-2">
                  <Volume2 className="h-4 w-4 sm:h-6 sm:w-6 text-gold" />
                  <span className="hidden sm:inline">Principal Audio Messages</span>
                  <span className="sm:hidden">Audio Messages</span>
                </h1>
                <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">Listen to messages from the Principal</p>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="container-wide py-4 sm:py-8 px-3 sm:px-6">
        {/* Playback Controls Bar */}
        <div className="bg-card rounded-lg border border-border/50 mb-4 sm:mb-6">
          <div className="p-3 sm:p-4 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-4">
            {/* Playback Speed Control */}
            <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
              <span className="text-xs sm:text-sm font-medium block sm:inline">Playback Speed:</span>
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
            
            {/* Volume Control */}
            <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-3 sm:min-w-0 sm:flex-1">
              <div className="flex items-center gap-2 sm:gap-3">
                <Volume2 className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground flex-shrink-0" />
                <span className="text-xs sm:text-sm font-medium">Volume:</span>
              </div>
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${volume * 100}%, hsl(var(--muted)) ${volume * 100}%, hsl(var(--muted)) 100%)`
                  }}
                />
                <span className="text-xs sm:text-sm font-medium flex-shrink-0 min-w-[2.5rem] text-right">{Math.round(volume * 100)}%</span>
              </div>
            </div>
          </div>
        </div>


        {/* Messages List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {messages.length === 0 ? (
            <div className="col-span-full text-center py-8 sm:py-12">
              <Volume2 className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-base sm:text-lg font-semibold text-foreground mb-2">No Audio Messages</h3>
              <p className="text-sm text-muted-foreground px-4">
                You don't have any audio messages from the Principal yet.
              </p>
            </div>
          ) : (
            messages
              .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
              .map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card border border-border/50 rounded-xl p-3 sm:p-4 lg:p-6 hover:shadow-lg transition-all duration-200"
                >
                  <div className="space-y-3">
                    {/* Message Info */}
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm sm:text-base lg:text-lg line-clamp-2 break-words">{message.subject}</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-3 break-words">{message.description}</p>
                    </div>

                    {/* Recipient and Date Info */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs sm:text-sm">
                        <Users className="h-3 w-3 sm:h-4 sm:w-4 text-gold flex-shrink-0" />
                        <span className="font-medium text-gold truncate">{getRecipientDisplay(message)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] sm:text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">Sent: {new Date(message.createdAt).toLocaleDateString()}, {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    {/* Play & Delete Buttons */}
                    <div className="pt-2 flex gap-2">
                      <Button
                        onClick={() => togglePlayPause(message.id, message.audioBlob || message.audioUrl)}
                        className="flex-1 bg-gradient-to-r from-gold to-yellow-500 hover:from-gold/80 hover:to-yellow-500/80 text-black font-medium h-9 sm:h-10 text-sm transition-all duration-200"
                      >
                        {playingMessageId === message.id ? (
                          <>
                            <Pause className="h-4 w-4 mr-2 flex-shrink-0" /> 
                            <span>Pause Audio</span>
                          </>
                        ) : (
                          <>
                            <Play className="h-4 w-4 mr-2 flex-shrink-0" /> 
                            <span>Play Audio</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))
          )}
        </div>
      </div>
    </div>
  );
};

export default PrincipalAudioMessages;