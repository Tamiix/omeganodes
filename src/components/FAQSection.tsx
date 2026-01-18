import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "How do I start using Omega RPC?",
    answer: "Join our Discord server, verify your account, and use our simple command to whitelist your IP. You'll receive your endpoint instantly - no complicated setup needed.",
  },
  {
    question: "What networks do you support?",
    answer: "We currently offer RPC nodes for Solana mainnet and testnet, with our mainnet validator launching soon. Our testnet validator is already actively participating in network consensus.",
  },
  {
    question: "What makes Omega different?",
    answer: "We combine enterprise-grade infrastructure + custom gRPC solutions with a simple, Discord-based setup process. Our focus is on delivering maximum performance without the complexity typically associated with RPC services.",
  },
  {
    question: "What are your performance metrics?",
    answer: "Our infrastructure delivers consistent sub 1ms average response times with 99.9% uptime. Each endpoint supports up to 4000 requests per second, ensuring your applications run smoothly.",
  },
  {
    question: "Do you have rate limits?",
    answer: "All plans come with generous request limits designed for real-world usage. Need more? Our scaling options can accommodate any volume requirement.",
  },
  {
    question: "How do you handle network congestion?",
    answer: "Our load balancing system automatically distributes traffic across multiple nodes, ensuring consistent performance even during peak network activity.",
  },
];

const FAQSection = () => {
  return (
    <section id="faq" className="py-24 relative">
      <div className="container mx-auto px-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <span className="text-primary font-medium text-sm uppercase tracking-wider mb-3 block">
            FAQ
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Find quick answers to common questions about our RPC infrastructure.
          </p>
        </motion.div>

        {/* FAQ Accordion */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="max-w-2xl mx-auto"
        >
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="border border-border rounded-lg px-5 bg-card data-[state=open]:border-primary/30 transition-colors"
              >
                <AccordionTrigger className="text-left text-base font-medium text-foreground hover:text-primary hover:no-underline py-4">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm pb-4 leading-relaxed">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <p className="text-center text-sm text-muted-foreground mt-8">
            Still have questions?{" "}
            <a 
              href="https://discord.gg/jMurX9gDDe" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Contact us on Discord
            </a>
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;
