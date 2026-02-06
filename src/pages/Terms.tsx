import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const Terms = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="container mx-auto px-6 py-12 max-w-3xl">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mb-8 gap-2">
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="text-3xl font-bold mb-2">Terms & Conditions</h1>
          <p className="text-muted-foreground mb-8">Last updated: February 6, 2025</p>

          <div className="prose prose-invert prose-sm max-w-none space-y-6 text-muted-foreground [&_h2]:text-foreground [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-8 [&_h2]:mb-3">
            <h2>1. Acceptance of Terms</h2>
            <p>By accessing or using Omega Networks ("Service"), you agree to be bound by these Terms & Conditions. If you do not agree, you may not use the Service.</p>

            <h2>2. Account Responsibilities</h2>
            <p>You are responsible for maintaining the confidentiality of your account credentials. You agree to notify us immediately of any unauthorized use. We are not liable for any loss arising from unauthorized access to your account.</p>

            <h2>3. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Use the Service for any unlawful purpose</li>
              <li>Attempt to gain unauthorized access to any part of the Service</li>
              <li>Interfere with or disrupt the integrity or performance of the Service</li>
              <li>Resell, redistribute, or share your access without authorization</li>
              <li>Use the Service to transmit malicious software or harmful content</li>
            </ul>

            <h2>4. Payments & Billing</h2>
            <p>All fees are non-refundable unless otherwise stated. Prices are subject to change with reasonable notice. You are responsible for all applicable taxes. Failure to pay may result in suspension or termination of your access.</p>

            <h2>5. Service Availability</h2>
            <p>We strive to maintain high uptime but do not guarantee uninterrupted access. We reserve the right to modify, suspend, or discontinue the Service at any time without prior notice. Scheduled maintenance will be communicated when possible.</p>

            <h2>6. Termination</h2>
            <p>We reserve the right to suspend or terminate your account at our sole discretion, with or without cause, and with or without notice. Upon termination, your right to use the Service ceases immediately.</p>

            <h2>7. Privacy</h2>
            <p>Your use of the Service is also governed by our Privacy Policy. By using the Service, you consent to the collection and use of information as described therein.</p>

            <h2>8. Changes to Terms</h2>
            <p>We may update these Terms at any time. Continued use of the Service after changes constitutes acceptance. We will notify users of material changes via email or in-app notification.</p>

            <h2>9. Governing Law</h2>
            <p>These Terms shall be governed by and construed in accordance with applicable laws. Any disputes shall be resolved through binding arbitration or in the courts of the applicable jurisdiction.</p>

            <h2>10. Contact</h2>
            <p>If you have questions about these Terms, please contact us through our Discord server or support channels.</p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Terms;
