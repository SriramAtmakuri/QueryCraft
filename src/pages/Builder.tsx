import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Play, Copy, Download, History, Database as DatabaseIcon } from "lucide-react";
import { toast } from "sonner";
import { SchemaVisualizer } from "@/components/SchemaVisualizer";
import { VisualQueryBuilder } from "@/components/VisualQueryBuilder";
import { SchemaUploader } from "@/components/SchemaUploader";

const Builder = () => {
  const [query, setQuery] = useState("");
  const [generatedSQL, setGeneratedSQL] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!query.trim()) {
      toast.error("Please enter a query description");
      return;
    }

    setIsGenerating(true);
    // Simulate AI generation (will be replaced with actual AI integration)
    setTimeout(() => {
      const mockSQL = `SELECT users.id, users.name, users.email, orders.order_date, orders.total
FROM users
INNER JOIN orders ON users.id = orders.user_id
WHERE orders.order_date >= DATE_SUB(NOW(), INTERVAL 30 DAY)
  AND orders.total > 100
ORDER BY orders.order_date DESC;`;
      
      setGeneratedSQL(mockSQL);
      setIsGenerating(false);
      toast.success("Query generated successfully!");
    }, 1500);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedSQL);
    toast.success("SQL copied to clipboard");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">QueryCraft Builder</h1>
            <Tabs defaultValue="natural" className="w-auto">
              <TabsList>
                <TabsTrigger value="natural" className="text-xs">Natural Language</TabsTrigger>
                <TabsTrigger value="visual" className="text-xs">Visual Builder</TabsTrigger>
                <TabsTrigger value="schema" className="text-xs">Schema</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs defaultValue="natural" className="w-full">
          <TabsContent value="natural" className="mt-0">
            <div className="grid lg:grid-cols-2 gap-6">
          {/* Input Section */}
          <div className="space-y-4">
            <Card className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Natural Language Input
                  </h2>
                  <Button variant="ghost" size="sm">
                    <History className="w-4 h-4 mr-2" />
                    History
                  </Button>
                </div>
                
                <Textarea
                  placeholder="Describe your query in plain English...&#10;&#10;Example: Show me all users who signed up last month and made a purchase over $100"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="min-h-[200px] font-mono"
                />
                
                <Button 
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  className="w-full"
                  size="lg"
                >
                  {isGenerating ? (
                    <>Generating...</>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate SQL
                    </>
                  )}
                </Button>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-sm font-semibold mb-3">Quick Examples</h3>
              <div className="space-y-2">
                <ExampleQuery text="Find all customers who haven't ordered in 90 days" />
                <ExampleQuery text="Show top 10 products by revenue this month" />
                <ExampleQuery text="List users with more than 5 orders" />
              </div>
            </Card>
          </div>

          {/* Output Section */}
          <div className="space-y-4">
            <Card className="p-6">
              <Tabs defaultValue="sql" className="w-full">
                <TabsList className="w-full">
                  <TabsTrigger value="sql" className="flex-1">SQL</TabsTrigger>
                  <TabsTrigger value="visual" className="flex-1">Visual</TabsTrigger>
                  <TabsTrigger value="export" className="flex-1">Export</TabsTrigger>
                </TabsList>
                
                <TabsContent value="sql" className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Generated Query</h2>
                    <div className="flex gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={handleCopy}
                        disabled={!generatedSQL}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        disabled={!generatedSQL}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm"
                        disabled={!generatedSQL}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Run
                      </Button>
                    </div>
                  </div>
                  
                  <div className="code-bg rounded-lg p-4 min-h-[300px] overflow-auto">
                    {generatedSQL ? (
                      <pre className="text-sm font-mono text-foreground">
                        <code>{generatedSQL}</code>
                      </pre>
                    ) : (
                      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                        Your generated SQL will appear here
                      </div>
                    )}
                  </div>
                </TabsContent>
                
                <TabsContent value="visual">
                  <div className="flex items-center justify-center h-[400px] text-muted-foreground border-2 border-dashed border-border rounded-lg">
                    Visual Query Builder - Coming Soon
                  </div>
                </TabsContent>
                
                <TabsContent value="export">
                  <div className="space-y-3">
                    <ExportOption label="Prisma" description="Generate Prisma Client query" />
                    <ExportOption label="TypeORM" description="Generate TypeORM query" />
                    <ExportOption label="Sequelize" description="Generate Sequelize query" />
                    <ExportOption label="Raw SQL" description="Plain SQL query" />
                  </div>
                </TabsContent>
              </Tabs>
            </Card>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="visual" className="mt-0">
        <div className="space-y-6">
          <SchemaUploader />
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <DatabaseIcon className="w-5 h-5 text-primary" />
              Visual Query Builder
            </h2>
            <VisualQueryBuilder />
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="schema" className="mt-0">
        <div className="space-y-6">
          <SchemaUploader />
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <DatabaseIcon className="w-5 h-5 text-primary" />
              Database Schema Diagram
            </h2>
            <SchemaVisualizer />
          </Card>
        </div>
      </TabsContent>
    </Tabs>
      </div>
    </div>
  );
};

const ExampleQuery = ({ text }: { text: string }) => (
  <button className="w-full text-left p-3 rounded-md bg-muted hover:bg-muted/70 transition-colors text-sm">
    {text}
  </button>
);

const ExportOption = ({ label, description }: { label: string; description: string }) => (
  <div className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 transition-colors cursor-pointer">
    <div>
      <h4 className="font-medium">{label}</h4>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
    <Button variant="ghost" size="sm">
      <Download className="w-4 h-4" />
    </Button>
  </div>
);

export default Builder;
