import { Github, Twitter, Linkedin } from "lucide-react";

const Footer = () => {
  return (
    <footer className="border-t border-border/30 py-12">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="font-heading text-lg font-bold text-foreground">
            Future<span className="text-gradient-primary">OS</span>
          </div>

          <div className="flex items-center gap-6">
            {["Features", "Simulator", "Roadmap", "Contact"].map((link) => (
              <a key={link} href="#" className="text-sm font-body text-muted-foreground hover:text-foreground transition-colors">
                {link}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {[Twitter, Github, Linkedin].map((Icon, i) => (
              <a key={i} href="#" className="w-9 h-9 rounded-lg bg-surface-3 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-primary/20 transition-all">
                <Icon className="w-4 h-4" />
              </a>
            ))}
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs font-body text-muted-foreground">
            © 2025 FutureOS. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
