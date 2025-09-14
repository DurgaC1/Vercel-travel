import { Card } from "@/components/ui/card";
import { Bot, MapPin, Calendar, DollarSign, Users, Zap } from "lucide-react";
import aiFeatures from "@/assets/ai-features.jpg";

const Features = () => {
  const features = [
    {
      icon: Bot,
      title: "AI Itinerary Builder",
      description: "Get personalized day-by-day plans based on your interests, budget, and travel style.",
      color: "from-purple-500 to-purple-600"
    },
    {
      icon: MapPin,
      title: "Smart Recommendations", 
      description: "Discover hidden gems and local favorites powered by real-time data and reviews.",
      color: "from-purple-500 to-purple-600"
    },
    {
      icon: Calendar,
      title: "Trip Organization",
      description: "Drag-and-drop itinerary builder with real-time collaboration and sync across devices.",
      color: "from-purple-500 to-purple-600"
    },
    {
      icon: DollarSign,
      title: "Budget Optimization",
      description: "Find the best deals on flights, hotels, and activities while staying within budget.",
      color: "from-purple-500 to-purple-600"
    },
    {
      icon: Users,
      title: "Collaborative Planning",
      description: "Invite friends and family to co-plan your trip with real-time updates and voting.",
      color: "from-purple-500 to-purple-600"
    },
    {
      icon: Zap,
      title: "Real-time Updates",
      description: "Live weather, traffic, and crowd data to optimize your travel experience.",
      color: "from-purple-500 to-purple-600"
    }
  ];

  return (
    <section className="py-20 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
            Why Choose <span className="bg-gradient-to-r from-[#5E25F1] to-[#4B1EC7] bg-clip-text text-transparent">Travel Genie</span>?
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Experience the future of travel planning with AI-powered insights, 
            smart recommendations, and seamless booking all in one platform.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card 
                key={index} 
                className="p-6 hover:shadow-lg transition-all duration-300 hover:scale-105 bg-white/50 border-purple-300/50"
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-r ${feature.color} flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-600 leading-relaxed">
                  {feature.description}
                </p>
              </Card>
            );
          })}
        </div>

        {/* Feature Showcase */}
        <div className="bg-gradient-to-r from-purple-500/10 to-purple-600/10 rounded-2xl p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-3xl font-bold text-gray-800 mb-6">
                See AI Planning in Action
              </h3>
              <p className="text-lg text-gray-600 mb-6">
                Our advanced AI analyzes millions of travel data points to create 
                the perfect itinerary for your unique preferences and constraints.
              </p>
              <ul className="space-y-3 text-gray-800">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                  Personalized recommendations based on your interests
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                  Real-time optimization for weather and events
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mr-3"></div>
                  Budget-conscious planning with smart alternatives
                </li>
              </ul>
            </div>
            <div className="relative">
              <img 
                src={aiFeatures} 
                alt="AI travel planning interface" 
                className="w-full rounded-xl shadow-lg"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-50/20 to-transparent rounded-xl"></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Features;