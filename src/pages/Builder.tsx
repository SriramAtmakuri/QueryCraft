import { useState, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Play, Copy, Download, Database as DatabaseIcon, RefreshCw, MessageSquare, Zap, ArrowRightLeft, Table as TableIcon, FileCode, Wand2, GitCompare, MoreHorizontal, Bug, Activity, Layers } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { SchemaVisualizer } from "@/components/SchemaVisualizer";
import { VisualQueryBuilder } from "@/components/VisualQueryBuilder";
import { SchemaUploader } from "@/components/SchemaUploader";
import { SampleDataUploader } from "@/components/SampleDataUploader";
import { QueryPanel } from "@/components/QueryPanel";
import { SQLDiff } from "@/components/SQLDiff";
import { PerformanceAnalyzer } from "@/components/PerformanceAnalyzer";
import { SQLDebugger } from "@/components/SQLDebugger";
import { SchemaGenerator } from "@/components/SchemaGenerator";
import { ImageSchemaUploader } from "@/components/ImageSchemaUploader";
import { QueryShare } from "@/components/QueryShare";
import { SQLHighlighter } from "@/components/SQLHighlighter";
import { SQLLinter } from "@/components/SQLLinter";
import { MultiQueryPanel } from "@/components/MultiQueryPanel";
import { QuerySuggestions } from "@/components/QuerySuggestions";
import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { useSchema } from "@/context/SchemaContext";
import { useSearchParams } from "react-router-dom";
import { addToHistory, formatSQL } from "@/lib/queryManager";

