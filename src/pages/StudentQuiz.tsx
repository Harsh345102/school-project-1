
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Brain, Play, Check, Forward, Lightbulb, RotateCcw, Trophy, Clock, X, CheckCircle2 } from "lucide-react";
import jsPDF from "jspdf";

// Gemini API Configuration
// Using Gemini 2.0 Flash-Lite model for quiz generation
const API_KEY = "AIzaSyA6CypLEfSwYWaXALh7SaD-jZjhqxbPUJw";
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-lite:generateContent";

interface Question {
  question: string;
  type: "mcq" | "fill" | "qa" | "tf" | "assertion";
  options?: string[];
  answer: string;
  assertion?: string;
  reason?: string;
  explanation?: string;
}

interface QuizState {
  class: string;
  difficulty: string;
  questionCount: number;
  questionType: string;
  subject: string;
  customTopic?: string;
  questions: Question[];
  currentQuestionIndex: number;
  userAnswers: (string | null)[];
  skippedQuestions: number[];
  startTime: Date | null;
  endTime: Date | null;
  hints: string[];
  hintUsed: boolean[];
  showAnswer: boolean[];
}

const StudentQuiz = () => {
      const handleDownloadPDF = () => {
        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text("Your Personalized 7-Day Routine", 10, 20);
        doc.setFontSize(12);
        const lines = doc.splitTextToSize(routine, 180);
        doc.text(lines, 10, 35);
        doc.save("7-day-routine.pdf");
      };
    const [routine, setRoutine] = useState<string>("");
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<"setup" | "loading" | "quiz" | "results">("setup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState("00:00");
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [currentHint, setCurrentHint] = useState("");
  const [showCurrentAnswer, setShowCurrentAnswer] = useState(false);

  const [quizState, setQuizState] = useState<QuizState>({
    class: "",
    difficulty: "",
    questionCount: 7,
    questionType: "",
    subject: "",
    customTopic: "",
    questions: [],
    currentQuestionIndex: 0,
    userAnswers: [],
    skippedQuestions: [],
    startTime: null,
    endTime: null,
    hints: [],
    hintUsed: [],
    showAnswer: []
  });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeSection === "quiz" && quizState.startTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - quizState.startTime!.getTime()) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        setTimer(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [activeSection, quizState.startTime]);

  const createPrompt = () => {
    let topic = quizState.customTopic && quizState.customTopic.trim() !== "" ? quizState.customTopic : quizState.subject;
    let prompt = `Create ${quizState.questionCount} high-quality educational quiz questions for a class ${quizState.class} student on the topic of "${topic}" at ${quizState.difficulty} difficulty level.\n\n`;
    
    if (quizState.questionType === 'mixed') {
      prompt += `Include a mix of question types: multiple choice questions, fill in the blanks, short answer questions, true/false questions, and assertion-reason questions.\n\n`;
    } else if (quizState.questionType === 'mcq') {
      prompt += `All questions must be multiple choice questions with exactly 4 options each.\n\n`;
    } else if (quizState.questionType === 'fill') {
      prompt += `All questions must be fill in the blanks type with clear blanks indicated.\n\n`;
    } else if (quizState.questionType === 'qa') {
      prompt += `All questions must be short answer questions requiring concise responses.\n\n`;
    } else if (quizState.questionType === 'tf') {
      prompt += `All questions must be true/false questions.\n\n`;
    } else if (quizState.questionType === 'assertion') {
      prompt += `All questions must be assertion-reason type questions.\n\n`;
    }
    
    prompt += `Requirements:
- Questions must be age-appropriate for class ${quizState.class}
- Difficulty level: ${quizState.difficulty}
- Questions should test understanding, not just memorization
- All content must be factually accurate
- Questions should be clear and unambiguous
- Each question MUST include a detailed explanation

Response format (JSON array):
[
  {
    "question": "The complete question text",
    "type": "mcq" or "fill" or "qa" or "tf" or "assertion",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "answer": "The correct answer",
    "assertion": "Assertion statement (only for assertion-reason type)",
    "reason": "Reason statement (only for assertion-reason type)",
    "explanation": "Detailed explanation of why this is the correct answer"
  }
]

Important:
- Return ONLY the JSON array
- No additional text or explanations outside JSON
- Ensure all questions have the required fields
- For MCQ: exactly 4 options with one correct answer
- For fill: the answer should be what fills the blank
- For QA: provide a concise correct answer
- For TF (True/False): answer must be either "True" or "False"
- For Assertion-Reason: include assertion and reason fields, answer should indicate the relationship
- ALL question types MUST include an "explanation" field with 2-3 sentences explaining the correct answer`;
    
    return prompt;
  };

  const generateQuestions = async () => {
    const prompt = createPrompt();
    
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      })
    });
    
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("AI limit reached (429 Too Many Requests). Please wait a few minutes and try again, or use a key/project with more quota.");
      }
      if (response.status === 401 || response.status === 403) {
        throw new Error("AI key is invalid or unauthorized. Please check your Gemini API key and project permissions.");
      }
      throw new Error(`AI Error: ${response.status}`);
    }
    
    const data = await response.json();
    let text = data.candidates[0].content.parts[0].text;
    
    // Multiple extraction strategies
    let cleanedJson = '';
    
    // Strategy 1: Try to extract JSON from markdown code blocks
    const markdownMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (markdownMatch) {
      cleanedJson = markdownMatch[1].trim();
    } else {
      // Strategy 2: Try to extract JSON array directly
      const arrayMatch = text.match(/\[[\s\S]*\]/);
      if (arrayMatch) {
        cleanedJson = arrayMatch[0];
      } else {
        console.error("Raw AI response:", text);
        throw new Error("Could not extract questions from AI response. Please try again.");
      }
    }
    
    // Clean the JSON string
    // Remove control characters
    cleanedJson = cleanedJson.replace(/[\x00-\x1F\x7F-\x9F]/g, '');
    // Fix common JSON issues with newlines and special characters
    cleanedJson = cleanedJson.replace(/\n/g, ' ').replace(/\r/g, '');
    
    try {
      const questions = JSON.parse(cleanedJson);
      
      if (!Array.isArray(questions)) {
        throw new Error("Response is not an array");
      }
      
      if (questions.length === 0) {
        throw new Error("No questions generated");
      }
      
      // Validate question structure
      const validQuestions = questions.filter(q => 
        q.question && q.type && q.answer && q.explanation
      );
      
      if (validQuestions.length === 0) {
        throw new Error("No valid questions found");
      }
      
      return validQuestions.slice(0, quizState.questionCount);
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      console.error("Attempted to parse:", cleanedJson.substring(0, 500));
      throw new Error("The AI generated an invalid response. Please try again with different settings.");
    }
  };

  const generateHint = async (question: string) => {
    const hintPrompt = `For the question: "${question}", provide a helpful hint without giving away the answer. The hint should guide the student to think about the right approach. Keep it concise (1-2 sentences).`;
    
    const response = await fetch(`${API_URL}?key=${API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: hintPrompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 150,
        }
      })
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  };

  const startQuiz = async (e: React.FormEvent) => {
    e.preventDefault();

    // Prevent multiple parallel requests
    if (loading) return;

    // Cap question count at 14
    if (quizState.questionCount > 14) {
      setQuizState(prev => ({ ...prev, questionCount: 14 }));
      return;
    }
    
    // Ensure at least 1 question
    if (quizState.questionCount < 1) {
      setError("Please choose at least 1 question.");
      return;
    }

    setLoading(true);
    setActiveSection("loading");
    setError(null);
    
    try {
      const questions = await generateQuestions();
      
      setQuizState(prev => ({
        ...prev,
        questions,
        userAnswers: new Array(questions.length).fill(null),
        hints: new Array(questions.length).fill(""),
        hintUsed: new Array(questions.length).fill(false),
        showAnswer: new Array(questions.length).fill(false),
        startTime: new Date()
      }));
      
      setActiveSection("quiz");
    } catch (err: any) {
      setError(err.message || "Failed to generate quiz");
      setActiveSection("setup");
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = () => {
    const question = quizState.questions[quizState.currentQuestionIndex];
    let userAnswer = null;
    
    if (question.type === 'mcq' && selectedOption !== null) {
      userAnswer = question.options![selectedOption];
    } else if (question.type === 'tf' && selectedOption !== null) {
      userAnswer = selectedOption === 0 ? "True" : "False";
    } else if (question.type === 'assertion' && selectedOption !== null) {
      const assertionOptions = [
        "Both assertion and reason are true, and reason is the correct explanation",
        "Both assertion and reason are true, but reason is not the correct explanation",
        "Assertion is true, but reason is false",
        "Assertion is false, but reason is true",
        "Both assertion and reason are false"
      ];
      userAnswer = assertionOptions[selectedOption];
    } else if ((question.type === 'fill' || question.type === 'qa') && textAnswer.trim()) {
      userAnswer = textAnswer.trim();
    }
    
    if (!userAnswer) {
      alert("Please provide an answer");
      return;
    }
    
    const newAnswers = [...quizState.userAnswers];
    newAnswers[quizState.currentQuestionIndex] = userAnswer;
    setQuizState(prev => ({ ...prev, userAnswers: newAnswers }));
    
    // Check if answer is wrong and show correct answer
    const isCorrect = checkAnswer(userAnswer, question);
    if (!isCorrect) {
      setShowCurrentAnswer(true);
      const newShowAnswer = [...quizState.showAnswer];
      newShowAnswer[quizState.currentQuestionIndex] = true;
      setQuizState(prev => ({ ...prev, showAnswer: newShowAnswer }));
    } else {
      setTimeout(() => nextQuestion(), 1000);
    }
  };

  const checkAnswer = (userAnswer: string, question: Question): boolean => {
    if (question.type === 'tf') {
      return userAnswer.toLowerCase() === question.answer.toLowerCase();
    } else if (question.type === 'assertion' || question.type === 'mcq') {
      return userAnswer.toLowerCase().includes(question.answer.toLowerCase());
    } else {
      return userAnswer.toLowerCase().includes(question.answer.toLowerCase());
    }
  };

  const skipQuestion = () => {
    setQuizState(prev => ({
      ...prev,
      skippedQuestions: [...prev.skippedQuestions, prev.currentQuestionIndex]
    }));
    nextQuestion();
  };

  const nextQuestion = () => {
    setSelectedOption(null);
    setTextAnswer("");
    setShowHint(false);
    setCurrentHint("");
    setShowCurrentAnswer(false);
    
    if (quizState.currentQuestionIndex < quizState.questions.length - 1) {
      setQuizState(prev => ({ ...prev, currentQuestionIndex: prev.currentQuestionIndex + 1 }));
    } else {
      endQuiz();
    }
  };

  const previousQuestion = () => {
    if (quizState.currentQuestionIndex > 0) {
      setSelectedOption(null);
      setTextAnswer("");
      setShowHint(false);
      setCurrentHint("");
      setShowCurrentAnswer(false);
      setQuizState(prev => ({ ...prev, currentQuestionIndex: prev.currentQuestionIndex - 1 }));
    }
  };

  const handleShowHint = async () => {
    if (!showHint) {
      if (!quizState.hints[quizState.currentQuestionIndex]) {
        const hint = await generateHint(currentQuestion.question);
        const newHints = [...quizState.hints];
        newHints[quizState.currentQuestionIndex] = hint;
        setQuizState(prev => ({ ...prev, hints: newHints }));
        setCurrentHint(hint);
      } else {
        setCurrentHint(quizState.hints[quizState.currentQuestionIndex]);
      }
      
      const newHintUsed = [...quizState.hintUsed];
      newHintUsed[quizState.currentQuestionIndex] = true;
      setQuizState(prev => ({ ...prev, hintUsed: newHintUsed }));
    }
    setShowHint(!showHint);
  };

  const endQuiz = () => {
    setQuizState(prev => ({ ...prev, endTime: new Date() }));
    generateRoutine();
    setActiveSection("results");

  };

  // Generate 7-day routine using Gemini AI
  const generateRoutine = async () => {
    const topic = quizState.customTopic && quizState.customTopic.trim() !== "" ? quizState.customTopic : quizState.subject;
    const prompt = `Create a personalized 7-day study routine for a student who just completed a quiz on the topic '${topic}'. The routine should include daily tasks, study tips, and revision suggestions. Format as a clear, readable list.`;
    try {
      const response = await fetch(`${API_URL}?key=${API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 512 }
        })
      });
      if (!response.ok) throw new Error("Failed to generate routine");
      const data = await response.json();
      setRoutine(data.candidates[0].content.parts[0].text);
    } catch (err) {
      setRoutine("Could not generate routine. Please try again later.");
    }
  };

  const calculateResults = () => {
    let correct = 0;
    let incorrect = 0;
    
    quizState.questions.forEach((q, i) => {
      if (quizState.userAnswers[i]) {
        const isCorrect = checkAnswer(quizState.userAnswers[i]!, q);
        if (isCorrect) correct++;
        else incorrect++;
      }
    });
    
    return {
      correct,
      incorrect,
      skipped: quizState.skippedQuestions.length,
      score: correct * 10
    };
  };

  const currentQuestion = quizState.questions[quizState.currentQuestionIndex];
  const progress = ((quizState.currentQuestionIndex + 1) / quizState.questions.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card/95 backdrop-blur-md border-b border-border/50 sticky top-0 z-50"
      >
        <div className="container-wide py-3 sm:py-4 px-3 sm:px-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/student-dashboard")}
                className="px-2 sm:px-3 text-xs sm:text-sm shrink-0"
              >
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                <span className="hidden xs:inline">Back</span>
              </Button>
              <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
                <Brain className="h-5 w-5 sm:h-6 sm:w-6 text-royal shrink-0" />
                <h1 className="text-sm sm:text-xl font-heading font-bold truncate">AI Quiz Master</h1>
              </div>
            </div>
            {activeSection === "quiz" && (
              <div className="flex items-center gap-1.5 sm:gap-2 bg-muted/30 px-2 sm:px-4 py-1.5 sm:py-2 rounded-lg shrink-0">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="font-mono text-xs sm:text-sm">{timer}</span>
              </div>
            )}
          </div>
        </div>
      </motion.header>

      <div className="container max-w-4xl mx-auto py-8 px-4">
        {activeSection === "setup" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl p-3 sm:p-6 border border-border/50"
          >
            <h2 className="text-lg sm:text-2xl font-bold mb-4 sm:mb-6">Quiz Configuration</h2>
            <form onSubmit={startQuiz} className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-2">Class</label>
                  <select
                    className="w-full bg-muted border border-border rounded-lg p-2 sm:p-3 text-sm sm:text-base"
                    value={quizState.class}
                    onChange={(e) => setQuizState(prev => ({ ...prev, class: e.target.value }))}
                    required
                  >
                    <option value="">Select class</option>
                    {[1,2,3,4,5,6,7,8,9,10,11,12].map(c => (
                      <option key={c} value={c}>Class {c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-2">Difficulty</label>
                  <select
                    className="w-full bg-muted border border-border rounded-lg p-2 sm:p-3 text-sm sm:text-base"
                    value={quizState.difficulty}
                    onChange={(e) => setQuizState(prev => ({ ...prev, difficulty: e.target.value }))}
                    required
                  >
                    <option value="">Select difficulty</option>
                    <option value="easy">Easy</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="extreme">Extreme</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-2">Questions (1-14)</label>
                  <input
                    type="number"
                    min="1"
                    max="14"
                    className="w-full bg-muted border border-border rounded-lg p-2 sm:p-3 text-sm sm:text-base"
                    value={quizState.questionCount}
                    onChange={(e) => setQuizState(prev => ({ ...prev, questionCount: parseInt(e.target.value) }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-2">Type</label>
                  <select
                    className="w-full bg-muted border border-border rounded-lg p-2 sm:p-3 text-sm sm:text-base"
                    value={quizState.questionType}
                    onChange={(e) => setQuizState(prev => ({ ...prev, questionType: e.target.value }))}
                    required
                  >
                    <option value="">Select type</option>
                    <option value="mcq">MCQ</option>
                    <option value="fill">Fill Blanks</option>
                    <option value="qa">Q & A</option>
                    <option value="tf">True/False</option>
                    <option value="assertion">Assertion-Reason</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs sm:text-sm font-medium mb-2">Subject</label>
                <select
                  className="w-full bg-muted border border-border rounded-lg p-2 sm:p-3 text-sm sm:text-base"
                  value={quizState.subject}
                  onChange={(e) => setQuizState(prev => ({ ...prev, subject: e.target.value }))}
                  required
                >
                  <option value="">Select subject</option>
                  <option value="Hindi">Hindi</option>
                  <option value="English">English</option>
                  <option value="Mathematics">Mathematics</option>
                  <option value="Science">Science</option>
                  <option value="Social Studies">Social Studies</option>
                  <option value="General Knowledge">General Knowledge</option>
                </select>
                <label className="block text-xs sm:text-sm font-medium mb-2 mt-2">Or write your own topic</label>
                <input
                  type="text"
                  className="w-full bg-muted border border-border rounded-lg p-2 sm:p-3 text-sm sm:text-base"
                  placeholder="Type your topic here (e.g. Photosynthesis)"
                  value={quizState.customTopic || ""}
                  onChange={e => setQuizState(prev => ({ ...prev, customTopic: e.target.value }))}
                />
              </div>
              <Button type="submit" className="w-full bg-gradient-to-r from-royal to-gold text-white text-sm sm:text-base py-5 sm:py-6">
                <Play className="h-4 w-4 mr-2" />
                Generate AI Quiz
              </Button>
            </form>
            {error && (
              <div className="mt-4 p-3 sm:p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-500 text-xs sm:text-sm">
                {error}
              </div>
            )}
          </motion.div>
        )}

        {activeSection === "loading" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="bg-card rounded-xl p-6 sm:p-12 text-center border border-border/50"
          >
            <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-royal mx-auto mb-3 sm:mb-4"></div>
            <h3 className="text-base sm:text-xl font-bold mb-2">Generating Quiz with Gemini AI</h3>
            <p className="text-sm sm:text-base text-muted-foreground">Please wait...</p>
          </motion.div>
        )}

        {activeSection === "quiz" && currentQuestion && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card rounded-xl p-3 sm:p-6 border border-border/50"
          >
            <div className="mb-4">
              <div className="flex justify-between text-xs sm:text-sm mb-2">
                <span className="truncate">Question {quizState.currentQuestionIndex + 1} of {quizState.questions.length}</span>
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-gradient-to-r from-royal to-gold h-2 rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            <div className="mb-6">
              <h3 className="text-base sm:text-xl font-semibold mb-4 leading-tight">{currentQuestion.question}</h3>
              
              {currentQuestion.type === "mcq" && currentQuestion.options && (
                <div className="space-y-2">
                  {currentQuestion.options.map((option, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedOption(i)}
                      className={`w-full text-left p-3 sm:p-4 rounded-lg border transition-all text-sm sm:text-base ${
                        selectedOption === i
                          ? "border-royal bg-royal/10"
                          : "border-border hover:border-royal/50"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion.type === "tf" && (
                <div className="space-y-2">
                  {["True", "False"].map((option, i) => (
                    <button
                      key={i}
                      onClick={() => setSelectedOption(i)}
                      className={`w-full text-left p-3 sm:p-4 rounded-lg border transition-all text-sm sm:text-base ${
                        selectedOption === i
                          ? "border-royal bg-royal/10"
                          : "border-border hover:border-royal/50"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}

              {currentQuestion.type === "assertion" && (
                <div className="space-y-4">
                  <div className="p-3 sm:p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                    <p className="text-xs sm:text-sm font-medium text-blue-600 mb-1">Assertion:</p>
                    <p className="text-sm sm:text-base">{currentQuestion.assertion}</p>
                  </div>
                  <div className="p-3 sm:p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                    <p className="text-xs sm:text-sm font-medium text-purple-600 mb-1">Reason:</p>
                    <p className="text-sm sm:text-base">{currentQuestion.reason}</p>
                  </div>
                  <div className="space-y-2">
                    {[
                      "Both assertion and reason are true, and reason is the correct explanation",
                      "Both assertion and reason are true, but reason is not the correct explanation",
                      "Assertion is true, but reason is false",
                      "Assertion is false, but reason is true",
                      "Both assertion and reason are false"
                    ].map((option, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedOption(i)}
                        className={`w-full text-left p-3 sm:p-4 rounded-lg border transition-all text-sm sm:text-base ${
                          selectedOption === i
                            ? "border-royal bg-royal/10"
                            : "border-border hover:border-royal/50"
                        }`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {(currentQuestion.type === "fill" || currentQuestion.type === "qa") && (
                <input
                  type="text"
                  className="w-full bg-muted border border-border rounded-lg p-3 sm:p-4 text-sm sm:text-base"
                  placeholder="Type your answer here..."
                  value={textAnswer}
                  onChange={(e) => setTextAnswer(e.target.value)}
                />
              )}

              {/* Hint Section */}
              {showHint && currentHint && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-4 p-3 sm:p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg"
                >
                  <div className="flex items-start gap-2">
                    <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs sm:text-sm font-medium text-amber-600 mb-1">Hint:</p>
                      <p className="text-xs sm:text-sm text-muted-foreground">{currentHint}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Wrong Answer - Show Correct Answer & Explanation */}
              {showCurrentAnswer && currentQuestion.answer && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="mt-4 space-y-3"
                >
                  <div className="p-3 sm:p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-start gap-2">
                      <X className="h-4 w-4 sm:h-5 sm:w-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs sm:text-sm font-medium text-red-600 mb-1">Incorrect Answer</p>
                        <p className="text-xs sm:text-sm text-muted-foreground">Your answer was wrong. See the correct answer below.</p>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 sm:p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <div className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs sm:text-sm font-medium text-green-600 mb-1">Correct Answer:</p>
                        <p className="text-sm sm:text-base font-semibold text-green-700">{currentQuestion.answer}</p>
                      </div>
                    </div>
                  </div>
                  {currentQuestion.explanation && (
                    <div className="p-3 sm:p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Brain className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-xs sm:text-sm font-medium text-blue-600 mb-1">Explanation:</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">{currentQuestion.explanation}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  <Button 
                    onClick={nextQuestion} 
                    className="w-full bg-gradient-to-r from-royal to-gold text-white text-xs sm:text-sm"
                  >
                    Continue to Next Question
                  </Button>
                </motion.div>
              )}
            </div>

            {!showCurrentAnswer && (
              <div className="flex flex-wrap gap-2">
                {quizState.currentQuestionIndex > 0 && (
                  <Button 
                    variant="outline" 
                    onClick={previousQuestion}
                    className="text-xs sm:text-sm px-2 sm:px-4"
                  >
                    <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden xs:inline">Previous</span>
                    <span className="xs:hidden">Prev</span>
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={handleShowHint}
                  className="text-xs sm:text-sm px-2 sm:px-4"
                >
                  <Lightbulb className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">{showHint ? "Hide Hint" : "Show Hint"}</span>
                  <span className="xs:hidden">Hint</span>
                </Button>
                <Button 
                  variant="outline" 
                  onClick={skipQuestion}
                  className="text-xs sm:text-sm px-2 sm:px-4"
                >
                  <Forward className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  Skip
                </Button>
                <Button 
                  onClick={submitAnswer} 
                  className="flex-1 bg-gradient-to-r from-royal to-gold text-white text-xs sm:text-sm px-3 sm:px-4"
                >
                  <Check className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden xs:inline">Submit Answer</span>
                  <span className="xs:hidden">Submit</span>
                </Button>
              </div>
            )}
          </motion.div>
        )}

        {activeSection === "results" && (

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4 sm:space-y-6"
          >
            <div className="bg-card rounded-xl p-4 sm:p-6 border border-border/50">
              <div className="text-center mb-6 sm:mb-8">
                <Trophy className="h-12 w-12 sm:h-16 sm:w-16 mx-auto mb-3 sm:mb-4 text-gold" />
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">Quiz Complete!</h2>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-6 sm:mb-8">
                {[ 
                  { label: "Score", value: calculateResults().score },
                  { label: "Correct", value: calculateResults().correct },
                  { label: "Incorrect", value: calculateResults().incorrect },
                  { label: "Skipped", value: calculateResults().skipped }
                ].map((stat, i) => (
                  <div key={i} className="text-center p-3 sm:p-4 bg-muted/30 rounded-lg">
                    <div className="text-xl sm:text-2xl font-bold text-gold">{stat.value}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                ))}
              </div>
              {/* 7-Day Routine Section */}
              <div className="mt-8">
                <h3 className="text-lg sm:text-xl font-bold mb-2 text-royal">Your Personalized 7-Day Routine</h3>
                <div className="bg-muted/30 rounded-lg p-4 whitespace-pre-line text-sm sm:text-base">
                  {routine ? routine : "Generating your routine..."}
                </div>
                {routine && (
                  <Button
                    onClick={handleDownloadPDF}
                    className="mt-4 mb-3 w-full bg-gradient-to-r from-royal to-gold text-white text-sm sm:text-base py-3"
                  >
                    Download Routine as PDF
                  </Button>
                )}
              </div>
              <Button
                onClick={() => {
                  setQuizState({
                    class: "",
                    difficulty: "",
                    questionCount: 5,
                    questionType: "",
                    subject: "",
                    customTopic: "",
                    questions: [],
                    currentQuestionIndex: 0,
                    userAnswers: [],
                    skippedQuestions: [],
                    startTime: null,
                    endTime: null,
                    hints: [],
                    hintUsed: [],
                    showAnswer: []
                  });
                  setRoutine("");
                  setActiveSection("setup");
                }}
                className="w-full bg-gradient-to-r from-royal to-gold text-white text-sm sm:text-base py-5 sm:py-6"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Take Another Quiz
              </Button>
            </div>

            {/* Question Review Section */}
            <div className="bg-card rounded-xl p-3 sm:p-6 border border-border/50">
              <h3 className="text-lg sm:text-2xl font-bold mb-4 sm:mb-6">Question Review</h3>
              <div className="space-y-3 sm:space-y-4">
                {quizState.questions.map((q, i) => {
                  const userAnswer = quizState.userAnswers[i];
                  const wasSkipped = quizState.skippedQuestions.includes(i);
                  const isCorrect = userAnswer && checkAnswer(userAnswer, q);
                  
                  return (
                    <div
                      key={i}
                      className={`p-3 sm:p-4 rounded-lg border-2 ${
                        wasSkipped
                          ? "border-yellow-500/30 bg-yellow-500/5"
                          : isCorrect
                          ? "border-green-500/30 bg-green-500/5"
                          : "border-red-500/30 bg-red-500/5"
                      }`}
                    >
                      <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                        <div
                          className={`flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-sm sm:text-base ${
                            wasSkipped
                              ? "bg-yellow-500/20 text-yellow-500"
                              : isCorrect
                              ? "bg-green-500/20 text-green-500"
                              : "bg-red-500/20 text-red-500"
                          }`}
                        >
                          {wasSkipped ? "⊘" : isCorrect ? "✓" : "✗"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold mb-2 text-sm sm:text-base leading-tight">
                            Question {i + 1}: {q.question}
                          </p>
                          
                          {q.type === "assertion" && (
                            <div className="space-y-2 mb-3">
                              <div className="p-2 sm:p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                                <p className="text-xs font-medium text-blue-600">Assertion: {q.assertion}</p>
                              </div>
                              <div className="p-2 sm:p-3 bg-purple-500/10 border border-purple-500/30 rounded">
                                <p className="text-xs font-medium text-purple-600">Reason: {q.reason}</p>
                              </div>
                            </div>
                          )}

                          {q.type === "mcq" && q.options && (
                            <div className="space-y-1.5 sm:space-y-2 mb-2 sm:mb-3">
                              {q.options.map((option, optIdx) => (
                                <div
                                  key={optIdx}
                                  className={`p-2 sm:p-3 rounded text-xs sm:text-sm leading-tight ${
                                    option === userAnswer && option.toLowerCase().includes(q.answer.toLowerCase())
                                      ? "bg-green-500/20 border border-green-500/50"
                                      : option === userAnswer
                                      ? "bg-red-500/20 border border-red-500/50"
                                      : option.toLowerCase().includes(q.answer.toLowerCase())
                                      ? "bg-green-500/10 border border-green-500/30"
                                      : "bg-muted/30"
                                  }`}
                                >
                                  {option}
                                </div>
                              ))}
                            </div>
                          )}

                          {!wasSkipped && (
                            <div className="space-y-1 text-xs sm:text-sm">
                              <p className="break-words">
                                <span className="font-medium text-muted-foreground">Your Answer: </span>
                                <span className={isCorrect ? "text-green-500" : "text-red-500"}>
                                  {userAnswer || "No answer"}
                                </span>
                              </p>
                              {!isCorrect && (
                                <p className="break-words">
                                  <span className="font-medium text-muted-foreground">Correct Answer: </span>
                                  <span className="text-green-500 font-semibold">{q.answer}</span>
                                </p>
                              )}
                              {q.explanation && (
                                <div className="mt-2 p-2 sm:p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                                  <p className="font-medium text-blue-600 mb-1">Explanation:</p>
                                  <p className="text-muted-foreground">{q.explanation}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {wasSkipped && (
                            <div className="space-y-2">
                              <p className="text-xs sm:text-sm break-words">
                                <span className="font-medium text-muted-foreground">Status: </span>
                                <span className="text-yellow-500">Skipped</span>
                              </p>
                              <p className="break-words text-xs sm:text-sm">
                                <span className="font-medium text-muted-foreground">Correct Answer: </span>
                                <span className="text-green-500 font-semibold">{q.answer}</span>
                              </p>
                              {q.explanation && (
                                <div className="p-2 sm:p-3 bg-blue-500/10 border border-blue-500/30 rounded">
                                  <p className="font-medium text-blue-600 mb-1 text-xs sm:text-sm">Explanation:</p>
                                  <p className="text-muted-foreground text-xs sm:text-sm">{q.explanation}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default StudentQuiz;
