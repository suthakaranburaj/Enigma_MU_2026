import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import UnicornScene from "unicornstudio-react";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Unicorn Studio Background */}
      <div className="absolute inset-0 z-0">
        <UnicornScene
          projectId="F2sVTMkw2IIFU538t9Op"
          sdkUrl="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.1.3/dist/unicornStudio.umd.js"
          width="100%"
          height="100%"
          scale={1}
          dpi={1.5}
          lazyLoad={false}
        />
      </div>

      {/* Overlay gradient for text readability */}
      <div className="absolute inset-0 z-[1] bg-gradient-to-t from-background via-background/40 to-background/60" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass-card mb-8"
        >
          <Sparkles className="w-4 h-4 text-accent" />
          <span className="text-sm font-body text-muted-foreground">AI-Powered Life Planning Platform</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="font-heading text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight leading-[1.05] mb-6"
        >
          Plan Your Life
          <br />
          <span className="text-gradient">Toward 2035</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="max-w-2xl mx-auto text-lg md:text-xl font-body text-muted-foreground mb-10 leading-relaxed"
        >
          FutureOS simulates career paths, predicts skills, and lets you talk to your future self.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.8 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <button className="group px-8 py-4 bg-primary rounded-xl font-heading font-semibold text-primary-foreground btn-glow transition-all duration-300 flex items-center gap-2">
            Start Planning
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>
          <button className="px-8 py-4 glass-card glow-border glow-border-hover rounded-xl font-heading font-semibold text-foreground transition-all duration-300">
            Explore Futures
          </button>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;