import { Card } from "@/components/ui/card";
import { Star, Quote } from "lucide-react";

const Testimonials = () => {
  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Digital Nomad",
      image: "https://images.unsplash.com/photo-1494790108755-2616b2c4c1e4?w=64&h=64&fit=crop&crop=face",
      content: "Travel Genie planned my 3-week European trip better than any travel agent could. The AI suggestions were spot-on and saved me hours of research.",
      rating: 5
    },
    {
      name: "Michael Chen",
      role: "Family Traveler",
      image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=64&h=64&fit=crop&crop=face",
      content: "Planning a family vacation with kids used to be a nightmare. Now it's actually fun! The collaborative features let everyone contribute ideas.",
      rating: 5
    },
    {
      name: "Emma Rodriguez",
      role: "Adventure Seeker",
      image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=64&h=64&fit=crop&crop=face",
      content: "Found hidden gems in Tokyo I never would have discovered otherwise. The local insights and real-time updates were game-changers.",
      rating: 5
    }
  ];

  return (
    <section className="py-20 bg-gradient-to-b from-gray-50 to-purple-100/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
            Loved by <span className="bg-gradient-to-r from-[#5E25F1] to-[#4B1EC7] bg-clip-text text-transparent">Travelers</span> Worldwide
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Join thousands of happy travelers who've discovered the magic of AI-powered trip planning.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card 
              key={index} 
              className="p-6 hover:shadow-lg transition-all duration-300 hover:scale-105 bg-white/50 border-purple-300/50 relative overflow-hidden"
            >
              {/* Quote icon */}
              <Quote className="absolute top-4 right-4 w-8 h-8 text-purple-500/20" />
              
              {/* Rating */}
              <div className="flex items-center mb-4">
                {[...Array(testimonial.rating)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-purple-500 fill-current" />
                ))}
              </div>

              {/* Content */}
              <p className="text-gray-800 mb-6 leading-relaxed italic">
                "{testimonial.content}"
              </p>

              {/* User info */}
              <div className="flex items-center">
                <img 
                  src={testimonial.image} 
                  alt={testimonial.name}
                  className="w-12 h-12 rounded-full object-cover mr-4"
                />
                <div>
                  <h4 className="font-semibold text-gray-800">{testimonial.name}</h4>
                  <p className="text-sm text-gray-600">{testimonial.role}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* CTA Section */}
        <div className="text-center mt-16">
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl p-8 md:p-12 text-white">
            <h3 className="text-3xl font-bold text-white mb-4">Ready to Plan Your Next Adventure?</h3>
            <p className="text-xl text-white/90 mb-8">
              Join over 1 million travelers who trust Travel Genie for their perfect trips.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button className="bg-purple-500 text-white font-semibold px-8 py-3 rounded-lg hover:bg-purple-600 transition-colors">
                Start Planning Free
              </button>
              <button className="border border-purple-300/30 text-white px-8 py-3 rounded-lg hover:bg-purple-100/20 transition-colors">
                View Pricing
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;