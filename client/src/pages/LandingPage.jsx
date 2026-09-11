import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import HeroSection from '../components/landing/HeroSection';
import TrustStrip from '../components/landing/TrustStrip';
import ProblemSection from '../components/landing/ProblemSection';
import EcosystemRoles from '../components/landing/EcosystemRoles';
import SkillJourney from '../components/landing/SkillJourney';
import CollaborationSection from '../components/landing/CollaborationSection';
import OpportunityDiscovery from '../components/landing/OpportunityDiscovery';
import PortfolioPreview from '../components/landing/PortfolioPreview';
import FinalCTA from '../components/landing/FinalCTA';

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main>
        <HeroSection />
        <TrustStrip />
        <ProblemSection />
        <EcosystemRoles />
        <SkillJourney />
        <CollaborationSection />
        <OpportunityDiscovery />
        <PortfolioPreview />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
