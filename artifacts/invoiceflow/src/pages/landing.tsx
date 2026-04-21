import { Button } from "@/components/ui/button";
import {
  ArrowRight, CheckCircle2, Zap, FileText, BarChart3, Shield,
  Users, IndianRupee, TrendingUp, Share2, ChevronRight,
  Star, MessageSquare, ClipboardList, Send
} from "lucide-react";
import { motion } from "framer-motion";
import { SignInButton, SignUpButton } from "@clerk/react";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.6, delay: i * 0.1 } }),
};

export default function Landing() {
  return (
    <div className="min-h-screen bg-background font-sans selection:bg-primary/20 selection:text-primary overflow-x-hidden">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 h-20 bg-background/80 backdrop-blur-lg border-b z-50 flex items-center px-6 md:px-12 justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <IndianRupee className="w-5 h-5 text-white" />
          </div>
          <span className="font-display font-bold text-2xl tracking-tight text-foreground">InvoiceFlow</span>
        </div>
        <div className="flex items-center gap-3">
          <SignInButton mode="modal">
            <Button variant="ghost" className="hidden sm:flex rounded-full">Sign In</Button>
          </SignInButton>
          <SignUpButton mode="modal">
            <Button className="rounded-full shadow-lg shadow-primary/20 px-6">
              Get Started Free
            </Button>
          </SignUpButton>
        </div>
      </nav>

      {/* HERO */}
      <section className="pt-36 pb-24 px-6 md:px-12 max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <motion.div initial="hidden" animate="visible" variants={fadeUp} className="flex flex-col gap-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary w-fit border border-primary/20">
              <Zap className="w-4 h-4" />
              <span className="text-sm font-semibold tracking-wide">For Indian Businesses</span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-extrabold text-foreground leading-[1.08]">
              Create Professional{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-violet-500">
                Invoices
              </span>{" "}
              in Minutes.
            </h1>

            <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
              Generate GST-ready invoices, manage customers and products, track payments, and share via WhatsApp — all from one beautiful platform.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              <SignUpButton mode="modal">
                <Button size="lg" className="rounded-full h-14 px-8 text-lg shadow-xl shadow-primary/25">
                  Get Started Free <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </SignUpButton>
              <SignInButton mode="modal">
                <Button size="lg" variant="outline" className="rounded-full h-14 px-8 text-lg">
                  Sign In <ChevronRight className="ml-1 w-5 h-5" />
                </Button>
              </SignInButton>
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-muted-foreground">
              <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> No credit card</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Setup in 2 mins</div>
              <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500" /> Google sign-in</div>
            </div>
          </motion.div>

          {/* Hero Visual */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-violet-400/20 rounded-[3rem] blur-3xl -z-10 rotate-3" />
            <div className="rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-6 shadow-2xl border border-white/10">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Invoice</div>
                  <div className="text-white font-bold text-lg">INV-2024-0042</div>
                  <div className="text-slate-400 text-sm mt-1">Due: 30 Apr 2024</div>
                </div>
                <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-semibold">PAID</div>
              </div>
              <div className="space-y-2 mb-6">
                {[
                  { name: "Web Design Services", total: "₹25,000" },
                  { name: "Monthly SEO Package", total: "₹15,000" },
                  { name: "Logo Redesign", total: "₹8,000" },
                ].map((item, i) => (
                  <div key={i} className="flex justify-between text-sm py-2 border-b border-white/5">
                    <span className="text-slate-300">{item.name}</span>
                    <span className="text-white font-medium">{item.total}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between items-center bg-primary/20 rounded-xl px-4 py-3">
                <div>
                  <div className="text-slate-400 text-xs">GST (18%)</div>
                  <div className="text-slate-400 text-xs mt-1">Total</div>
                </div>
                <div className="text-right">
                  <div className="text-white text-sm">₹8,640</div>
                  <div className="text-primary font-bold text-xl">₹56,640</div>
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <div className="flex-1 py-2 rounded-lg bg-primary text-white text-sm font-semibold text-center">Download PDF</div>
                <div className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold text-center">Share WhatsApp</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* STATS */}
      <section className="py-16 border-y bg-muted/30">
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "10,000+", label: "Invoices Generated" },
              { value: "₹50Cr+", label: "Revenue Tracked" },
              { value: "2,500+", label: "Happy Shopkeepers" },
              { value: "4.9 ★", label: "Average Rating" },
            ].map((stat, i) => (
              <motion.div key={i} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}>
                <div className="text-3xl font-display font-extrabold text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-16"
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary w-fit border border-primary/20 mb-4 mx-auto">
            <span className="text-sm font-semibold">Everything you need</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-display font-extrabold text-foreground mb-4">
            Built for Indian Shopkeepers
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            From GST calculations to WhatsApp sharing — every feature is designed around how Indian businesses actually work.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            {
              icon: FileText, color: "bg-blue-500/10 text-blue-500",
              title: "GST-Ready PDF Invoices",
              desc: "Generate beautiful, GST-compliant invoices with CGST/SGST/IGST breakdown. Download as PDF or print instantly.",
            },
            {
              icon: Share2, color: "bg-emerald-500/10 text-emerald-500",
              title: "Share via WhatsApp",
              desc: "Send invoice links to customers directly via WhatsApp with a single tap. No emails, no hassle.",
            },
            {
              icon: BarChart3, color: "bg-violet-500/10 text-violet-500",
              title: "Smart Dashboard",
              desc: "Track revenue, outstanding payments, top customers, and monthly trends — all in one clean view.",
            },
            {
              icon: Users, color: "bg-orange-500/10 text-orange-500",
              title: "Customer Management",
              desc: "Maintain a complete customer directory with billing details, GSTIN, and full invoice history.",
            },
            {
              icon: ClipboardList, color: "bg-rose-500/10 text-rose-500",
              title: "Product & Service Library",
              desc: "Save your products and services with default rates and tax. Add to invoices in seconds.",
            },
            {
              icon: Shield, color: "bg-teal-500/10 text-teal-500",
              title: "Private & Secure",
              desc: "Each shopkeeper's data is completely isolated. Sign in with Google, Apple, email, or phone.",
            },
          ].map((f, i) => (
            <motion.div
              key={i} custom={i % 3} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="p-8 rounded-3xl bg-card border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className={`w-14 h-14 rounded-2xl ${f.color} flex items-center justify-center mb-6`}>
                <f.icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">{f.title}</h3>
              <p className="text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="py-24 bg-muted/30 border-y">
        <div className="max-w-5xl mx-auto px-6 md:px-12">
          <motion.div
            className="text-center mb-16"
            variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-display font-extrabold text-foreground mb-4">
              Up and running in 3 steps
            </h2>
            <p className="text-xl text-muted-foreground">No training needed. No accountant required.</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "01", icon: Zap,
                title: "Sign in with Google",
                desc: "One click to create your free account. Also supports Apple, email, phone and WhatsApp.",
              },
              {
                step: "02", icon: ClipboardList,
                title: "Set up your business",
                desc: "Enter your shop name, GSTIN, bank details. Takes under 2 minutes.",
              },
              {
                step: "03", icon: Send,
                title: "Create & send invoices",
                desc: "Generate your first professional PDF invoice and share it on WhatsApp instantly.",
              },
            ].map((step, i) => (
              <motion.div
                key={i} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
                className="relative text-center p-8 rounded-3xl bg-card border shadow-sm"
              >
                <div className="text-6xl font-display font-black text-primary/10 mb-4">{step.step}</div>
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 mx-auto">
                  <step.icon className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-muted-foreground">{step.desc}</p>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 text-muted-foreground/30">
                    <ArrowRight className="w-8 h-8" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-16"
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
        >
          <h2 className="text-4xl md:text-5xl font-display font-extrabold text-foreground mb-4">
            Loved by shopkeepers across India
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              name: "Rajesh Sharma",
              role: "Electronics Shop, Delhi",
              review: "Earlier billing used to take 30 minutes. Now I send GST invoice in 2 minutes. Bahut acha hai!",
              rating: 5,
            },
            {
              name: "Priya Nair",
              role: "Freelance Designer, Kochi",
              review: "The WhatsApp sharing is a lifesaver. My clients love receiving professional PDFs instantly.",
              rating: 5,
            },
            {
              name: "Mohammed Aslam",
              role: "Garment Wholesaler, Surat",
              review: "Dashboard dikha ke clients ko impress karta hoon. Monthly revenue track karna ab easy hai.",
              rating: 5,
            },
          ].map((t, i) => (
            <motion.div
              key={i} custom={i} variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
              className="p-8 rounded-3xl bg-card border shadow-sm"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="text-foreground leading-relaxed mb-6 italic">"{t.review}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                  {t.name[0]}
                </div>
                <div>
                  <div className="font-semibold text-foreground">{t.name}</div>
                  <div className="text-sm text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 md:px-12 bg-gradient-to-br from-primary via-primary to-violet-600">
        <motion.div
          className="max-w-3xl mx-auto text-center"
          variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true }}
        >
          <TrendingUp className="w-12 h-12 text-white/60 mx-auto mb-6" />
          <h2 className="text-4xl md:text-5xl font-display font-extrabold text-white mb-6">
            Start sending professional invoices today
          </h2>
          <p className="text-xl text-white/70 mb-10">
            Join thousands of Indian shopkeepers who save hours every week with InvoiceFlow.
          </p>
          <SignUpButton mode="modal">
            <Button
              size="lg"
              variant="secondary"
              className="rounded-full h-14 px-10 text-lg font-semibold shadow-2xl hover:-translate-y-0.5 transition-transform"
            >
              Get Started — It's Free <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </SignUpButton>
          <p className="text-white/50 text-sm mt-6">No credit card required · Google · Apple · Email · Phone</p>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-6 md:px-12 border-t bg-background">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <IndianRupee className="w-4 h-4 text-white" />
            </div>
            <span className="font-display font-bold text-xl text-foreground">InvoiceFlow</span>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            GST-ready invoicing for Indian businesses · Made with ❤️ in India
          </p>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MessageSquare className="w-4 h-4" />
            <SignInButton mode="modal">
              <button className="hover:text-foreground transition-colors">Get Support</button>
            </SignInButton>
          </div>
        </div>
      </footer>

    </div>
  );
}
