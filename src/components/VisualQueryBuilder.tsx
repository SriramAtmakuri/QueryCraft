import { useCallback, useState } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Connection,
  Background,
  Controls,
  addEdge,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, Filter, Plus, Trash2, Link as LinkIcon } from 'lucide-react';

interface TableNodeData {
  label: string;
  columns: string[];
  selectedColumns: string[];
  onColumnToggle: (column: string) => void;
}

interface FilterNodeData {
  column: string;
  operator: string;
  value: string;
  onUpdate: (field: string, value: string) => void;
}

const TableNode = ({ data }: { data: Record<string, unknown> }) => {
  const nodeData = data as unknown as TableNodeData;
  
  return (
    <div className="bg-card border-2 border-primary rounded-lg shadow-lg min-w-[200px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="bg-primary/10 border-b border-border px-3 py-2 rounded-t-lg flex items-center gap-2">
        <Table className="w-4 h-4 text-primary" />
        <span className="font-semibold text-sm">{nodeData.label}</span>
      </div>
      <div className="p-3 space-y-1">
        {nodeData.columns.map((col) => (
          <label key={col} className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 px-2 py-1 rounded">
            <input
              type="checkbox"
              checked={nodeData.selectedColumns.includes(col)}
              onChange={() => nodeData.onColumnToggle(col)}
              className="rounded border-border"
            />
            <span className="text-xs font-mono">{col}</span>
          </label>
        ))}
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};

const FilterNode = ({ data }: { data: Record<string, unknown> }) => {
  const nodeData = data as unknown as FilterNodeData;
  
  return (
    <div className="bg-card border-2 border-accent rounded-lg shadow-lg min-w-[250px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="bg-accent/10 border-b border-border px-3 py-2 rounded-t-lg flex items-center gap-2">
        <Filter className="w-4 h-4 text-accent" />
        <span className="font-semibold text-sm">Filter</span>
      </div>
      <div className="p-3 space-y-2">
        <Input
          placeholder="Column"
          value={nodeData.column}
          onChange={(e) => nodeData.onUpdate('column', e.target.value)}
          className="h-8 text-xs"
        />
        <Select value={nodeData.operator} onValueChange={(v) => nodeData.onUpdate('operator', v)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="=">=</SelectItem>
            <SelectItem value="!=">!=</SelectItem>
            <SelectItem value=">">{">"}</SelectItem>
            <SelectItem value="<">{"<"}</SelectItem>
            <SelectItem value="LIKE">LIKE</SelectItem>
            <SelectItem value="IN">IN</SelectItem>
          </SelectContent>
        </Select>
        <Input
          placeholder="Value"
          value={nodeData.value}
          onChange={(e) => nodeData.onUpdate('value', e.target.value)}
          className="h-8 text-xs"
        />
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};

const nodeTypes = {
  tableNode: TableNode,
  filterNode: FilterNode,
};

export const VisualQueryBuilder = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [nodeId, setNodeId] = useState(0);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const addTableNode = () => {
    const newNode: Node = {
      id: `table-${nodeId}`,
      type: 'tableNode',
      position: { x: 100 + nodeId * 50, y: 100 + nodeId * 50 },
      data: {
        label: 'users',
        columns: ['id', 'name', 'email', 'created_at'],
        selectedColumns: ['id', 'name'],
        onColumnToggle: (column: string) => {
          setNodes((nds) =>
            nds.map((node) => {
              if (node.id === `table-${nodeId}`) {
                const selected = (node.data as any).selectedColumns as string[];
                return {
                  ...node,
                  data: {
                    ...node.data,
                    selectedColumns: selected.includes(column)
                      ? selected.filter((c) => c !== column)
                      : [...selected, column],
                  },
                };
              }
              return node;
            })
          );
        },
      } as Record<string, unknown>,
    };
    setNodes((nds) => [...nds, newNode]);
    setNodeId((id) => id + 1);
  };

  const addFilterNode = () => {
    const newNode: Node = {
      id: `filter-${nodeId}`,
      type: 'filterNode',
      position: { x: 400 + nodeId * 50, y: 100 + nodeId * 50 },
      data: {
        column: 'created_at',
        operator: '>',
        value: '2024-01-01',
        onUpdate: (field: string, value: string) => {
          setNodes((nds) =>
            nds.map((node) => {
              if (node.id === `filter-${nodeId}`) {
                return {
                  ...node,
                  data: { ...node.data, [field]: value },
                };
              }
              return node;
            })
          );
        },
      } as Record<string, unknown>,
    };
    setNodes((nds) => [...nds, newNode]);
    setNodeId((id) => id + 1);
  };

  const clearCanvas = () => {
    setNodes([]);
    setEdges([]);
    setNodeId(0);
  };

  const generateSQL = () => {
    // Basic SQL generation logic - will be enhanced
    const tableNodes = nodes.filter((n) => n.type === 'tableNode');
    const filterNodes = nodes.filter((n) => n.type === 'filterNode');

    if (tableNodes.length === 0) return 'SELECT * FROM table_name;';

    const selectedColumns = tableNodes.flatMap((n) => {
      const data = n.data as any;
      return (data.selectedColumns as string[]).map(col => `${data.label}.${col}`);
    });
    
    const from = tableNodes.map((n) => (n.data as any).label).join(', ');
    
    const where = filterNodes
      .map((n) => {
        const data = n.data as any;
        return `${data.column} ${data.operator} '${data.value}'`;
      })
      .join(' AND ');

    let sql = `SELECT ${selectedColumns.join(', ')}\nFROM ${from}`;
    if (where) sql += `\nWHERE ${where}`;
    sql += ';';

    return sql;
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button onClick={addTableNode} size="sm" variant="outline">
          <Table className="w-4 h-4 mr-2" />
          Add Table
        </Button>
        <Button onClick={addFilterNode} size="sm" variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          Add Filter
        </Button>
        <Button onClick={clearCanvas} size="sm" variant="ghost">
          <Trash2 className="w-4 h-4 mr-2" />
          Clear
        </Button>
        <Button onClick={() => console.log(generateSQL())} size="sm" className="ml-auto">
          Generate SQL
        </Button>
      </div>

      <Card className="h-[500px] overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          minZoom={0.5}
          maxZoom={1.5}
        >
          <Background className="bg-background" />
          <Controls className="bg-card border border-border rounded-lg" />
        </ReactFlow>
      </Card>

      {nodes.length > 0 && (
        <Card className="p-4">
          <Label className="text-sm font-semibold mb-2 block">Generated SQL</Label>
          <pre className="code-bg rounded p-3 text-xs font-mono overflow-auto">
            <code>{generateSQL()}</code>
          </pre>
        </Card>
      )}
    </div>
  );
};
