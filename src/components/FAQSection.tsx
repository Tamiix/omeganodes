import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What is OmegaNode?",
    answer: "OmegaNode is a next-generation node infrastructure service that provides ultra-fast, secure, and reliable RPC access for Web3 applications. Our global network ensures optimal performance with sub-10ms latency and 99.99% uptime guarantee.",
  },
  {
    question: "How does the one-time payment work?",
    answer: "Unlike traditional subscription models, OmegaNode offers lifetime access with a single payment of $499. This includes unlimited RPC access, priority routing, auto-scaling up to 5000 RPS, and all future feature updates at no additional cost.",
  },
  {
    question: "What blockchains do you support?",
    answer: "We currently support major blockchain networks including Ethereum, Solana, Polygon, and more. Our infrastructure is constantly expanding to include new networks based on community demand.",
  },
  {
    question: "How do I connect to Discord for support?",
    answer: "After purchasing OmegaNode access, you'll receive an exclusive invite link to our private Discord community. There you'll get dedicated support channels, direct access to our team, and connect with other node operators.",
  },
  {
    question: "Can I upgrade my access tier?",
    answer: "The OmegaNode Pass includes our full feature set. As we add new capabilities, they're automatically included in your existing pass. We're committed to continuously improving the service for all pass holders.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept cryptocurrency payments (ETH, SOL, USDC) as well as traditional payment methods via credit/debit cards. All transactions are processed securely with instant activation.",
  },
];

const FAQSection = () => {
  return (
    <section id="faq" className="py-32 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-cosmic" />

      <div className="container mx-auto px-6 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <span className="text-primary font-semibold text-sm uppercase tracking-wider mb-4 block">
            FAQ
          </span>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-6">
            <span className="text-foreground">Frequently Asked </span>
            <span className="text-gradient-omega">Questions</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Everything you need to know about OmegaNode
          </p>
        </motion.div>

        {/* FAQ Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-4">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border border-border/50 rounded-xl px-6 bg-card/50 backdrop-blur-sm data-[state=open]:border-primary/30 transition-colors"
              >
                <AccordionTrigger className="text-left text-lg font-semibold text-foreground hover:text-primary hover:no-underline py-6">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground pb-6 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;
