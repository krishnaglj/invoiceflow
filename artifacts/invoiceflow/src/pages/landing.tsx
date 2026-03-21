import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Zap, FileText, BarChart3, Shield } from "lucide-react";
import { motion } from "framer-motion";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/20 selection:text-primary overflow-hidden">
      <nav className="fixed top-0 left-0 right-0 h-20 bg-background/80 backdrop-blur-lg border-b z-50 flex items-center px-6 md:px-12 justify-between">
        <div className="flex items-center gap-3">
          <img src={`${import.meta.env.BASE_URL}images/logo.png`} alt="InvoiceFlow" className="w-10 h-10 object-contain" />
          <span className="font-display font-bold text-2xl tracking-tight text-foreground">InvoiceFlow</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors hidden sm:block">
            Sign In
          </Link>
          <Button className="rounded-full shadow-lg shadow-primary/20 hover-elevate px-6" asChild>
            <Link href="/signup">Get Started</Link>
          </Button>
        </div>
      </nav>

      <main className="pt-32 pb-20 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col gap-8"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary w-fit border border-primary/20">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-semibold tracking-wide">For Indian Businesses</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-display font-extrabold text-foreground leading-[1.1]">
              Create Professional <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">Invoices</span> in Minutes.
            </h1>
            
            <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
              Manage your business effortlessly. Generate GST-ready invoices, track payments, and get beautiful dashboards—all from one platform.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <Button size="lg" className="rounded-full h-14 px-8 text-lg shadow-xl shadow-primary/25 hover-elevate" asChild>
                <Link href="/signup">
                  Start for free <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-full h-14 px-8 text-lg hover-elevate" asChild>
                <Link href="/login">View Demo</Link>
              </Button>
            </div>
            
            <div className="flex items-center gap-6 mt-4 text-sm font-medium text-muted-foreground">
              <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500"/> No credit card</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500"/> Setup in 2 mins</div>
            </div>
          </motion.div>

          <motion.div
             initial={{ opacity: 0, scale: 0.95 }}
             animate={{ opacity: 1, scale: 1 }}
             transition={{ duration: 0.8, delay: 0.2 }}
             className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-accent/20 rounded-[3rem] blur-3xl -z-10 transform rotate-3" />
            <img 
              src={`${import.meta.env.BASE_URL}images/hero-illustration.png`} 
              alt="Dashboard visualization" 
              className="w-full h-auto rounded-3xl shadow-2xl shadow-black/10 border border-white/20"
            />
          </motion.div>
        </div>

        <div className="mt-40 grid md:grid-cols-3 gap-8">
          {[
            { icon: FileText, title: "Beautiful PDFs", desc: "Generate professional, GST-compliant invoices that look great on any device." },
            { icon: BarChart3, title: "Smart Dashboard", desc: "Track revenue, outstanding payments, and top customers at a glance." },
            { icon: Shield, title: "Secure & Reliable", desc: "Your business data is safely stored and backed up on our robust infrastructure." },
          ].map((feature, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="p-8 rounded-3xl bg-card border shadow-lg shadow-black/5 hover-elevate"
            >
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
                <feature.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">{feature.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </main>
    </div>
  );
}