const Builder = () => {
  const [searchParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [generatedSQL, setGeneratedSQL] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [dialect, setDialect] = useState("postgresql");
  const [explanation, setExplanation] = useState<{
    summary?: string;
    sections?: { title: string; explanation: string; columns?: string[] }[];
    result?: string;
    tips?: string[];
  } | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);
  const [convertDialect, setConvertDialect] = useState("mysql");
  const [isConverting, setIsConverting] = useState(false);
  const [convertedSQL, setConvertedSQL] = useState("");
  const [optimization, setOptimization] = useState<{
    optimizedQuery?: string;
    improvements?: { type: string; description: string; impact: string }[];
    indexes?: { table: string; columns: string[]; sql: string; reason: string }[];
    tips?: string[];
    summary?: string;
  } | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [activeTab, setActiveTab] = useState("natural");
  const [mockResults, setMockResults] = useState<{ columns: string[]; rows: string[][] } | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [outputTab, setOutputTab] = useState("sql");
  const [exportORM, setExportORM] = useState("prisma");
  const [exportedCode, setExportedCode] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [showDiff, setShowDiff] = useState(true);
  const [multiQueryMode, setMultiQueryMode] = useState(false);
  const [multiQueries, setMultiQueries] = useState<{ description: string; sql: string; order: number; dependencies: number[] }[]>([]);
  const [expandedSection, setExpandedSection] = useState<{ title: string; explanation: string; columns?: string[] } | null>(null);

  const { schemaText, setSchemaText } = useSchema();

  // Handle URL tab parameter and shared queries
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['natural', 'visual', 'schema'].includes(tab)) {
      setActiveTab(tab);
    }
    const output = searchParams.get('output');
    if (output && ['sql', 'results', 'explain', 'optimize', 'convert', 'export', 'performance', 'debug'].includes(output)) {
      setOutputTab(output);
    }

    // Handle shared query from URL
    const shared = searchParams.get('shared');
    if (shared) {
      try {
        const data = JSON.parse(atob(shared));
        if (data.sql) {
          setQuery(data.query || '');
          setGeneratedSQL(data.sql);
          setDialect(data.dialect || 'postgresql');
          if (data.schema) setSchemaText(data.schema);
          toast.success('Shared query loaded');
        }
      } catch {
        toast.error('Invalid shared query link');
      }
    }
  }, [searchParams, setSchemaText]);

  // Handle imported queries
  useEffect(() => {
    const handleLoadSharedQuery = (e: CustomEvent) => {
      const data = e.detail;
      setQuery(data.query || '');
      setGeneratedSQL(data.sql);
      setDialect(data.dialect || 'postgresql');
      if (data.schema) setSchemaText(data.schema);
    };

    window.addEventListener('loadSharedQuery', handleLoadSharedQuery as EventListener);
    return () => window.removeEventListener('loadSharedQuery', handleLoadSharedQuery as EventListener);
  }, [setSchemaText]);

  const handleGenerate = async () => {
    if (!query.trim()) {
      toast.error("Please enter a query description");
      return;
    }

    setIsGenerating(true);
    try {
      if (multiQueryMode) {
        const result = await api.generateMultiSQL(query, schemaText, dialect);
        setMultiQueries(result.queries);
        // Combine all queries for the main display
        const combined = result.queries
          .sort((a: { order: number }, b: { order: number }) => a.order - b.order)
          .map((q: { sql: string }) => q.sql)
          .join(';\n\n');
        setGeneratedSQL(combined);
        addToHistory(query, combined, dialect);
        toast.success(`${result.queries.length} queries generated!`);
      } else {
        const result = await api.generateSQL(query, schemaText, dialect);
        setGeneratedSQL(result.sql);
        setMultiQueries([]);
        addToHistory(query, result.sql, dialect);
        toast.success("Query generated successfully!");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate SQL");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleFormat = () => {
    if (!generatedSQL) {
      toast.error("No SQL to format");
      return;
    }
    const formatted = formatSQL(generatedSQL);
    setGeneratedSQL(formatted);
    toast.success("SQL formatted");
  };

  const handleLoadFromHistory = (prompt: string) => {
    setQuery(prompt);
  };

  const handleLoadSQLFromHistory = (sql: string) => {
    setGeneratedSQL(sql);
  };

  const handleExplain = async () => {
    if (!generatedSQL) {
      toast.error("No SQL query to explain");
      return;
    }

    setIsExplaining(true);
    try {
      const result = await api.explainSQL(generatedSQL);
      // Result is already structured JSON from backend
      setExplanation(result);
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
      setConvertedSQL(result.sql);
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
      // Result is already structured JSON from backend
      setOptimization(result);
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

  const handleRun = async () => {
    if (!generatedSQL) {
      toast.error("No SQL query to run");
      return;
    }

    setIsRunning(true);
    try {
      const result = await api.getMockResults(generatedSQL);
      setMockResults(result);
      setOutputTab("results");
      toast.success("Mock results generated!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate mock results");
    } finally {
      setIsRunning(false);
    }
  };

  const handleExport = async () => {
    if (!generatedSQL) {
      toast.error("No SQL query to export");
      return;
    }

    setIsExporting(true);
    try {
      const result = await api.exportORM(generatedSQL, exportORM);
      setExportedCode(result.code);
      toast.success(`Exported to ${exportORM.charAt(0).toUpperCase() + exportORM.slice(1)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to export to ORM");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExampleClick = (text: string) => {
    setQuery(text);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-2xl font-bold">QueryCraft Builder</h1>
            <TabsList>
              <TabsTrigger value="natural" className="text-xs">Natural Language</TabsTrigger>
              <TabsTrigger value="visual" className="text-xs">Visual Builder</TabsTrigger>
              <TabsTrigger value="schema" className="text-xs">Schema</TabsTrigger>
            </TabsList>
          </div>

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
                        <QueryPanel
                          onSelectQuery={handleLoadFromHistory}
                          onSelectSQL={handleLoadSQLFromHistory}
                        />
                        <QueryShare
                          query={query}
                          sql={generatedSQL}
                          dialect={dialect}
                          schema={schemaText}
                        />
                      </div>
                    </div>

                    <div className="relative">
                      <Textarea
                        placeholder="Describe your query in plain English...&#10;&#10;Example: Show me all users who signed up last month and made a purchase over $100"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="min-h-[200px] font-mono"
                      />
                      <QuerySuggestions
                        query={query}
                        schema={schemaText}
                        onSelect={(suggestion) => setQuery(suggestion)}
                      />
                    </div>

                    <div className="flex items-center gap-3">
                      <Button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="flex-1"
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
                            {multiQueryMode ? 'Generate Multi-Query' : 'Generate SQL'}
                          </>
                        )}
                      </Button>
                      <Button
                        variant={multiQueryMode ? "secondary" : "outline"}
                        size="lg"
                        onClick={() => setMultiQueryMode(!multiQueryMode)}
                        title="Toggle multi-query mode for complex operations"
                      >
                        <Layers className="w-4 h-4" />
                      </Button>
                    </div>
                    {multiQueryMode && (
                      <p className="text-xs text-muted-foreground text-center">
                        Multi-query mode: Generate multiple related SQL statements
                      </p>
                    )}
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

                <SampleDataUploader />
              </div>

              {/* Output Section */}
              <div className="space-y-4">
                <Card className="p-6">
                  <Tabs value={outputTab} onValueChange={setOutputTab} className="w-full">
                    <div className="flex items-center gap-2 mb-4">
                      <TabsList className="flex-1 grid grid-cols-4">
                        <TabsTrigger value="sql" className="text-xs px-4 border-r border-border">SQL</TabsTrigger>
                        <TabsTrigger value="results" className="text-xs px-4 border-r border-border">Results</TabsTrigger>
                        <TabsTrigger value="explain" className="text-xs px-4 border-r border-border">Explain</TabsTrigger>
                        <TabsTrigger value="optimize" className="text-xs px-4">Optimize</TabsTrigger>
                      </TabsList>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8">
                            <MoreHorizontal className="w-4 h-4 mr-1" />
                            More
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setOutputTab("convert")}>
                            <ArrowRightLeft className="w-4 h-4 mr-2" />
                            Convert Dialect
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setOutputTab("export")}>
                            <FileCode className="w-4 h-4 mr-2" />
                            Export to ORM
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setOutputTab("performance")}>
                            <Activity className="w-4 h-4 mr-2" />
                            Performance Analysis
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setOutputTab("debug")}>
                            <Bug className="w-4 h-4 mr-2" />
                            Debug Query
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <TabsContent value="sql" className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Generated Query</h2>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleFormat}
                            disabled={!generatedSQL}
                            title="Format SQL"
                          >
                            <Wand2 className="w-4 h-4" />
                          </Button>
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
                            onClick={handleRun}
                            disabled={!generatedSQL || isRunning}
                          >
                            {isRunning ? (
                              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            ) : (
                              <Play className="w-4 h-4 mr-2" />
                            )}
                            Run
                          </Button>
                        </div>
                      </div>

                      <div className="code-bg rounded-lg p-4 min-h-[300px] overflow-auto">
                        {generatedSQL ? (
                          <SQLHighlighter code={generatedSQL} className="text-sm" />
                        ) : (
                          <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                            Your generated SQL will appear here
                          </div>
                        )}
                      </div>

                      {/* Multi-Query Panel */}
                      {multiQueries.length > 0 && (
                        <MultiQueryPanel
                          queries={multiQueries}
                          onRunQuery={(sql) => {
                            setGeneratedSQL(sql);
                            setMultiQueries([]);
                          }}
                          onSelectAll={(combined) => {
                            setGeneratedSQL(combined);
                          }}
                        />
                      )}

                      {/* SQL Linting */}
                      {generatedSQL && (
                        <Card className="p-3">
                          <h3 className="text-sm font-semibold mb-2">SQL Analysis</h3>
                          <SQLLinter sql={generatedSQL} />
                        </Card>
                      )}
                    </TabsContent>

                    <TabsContent value="results" className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Query Results (Mock Data)</h2>
                        <Button
                          onClick={handleRun}
                          disabled={!generatedSQL || isRunning}
                          size="sm"
                        >
                          {isRunning ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <>
                              <TableIcon className="w-4 h-4 mr-2" />
                              Generate Results
                            </>
                          )}
                        </Button>
                      </div>

                      <div className="rounded-lg border border-border min-h-[300px] overflow-auto">
                        {mockResults ? (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                {mockResults.columns.map((col, idx) => (
                                  <TableHead key={idx} className="font-semibold">
                                    {col}
                                  </TableHead>
                                ))}
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {mockResults.rows.map((row, rowIdx) => (
                                <TableRow key={rowIdx}>
                                  {row.map((cell, cellIdx) => (
                                    <TableCell key={cellIdx} className="font-mono text-sm">
                                      {cell}
                                    </TableCell>
                                  ))}
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                            <TableIcon className="w-12 h-12 mb-4 opacity-50" />
                            <p>Click "Run" or "Generate Results" to see mock data</p>
                            <p className="text-xs mt-2">AI will generate realistic sample data based on your query</p>
                          </div>
                        )}
                      </div>

                      {mockResults && (
                        <p className="text-xs text-muted-foreground text-center">
                          Showing {mockResults.rows.length} rows of AI-generated mock data
                        </p>
                      )}
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

                      <div className="min-h-[300px] overflow-auto">
                        {explanation ? (
                          <div className="space-y-4">
                            {/* Summary */}
                            {explanation.summary && (
                              <Card className="p-4 border-primary/30">
                                <h4 className="text-sm font-semibold mb-2">Summary</h4>
                                <p className="text-sm text-muted-foreground">{explanation.summary}</p>
                              </Card>
                            )}

                            {/* Sections */}
                            {explanation.sections && explanation.sections.length > 0 && (
                              <div className="space-y-3">
                                {explanation.sections.map((section, idx) => (
                                  <Card
                                    key={idx}
                                    className="p-4 cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => setExpandedSection(section)}
                                  >
                                    <h4 className="text-sm font-semibold mb-2">{section.title}</h4>
                                    <p className="text-sm text-muted-foreground line-clamp-2">
                                      {section.explanation}
                                    </p>
                                    {section.columns && section.columns.length > 0 && (
                                      <div className="mt-2 flex flex-wrap gap-1">
                                        {section.columns.slice(0, 3).map((col, colIdx) => (
                                          <span key={colIdx} className="text-xs px-2 py-1 bg-muted rounded">
                                            {col}
                                          </span>
                                        ))}
                                        {section.columns.length > 3 && (
                                          <span className="text-xs px-2 py-1 bg-muted rounded">
                                            +{section.columns.length - 3} more
                                          </span>
                                        )}
                                      </div>
                                    )}
                                    <p className="text-xs text-primary mt-2">Click to expand</p>
                                  </Card>
                                ))}
                              </div>
                            )}

                            {/* Result */}
                            {explanation.result && (
                              <Card className="p-4">
                                <h4 className="text-sm font-semibold mb-2">Expected Result</h4>
                                <p className="text-sm text-muted-foreground">{explanation.result}</p>
                              </Card>
                            )}

                            {/* Tips */}
                            {explanation.tips && explanation.tips.length > 0 && (
                              <Card className="p-4 border-yellow-500/30">
                                <h4 className="text-sm font-semibold mb-2">Tips</h4>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                  {explanation.tips.map((tip, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                      <span className="text-yellow-500">•</span>
                                      {tip}
                                    </li>
                                  ))}
                                </ul>
                              </Card>
                            )}
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
                        <div className="flex items-center gap-2">
                          {optimization?.optimizedQuery && (
                            <Button
                              variant={showDiff ? "secondary" : "ghost"}
                              size="sm"
                              onClick={() => setShowDiff(!showDiff)}
                              title="Toggle Diff View"
                            >
                              <GitCompare className="w-4 h-4" />
                            </Button>
                          )}
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
                      </div>

                      <div className="min-h-[300px] overflow-auto">
                        {optimization ? (
                          <div className="space-y-4">
                            {/* Summary */}
                            {optimization.summary && (
                              <Card className="p-4 border-primary/30">
                                <h4 className="text-sm font-semibold mb-2">Summary</h4>
                                <p className="text-sm text-muted-foreground">{optimization.summary}</p>
                              </Card>
                            )}

                            {/* Optimized Query */}
                            {optimization.optimizedQuery && (
                              <Card className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-sm font-semibold">Optimized Query</h4>
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    onClick={() => {
                                      setGeneratedSQL(optimization.optimizedQuery!);
                                      toast.success("Optimized query applied");
                                    }}
                                  >
                                    Use Optimized
                                  </Button>
                                </div>
                                {showDiff ? (
                                  <SQLDiff
                                    original={generatedSQL}
                                    modified={optimization.optimizedQuery}
                                    originalLabel="Original"
                                    modifiedLabel="Optimized"
                                  />
                                ) : (
                                  <div className="code-bg rounded p-3">
                                    <SQLHighlighter code={optimization.optimizedQuery} className="text-xs" />
                                  </div>
                                )}
                              </Card>
                            )}

                            {/* Improvements */}
                            {optimization.improvements && optimization.improvements.length > 0 && (
                              <Card className="p-4">
                                <h4 className="text-sm font-semibold mb-3">Improvements</h4>
                                <div className="space-y-2">
                                  {optimization.improvements.map((imp, idx) => (
                                    <div key={idx} className="flex items-start gap-2">
                                      <span className={`text-xs px-2 py-0.5 rounded ${
                                        imp.impact === 'high' ? 'bg-green-500/20 text-green-400' :
                                        imp.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                        'bg-muted text-muted-foreground'
                                      }`}>
                                        {imp.type}
                                      </span>
                                      <p className="text-sm text-muted-foreground flex-1">{imp.description}</p>
                                    </div>
                                  ))}
                                </div>
                              </Card>
                            )}

                            {/* Suggested Indexes */}
                            {optimization.indexes && optimization.indexes.length > 0 && (
                              <Card className="p-4">
                                <h4 className="text-sm font-semibold mb-3">Suggested Indexes</h4>
                                <div className="space-y-3">
                                  {optimization.indexes.map((index, idx) => (
                                    <div key={idx} className="border-l-2 border-primary/50 pl-3">
                                      <p className="text-sm font-medium">{index.table} ({index.columns.join(', ')})</p>
                                      <p className="text-xs text-muted-foreground mb-2">{index.reason}</p>
                                      <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">{index.sql}</pre>
                                    </div>
                                  ))}
                                </div>
                              </Card>
                            )}

                            {/* Tips */}
                            {optimization.tips && optimization.tips.length > 0 && (
                              <Card className="p-4 border-yellow-500/30">
                                <h4 className="text-sm font-semibold mb-2">Performance Tips</h4>
                                <ul className="text-sm text-muted-foreground space-y-1">
                                  {optimization.tips.map((tip, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                      <span className="text-yellow-500">•</span>
                                      {tip}
                                    </li>
                                  ))}
                                </ul>
                              </Card>
                            )}
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
                          {convertedSQL && (
                            <Button
                              variant={showDiff ? "secondary" : "ghost"}
                              size="sm"
                              onClick={() => setShowDiff(!showDiff)}
                              title="Toggle Diff View"
                            >
                              <GitCompare className="w-4 h-4" />
                            </Button>
                          )}
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

                      {showDiff && convertedSQL && generatedSQL ? (
                        <SQLDiff
                          original={generatedSQL}
                          modified={convertedSQL}
                          originalLabel={`Original (${dialect})`}
                          modifiedLabel={`Converted (${convertDialect})`}
                        />
                      ) : (
                        <div className="code-bg rounded-lg p-4 min-h-[300px] overflow-auto">
                          {convertedSQL ? (
                            <SQLHighlighter code={convertedSQL} className="text-sm" />
                          ) : (
                            <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                              Select a target dialect and click "Convert" to translate your SQL
                            </div>
                          )}
                        </div>
                      )}
                    </TabsContent>

                    <TabsContent value="export" className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold">Export to ORM</h2>
                        <div className="flex items-center gap-2">
                          <Select value={exportORM} onValueChange={setExportORM}>
                            <SelectTrigger className="w-32 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="prisma">Prisma</SelectItem>
                              <SelectItem value="typeorm">TypeORM</SelectItem>
                              <SelectItem value="sequelize">Sequelize</SelectItem>
                              <SelectItem value="drizzle">Drizzle</SelectItem>
                              <SelectItem value="knex">Knex.js</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            onClick={handleExport}
                            disabled={!generatedSQL || isExporting}
                            size="sm"
                          >
                            {isExporting ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <FileCode className="w-4 h-4 mr-2" />
                                Export
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="code-bg rounded-lg p-4 min-h-[300px] overflow-auto">
                        {exportedCode ? (
                          <pre className="text-sm font-mono text-foreground">
                            <code>{exportedCode}</code>
                          </pre>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground">
                            <FileCode className="w-12 h-12 mb-4 opacity-50" />
                            <p>Select an ORM and click "Export" to generate code</p>
                            <p className="text-xs mt-2">Supports Prisma, TypeORM, Sequelize, Drizzle, and Knex.js</p>
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    <TabsContent value="performance" className="space-y-4">
                      <PerformanceAnalyzer sql={generatedSQL} schema={schemaText} />
                    </TabsContent>

                    <TabsContent value="debug" className="space-y-4">
                      <SQLDebugger
                        sql={generatedSQL}
                        schema={schemaText}
                        onApplyFix={(sql) => setGeneratedSQL(sql)}
                      />
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
              <div className="grid md:grid-cols-3 gap-4">
                <SchemaUploader />
                <SchemaGenerator />
                <ImageSchemaUploader />
              </div>
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

      {/* Expanded Section Modal */}
      <Dialog open={!!expandedSection} onOpenChange={(open) => !open && setExpandedSection(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{expandedSection?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {expandedSection?.explanation}
            </p>
            {expandedSection?.columns && expandedSection.columns.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2">Columns Involved</h4>
                <div className="flex flex-wrap gap-1">
                  {expandedSection.columns.map((col, idx) => (
                    <span key={idx} className="text-xs px-2 py-1 bg-muted rounded">
                      {col}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
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
