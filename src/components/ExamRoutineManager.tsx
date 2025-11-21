import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Filter,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button-variants";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  loadExamRoutines,
  addExamRoutine,
  updateExamRoutine,
  deleteExamRoutine,
  getRoutinesByMonth,
  getUpcomingExams,
  getRoutinesByDate,
  ExamRoutine
} from "@/lib/examRoutinesHelper";
import { subscribeToSupabaseChanges } from "@/lib/supabaseHelpers";
import { toast } from "sonner";

const ExamRoutineManager = () => {
  const [routines, setRoutines] = useState<ExamRoutine[]>([]);
  const [filteredRoutines, setFilteredRoutines] = useState<ExamRoutine[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<ExamRoutine | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const [filterClass, setFilterClass] = useState<string>("All");
  const [filterMonth, setFilterMonth] = useState<string>("");
  const monthInputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    date: "",
    exam_name: "",
    class: "All",
    is_holiday: false,
    notes: ""
  });

  useEffect(() => {
    loadRoutinesData();

    // Subscribe to realtime changes
    const unsubscribe = subscribeToSupabaseChanges<ExamRoutine[]>(
      'royal-academy-exam-routines',
      (newData) => {
        console.log('[ExamRoutineManager] Received realtime update');
        setRoutines(newData);
      }
    );

    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    applyFilters();
  }, [routines, filterClass, filterMonth]);

  const openMonthPicker = () => {
    const input = monthInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
    } else {
      input.focus();
    }
  };

  const openDatePicker = () => {
    const input = dateInputRef.current;
    if (!input) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
    } else {
      input.focus();
    }
  };

  const loadRoutinesData = async () => {
    setIsLoading(true);
    try {
      const data = await loadExamRoutines();
      setRoutines(data);
    } catch (error) {
      console.error("Error loading exam routines:", error);
      toast.error("Failed to load exam routines");
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...routines];

    if (filterClass !== "All") {
      filtered = filtered.filter(r => r.class === filterClass || r.class === "All");
    }

    if (filterMonth) {
      const [year, month] = filterMonth.split("-").map(Number);
      filtered = filtered.filter(r => {
        const routineDate = new Date(r.date);
        return routineDate.getFullYear() === year && routineDate.getMonth() + 1 === month;
      });
    }

    filtered.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    setFilteredRoutines(filtered);
  };

  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const getRoutinesForDate = (date: Date) => {
    return routines.filter(routine => {
      const routineDate = new Date(routine.date);
      return routineDate.getDate() === date.getDate() &&
             routineDate.getMonth() === date.getMonth() &&
             routineDate.getFullYear() === date.getFullYear();
    });
  };

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(currentYear, currentMonth, day);
    setSelectedDate(clickedDate);
    
    // Format date as YYYY-MM-DD to avoid timezone issues
    const year = clickedDate.getFullYear();
    const month = String(clickedDate.getMonth() + 1).padStart(2, '0');
    const dayStr = String(clickedDate.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${dayStr}`;
    
    const existingRoutines = getRoutinesForDate(clickedDate);
    if (existingRoutines.length === 1) {
      handleEditRoutine(existingRoutines[0]);
    } else {
      setFormData({
        date: dateString,
        exam_name: "",
        class: "All",
        is_holiday: false,
        notes: ""
      });
      setIsEditing(false);
      setEditingRoutine(null);
      setShowModal(true);
    }
  };

  const handleAddNew = () => {
    setFormData({
      date: "",
      exam_name: "",
      class: "All",
      is_holiday: false,
      notes: ""
    });
    setSelectedDate(null);
    setIsEditing(false);
    setEditingRoutine(null);
    setShowModal(true);
  };

  const handleEditRoutine = (routine: ExamRoutine) => {
    setEditingRoutine(routine);
    setFormData({
      date: routine.date.split('T')[0],
      exam_name: routine.exam_name,
      class: routine.class,
      is_holiday: routine.is_holiday,
      notes: routine.notes
    });
    setIsEditing(true);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.date) {
      toast.error("Please select a date");
      return;
    }

    if (!formData.is_holiday && !formData.exam_name.trim()) {
      toast.error("Exam name is required");
      return;
    }

    if (formData.is_holiday && !formData.exam_name.trim()) {
      formData.exam_name = "Holiday";
    }

    try {
      if (isEditing && editingRoutine) {
        const success = await updateExamRoutine(editingRoutine.id, {
          date: new Date(formData.date).toISOString(),
          exam_name: formData.exam_name,
          class: formData.class,
          is_holiday: formData.is_holiday,
          notes: formData.notes
        });

        if (success) {
          toast.success("Exam routine updated successfully!");
          await loadRoutinesData();
          setShowModal(false);
        } else {
          toast.error("Failed to update exam routine");
        }
      } else {
        const newRoutine = await addExamRoutine({
          date: new Date(formData.date).toISOString(),
          exam_name: formData.exam_name,
          class: formData.class,
          is_holiday: formData.is_holiday,
          notes: formData.notes
        });

        if (newRoutine) {
          toast.success("Exam routine added successfully!");
          await loadRoutinesData();
          setShowModal(false);
        } else {
          toast.error("Failed to add exam routine");
        }
      }
    } catch (error) {
      console.error("Error saving exam routine:", error);
      toast.error("An error occurred while saving");
    }
  };

  const handleDelete = async (routineId: string) => {
    if (confirm("Are you sure you want to delete this entry?")) {
      try {
        const success = await deleteExamRoutine(routineId);
        if (success) {
          toast.success("Entry deleted successfully!");
          await loadRoutinesData();
        } else {
          toast.error("Failed to delete entry");
        }
      } catch (error) {
        console.error("Error deleting exam routine:", error);
        toast.error("An error occurred while deleting");
      }
    }
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth, currentYear);
    const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
    const days = [];
    const monthNames = ["January", "February", "March", "April", "May", "June",
                       "July", "August", "September", "October", "November", "December"];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="aspect-square" />);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const dayRoutines = getRoutinesForDate(date);
      const hasExam = dayRoutines.some(r => !r.is_holiday);
      const hasHoliday = dayRoutines.some(r => r.is_holiday);
      const isToday = date.toDateString() === new Date().toDateString();

      days.push(
        <motion.div
          key={day}
          whileHover={{ scale: 1.05 }}
          className={`
            aspect-square border-2 rounded-lg p-1 sm:p-2 cursor-pointer relative
            text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100
            transition-all
            ${isToday ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-800 dark:border-gray-300 bg-white dark:bg-gray-700'}
            ${hasExam ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-600 dark:border-orange-400' : ''}
            ${hasHoliday ? 'bg-green-50 dark:bg-green-900/20 border-green-600 dark:border-green-400' : ''}
            hover:shadow-md active:scale-95
          `}
          onClick={() => handleDateClick(day)}
        >
          <div className="flex items-center justify-center h-full">
            {day}
          </div>
          {dayRoutines.length > 0 && (
            <div className="absolute bottom-0.5 left-0.5 right-0.5 space-y-0.5 flex gap-0.5">
              {hasExam && (
                <div className="h-0.5 sm:h-1 bg-orange-500 rounded-full flex-1" />
              )}
              {hasHoliday && (
                <div className="h-0.5 sm:h-1 bg-green-500 rounded-full flex-1" />
              )}
            </div>
          )}
        </motion.div>
      );
    }

    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 sm:p-4 md:p-6 overflow-hidden">
        <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevMonth}
            className="h-8 w-8 sm:h-9 sm:w-9 p-0"
          >
            <ChevronLeft className="w-4 h-4 text-black dark:text-white" />
          </Button>
          
          <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 text-center flex-1 truncate">
            {monthNames[currentMonth]} {currentYear}
          </h3>

          <Button
            variant="outline"
            size="sm"
            onClick={handleNextMonth}
            className="h-8 w-8 sm:h-9 sm:w-9 p-0"
          >
            <ChevronRight className="w-4 h-4 text-black dark:text-white" />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1 sm:mb-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="text-center text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {days}
        </div>

        <div className="mt-4 sm:mt-6 flex flex-wrap gap-2 sm:gap-4 text-xs sm:text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 sm:w-4 h-0.5 sm:h-1 bg-orange-500 rounded-full" />
            <span className="text-gray-900 dark:text-gray-100 font-semibold">Exam</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 sm:w-4 h-0.5 sm:h-1 bg-green-500 rounded-full" />
            <span className="text-gray-900 dark:text-gray-100 font-semibold">Holiday</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 sm:w-4 h-3 sm:h-4 border border-blue-500 rounded" />
            <span className="text-gray-900 dark:text-gray-100 font-semibold">Today</span>
          </div>
        </div>
      </div>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto mb-3 sm:mb-4"></div>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Loading exam routines...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
        <div className="min-w-0">
          <h2 className="text-2xl sm:text-3xl font-bold flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <CalendarIcon className="w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0 text-black dark:text-white" />
            <span className="truncate">Exam Routine Manager</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage exam schedules and holidays for all classes
          </p>
        </div>
        <Button onClick={handleAddNew} className="flex items-center justify-center gap-2 w-full sm:w-auto text-xs sm:text-sm py-2 sm:py-2">
          <Plus className="w-4 h-4" />
          Add Exam/Holiday
        </Button>
      </div>

      {renderCalendar()}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 sm:p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:gap-4 mb-4 sm:mb-6">
          <div className="w-full">
            <label className="block text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1.5 sm:mb-2">Filter by Class</label>
            <Select value={filterClass} onValueChange={setFilterClass}>
              <SelectTrigger className="text-xs sm:text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Classes</SelectItem>
                {[...Array(12)].map((_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>
                    Class {i + 1}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full">
            <label className="block text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1.5 sm:mb-2">Filter by Month</label>
            <Input
              ref={monthInputRef}
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(e.target.value)}
              onFocus={openMonthPicker}
              onClick={openMonthPicker}
              placeholder="Select month"
              className="text-xs sm:text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border-2 border-gray-400 dark:border-gray-500 font-semibold"
            />
          </div>
        </div>

        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">Upcoming Exams & Holidays</h3>

        {filteredRoutines.length === 0 ? (
          <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700">
            <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-xs sm:text-sm text-blue-900 dark:text-blue-100 font-medium">
              No exam routine for all classes. Click "Add Exam/Holiday" or select a date to create one.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {filteredRoutines.map(routine => (
              <motion.div
                key={routine.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`
                  p-3 sm:p-4 rounded-lg border-l-4 
                  ${routine.is_holiday 
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                    : 'border-orange-500 bg-orange-50 dark:bg-orange-900/20'
                  }
                `}
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 sm:gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`
                        px-2 py-0.5 text-xs font-medium rounded
                        ${routine.is_holiday 
                          ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' 
                          : 'bg-orange-100 text-orange-800 dark:bg-orange-800 dark:text-orange-100'
                        }
                      `}>
                        {routine.is_holiday ? 'Holiday' : 'Exam'}
                      </span>
                      <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(routine.date)}
                      </span>
                    </div>
                    
                    <h4 className="font-semibold text-sm sm:text-base break-words">{routine.exam_name}</h4>
                    
                    <div className="flex gap-4 mt-1.5 sm:mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                      <span>Class: {routine.class}</span>
                    </div>
                    
                    {routine.notes && (
                      <p className="mt-1.5 sm:mt-2 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                        {routine.notes}
                      </p>
                    )}
                  </div>

                  <div className="flex gap-1 sm:gap-2 self-start sm:self-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditRoutine(routine)}
                      className="h-8 w-8 sm:h-9 sm:w-9 p-0"
                    >
                      <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(routine.id)}
                      className="h-8 w-8 sm:h-9 sm:w-9 p-0 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: "100%" }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-gray-800 rounded-t-lg sm:rounded-lg shadow-xl w-full sm:max-w-lg sm:w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4 sm:mb-6 gap-2">
                  <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 truncate">
                    {isEditing ? 'Edit Entry' : 'Add Exam/Holiday'}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowModal(false)}
                    className="h-8 w-8 sm:h-9 sm:w-9 p-0 flex-shrink-0 text-gray-900 dark:text-gray-100 hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="space-y-3 sm:space-y-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1.5 sm:mb-2">
                      Date *
                    </label>
                    <Input
                      ref={dateInputRef}
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      onFocus={openDatePicker}
                      onClick={openDatePicker}
                      className="text-xs sm:text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border-2 border-gray-400 dark:border-gray-500"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="is_holiday"
                      checked={formData.is_holiday}
                      onCheckedChange={(checked) => 
                        setFormData({ ...formData, is_holiday: checked as boolean })
                      }
                    />
                    <label
                      htmlFor="is_holiday"
                      className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Mark as Holiday
                    </label>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1.5 sm:mb-2">
                      {formData.is_holiday ? 'Holiday Name' : 'Exam Name *'}
                    </label>
                    <Input
                      type="text"
                      value={formData.exam_name}
                      onChange={(e) => setFormData({ ...formData, exam_name: e.target.value })}
                      placeholder={formData.is_holiday ? "e.g., Independence Day" : "e.g., Mathematics Mid-Term"}
                      className="text-xs sm:text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border-2 border-gray-400 dark:border-gray-500 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1.5 sm:mb-2">Class *</label>
                    <Select 
                      value={formData.class} 
                      onValueChange={(value) => setFormData({ ...formData, class: value })}
                    >
                      <SelectTrigger className="text-xs sm:text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border-2 border-gray-400 dark:border-gray-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All Classes</SelectItem>
                        {[...Array(12)].map((_, i) => (
                          <SelectItem key={i + 1} value={String(i + 1)}>
                            Class {i + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1.5 sm:mb-2">Notes/Description</label>
                    <Textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional information or instructions..."
                      rows={3}
                      className="text-xs sm:text-sm text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border-2 border-gray-400 dark:border-gray-500 placeholder:text-gray-500 dark:placeholder:text-gray-400"
                    />
                  </div>

                  <div className="flex flex-col gap-2 pt-2 sm:pt-4">
                    <Button
                      onClick={handleSave}
                      className="flex items-center justify-center gap-2 h-9 sm:h-10 text-xs sm:text-sm w-full"
                    >
                      <Save className="w-4 h-4" />
                      {isEditing ? 'Update' : 'Save'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowModal(false)}
                      className="h-9 sm:h-10 text-xs sm:text-sm w-full"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ExamRoutineManager;
