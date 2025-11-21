import { useState, useEffect } from "react";
import { ArrowRight, Award, BookOpen, Users } from "lucide-react";
import { Button } from "./ui/button-variants";
import { Link } from "react-router-dom";
import { getSupabaseData } from "@/lib/supabaseHelpers";
import ShinyText from "@/components/ShinyText";
import { useTranslation } from "@/hooks/useTranslation";

interface HomepageData {
  heroTitle: string;
  heroSubtitle: string;
  heroButtonPrimary: string;
  heroButtonSecondary: string;
  bannerImages: string[];
  autoRotate: boolean;
  rotationInterval: number;
  stats: {
    students: { number: string; label: string };
    programs: { number: string; label: string };
    awards: { number: string; label: string };
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
}

const Hero = () => {
  const { t } = useTranslation();
  // State for homepage data
  const [homepageData, setHomepageData] = useState<HomepageData>({
    heroTitle: "Royal Academy",
    heroSubtitle: "Shaping tomorrow's leaders through excellence in education, character development, and innovative learning experiences.",
    heroButtonPrimary: "Apply for Admission",
    heroButtonSecondary: "Discover Our Legacy",
    bannerImages: [],
    autoRotate: true,
    rotationInterval: 3,
    stats: {
      students: { number: "2,500+", label: t("students") },
      programs: { number: "150+", label: t("programs") },
      awards: { number: "25+", label: t("awards") }
    },
    colors: {
      primary: "#1e40af",
      secondary: "#f59e0b",
      accent: "#10b981",
      background: "#ffffff",
      text: "#1f2937"
    },
    fonts: {
      heading: "Inter",
      body: "Inter"
    }
  });

  // State for branding data
  const [brandingData, setBrandingData] = useState({
    schoolName: "Royal Academy",
    tagline: "Excellence in Education",
    logoUrl: ""
  });

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Load homepage data from Supabase
  useEffect(() => {
    getSupabaseData('royal-academy-homepage', {
      heroTitle: "Royal Academy",
      heroSubtitle: "Shaping tomorrow's leaders through excellence in education, character development, and innovative learning experiences.",
      heroButtonPrimary: "Apply for Admission",
      heroButtonSecondary: "Discover Our Legacy",
      bannerImages: [],
      autoRotate: true,
      rotationInterval: 5,
      stats: {
        students: { number: "2,500+", label: "Students" },
        programs: { number: "150+", label: "Programs" },
        awards: { number: "25+", label: "Awards" }
      },
      colors: {
        primary: "#1e40af",
        secondary: "#f59e0b",
        accent: "#10b981",
        background: "#ffffff",
        text: "#1f2937"
      },
      fonts: {
        heading: "Inter",
        body: "Inter"
      }
    }).then(data => {
      setHomepageData({
        heroTitle: data.heroTitle || "Royal Academy",
        heroSubtitle: data.heroSubtitle || "Shaping tomorrow's leaders through excellence in education, character development, and innovative learning experiences.",
        heroButtonPrimary: data.heroButtonPrimary || "Apply for Admission",
        heroButtonSecondary: data.heroButtonSecondary || "Discover Our Legacy",
        bannerImages: Array.isArray(data.bannerImages) ? data.bannerImages : [],
        autoRotate: data.autoRotate !== undefined ? data.autoRotate : true,
        rotationInterval: data.rotationInterval || 5,
        stats: {
          students: { 
            number: data.stats?.students?.number || "2,500+", 
            label: data.stats?.students?.label || "Students" 
          },
          programs: { 
            number: data.stats?.programs?.number || "150+", 
            label: data.stats?.programs?.label || "Programs" 
          },
          awards: { 
            number: data.stats?.awards?.number || "25+", 
            label: data.stats?.awards?.label || "Awards" 
          }
        },
        colors: {
          primary: data.colors?.primary || "#1e40af",
          secondary: data.colors?.secondary || "#f59e0b",
          accent: data.colors?.accent || "#10b981",
          background: data.colors?.background || "#ffffff",
          text: data.colors?.text || "#1f2937"
        },
        fonts: {
          heading: data.fonts?.heading || "Inter",
          body: data.fonts?.body || "Inter"
        }
      });
    });
  }, []);

  // Load branding data from Supabase
  useEffect(() => {
    getSupabaseData('royal-academy-branding', {
      schoolName: "Royal Academy",
      tagline: "Excellence in Education",
      logoUrl: ""
    }).then(data => {
      setBrandingData({
        schoolName: data.schoolName || "Royal Academy",
        tagline: data.tagline || "Excellence in Education",
        logoUrl: data.logoUrl || ""
      });
    });
  }, []);


  // Auto-rotate banner images
  useEffect(() => {
    if (homepageData.autoRotate && homepageData.bannerImages && homepageData.bannerImages.length > 1) {
      const interval = setInterval(() => {
        setCurrentImageIndex((prev) => 
          (prev + 1) % homepageData.bannerImages.length
        );
      }, homepageData.rotationInterval * 1000);

      return () => clearInterval(interval);
    }
  }, [homepageData.autoRotate, homepageData.rotationInterval, homepageData.bannerImages]);

  const stats = [
    { icon: Users, value: homepageData.stats.students.number, label: homepageData.stats.students.label },
    { icon: BookOpen, value: homepageData.stats.programs.number, label: homepageData.stats.programs.label },
    { icon: Award, value: homepageData.stats.awards.number, label: homepageData.stats.awards.label },
  ];

  const currentBannerImage = homepageData.bannerImages && homepageData.bannerImages.length > 0 
    ? homepageData.bannerImages[currentImageIndex] 
    : brandingData.logoUrl || '/placeholder.svg';

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Custom Styles */}
      <style>{`
        @keyframes pulse-soft {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }
        .animate-pulse-soft {
          animation: pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>

      {/* Background with banner image rotation */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center transition-all duration-1000 ease-in-out"
          style={{
            backgroundImage: `url(${currentBannerImage})`,
          }}
        ></div>
        <div className="absolute inset-0 bg-black/50"></div>
      </div>

      {/* Floating Elements - Hidden on mobile */}
      <div className="absolute top-20 left-10 w-20 h-20 rounded-full bg-sky-400/25 animate-float hidden sm:block"></div>
      <div className="absolute top-40 right-20 w-16 h-16 rounded-full bg-blue-400/20 animate-float hidden sm:block" style={{ animationDelay: "2s" }}></div>
      <div className="absolute bottom-40 left-20 w-12 h-12 rounded-full bg-cyan-400/20 animate-float hidden sm:block" style={{ animationDelay: "4s" }}></div>

      {/* Content */}
      <div className="relative z-10 container-wide px-4 sm:px-6 py-8 sm:py-16 text-center">
        <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8">
          {/* Main Heading */}
          <div className="space-y-4 sm:space-y-6">
            <h1 
              className="text-3xl xs:text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-heading font-bold leading-tight sm:leading-normal text-sky-gradient"
              style={{ fontFamily: homepageData.fonts.heading }}
            >
              {homepageData.heroTitle}
            </h1>
            <p 
              className="text-sm xs:text-base sm:text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed px-2 sm:px-0 text-sky-gradient"
              style={{ fontFamily: homepageData.fonts.body }}
            >
              {homepageData.heroSubtitle}
            </p>
          </div>

          {/* Call to Action */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-6 justify-center items-center pt-4 sm:pt-8 px-2 sm:px-0">
            <Button variant="hero" size="lg" asChild className="w-full sm:w-auto">
              <Link to="/admissions" className="group">
                {homepageData.heroButtonPrimary}
                <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="w-full sm:w-auto">
              <Link to="/about">
                {homepageData.heroButtonSecondary}
              </Link>
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-6 pt-4 sm:pt-12 px-1 sm:px-0 relative">
            {/* Glowing Background */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-1/4 top-1/2 w-32 h-32 bg-sky-400/15 rounded-full blur-2xl -translate-y-1/2"></div>
              <div className="absolute right-1/4 top-1/2 w-32 h-32 bg-blue-400/12 rounded-full blur-2xl -translate-y-1/2"></div>
            </div>

            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className="card-3d p-2 sm:p-3 text-center group relative overflow-hidden rounded-xl hover:scale-105 transition-transform duration-300"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Animated Background Gradient - Always Visible */}
                <div className="absolute inset-0 bg-gradient-to-br from-gold/10 via-transparent to-transparent opacity-100 group-hover:opacity-100 transition-opacity duration-500"></div>
                
                {/* Border Glow Effect - Always Visible */}
                <div className="absolute inset-0 rounded-xl border border-gold/40 group-hover:border-gold/60 transition-colors duration-300"></div>
                
                {/* Neon Glow on Hover - Always Visible */}
                <div className="absolute inset-0 rounded-xl opacity-100 group-hover:opacity-100 transition-opacity duration-300" style={{
                  boxShadow: 'inset 0 0 20px rgba(255, 193, 7, 0.15), 0 0 20px rgba(255, 193, 7, 0.1)',
                  background: 'radial-gradient(circle at center, rgba(255, 193, 7, 0.05) 0%, transparent 70%)'
                }}></div>

                <div className="flex flex-col items-center space-y-1.5 sm:space-y-2 relative z-10">
                  {/* Icon Container with Enhanced Effects - Always Visible */}
                  <div className="relative">
                    <div className="absolute inset-0 w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-gold/40 rounded-full blur-xl opacity-100 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>
                    <div className="w-7 h-7 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-gold/40 to-gold/60 flex items-center justify-center group-hover:scale-125 hover:scale-120 group-hover:shadow-lg group-hover:shadow-gold/60 shadow-md shadow-gold/40 transition-all duration-300">
                      <stat.icon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white group-hover:text-white transition-colors duration-300" />
                    </div>
                  </div>

                  <div className="space-y-0.5">
                    {/* Animated Number Counter Effect - Always Visible */}
                    <div className="text-sm sm:text-lg md:text-2xl lg:text-3xl font-heading font-bold text-transparent bg-clip-text bg-gradient-to-r from-gold via-amber-300 to-gold group-hover:from-amber-200 group-hover:via-gold group-hover:to-amber-200 transition-all duration-300 animate-pulse-soft">
                      {stat.value}
                    </div>
                    <p className="text-muted-foreground text-[10px] sm:text-xs md:text-sm group-hover:text-gold transition-colors duration-300 font-medium">{stat.label}</p>
                  </div>

                  {/* Floating Particles - Always Visible */}
                  <div className="absolute top-1 left-1 w-1 h-1 bg-gold/100 rounded-full opacity-100 group-hover:opacity-100 animate-float transition-opacity" style={{ animationDuration: '2s' }}></div>
                  <div className="absolute bottom-1 right-1 w-1 h-1 bg-gold/80 rounded-full opacity-100 group-hover:opacity-100 animate-float transition-opacity" style={{ animationDuration: '3s', animationDelay: '0.5s' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-gold/50 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-gold/80 rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>
  );
};

export default Hero;