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
      title: 'Real-time Threat Detection',
      description: 'Monitor 50+ global shipping lanes for geopolitical events, weather disruptions, and security threats.',
    },
    {
      icon: <Brain className="w-6 h-6" />,
      title: 'Multi-Agent Risk Analysis',
      description: '5 specialized AI agents collaborate to analyze risks from market, logistics, compliance, and financial perspectives.',
    },
    {
      icon: <Ship className="w-6 h-6" />,
      title: 'Autonomous Route Optimization',
      description: 'AI-powered rerouting decisions executed in minutes, not days. Avoid crisis zones automatically.',
    },
    {
      icon: <Scale className="w-6 h-6" />,
      title: 'Adversarial Debate System',
      description: 'Built-in red team testing prevents AI hallucinations. Every decision is challenged before execution.',
    },
  ];

  const useCases = [
    {
      icon: <AlertTriangle className="w-6 h-6 text-[#c94444]" />,
      title: 'Geopolitical Crisis Response',
      scenario: 'Vessel seized in Strait of Hormuz at 4:55 PM. Traditional response takes 3+ days.',
      outcome: 'Globot reroutes via Cape of Good Hope in 3 minutes, saving $2.3M in cargo value',
    },
    {
      icon: <Cloud className="w-6 h-6 text-[#4a90e2]" />,
      title: 'Extreme Weather Mitigation',
      scenario: 'Category 4 hurricane approaching Gulf of Mexico shipping lane.',
      outcome: 'Proactive rerouting 48 hours before impact, zero cargo delays',
    },
    {
      icon: <Anchor className="w-6 h-6 text-[#5a9a7a]" />,
      title: 'Supply Chain Disruption Prevention',
      scenario: 'Port congestion detected at Los Angeles, 15-day delay projected.',
      outcome: 'Automatic diversion to Long Beach with pre-arranged customs clearance',
    },
  ];

  const pricingTiers = [
    {
      name: 'Starter',
      price: '$999',
      period: '/month',
      description: 'For small-to-medium freight forwarders',
      features: [
        '10 shipping routes monitoring',
        'Real-time risk alerts',
        'Basic dashboard access',
        'Email notifications',
        'Standard support',
      ],
      ctaText: 'Start Starter Plan',
    },
    {
      name: 'Pro',
      price: '$4,999',
      period: '/month',
      description: 'For mid-size 3PL companies',
      features: [
        'Unlimited route monitoring',
        'Full API access',
        'Multi-agent AI analysis',
        'Custom alert rules',
        'Priority support',
        'Advanced analytics',
      ],
      highlighted: true,
      ctaText: 'Start Pro Trial',
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      description: 'For Global 500 shippers',
      features: [
        'Private cloud deployment',
        'Custom AI agent training',
        'White-glove onboarding',
        'Dedicated success manager',
        'SLA guarantees',
        'Unlimited users',
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
            <Shield className="w-4 h-4" />
            <span>Powered by Microsoft Azure AI</span>
          </div>

          <h1 className="hero-title">
            <span className="hero-title-gradient">Globot Shield</span>
            <br />
            Trade with Confidence
          </h1>

          <p className="hero-subtitle">
            The AI guardian that protects your global supply chain from geopolitical storms,
            extreme weather, and market disruptions — making decisions in{' '}
            <span className="hero-highlight">3 minutes</span>, not 3 days.
          </p>

          <div className="hero-cta-group">
            <button className="hero-cta-primary" onClick={() => handleTierSelect('Pro')}>
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
            <Globe className="hero-globe-icon" />
            <div className="hero-orbiting-dots">
              <div className="orbiting-dot dot-1" />
              <div className="orbiting-dot dot-2" />
              <div className="orbiting-dot dot-3" />
            </div>
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
          <h2 className="cta-title">Ready to Protect Your Supply Chain?</h2>
          <p className="cta-subtitle">
            Join forward-thinking logistics companies using AI to stay ahead of disruptions
          </p>
          <div className="cta-buttons">
            <button className="cta-btn-primary" onClick={() => handleTierSelect('Pro')}>
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
          <p className="footer-copyright">© 2026 Globot. Imagine Cup 2026 Project.</p>
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
