'use client';

import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";

import HowItWorks from "@/components/HowItWorks";
import ChatbotPreview from "@/components/ChatbotPreview";
import CTASection from "@/components/CTASection";

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      <FeaturesSection />
      
      <HowItWorks />
      <ChatbotPreview />
      <CTASection />
      <Footer />
    </div>  
  );
}
