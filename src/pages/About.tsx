import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { motion } from "framer-motion";
import { Shield, Target, Eye, Heart, Users, Award, BookOpen, Globe, ArrowLeft, ArrowUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button-variants";
import ShinyText from "@/components/ShinyText";
import TextType from "@/components/TextType";
import Squares from "@/components/Squares";

interface AboutPageData {
  heroTitle: string;
  heroSubtitle: string;
  heroDescription: string;
  historyTitle: string;
  historyContent: string;
  foundedYear: string;
  missionTitle: string;
  missionContent: string;
  visionTitle: string;
  visionContent: string;
  values: {
    excellence: { title: string; description: string };
    innovation: { title: string; description: string };
    integrity: { title: string; description: string };
    community: { title: string; description: string };
  };
  leadershipTitle: string;
  leadershipDescription: string;
  staffMembers: {
    id: string;
    name: string;
    position: string;
    description: string;
    photos: string[];
    email?: string;
    phone?: string;
    qualifications?: string;
    experience?: string;
  }[];
  stats: {
    students: { number: string; label: string };
    faculty: { number: string; label: string };
    programs: { number: string; label: string };
    years: { number: string; label: string };
  };
  achievements: string[];
  contactInfo: {
    address: string;
    phone: string;
    email: string;
    website: string;
  };
}

const About = () => {
  const navigate = useNavigate();
  const [aboutData, setAboutData] = useState<AboutPageData | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  // Load data from localStorage (managed by Principal Dashboard)
  useEffect(() => {
    const savedData = localStorage.getItem('royal-academy-about');
    if (savedData) {
      try {
        setAboutData(JSON.parse(savedData));
      } catch (error) {
        console.error('Error parsing saved data:', error);
        setAboutData(getDefaultData());
      }
    } else {
      setAboutData(getDefaultData());
    }
  }, []);

  // Scroll to top functionality
  useEffect(() => {
    const handleScroll = () => {
      // Show scroll button when user has scrolled 400px OR is near the bottom of the page
      const scrolled = window.scrollY;
      const threshold = 400;
      const nearBottom = window.innerHeight + window.scrollY >= document.body.offsetHeight - 1000;
      
      setShowScrollTop(scrolled > threshold || nearBottom);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Default data function
  const getDefaultData = (): AboutPageData => ({
    heroTitle: "About Royal Academy",
    heroSubtitle: "Excellence in Education Since 1875",
    heroDescription: "Royal Academy has been a beacon of educational excellence for over 148 years, nurturing minds and shaping the future of countless students through innovative teaching and character development.",
    historyTitle: "Our Rich History",
    historyContent: "Founded in 1875 by visionary educators, Royal Academy began as a small institution with big dreams. Over nearly 150 years, we have grown into one of the nation's premier educational establishments, combining time-honored traditions with innovative approaches to learning.",
    foundedYear: "1875",
    missionTitle: "Our Mission",
    missionContent: "To provide exceptional education that empowers students to achieve their highest potential, fostering critical thinking, creativity, and moral leadership in a rapidly changing world.",
    visionTitle: "Our Vision",
    visionContent: "To be the world's leading educational institution, recognized for academic excellence, innovative teaching, and the development of ethical leaders who will shape a better future for humanity.",
    values: {
      excellence: { title: "Excellence", description: "We strive for the highest standards in everything we do, from academic achievement to character development." },
      innovation: { title: "Innovation", description: "We embrace new ideas, technologies, and teaching methods to enhance the learning experience." },
      integrity: { title: "Integrity", description: "We uphold the highest ethical standards and promote honesty, respect, and responsibility." },
      community: { title: "Community", description: "We foster a supportive, inclusive environment where everyone can thrive and contribute." }
    },
    leadershipTitle: "Principal and Teacher Section",
    leadershipDescription: "Meet our dedicated leadership team and faculty members who guide Royal Academy towards excellence in education.",
    staffMembers: [
      {
        id: "principal-1",
        name: "Dr. Sarah Johnson",
        position: "Principal",
        description: "Dr. Sarah Johnson brings over 20 years of educational leadership experience to Royal Academy.",
        photos: ["https://images.unsplash.com/photo-1494790108755-2616c669-b163?w=400&h=400&fit=crop&crop=face&auto=format&q=80"],
        email: "principal@royalacademy.edu",
        phone: "+1 (555) 123-4567",
        qualifications: "Ph.D. in Educational Administration",
        experience: "20+ years in educational leadership"
      }
    ],
    stats: {
      students: { number: "2,500+", label: "Students" },
      faculty: { number: "180+", label: "Faculty Members" },
      programs: { number: "45+", label: "Academic Programs" },
      years: { number: "148+", label: "Years of Excellence" }
    },
    achievements: [
      "Ranked #1 Private School in the Region for 5 consecutive years",
      "98% Graduate Employment Rate within 6 months",
      "Over 50 National Academic Awards in the last decade",
      "Alumni network spanning 75+ countries worldwide",
      "State-of-the-art facilities and technology integration",
      "Comprehensive scholarship programs serving 40% of students"
    ],
    contactInfo: {
      address: "123 Education Boulevard, Academic City, AC 12345",
      phone: "+1 (555) 123-4567",
      email: "info@royalacademy.edu",
      website: "www.royalacademy.edu"
    }
  });

  if (!aboutData) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  // Map dynamic values to icons
  const getValueIcon = (key: string) => {
    switch (key) {
      case 'excellence': return Shield;
      case 'innovation': return Target;
      case 'integrity': return Eye;
      case 'community': return Heart;
      default: return Shield;
    }
  };

  // Create values array from dynamic data
  const values = Object.entries(aboutData.values).map(([key, value]) => ({
    icon: getValueIcon(key),
    title: value.title,
    description: value.description,
  }));

  // Create achievements array from dynamic stats
  const achievements = [
    { icon: Users, value: aboutData.stats.students.number, label: aboutData.stats.students.label },
    { icon: Award, value: aboutData.stats.faculty.number, label: aboutData.stats.faculty.label },
    { icon: BookOpen, value: aboutData.stats.programs.number, label: aboutData.stats.programs.label },
    { icon: Globe, value: aboutData.stats.years.number, label: aboutData.stats.years.label },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      
      {/* Hero Section */}
      <section className="relative pt-24 sm:pt-32 pb-12 sm:pb-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-royal/20 via-background to-crimson/20"></div>
        <div className="absolute inset-0 opacity-30">
          <Squares
            direction="diagonal"
            speed={0.5}
            borderColor="#D4AF37"
            squareSize={50}
            hoverFillColor="rgba(212, 175, 55, 0.2)"
          />
        </div>
        <div className="container-wide relative z-10 px-4 sm:px-6">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6 sm:mb-8"
          >
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12 sm:mb-16"
          >
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-heading font-bold mb-4 sm:mb-6">
              <TextType 
                text={aboutData.heroTitle}
                className="text-sky-gradient"
                typingSpeed={100}
                loop={false}
                showCursor={false}
              />
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed px-2 sm:px-0 mb-4">
              {aboutData.heroSubtitle}
            </p>
          </motion.div>
        </div>
      </section>

      {/* History & Mission */}
      <section className="section-padding bg-gradient-to-b from-background to-muted/20">
        <div className="container-wide">
          <div className="grid lg:grid-cols-2 gap-16 items-center mb-20">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="space-y-8"
            >
              <div className="space-y-6">
                <h2 className="text-4xl font-heading font-semibold">{aboutData.historyTitle}</h2>
                <div className="text-lg text-muted-foreground leading-relaxed">
                  {aboutData.historyContent.split('\n\n').map((paragraph, index) => (
                    <p key={index} className="mb-4 last:mb-0">
                      <ShinyText text={paragraph} speed={3} />
                    </p>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-2xl font-heading font-semibold text-gradient-royal">{aboutData.missionTitle}</h3>
                <div className="text-lg text-muted-foreground italic bg-card/50 p-6 rounded-lg border border-border">
                  "<ShinyText text={aboutData.missionContent} speed={4} />"
                </div>
              </div>
            </motion.div>

            {/* Values Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {values.map((value, index) => (
                <motion.div
                  key={value.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  whileHover={{ 
                    scale: 1.05, 
                    rotateY: 10,
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
                  }}
                  transition={{ 
                    duration: 0.3, 
                    delay: index * 0.1,
                    type: "spring",
                    stiffness: 300
                  }}
                  className="card-3d p-6 group cursor-pointer"
                >
                  <div className="space-y-4">
                    <motion.div
                      whileHover={{ rotate: 360 }}
                      transition={{ duration: 0.6 }}
                      className="w-12 h-12 rounded-lg bg-gradient-to-br from-gold/20 to-gold/40 flex items-center justify-center"
                    >
                      <value.icon className="h-6 w-6 text-gold" />
                    </motion.div>
                    <h4 className="text-xl font-heading font-semibold">{value.title}</h4>
                    <p className="text-muted-foreground leading-relaxed">{value.description}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Achievements */}
      <section className="section-padding bg-gradient-to-r from-royal/5 via-background to-crimson/5">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-heading font-bold mb-6">Our Achievements</h2>
            <p className="text-xl text-muted-foreground">Numbers that reflect our commitment to excellence</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {achievements.map((achievement, index) => (
              <motion.div
                key={achievement.label}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                whileHover={{ 
                  scale: 1.05, 
                  y: -5,
                  rotateY: 5 
                }}
                transition={{ 
                  duration: 0.3, 
                  delay: index * 0.1,
                  type: "spring",
                  stiffness: 300
                }}
                className="card-3d p-6 text-center group cursor-pointer"
              >
                <div className="flex flex-col items-center space-y-3">
                  <motion.div
                    whileHover={{ rotate: 360, scale: 1.1 }}
                    transition={{ duration: 0.6 }}
                    className="w-12 h-12 rounded-full bg-gradient-to-br from-gold/20 to-gold/40 flex items-center justify-center"
                  >
                    <achievement.icon className="h-6 w-6 text-gold" />
                  </motion.div>
                  <div className="space-y-1">
                    <motion.div
                      initial={{ scale: 0 }}
                      whileInView={{ scale: 1 }}
                      transition={{ delay: index * 0.1 + 0.3, type: "spring", stiffness: 300 }}
                      className="text-2xl sm:text-3xl font-heading font-bold text-gradient-gold"
                    >
                      {achievement.value}
                    </motion.div>
                    <p className="text-muted-foreground text-sm sm:text-base">{achievement.label}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Vision Statement */}
      <section className="section-padding">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.6 }}
            className="text-center bg-gradient-to-r from-royal/10 via-crimson/5 to-royal/10 p-12 rounded-2xl border border-border cursor-pointer"
          >
            <h3 className="text-3xl font-heading font-semibold mb-6">{aboutData.visionTitle}</h3>
            <p className="text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
              <ShinyText text={aboutData.visionContent} speed={4} />
            </p>
          </motion.div>
        </div>
      </section>

      {/* Achievements List */}
      <section className="section-padding bg-gradient-to-b from-muted/20 to-background">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-heading font-bold mb-6">Our Accomplishments</h2>
            <p className="text-xl text-muted-foreground">Recognitions that define our excellence</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {aboutData.achievements.map((achievement, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: index % 2 === 0 ? -30 : 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-card/50 border border-border rounded-lg p-6 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-start space-x-4">
                  <div className="w-2 h-2 bg-gold rounded-full mt-3 flex-shrink-0"></div>
                  <p className="text-muted-foreground leading-relaxed">{achievement}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Leadership Section */}
      <section className="section-padding">
        <div className="container-wide">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-4xl font-heading font-bold mb-6">{aboutData.leadershipTitle}</h2>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              {aboutData.leadershipDescription}
            </p>
          </motion.div>

          {/* Staff Members Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {aboutData.staffMembers.map((staff, index) => (
              <motion.div
                key={staff.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="bg-card/50 border border-border rounded-xl p-4 sm:p-6 hover:shadow-lg transition-all duration-300"
              >
                {/* Staff Photo */}
                {staff.photos[0] && (
                  <div className="relative mb-4">
                    <img
                      src={staff.photos[0]}
                      alt={staff.name}
                      className="w-20 h-20 sm:w-24 sm:h-24 mx-auto rounded-full object-cover border-4 border-gold/30"
                    />
                  </div>
                )}

                {/* Staff Info */}
                <div className="text-center mb-4">
                  <h3 className="text-lg sm:text-xl font-heading font-bold text-foreground mb-1">{staff.name}</h3>
                  <p className="text-gold font-medium text-sm sm:text-base mb-2">{staff.position}</p>
                  <p className="text-muted-foreground text-xs sm:text-sm leading-relaxed">{staff.description}</p>
                </div>

                {/* Additional Info */}
                <div className="space-y-2 text-xs sm:text-sm">
                  {staff.qualifications && (
                    <div>
                      <span className="font-medium text-foreground">Qualifications: </span>
                      <span className="text-muted-foreground">{staff.qualifications}</span>
                    </div>
                  )}
                  {staff.experience && (
                    <div>
                      <span className="font-medium text-foreground">Experience: </span>
                      <span className="text-muted-foreground">{staff.experience}</span>
                    </div>
                  )}
                  {staff.email && (
                    <div>
                      <span className="font-medium text-foreground">Email: </span>
                      <a href={`mailto:${staff.email}`} className="text-gold hover:text-gold/80 transition-colors">
                        {staff.email}
                      </a>
                    </div>
                  )}
                </div>

                {/* Additional Photos */}
                {staff.photos.length > 1 && (
                  <div className="mt-4 grid grid-cols-3 gap-2">
                    {staff.photos.slice(1, 4).map((photo, photoIndex) => (
                      <img
                        key={photoIndex}
                        src={photo}
                        alt={`${staff.name} ${photoIndex + 2}`}
                        className="w-full h-12 sm:h-16 object-cover rounded-full border-2 border-gold/30"
                      />
                    ))}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <motion.button
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 p-3 rounded-full bg-gold hover:bg-gold/90 text-black shadow-lg hover:shadow-xl transition-all duration-300"
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-6 w-6" />
        </motion.button>
      )}

      <Footer />
    </div>
  );
};

export default About;