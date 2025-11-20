import { Button } from "@/components/ui/button";
import { ArrowRight, Database, Sparkles, Code2, Zap, FileCode } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";

const Index = () => {
  const navigate = useNavigate();

  const handleFeatureClick = (feature: string) => {
    switch (feature) {
      case 'ai':
        navigate('/builder');
        break;
      case 'visual':
        navigate('/builder?tab=visual');
        break;
      case 'schema':
        navigate('/builder?tab=schema');
        break;
      case 'export':
        navigate('/builder?output=export');
        break;
      default:
        navigate('/builder');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <div className="container mx-auto px-4 py-20">
        <div className="text-center space-y-6 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary">AI-Powered Query Builder</span>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
            QueryCraft
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">
            Transform natural language into optimized SQL queries with AI-powered visual builder
          </p>

          <div className="flex gap-4 justify-center pt-4">
            <Button
              size="lg"
              onClick={() => navigate('/builder')}
              className="gap-2"
            >
              Start Building
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => handleFeatureClick('visual')}
            >
              Visual Builder
            </Button>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-6 mt-20">
          <FeatureCard
            icon={<Sparkles className="w-6 h-6" />}
            title="AI Query Generation"
            description="Type in plain English and watch AI generate optimized SQL queries instantly"
            onClick={() => handleFeatureClick('ai')}
          />
          <FeatureCard
            icon={<Database className="w-6 h-6" />}
            title="Visual Builder"
            description="Drag-and-drop interface to build and modify queries with tables, joins, and filters"
            onClick={() => handleFeatureClick('visual')}
          />
          <FeatureCard
            icon={<Code2 className="w-6 h-6" />}
            title="Multi-Database"
            description="Support for PostgreSQL, MySQL, SQLite, and MongoDB with dialect translation"
            onClick={() => handleFeatureClick('ai')}
          />
          <FeatureCard
            icon={<Zap className="w-6 h-6" />}
            title="Query Optimization"
            description="AI-powered performance analysis and optimization suggestions"
            onClick={() => handleFeatureClick('ai')}
          />
          <FeatureCard
            icon={<FileCode className="w-6 h-6" />}
            title="Export Options"
            description="Generate queries for Prisma, TypeORM, Sequelize, and raw SQL"
            onClick={() => handleFeatureClick('export')}
          />
          <FeatureCard
            icon={<Database className="w-6 h-6" />}
            title="Schema Visualizer"
            description="Auto-generate ER diagrams from your database connections"
            onClick={() => handleFeatureClick('schema')}
          />
        </div>
      </div>
    </div>
  );
};

const FeatureCard = ({
  icon,
  title,
  description,
  onClick
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onClick: () => void;
}) => (
  <div
    onClick={onClick}
    className="p-6 rounded-lg border border-border bg-card hover:border-primary/50 transition-all hover:shadow-lg hover:shadow-primary/5 cursor-pointer"
  >
    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary mb-4">
      {icon}
    </div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-sm text-muted-foreground">{description}</p>
  </div>
);

export default Index;
