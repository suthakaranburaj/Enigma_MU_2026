import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { UserPlus, BrainCircuit, Route } from "lucide-react";
import UnicornScene from "unicornstudio-react";

const steps = [
  { icon: UserPlus, step: "01", title: "Create Your Profile", description: "Input your skills, goals, interests, and current career trajectory." },
  { icon: BrainCircuit, step: "02", title: "AI Simulates Your Future", description: "Our models run thousands of simulations across industries and timelines." },
  { icon: Route, step: "03", title: "Build Your Roadmap", description: "Get a personalized, actionable plan with milestones to reach your ideal future." },
];

const HowItWorks = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="roadmap" className="relative min-h-[700px] flex items-center overflow-hidden" ref={ref}>
      {/* Unicorn Studio Background */}
      <div className="absolute inset-0 z-0">
        <UnicornScene
          projectId="fTrof8PYtemnaL7XGWE7"
          sdkUrl="https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v2.1.3/dist/unicornStudio.umd.js"
          width="100%"
          height="100%"
          scale={1}
          dpi={1.5}
          lazyLoad={true}
        />
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 z-[1] bg-background/60" />

      <div className="relative z-10 container mx-auto px-6 py-24 md:py-32">
        <div className="text-center mb-16">
          <h2 className="font-heading text-3xl md:text-5xl font-bold text-foreground mb-4">
            How It <span className="text-gradient-primary">Works</span>
          </h2>
          <p className="font-body text-muted-foreground text-lg max-w-xl mx-auto">
            Three steps to engineering your future.
          </p>
        </div>

        <div className="relative max-w-4xl mx-auto">
          {/* Connecting line */}
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent -translate-y-1/2" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
            {steps.map((step, i) => {
              const Icon = step.icon;
              return (
                <motion.div
                  key={step.step}
                  initial={{ opacity: 0, y: 40 }}
                  animate={isInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: i * 0.2 }}
                  className="relative text-center"
                >
                  <div className="relative mx-auto w-20 h-20 mb-6">
                    <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-xl" />
                    <div className="relative w-full h-full glass-card glow-border rounded-2xl flex items-center justify-center">
                      <Icon className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <span className="font-heading text-xs font-semibold text-primary tracking-widest uppercase mb-2 block">{step.step}</span>
                  <h3 className="font-heading text-lg font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="font-body text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;