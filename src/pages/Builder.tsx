import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Play, Copy, Download, History, Database as DatabaseIcon, RefreshCw, MessageSquare, Zap, ArrowRightLeft } from "lucide-react";
import { toast } from "sonner";
import { SchemaVisualizer } from "@/components/SchemaVisualizer";
import { VisualQueryBuilder } from "@/components/VisualQueryBuilder";
import { SchemaUploader } from "@/components/SchemaUploader";
import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { useSchema } from "@/context/SchemaContext";

const Builder = () => {
  const [query, setQuery] = useState("");
  const [generatedSQL, setGeneratedSQL] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [dialect, setDialect] = useState("postgresql");
  const [explanation, setExplanation] = useState("");
  const [isExplaining, setIsExplaining] = useState(false);
  const [convertDialect, setConvertDialect] = useState("mysql");
  const [isConverting, setIsConverting] = useState(false);
  const [optimization, setOptimization] = useState("");
  const [isOptimizing, setIsOptimizing] = useState(false);

  const { schemaText } = useSchema();

  const handleGenerate = async () => {
    if (!query.trim()) {
      toast.error("Please enter a query description");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await api.generateSQL(query, schemaText, dialect);
      setGeneratedSQL(result.sql);
      toast.success("Query generated successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate SQL");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExplain = async () => {
    if (!generatedSQL) {
      toast.error("No SQL query to explain");
      return;
    }

    setIsExplaining(true);
    try {
      const result = await api.explainSQL(generatedSQL);
      setExplanation(result.explanation);
      toast.success("Explanation generated!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to explain SQL");
    } finally {
      setIsExplaining(false);
    }
  };

  const handleConvert = async () => {
    if (!generatedSQL) {
      toast.error("No SQL query to convert");
      return;
    }

    setIsConverting(true);
    try {
      const result = await api.convertSQL(generatedSQL, dialect, convertDialect);
      setGeneratedSQL(result.sql);
      setDialect(convertDialect);
      toast.success(`Converted to ${convertDialect.toUpperCase()}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to convert SQL");
    } finally {
      setIsConverting(false);
    }
  };

  const handleOptimize = async () => {
    if (!generatedSQL) {
      toast.error("No SQL query to optimize");
      return;
    }

    setIsOptimizing(true);
    try {
      const result = await api.optimizeSQL(generatedSQL, schemaText);
      setOptimization(result.optimization);
      toast.success("Optimization analysis complete!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to optimize SQL");
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedSQL);
    toast.success("SQL copied to clipboard");
  };

  const handleDownload = () => {
    const blob = new Blob([generatedSQL], { type: 'text/sql' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'query.sql';
    a.click();
    URL.revokeObjectURL(url);
    toast.success("SQL file downloaded");
  };

  const handleExampleClick = (text: string) => {
    setQuery(text);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

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
                      <div className="flex items-center gap-2">
                        <Select value={dialect} onValueChange={setDialect}>
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="postgresql">PostgreSQL</SelectItem>
                            <SelectItem value="mysql">MySQL</SelectItem>
                            <SelectItem value="sqlite">SQLite</SelectItem>
                            <SelectItem value="sqlserver">SQL Server</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="sm">
                          <History className="w-4 h-4 mr-2" />
                          History
                        </Button>
                      </div>
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
                        <>
                          <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                          Generating...
                        </>
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
                    <ExampleQuery
                      text="Find all customers who haven't ordered in 90 days"
                      onClick={() => handleExampleClick("Find all customers who haven't ordered in 90 days")}
                    />
                    <ExampleQuery
                      text="Show top 10 products by revenue this month"
                      onClick={() => handleExampleClick("Show top 10 products by revenue this month")}
                    />
                    <ExampleQuery
                      text="List users with more than 5 orders"
                      onClick={() => handleExampleClick("List users with more than 5 orders")}
                    />
                  </div>
                </Card>
              </div>

              {/* Output Section */}
              <div className="space-y-4">
                <Card className="p-6">
                  <Tabs defaultValue="sql" className="w-full">
                    <TabsList className="w-full">
                      <TabsTrigger value="sql" className="flex-1">SQL</TabsTrigger>
                      <TabsTrigger value="explain" className="flex-1">Explain</TabsTrigger>
                      <TabsTrigger value="optimize" className="flex-1">Optimize</TabsTrigger>
                      <TabsTrigger value="convert" className="flex-1">Convert</TabsTrigger>
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
                            onClick={handleDownload}
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

                    <TabsContent value="explain" className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Query Explanation</h2>
                        <Button
                          onClick={handleExplain}
                          disabled={!generatedSQL || isExplaining}
                          size="sm"
                        >
                          {isExplaining ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <MessageSquare className="w-4 h-4 mr-2" />
                              Explain
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="code-bg rounded-lg p-4 min-h-[300px] overflow-auto">
                        {explanation ? (
                          <div className="text-sm text-foreground whitespace-pre-wrap">
                            {explanation}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                            Click "Explain" to get a plain English explanation of your query
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="optimize" className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Query Optimization</h2>
                        <Button
                          onClick={handleOptimize}
                          disabled={!generatedSQL || isOptimizing}
                          size="sm"
                        >
                          {isOptimizing ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <Zap className="w-4 h-4 mr-2" />
                              Optimize
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="code-bg rounded-lg p-4 min-h-[300px] overflow-auto">
                        {optimization ? (
                          <div className="text-sm text-foreground whitespace-pre-wrap">
                            {optimization}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                            Click "Optimize" to get performance suggestions and index recommendations
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="convert" className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Dialect Conversion</h2>
                        <div className="flex items-center gap-2">
                          <Select value={convertDialect} onValueChange={setConvertDialect}>
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="postgresql">PostgreSQL</SelectItem>
                              <SelectItem value="mysql">MySQL</SelectItem>
                              <SelectItem value="sqlite">SQLite</SelectItem>
                              <SelectItem value="sqlserver">SQL Server</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            onClick={handleConvert}
                            disabled={!generatedSQL || isConverting}
                            size="sm"
                          >
                            {isConverting ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <ArrowRightLeft className="w-4 h-4 mr-2" />
                                Convert
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="code-bg rounded-lg p-4 min-h-[300px] overflow-auto">
                        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                          Select a target dialect and click "Convert" to translate your SQL
                        </div>
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

const ExampleQuery = ({ text, onClick }: { text: string; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="w-full text-left p-3 rounded-md bg-muted hover:bg-muted/70 transition-colors text-sm"
  >
    {text}
  </button>
);

export default Builder;
