import { useMemo } from 'react';
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
import { Database, Key, Link } from 'lucide-react';

interface TableColumn {
  name: string;
  type: string;
  isPrimaryKey?: boolean;
  isForeignKey?: boolean;
}

interface TableSchema {
  name: string;
  columns: TableColumn[];
}

// Mock schema data - will be replaced with actual schema parsing
const mockSchema: TableSchema[] = [
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

const TableNode = ({ data }: { data: Record<string, unknown> }) => {
  const tableData = data as unknown as TableSchema;
  
  return (
    <div className="bg-card border border-border rounded-lg shadow-lg min-w-[250px]">
      <div className="bg-primary/10 border-b border-border px-4 py-3 rounded-t-lg flex items-center gap-2">
        <Database className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm">{tableData.name}</span>
      </div>
      <div className="p-2">
        {tableData.columns.map((col, idx) => (
          <div
            key={idx}
            className="flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-muted/50 rounded"
          >
            {col.isPrimaryKey && <Key className="w-3 h-3 text-primary" />}
            {col.isForeignKey && <Link className="w-3 h-3 text-accent" />}
            <span className="flex-1 font-mono">{col.name}</span>
            <span className="text-muted-foreground">{col.type}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const nodeTypes = {
  table: TableNode,
};

export const SchemaVisualizer = () => {
  const initialNodes: Node[] = useMemo(() => {
    return mockSchema.map((table, idx) => ({
      id: table.name,
      type: 'table',
      position: { x: (idx % 2) * 350 + 50, y: Math.floor(idx / 2) * 250 + 50 },
      data: { ...table } as Record<string, unknown>,
    }));
  }, []);

  const initialEdges: Edge[] = useMemo(() => {
    return [
      {
        id: 'users-orders',
        source: 'users',
        target: 'orders',
        sourceHandle: 'id',
        targetHandle: 'user_id',
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
  }, []);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <Card className="h-[600px] overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.5}
        maxZoom={1.5}
      >
        <Background className="bg-background" />
        <Controls className="bg-card border border-border rounded-lg" />
        <MiniMap
          className="bg-card border border-border rounded-lg"
          nodeColor={(node) => 'hsl(var(--primary))'}
          maskColor="hsl(var(--background) / 0.8)"
        />
      </ReactFlow>
    </Card>
  );
};
