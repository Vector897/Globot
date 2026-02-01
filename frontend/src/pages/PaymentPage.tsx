import React, { useState } from 'react';
import { motion } from 'motion/react';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Shield,
  Eye,
  Brain,
  Ship,
  Scale,
  Zap,
  Cloud,
  Globe,
  TrendingUp,
  Check,
  X,
  Play,
  ArrowRight,
  DollarSign,
  Clock,
  AlertTriangle,
  Anchor,
} from 'lucide-react';
import '../styles/payment.css';

// Feature Card Component
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  delay: number;
}

const FeatureCard: React.FC<FeatureCardProps> = ({ icon, title, description, delay }) => (
  <motion.div
    className="feature-card"
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
  >
    <div className="feature-icon">{icon}</div>
    <h3 className="feature-title">{title}</h3>
    <p className="feature-description">{description}</p>
  </motion.div>
);

// Use Case Card Component
interface UseCaseCardProps {
  icon: React.ReactNode;
  title: string;
  scenario: string;
  outcome: string;
  delay: number;
}

const UseCaseCard: React.FC<UseCaseCardProps> = ({ icon, title, scenario, outcome, delay }) => (
  <motion.div
    className="usecase-card"
    initial={{ opacity: 0, x: -20 }}
    whileInView={{ opacity: 1, x: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
  >
    <div className="usecase-icon">{icon}</div>
    <div className="usecase-content">
      <h3 className="usecase-title">{title}</h3>
      <p className="usecase-scenario">{scenario}</p>
      <div className="usecase-outcome">
        <Check className="w-4 h-4 text-[#5a9a7a]" />
        <span>{outcome}</span>
      </div>
    </div>
  </motion.div>
);

// Pricing Tier Component
interface PricingTierProps {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  ctaText: string;
  onSelect: () => void;
  delay: number;
}

const PricingTier: React.FC<PricingTierProps> = ({
  name,
  price,
  period,
  description,
  features,
  highlighted,
  ctaText,
  onSelect,
  delay,
}) => (
  <motion.div
    className={`pricing-card ${highlighted ? 'pricing-card-highlighted' : ''}`}
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
  >
    {highlighted && <div className="pricing-badge">Most Popular</div>}
    <h3 className="pricing-name">{name}</h3>
    <div className="pricing-price">
      <span className="pricing-amount">{price}</span>
      {period && <span className="pricing-period">{period}</span>}
    </div>
    <p className="pricing-description">{description}</p>
    <ul className="pricing-features">
      {features.map((feature, index) => (
        <li key={index} className="pricing-feature">
          <Check className="w-4 h-4 text-[#5a9a7a]" />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
    <button className={`pricing-cta ${highlighted ? 'pricing-cta-primary' : ''}`} onClick={onSelect}>
      {ctaText}
    </button>
  </motion.div>
);

// Payment Modal Component
interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTier: string;
  onProceedToDemo: () => void;
  onSignIn: (e?: React.MouseEvent) => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ isOpen, onClose, selectedTier, onProceedToDemo, onSignIn }) => {
  const { isSignedIn } = useAuth();
  
  if (!isOpen) return null;

  return (
    <motion.div
      className="payment-modal-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="payment-modal"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
      >
        <button className="payment-modal-close" onClick={onClose}>
          <X className="w-5 h-5" />
        </button>

        <div className="payment-modal-header">
          <div className="payment-modal-icon">
            <Shield className="w-8 h-8 text-[#0078d4]" />
          </div>
          <h2>Welcome to Globot {selectedTier}</h2>
          <p>Experience AI-powered supply chain protection</p>
        </div>

        <div className="payment-modal-body">
          <div className="payment-demo-notice">
            <Zap className="w-5 h-5 text-[#4a90e2]" />
            <div>
              <h4>Demo Mode Active</h4>
              <p>This is a demonstration. No payment will be processed.</p>
            </div>
          </div>

          <div className="payment-benefits">
            <div className="payment-benefit">
              <Check className="w-4 h-4 text-[#5a9a7a]" />
              <span>Full access to crisis simulation</span>
            </div>
            <div className="payment-benefit">
              <Check className="w-4 h-4 text-[#5a9a7a]" />
              <span>Multi-agent AI decision making</span>
            </div>
            <div className="payment-benefit">
              <Check className="w-4 h-4 text-[#5a9a7a]" />
              <span>Real-time route optimization</span>
            </div>
          </div>
        </div>

        <div className="payment-modal-footer">
          <button className="payment-btn-secondary" onClick={(e) => {
              console.log("[PaymentModal] Action button clicked, isSignedIn:", isSignedIn);
              onSignIn(e);
          }}>
            {isSignedIn ? "Go to Dashboard" : "Sign In Now"}
          </button>
          <button className="payment-btn-primary" onClick={onProceedToDemo}>
            <Play className="w-4 h-4" />
            Enter Demo
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

// Main Payment Page Component
export const PaymentPage: React.FC = () => {
  const navigate = useNavigate();
  const { isSignedIn } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState('Pro');

  const handleTierSelect = (tier: string) => {
    setSelectedTier(tier);
    setIsModalOpen(true);
  };

  const handleProceedToDemo = () => {
    setIsModalOpen(false);
    navigate('/port');
  };

  const handleSignIn = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    setIsModalOpen(false);

    if (isSignedIn) {
      console.warn("[PaymentPage] User already signed in. Navigating to /port");
      setTimeout(() => navigate('/port'), 0);
    } else {
      console.warn("[PaymentPage] User not signed in. Navigating to /sign-in");
      setTimeout(() => navigate('/sign-in'), 0);
    }
  };

  const features = [
    {
      icon: <Eye className="w-6 h-6" />,
      title: 'Visual Risk Intelligence',
      description: 'Gemini Vision analyzes satellite imagery to detect port congestion, canal blockages, and container pile-ups in real-time.',
    },
    {
      icon: <Brain className="w-6 h-6" />,
      title: 'Multi-Agent Reasoning Engine',
      description: '5 specialized AI agents collaborate: Market Sentinel, Compliance Manager, Risk Hedger, Route Optimizer, and Crisis Coordinator.',
    },
    {
      icon: <Scale className="w-6 h-6" />,
      title: 'Long Document Compliance',
      description: 'Analyze 500-page insurance policies and sanction lists using Gemini\'s 2M token context window for instant compliance verification.',
    },
    {
      icon: <Ship className="w-6 h-6" />,
      title: 'Dynamic Cost Calculation',
      description: 'Automatically calculate rerouting fuel costs, freight rate changes, and total financial impact before making decisions.',
    },
  ];

  const useCases = [
    {
      icon: <AlertTriangle className="w-6 h-6 text-[#c94444]" />,
      title: 'Red Sea Crisis (Maersk Scenario)',
      scenario: 'Houthi attacks disrupt Red Sea shipping. Traditional analysis: 3+ days.',
      outcome: 'AI recommends Cape reroute in 3 min, calculates +$180K fuel cost vs $2.3M cargo risk',
    },
    {
      icon: <Cloud className="w-6 h-6 text-[#4a90e2]" />,
      title: 'Critical Material Tracking (Tesla Scenario)',
      scenario: 'Cobalt shipment from DRC faces port worker strike. EV battery production at risk.',
      outcome: 'Gemini Vision detects container backlog from satellite, triggers alternate supplier protocol',
    },
    {
      icon: <Anchor className="w-6 h-6 text-[#5a9a7a]" />,
      title: 'Suez Canal Blockage (Ever Given Type)',
      scenario: 'Satellite imagery shows unusual vessel clustering at canal entrance.',
      outcome: 'Early warning 6 hours before official announcement, proactive fleet diversion',
    },
  ];

  const pricingTiers = [
    {
      name: 'Growth',
      price: '$4,999',
      period: '/month',
      description: 'For regional logistics providers (Flexport-level)',
      features: [
        '50 shipping routes monitoring',
        'Gemini-powered risk alerts',
        'Compliance document analysis',
        'Trade sanction screening',
        'Priority support',
      ],
      ctaText: 'Start Growth Plan',
    },
    {
      name: 'Enterprise',
      price: '$19,999',
      period: '/month',
      description: 'For Global 500 (Maersk, Tesla, Apple)',
      features: [
        'Unlimited route monitoring',
        'Visual Risk satellite analysis',
        '5-agent reasoning engine',
        'Real-time financial hedging',
        'Dedicated NOC integration',
        '24/7 SLA guarantee',
      ],
      highlighted: true,
      ctaText: 'Start Enterprise Trial',
    },
    {
      name: 'Strategic',
      price: 'Custom',
      description: 'For commodity traders (Cargill, Glencore)',
      features: [
        'Private cloud deployment',
        'Bloomberg/MarineTraffic API integration',
        'Custom AI agent training',
        'Geopolitical intelligence feed',
        'Board-level reporting',
        'Unlimited global coverage',
      ],
      ctaText: 'Contact Sales',
    },
  ];

  return (
    <div className="payment-page">
      {/* Background Effects */}
      <div className="payment-bg-gradient" />
      <div className="payment-grid-bg" />

      {/* Hero Section */}
      <section className="hero-section">
        <motion.div
          className="hero-content"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="hero-badge">
            <Brain className="w-4 h-4" />
            <span>Powered by Google Gemini 2.0</span>
          </div>

          <h1 className="hero-title">
            <span className="hero-title-gradient">Globot Shield</span>
            <br />
            Securing Global Lifelines
          </h1>

          <p className="hero-subtitle">
            Enterprise-grade AI that protects Fortune 500 supply chains from geopolitical crises,
            using <span className="hero-highlight">satellite imagery analysis</span> and <span className="hero-highlight">real-time reasoning</span> — 
            making decisions in 3 minutes, not 3 days.
          </p>

          <div className="hero-cta-group">
            <button className="hero-cta-primary" onClick={() => handleTierSelect('Enterprise')}>
              <Zap className="w-5 h-5" />
              Start Free Trial
            </button>
            <button className="hero-cta-secondary" onClick={() => navigate('/port')}>
              <Play className="w-5 h-5" />
              Watch Demo
            </button>
          </div>

          <div className="hero-trust-badges">
            <div className="trust-badge">
              <Globe className="w-4 h-4" />
              <span>50+ Global Routes</span>
            </div>
            <div className="trust-badge">
              <Clock className="w-4 h-4" />
              <span>99.9% Uptime</span>
            </div>
            <div className="trust-badge">
              <Shield className="w-4 h-4" />
              <span>Enterprise Security</span>
            </div>
          </div>
        </motion.div>

        {/* Hero Visual */}
        <motion.div
          className="hero-visual"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="hero-globe-wrapper">
            <div className="hero-globe-glow" />
            <img src="/Globot_logo.png" alt="Globot Logo" className="hero-globe-icon" style={{ width: '1550px', height: '1550px', objectFit: 'contain' }} />
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="section-title">Enterprise-Grade AI Capabilities</h2>
          <p className="section-subtitle">
            Powered by 5 specialized AI agents working together to protect your supply chain
          </p>
        </motion.div>

        <div className="features-grid">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              icon={feature.icon}
              title={feature.title}
              description={feature.description}
              delay={index * 0.1}
            />
          ))}
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="usecases-section">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="section-title">Real-World Crisis Response</h2>
          <p className="section-subtitle">
            See how Globot transforms reactive firefighting into proactive protection
          </p>
        </motion.div>

        <div className="usecases-list">
          {useCases.map((useCase, index) => (
            <UseCaseCard
              key={index}
              icon={useCase.icon}
              title={useCase.title}
              scenario={useCase.scenario}
              outcome={useCase.outcome}
              delay={index * 0.15}
            />
          ))}
        </div>
      </section>

      {/* ROI Section */}
      <section className="roi-section">
        <motion.div
          className="roi-container"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="roi-header">
            <TrendingUp className="w-8 h-8 text-[#5a9a7a]" />
            <h2>Return on Investment</h2>
          </div>

          <div className="roi-comparison">
            <div className="roi-invest">
              <span className="roi-label">Your Investment</span>
              <div className="roi-value invest">
                <DollarSign className="w-6 h-6" />
                <span>2,870</span>
                <span className="roi-period">/year</span>
              </div>
            </div>

            <div className="roi-arrow">
              <ArrowRight className="w-8 h-8" />
            </div>

            <div className="roi-return">
              <span className="roi-label">Average Savings</span>
              <div className="roi-value return">
                <DollarSign className="w-6 h-6" />
                <span>50,000+</span>
                <span className="roi-period">/year</span>
              </div>
            </div>
          </div>

          <div className="roi-highlight">
            <span className="roi-multiplier">17x</span>
            <span className="roi-text">Return on Investment</span>
          </div>

          <p className="roi-footnote">
            Based on average client savings from avoided delays, rerouting costs, and cargo protection.
            Enterprise clients with $10M+ annual shipping spend see even higher returns.
          </p>
        </motion.div>
      </section>

      {/* Pricing Section */}
      <section className="pricing-section">
        <motion.div
          className="section-header"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="section-title">Simple, Transparent Pricing</h2>
          <p className="section-subtitle">
            Start free, scale as you grow. No hidden fees.
          </p>
        </motion.div>

        <div className="pricing-grid">
          {pricingTiers.map((tier, index) => (
            <PricingTier
              key={index}
              {...tier}
              onSelect={() => handleTierSelect(tier.name)}
              delay={index * 0.1}
            />
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <motion.div
          className="cta-container"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="cta-title">Securing the Lifelines of Global Economy</h2>
          <p className="cta-subtitle">
            When Globot helps Maersk reroute during a Red Sea crisis, it means Kenya's grain won't run out, 
            Europe's gas supply stays secure, and critical medical equipment reaches hospitals on time.
          </p>
          <div className="cta-buttons">
            <button className="cta-btn-primary" onClick={() => handleTierSelect('Enterprise')}>
              <Zap className="w-5 h-5" />
              Start Free Trial
            </button>
            <button className="cta-btn-secondary" onClick={() => navigate('/port')}>
              <Play className="w-5 h-5" />
              Try Live Demo
            </button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="payment-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <Shield className="w-6 h-6 text-[#0078d4]" />
            <span>Globot</span>
          </div>
          <p className="footer-tagline">Trading with Confidence</p>
          <p className="footer-copyright">© 2026 Globot. Google Gemini 3 Hackathon Project.</p>
        </div>
      </footer>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        selectedTier={selectedTier}
        onProceedToDemo={handleProceedToDemo}
        onSignIn={handleSignIn}
      />
    </div>
  );
};

export default PaymentPage;
