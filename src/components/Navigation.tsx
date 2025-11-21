import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, ChevronDown, GraduationCap, BookOpen, Users, Calendar, Mail, LogIn, Home, Building, Camera, Trophy, Bell, Eye, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "./ui/button-variants";
import { getSupabaseData } from "@/lib/supabaseHelpers";
import { useTranslation } from "@/hooks/useTranslation";

const Navigation = () => {
  const { t, language } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [performanceMode, setPerformanceMode] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Welcome to New Academic Year",
      message: "Classes for the new academic year will begin on September 1st. Please check your course schedules.",
      timestamp: "2024-09-26T08:30:00",
      type: "info",
      unread: true
    },
    {
      id: 2,
      title: "Library Hours Extended",
      message: "The library will now be open until 22:00 on weekdays to support your studies.",
      timestamp: "2024-09-25T14:15:00",
      type: "info",
      unread: true
    },
    {
      id: 3,
      title: "Sports Day Registration",
      message: "Registration for Annual Sports Day is now open. Register before October 5th.",
      timestamp: "2024-09-24T10:45:00",
      type: "announcement",
      unread: false
    },
    {
      id: 4,
      title: "Exam Schedule Released",
      message: "Mid-term examination schedule has been published. Check the student portal for details.",
      timestamp: "2024-09-23T16:20:00",
      type: "important",
      unread: false
    }
  ]);
  const location = useLocation();

  // Branding state
  const [brandingData, setBrandingData] = useState({
    schoolName: "Royal Academy",
    tagline: "Excellence in Education",
    logoUrl: "/placeholder.svg"
  });

  // Load branding data from Supabase
  useEffect(() => {
    getSupabaseData('royal-academy-branding', {
      schoolName: "Royal Academy",
      tagline: "Excellence in Education",
      logoUrl: "/placeholder.svg"
    }).then(data => {
      setBrandingData({
        schoolName: data.schoolName || "Royal Academy",
        tagline: data.tagline || "Excellence in Education",
        logoUrl: data.logoUrl || "/placeholder.svg"
      });
    });
  }, []);


  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setScrollY(currentScrollY);
      setScrolled(currentScrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
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

  // Performance mode toggle function
  const togglePerformanceMode = () => {
    const newMode = !performanceMode;
    setPerformanceMode(newMode);
    localStorage.setItem('performance-mode', newMode.toString());

    // Apply performance mode styles to document
    if (newMode) {
      document.documentElement.classList.add('performance-mode');
    } else {
      document.documentElement.classList.remove('performance-mode');
    }
  };

  // Apply performance mode on component mount
  useEffect(() => {
    if (performanceMode) {
      document.documentElement.classList.add('performance-mode');
    }
    
    // Add performance optimizations for mobile
    const isMobile = window.innerWidth < 768;
    if (isMobile) {
      // Reduce animation complexity on mobile
      document.documentElement.style.setProperty('--animation-duration', '0s');
    }
  }, [performanceMode]);


  // Load notifications from localStorage (connected to principal announcements)
  useEffect(() => {
    const savedNotifications = localStorage.getItem('royal-academy-announcements');
    if (savedNotifications) {
      setNotifications(JSON.parse(savedNotifications));
    }
  }, []);

  const markAsRead = (notificationId: number) => {
    setNotifications(prev =>
      prev.map(notif =>
        notif.id === notificationId
          ? { ...notif, unread: false }
          : notif
      )
    );
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      }) + ' ' + date.toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  const navItems = [
    { name: t("home"), path: "/", icon: Home, description: t("homeDesc") },
    { name: t("about"), path: "/about", icon: Users, description: t("aboutDesc") },
    { name: t("academics"), path: "/academics", icon: BookOpen, description: t("academicsDesc") },
    { name: t("courses"), path: "/courses", icon: BookOpen, description: t("coursesDesc") },
    { name: t("yearlyBook"), path: "/yearly-book", icon: BookOpen, description: t("yearlyBookDesc") },
    { name: t("examRoutine"), path: "/exam-routine", icon: Calendar, description: t("examRoutineDesc") },
    { name: t("facilities"), path: "/facilities", icon: Building, description: t("facilitiesDesc") },
    { name: t("admissions"), path: "/admissions", icon: GraduationCap, description: t("admissionsDesc") },
    { name: t("gallery"), path: "/gallery", icon: Camera, description: t("galleryDesc") },
    { name: t("topScorers"), path: "/top-scorers", icon: Trophy, description: t("topScorersDesc") },
    { name: t("events"), path: "/events", icon: Calendar, description: t("eventsDesc") }
  ];

  // Calculate dynamic opacity and blur based on scroll position
  const opacity = Math.min(scrollY / 100, 0.9);
  const blurAmount = Math.min(scrollY / 30, 20);

  return (
    <motion.nav
      className="fixed top-4 left-0 right-0 z-50 px-4 sm:px-6 transition-all duration-300"
      animate={{ y: 0 }}
      transition={{ duration: 0, ease: "easeOut" }}
      style={{
        background: scrolled ? 'rgba(15, 50, 90, 0.7)' : 'transparent',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(135, 206, 250, 0.25)',
        borderRadius: '9999px',
        boxShadow: '0 12px 30px rgba(30, 144, 255, 0.35)',
        maxWidth: '1200px',
        margin: '0 auto'
      }}
    >
      <div className="w-full">
        <div className="flex items-center justify-between h-14 sm:h-16 px-4 sm:px-6">

          {/* Logo with Dropdown (PC Only) */}
          <div className="relative">
            <motion.button
              className="flex items-center space-x-2 sm:space-x-3 group"
              onMouseEnter={() => setShowDropdown(true)}
              onMouseLeave={() => setShowDropdown(false)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="relative">
                {brandingData.logoUrl ? (
                  <img
                    src={brandingData.logoUrl}
                    alt={brandingData.schoolName}
                    className="h-6 w-6 sm:h-8 sm:w-8 md:h-12 md:w-12 rounded-full object-cover animate-glow group-hover:scale-110 transition-transform duration-300"
                  />
                ) : (
                  <div className="h-6 w-6 sm:h-8 sm:w-8 md:h-12 md:w-12 rounded-full bg-gradient-to-r from-gold to-yellow-500 flex items-center justify-center animate-glow group-hover:scale-110 transition-transform duration-300">
                    <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4 md:h-6 md:w-6 text-black" />
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <span className="text-sm sm:text-base md:text-lg lg:text-xl font-heading font-bold text-gradient-gold truncate max-w-[120px] sm:max-w-[200px] md:max-w-none">
                  {brandingData.schoolName}
                </span>
                <span className="text-[10px] sm:text-xs text-muted-foreground tracking-wider hidden sm:block truncate max-w-[120px] sm:max-w-[200px] md:max-w-none">
                  {brandingData.tagline}
                </span>
              </div>
              <motion.div
                animate={{ rotate: showDropdown ? 180 : 0 }}
                transition={{ duration: 0 }}
                className="hidden lg:block"
              >
                <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-gold transition-colors" />
              </motion.div>
            </motion.button>

            {/* Dropdown Menu (PC Only) */}
            <AnimatePresence>
              {showDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0, type: "spring", stiffness: 300 }}
                  className="absolute top-full left-0 mt-2 w-80 bg-background/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl overflow-hidden hidden lg:block"
                  onMouseEnter={() => setShowDropdown(true)}
                  onMouseLeave={() => setShowDropdown(false)}
                >
                  <div className="p-2">
                    {navItems.map((item, index) => (
                      <motion.div
                        key={item.path}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0 }}
                      >
                        <Link
                          to={item.path}
                          className={`flex items-center space-x-4 p-4 rounded-xl transition-all duration-300 group ${
                            location.pathname === item.path
                              ? "bg-gold/15 border border-gold/30"
                              : "hover:bg-muted/50"
                          }`}
                          onClick={() => setShowDropdown(false)}
                        >
                          <motion.div
                            whileHover={{ scale: 1.1, rotate: 5 }}
                            transition={{ duration: 0 }}
                            className={`p-2 rounded-lg ${
                              location.pathname === item.path
                                ? "bg-gold text-black"
                                : "bg-muted/30 text-muted-foreground group-hover:text-gold group-hover:bg-gold/20"
                            }`}
                          >
                            <item.icon className="h-5 w-5" />
                          </motion.div>
                          <div className="flex-1">
                            <div className={`font-semibold ${
                              location.pathname === item.path ? "text-gold" : "text-foreground"
                            }`}>
                              {item.name}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {item.description}
                            </div>
                          </div>
                          {location.pathname === item.path && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ duration: 0 }}
                              className="w-2 h-2 bg-gold rounded-full"
                            />
                          )}
                        </Link>
                      </motion.div>
                    ))}
                  </div>
                  {/* Authentication Links */}
                <div className="border-t border-border pt-4 mt-4">
                  <div className="text-xs font-semibold text-gold mb-3 px-4">SIGN IN</div>
                  <Link to="/teacher" className="flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 font-medium text-foreground hover:text-gold hover:bg-gold/5" onClick={() => setIsOpen(false)}>
                    <Users className="h-5 w-5" />
                    <div>{t("teacherLogin")}</div>
                  </Link>
                  <Link to="/student-login" className="flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-300 font-medium text-foreground hover:text-gold hover:bg-gold/5" onClick={() => setIsOpen(false)}>
                    <GraduationCap className="h-5 w-5" />
                    <div>{t("studentLogin")}</div>
                  </Link>
                </div>
                  {/* Dropdown Footer */}
                  <div className="border-t border-border bg-muted/20 p-4">
                    <div className="text-center">
                      <div className="text-sm font-semibold text-gradient-gold mb-1">
                        🏆 148+ Years of Excellence
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Empowering minds, shaping futures
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center space-x-1 sm:space-x-3">
            {/* Dashboard buttons for logged-in users */}
            {(() => {
              const teacherAuth = localStorage.getItem("teacherAuth");
              const studentAuth = localStorage.getItem("studentAuth");

              if (teacherAuth) {
                return (
                  <Link to="/teacher-dashboard" className="hidden sm:block">
                    <Button variant="outline" size="sm" className="bg-gradient-to-r from-gold/10 to-yellow-500/10 hover:from-gold/20 hover:to-yellow-500/20 border-gold/30 text-gold hover:text-gold/80 transition-all duration-300">
                      {t("teacherDashboard")}
                    </Button>
                  </Link>
                );
              }

              if (studentAuth) {
                return (
                  <Link to="/student-dashboard" className="hidden sm:block">
                    <Button variant="outline" size="sm" className="bg-gradient-to-r from-royal/10 to-gold/10 hover:from-royal/20 hover:to-gold/20 border-royal/30 text-royal hover:text-royal/80 transition-all duration-300">
                      {t("studentDashboard")}
                    </Button>
                  </Link>
                );
              }

              // Show Sign Up button if not logged in
              return (
                <Link to="/auth" className="hidden sm:block">
                  <Button variant="outline" size="sm" className="bg-gradient-to-r from-gold/10 to-yellow-500/10 hover:from-gold/20 hover:to-yellow-500/20 border-gold/30 text-gold hover:text-gold/80 transition-all duration-300">
                    {t("signUp")}
                  </Button>
                </Link>
              );
            })()}

            {/* Notification Bell */}
            {/* Language Selector */}
            <div className="relative" data-language-container>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowLanguageDropdown(!showLanguageDropdown)}
                className="p-2 flex items-center gap-1 hover:bg-gold/10 transition-all duration-300"
                aria-label="Language"
              >
                <Globe className="h-4 w-4 text-gold" />
                <span className="text-xs font-medium text-gold hidden sm:inline">
                  {language === "en" ? "EN" : "HI"}
                </span>
              </Button>

              {/* Language Dropdown */}
              <AnimatePresence>
                {showLanguageDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.1 }}
                    className="absolute right-0 mt-2 w-32 bg-background/95 backdrop-blur-xl border border-gold/30 rounded-xl shadow-2xl overflow-hidden z-50"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        localStorage.setItem('language', 'en');
                        document.documentElement.lang = 'en';
                        document.documentElement.setAttribute('data-language', 'en');
                        window.dispatchEvent(new CustomEvent('languageChange', { detail: { language: 'en' } }));
                        setShowLanguageDropdown(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm font-medium transition-all duration-200 ${
                        language === "en"
                          ? "bg-gold/20 text-gold border-l-2 border-gold"
                          : "text-foreground hover:bg-gold/10"
                      }`}
                    >
                      English
                    </button>
                    <button
                      onClick={() => {
                        localStorage.setItem('language', 'hi');
                        document.documentElement.lang = 'hi';
                        document.documentElement.setAttribute('data-language', 'hi');
                        window.dispatchEvent(new CustomEvent('languageChange', { detail: { language: 'hi' } }));
                        setShowLanguageDropdown(false);
                      }}
                      className={`w-full px-4 py-2 text-left text-sm font-medium transition-all duration-200 ${
                        language === "hi"
                          ? "bg-gold/20 text-gold border-l-2 border-gold"
                          : "text-foreground hover:bg-gold/10"
                      }`}
                    >
                      हिंदी
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="relative" data-notification-container>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 relative"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] flex items-center justify-center text-white">
                    {unreadCount}
                  </span>
                )}
              </Button>

              {/* Notifications Dropdown */}
              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0 }}
                    className="absolute right-0 mt-2 w-[calc(100vw-6rem)] sm:w-64 notification-dropdown bg-background/95 backdrop-blur-xl border border-border rounded-xl shadow-2xl overflow-hidden z-50"
                  >
                    <div className="p-3 border-b border-border">
                      <h3 className="font-heading font-bold text-base sm:text-lg">{t("notifications")}</h3>
                    </div>
                    <div className="max-h-80 sm:max-h-96 overflow-y-auto">
                      {notifications.length > 0 ? (
                        notifications.map((notification) => (
                          <motion.div
                            key={notification.id}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0 }}
                            className={`p-3 border-b border-border last:border-b-0 hover:bg-muted/10 cursor-pointer ${
                              notification.unread ? "bg-gold/5" : ""
                            }`}
                            onClick={() => markAsRead(notification.id)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center space-x-2 mb-1">
                                  <h4 className="font-semibold text-sm notification-title">{notification.title}</h4>
                                  {notification.unread && (
                                    <span className="h-2 w-2 rounded-full bg-gold"></span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mb-1 notification-message">
                                  {notification.message}
                                </p>
                                <p className="text-[10px] text-muted-foreground notification-time">
                                  {formatTime(notification.timestamp)}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        ))
                      ) : (
                        <div className="p-6 text-center text-muted-foreground">
                          <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p className="text-sm">{t("noNotifications")}</p>
                        </div>
                      )}
                    </div>
                    <div className="p-2 border-t border-border text-center">
                      <Button variant="ghost" size="sm" className="text-xs h-8 px-2">
                        {t("viewAllNotifications")}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 sm:hidden"
              aria-label="Toggle menu"
            >
              {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0 }}
              className="sm:hidden border-t border-blue-400/30 bg-gradient-to-b from-blue-950/80 to-blue-900/60 backdrop-blur-xl"
            >
              <div className="p-4 space-y-1 max-h-[70vh] overflow-y-auto">
                {navItems.map((item) => (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0 }}
                  >
                    <Link
                      to={item.path}
                      className={`flex items-center space-x-3 p-3 rounded-lg transition-colors ${
                        location.pathname === item.path
                          ? "bg-gold/15 text-gold border border-gold/30"
                          : "hover:bg-muted/50"
                      }`}
                      onClick={() => setIsOpen(false)}
                    >
                      <item.icon className="h-5 w-5 flex-shrink-0" />
                      <span className="font-medium">{item.name}</span>
                    </Link>
                  </motion.div>
                ))}

                {/* Mobile Authentication Links */}
                <div className="pt-4 mt-4 border-t border-border">
                  <div className="text-xs font-semibold text-gold mb-3 px-3">ACCOUNT</div>
                  {(() => {
                    const teacherAuth = localStorage.getItem("teacherAuth");
                    const studentAuth = localStorage.getItem("studentAuth");

                    if (teacherAuth) {
                      return (
                        <Link to="/teacher-dashboard" className="flex items-center space-x-3 p-3 rounded-lg transition-colors hover:bg-muted/50" onClick={() => setIsOpen(false)}>
                          <Users className="h-5 w-5" />
                          <div>
                            <div className="font-medium">{t("teacherDashboard")}</div>
                            <div className="text-xs text-muted-foreground">Access your dashboard</div>
                          </div>
                        </Link>
                      );
                    }

                    if (studentAuth) {
                      return (
                        <Link to="/student-dashboard" className="flex items-center space-x-3 p-3 rounded-lg transition-colors hover:bg-muted/50" onClick={() => setIsOpen(false)}>
                          <GraduationCap className="h-5 w-5" />
                          <div>
                            <div className="font-medium">{t("studentDashboard")}</div>
                            <div className="text-xs text-muted-foreground">Access your dashboard</div>
                          </div>
                        </Link>
                      );
                    }

                    return (
                      <Link to="/auth" className="flex items-center space-x-3 p-3 rounded-lg transition-colors hover:bg-muted/50" onClick={() => setIsOpen(false)}>
                        <LogIn className="h-5 w-5" />
                        <div>
                          <div className="font-medium">Sign In</div>
                          <div className="text-xs text-muted-foreground">Access your account</div>
                        </div>
                      </Link>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
};

export default Navigation;