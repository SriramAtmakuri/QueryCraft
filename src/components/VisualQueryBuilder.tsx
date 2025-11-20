import { useCallback, useState, useEffect } from 'react';
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
import { Table, Filter, Trash2, Copy, GitBranch } from 'lucide-react';
import { toast } from 'sonner';
import { useSchema } from '@/context/SchemaContext';

interface TableNodeData {
  label: string;
  columns: string[];
  selectedColumns: string[];
  onColumnToggle: (column: string) => void;
  onLabelChange: (label: string) => void;
}

interface FilterNodeData {
  column: string;
  operator: string;
  value: string;
  onUpdate: (field: string, value: string) => void;
}

interface JoinNodeData {
  leftTable: string;
  leftColumn: string;
  rightTable: string;
  rightColumn: string;
  joinType: string;
  onUpdate: (field: string, value: string) => void;
}

const TableNode = ({ data, id }: { data: Record<string, unknown>; id: string }) => {
  const nodeData = data as unknown as TableNodeData;
  const { schema } = useSchema();

  // Get available tables from schema
  const availableTables = schema.tables.length > 0
    ? schema.tables.map(t => t.name)
    : ['users', 'orders', 'products', 'order_items'];

  // Get columns for selected table
  const tableSchema = schema.tables.find(t => t.name === nodeData.label);
  const columns = tableSchema
    ? tableSchema.columns.map(c => c.name)
    : nodeData.columns;

  return (
    <div className="bg-card border-2 border-primary rounded-lg shadow-lg min-w-[200px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="bg-primary/10 border-b border-border px-3 py-2 rounded-t-lg">
        <Select value={nodeData.label} onValueChange={nodeData.onLabelChange}>
          <SelectTrigger className="h-7 text-xs border-0 bg-transparent p-0">
            <div className="flex items-center gap-2">
              <Table className="w-4 h-4 text-primary" />
              <SelectValue />
            </div>
          </SelectTrigger>
          <SelectContent>
            {availableTables.map(table => (
              <SelectItem key={table} value={table}>{table}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="p-3 space-y-1 max-h-[200px] overflow-y-auto">
        {columns.map((col) => (
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
            <SelectItem value=">=">{"≥"}</SelectItem>
            <SelectItem value="<=">{"≤"}</SelectItem>
            <SelectItem value="LIKE">LIKE</SelectItem>
            <SelectItem value="IN">IN</SelectItem>
            <SelectItem value="IS NULL">IS NULL</SelectItem>
            <SelectItem value="IS NOT NULL">IS NOT NULL</SelectItem>
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

const JoinNode = ({ data }: { data: Record<string, unknown> }) => {
  const nodeData = data as unknown as JoinNodeData;

  return (
    <div className="bg-card border-2 border-green-500 rounded-lg shadow-lg min-w-[280px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="bg-green-500/10 border-b border-border px-3 py-2 rounded-t-lg flex items-center gap-2">
        <GitBranch className="w-4 h-4 text-green-500" />
        <span className="font-semibold text-sm">Join</span>
      </div>
      <div className="p-3 space-y-2">
        <Select value={nodeData.joinType} onValueChange={(v) => nodeData.onUpdate('joinType', v)}>
          <SelectTrigger className="h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="INNER JOIN">INNER JOIN</SelectItem>
            <SelectItem value="LEFT JOIN">LEFT JOIN</SelectItem>
            <SelectItem value="RIGHT JOIN">RIGHT JOIN</SelectItem>
            <SelectItem value="FULL JOIN">FULL JOIN</SelectItem>
          </SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Left table"
            value={nodeData.leftTable}
            onChange={(e) => nodeData.onUpdate('leftTable', e.target.value)}
            className="h-8 text-xs"
          />
          <Input
            placeholder="Left column"
            value={nodeData.leftColumn}
            onChange={(e) => nodeData.onUpdate('leftColumn', e.target.value)}
            className="h-8 text-xs"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Input
            placeholder="Right table"
            value={nodeData.rightTable}
            onChange={(e) => nodeData.onUpdate('rightTable', e.target.value)}
            className="h-8 text-xs"
          />
          <Input
            placeholder="Right column"
            value={nodeData.rightColumn}
            onChange={(e) => nodeData.onUpdate('rightColumn', e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};

const nodeTypes = {
  tableNode: TableNode,
  filterNode: FilterNode,
  joinNode: JoinNode,
};

export const VisualQueryBuilder = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [nodeId, setNodeId] = useState(0);
  const [generatedSQL, setGeneratedSQL] = useState('');
  const { schema } = useSchema();

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Get default columns based on schema
  const getDefaultColumns = (tableName: string) => {
    const table = schema.tables.find(t => t.name === tableName);
    return table ? table.columns.map(c => c.name) : ['id', 'name', 'email', 'created_at'];
  };

  const addTableNode = () => {
    const defaultTable = schema.tables.length > 0 ? schema.tables[0].name : 'users';
    const columns = getDefaultColumns(defaultTable);
    const currentNodeId = nodeId;

    const newNode: Node = {
      id: `table-${currentNodeId}`,
      type: 'tableNode',
      position: { x: 100 + nodeId * 50, y: 100 + nodeId * 50 },
      data: {
        label: defaultTable,
        columns: columns,
        selectedColumns: columns.slice(0, 2),
        onColumnToggle: (column: string) => {
          setNodes((nds) =>
            nds.map((node) => {
              if (node.id === `table-${currentNodeId}`) {
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
        onLabelChange: (label: string) => {
          const newColumns = getDefaultColumns(label);
          setNodes((nds) =>
            nds.map((node) => {
              if (node.id === `table-${currentNodeId}`) {
                return {
                  ...node,
                  data: {
                    ...node.data,
                    label,
                    columns: newColumns,
                    selectedColumns: newColumns.slice(0, 2),
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
    const currentNodeId = nodeId;

    const newNode: Node = {
      id: `filter-${currentNodeId}`,
      type: 'filterNode',
      position: { x: 400 + nodeId * 50, y: 100 + nodeId * 50 },
      data: {
        column: '',
        operator: '=',
        value: '',
        onUpdate: (field: string, value: string) => {
          setNodes((nds) =>
            nds.map((node) => {
              if (node.id === `filter-${currentNodeId}`) {
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

  const addJoinNode = () => {
    const currentNodeId = nodeId;

    const newNode: Node = {
      id: `join-${currentNodeId}`,
      type: 'joinNode',
      position: { x: 250 + nodeId * 50, y: 200 + nodeId * 50 },
      data: {
        leftTable: '',
        leftColumn: '',
        rightTable: '',
        rightColumn: '',
        joinType: 'INNER JOIN',
        onUpdate: (field: string, value: string) => {
          setNodes((nds) =>
            nds.map((node) => {
              if (node.id === `join-${currentNodeId}`) {
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
    setGeneratedSQL('');
  };

  const generateSQL = useCallback(() => {
    const tableNodes = nodes.filter((n) => n.type === 'tableNode');
    const filterNodes = nodes.filter((n) => n.type === 'filterNode');
    const joinNodes = nodes.filter((n) => n.type === 'joinNode');

    if (tableNodes.length === 0) return '';

    // Collect selected columns
    const selectedColumns = tableNodes.flatMap((n) => {
      const data = n.data as any;
      return (data.selectedColumns as string[]).map(col => `${data.label}.${col}`);
    });

    if (selectedColumns.length === 0) return '';

    // Build FROM clause
    const tables = tableNodes.map((n) => (n.data as any).label);
    let fromClause = tables[0];

    // Add JOINs
    joinNodes.forEach((n) => {
      const data = n.data as any;
      if (data.leftTable && data.rightTable && data.leftColumn && data.rightColumn) {
        fromClause += `\n${data.joinType} ${data.rightTable} ON ${data.leftTable}.${data.leftColumn} = ${data.rightTable}.${data.rightColumn}`;
      }
    });

    // Build WHERE clause
    const conditions = filterNodes
      .map((n) => {
        const data = n.data as any;
        if (!data.column) return null;

        if (data.operator === 'IS NULL' || data.operator === 'IS NOT NULL') {
          return `${data.column} ${data.operator}`;
        }

        const value = isNaN(Number(data.value)) ? `'${data.value}'` : data.value;
        return `${data.column} ${data.operator} ${value}`;
      })
      .filter(Boolean);

    let sql = `SELECT ${selectedColumns.join(', ')}\nFROM ${fromClause}`;
    if (conditions.length > 0) {
      sql += `\nWHERE ${conditions.join('\n  AND ')}`;
    }
    sql += ';';

    return sql;
  }, [nodes]);

  // Real-time SQL generation
  useEffect(() => {
    const sql = generateSQL();
    setGeneratedSQL(sql);
  }, [generateSQL, nodes]);

  const handleCopy = () => {
    if (generatedSQL) {
      navigator.clipboard.writeText(generatedSQL);
      toast.success('SQL copied to clipboard');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <Button onClick={addTableNode} size="sm" variant="outline">
          <Table className="w-4 h-4 mr-2" />
          Add Table
        </Button>
        <Button onClick={addFilterNode} size="sm" variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          Add Filter
        </Button>
        <Button onClick={addJoinNode} size="sm" variant="outline">
          <GitBranch className="w-4 h-4 mr-2" />
          Add Join
        </Button>
        <Button onClick={clearCanvas} size="sm" variant="ghost">
          <Trash2 className="w-4 h-4 mr-2" />
          Clear
        </Button>
        <Button onClick={handleCopy} size="sm" className="ml-auto" disabled={!generatedSQL}>
          <Copy className="w-4 h-4 mr-2" />
          Copy SQL
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

      {generatedSQL && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold">Generated SQL (Real-time)</Label>
            <span className="text-xs text-muted-foreground">Updates automatically as you build</span>
          </div>
          <pre className="code-bg rounded p-3 text-xs font-mono overflow-auto">
            <code>{generatedSQL}</code>
          </pre>
        </Card>
      )}
    </div>
  );
};
