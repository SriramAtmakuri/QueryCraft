import { Button } from "@/components/ui/button";
import { Database, Home, Wrench } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <header className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <Database className="w-6 h-6 text-primary" />
            <span className="text-xl font-bold">QueryCraft</span>
          </div>

          <nav className="flex items-center gap-2">
            <Button
              variant={location.pathname === '/' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/')}
            >
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
            <Button
              variant={location.pathname === '/builder' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => navigate('/builder')}
            >
              <Wrench className="w-4 h-4 mr-2" />
              Builder
            </Button>
          </nav>
        </div>
      </div>
    </header>
  );
};
