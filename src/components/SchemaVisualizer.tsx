import { useMemo, useEffect, useState } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Database, Key, Link, Info, LayoutTemplate } from 'lucide-react';
import { useSchema } from '@/context/SchemaContext';
import { TableSchema } from '@/lib/sqlParser';
import { schemaTemplates, getColumnTypeDescription } from '@/lib/schemaTemplates';

const TableNode = ({ data }: { data: Record<string, unknown> }) => {
  const tableData = data as unknown as TableSchema;

  return (
    <TooltipProvider>
      <div className="bg-card border border-border rounded-lg shadow-lg min-w-[250px]">
        <div className="bg-primary/10 border-b border-border px-4 py-3 rounded-t-lg flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm flex-1">{tableData.name}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-[250px]">
              <p className="font-semibold mb-1">{tableData.name}</p>
              <p className="text-xs">{tableData.columns.length} columns</p>
              <p className="text-xs mt-1">
                {tableData.columns.filter(c => c.isPrimaryKey).length} primary key(s),{' '}
                {tableData.columns.filter(c => c.isForeignKey).length} foreign key(s)
              </p>
            </TooltipContent>
          </Tooltip>
        </div>
        <div className="p-2">
          {tableData.columns.map((col, idx) => (
            <Tooltip key={idx}>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted/50 rounded cursor-help">
                  {col.isPrimaryKey && <Key className="w-3 h-3 text-primary" />}
                  {col.isForeignKey && !col.isPrimaryKey && <Link className="w-3 h-3 text-accent" />}
                  {!col.isPrimaryKey && !col.isForeignKey && <span className="w-3" />}
                  <span className="flex-1 font-mono">{col.name}</span>
                  <span className="text-muted-foreground">{col.type}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-[300px]">
                <p className="font-semibold">{col.name}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Type: <span className="font-mono">{col.type}</span>
                </p>
                <p className="text-xs mt-1">{getColumnTypeDescription(col.type)}</p>
                {col.isPrimaryKey && (
                  <p className="text-xs text-primary mt-1">Primary Key - Uniquely identifies each row</p>
                )}
                {col.isForeignKey && (
                  <p className="text-xs text-accent mt-1">Foreign Key - References another table</p>
                )}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
};

const nodeTypes = {
  table: TableNode,
};

// Default schema for when no schema is loaded
const defaultSchema: TableSchema[] = [
  {
    name: 'users',
    columns: [
      { name: 'id', type: 'INTEGER', isPrimaryKey: true },
      { name: 'name', type: 'VARCHAR(255)' },
      { name: 'email', type: 'VARCHAR(255)' },
      { name: 'created_at', type: 'TIMESTAMP' },
    ],
  },
  {
    name: 'orders',
    columns: [
      { name: 'id', type: 'INTEGER', isPrimaryKey: true },
      { name: 'user_id', type: 'INTEGER', isForeignKey: true },
      { name: 'total', type: 'DECIMAL(10,2)' },
      { name: 'order_date', type: 'TIMESTAMP' },
    ],
  },
  {
    name: 'products',
    columns: [
      { name: 'id', type: 'INTEGER', isPrimaryKey: true },
      { name: 'name', type: 'VARCHAR(255)' },
      { name: 'price', type: 'DECIMAL(10,2)' },
      { name: 'category', type: 'VARCHAR(100)' },
    ],
  },
  {
    name: 'order_items',
    columns: [
      { name: 'id', type: 'INTEGER', isPrimaryKey: true },
      { name: 'order_id', type: 'INTEGER', isForeignKey: true },
      { name: 'product_id', type: 'INTEGER', isForeignKey: true },
      { name: 'quantity', type: 'INTEGER' },
    ],
  },
];

export const SchemaVisualizer = () => {
  const { schema, setSchema } = useSchema();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  // Use parsed schema if available, otherwise use default
  const tables = schema.tables.length > 0 ? schema.tables : defaultSchema;
  const relationships = schema.relationships;

  const handleTemplateSelect = (templateId: string) => {
    const template = schemaTemplates.find(t => t.id === templateId);
    if (template) {
      setSchema({
        tables: template.tables,
        relationships: template.relationships,
      });
      setSelectedTemplate(templateId);
    }
  };

  const computedNodes: Node[] = useMemo(() => {
    const cols = Math.ceil(Math.sqrt(tables.length));
    return tables.map((table, idx) => ({
      id: table.name,
      type: 'table',
      position: {
        x: (idx % cols) * 350 + 50,
        y: Math.floor(idx / cols) * 280 + 50
      },
      data: { ...table } as Record<string, unknown>,
    }));
  }, [tables]);

  const computedEdges: Edge[] = useMemo(() => {
    if (relationships.length > 0) {
      return relationships.map((rel, idx) => ({
        id: `${rel.fromTable}-${rel.toTable}-${idx}`,
        source: rel.toTable,
        target: rel.fromTable,
        markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' },
        style: { stroke: 'hsl(var(--primary))' },
        label: `${rel.fromColumn} → ${rel.toColumn}`,
        labelStyle: { fontSize: 10, fill: 'hsl(var(--muted-foreground))' },
      }));
    }

    // Default relationships for demo
    return [
      {
        id: 'users-orders',
        source: 'users',
        target: 'orders',
        markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' },
        style: { stroke: 'hsl(var(--primary))' },
      },
      {
        id: 'orders-order_items',
        source: 'orders',
        target: 'order_items',
        markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' },
        style: { stroke: 'hsl(var(--primary))' },
      },
      {
        id: 'products-order_items',
        source: 'products',
        target: 'order_items',
        markerEnd: { type: MarkerType.ArrowClosed, color: 'hsl(var(--primary))' },
        style: { stroke: 'hsl(var(--primary))' },
      },
    ];
  }, [relationships]);

  const [nodes, setNodes, onNodesChange] = useNodesState(computedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(computedEdges);

  // Update nodes and edges when schema changes
  useEffect(() => {
    setNodes(computedNodes);
    setEdges(computedEdges);
  }, [computedNodes, computedEdges, setNodes, setEdges]);

  return (
    <div className="space-y-4">
      {/* Template Selector */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Load Template:</span>
          </div>
          <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Select a template" />
            </SelectTrigger>
            <SelectContent>
              {schemaTemplates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  <span className="flex items-center gap-2">
                    <span>{template.icon}</span>
                    <span>{template.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedTemplate && (
            <span className="text-xs text-muted-foreground">
              {schemaTemplates.find(t => t.id === selectedTemplate)?.description}
            </span>
          )}
        </div>
      </Card>

      {/* Schema Diagram */}
      <Card className="h-[600px] overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.3}
          maxZoom={1.5}
        >
          <Background className="bg-background" />
          <Controls className="bg-card border border-border rounded-lg" />
          <MiniMap
            className="bg-card border border-border rounded-lg"
            nodeColor={() => 'hsl(var(--primary))'}
            maskColor="hsl(var(--background) / 0.8)"
          />
        </ReactFlow>
      </Card>

      {/* Legend */}
      <Card className="p-4">
        <div className="flex items-center gap-6 text-xs">
          <span className="font-medium">Legend:</span>
          <div className="flex items-center gap-1.5">
            <Key className="w-3 h-3 text-primary" />
            <span>Primary Key</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Link className="w-3 h-3 text-accent" />
            <span>Foreign Key</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Info className="w-3 h-3 text-muted-foreground" />
            <span>Hover for details</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
