import { TableSchema } from './sqlParser';

export interface SchemaTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  tables: TableSchema[];
  relationships: {
    fromTable: string;
    fromColumn: string;
    toTable: string;
    toColumn: string;
  }[];
}

export const schemaTemplates: SchemaTemplate[] = [
  {
    id: 'ecommerce',
    name: 'E-Commerce',
    description: 'Online store with users, products, orders, and reviews',
    icon: '🛒',
    tables: [
      {
        name: 'users',
        columns: [
          { name: 'id', type: 'SERIAL', isPrimaryKey: true },
          { name: 'email', type: 'VARCHAR(255)' },
          { name: 'name', type: 'VARCHAR(255)' },
          { name: 'password_hash', type: 'VARCHAR(255)' },
          { name: 'created_at', type: 'TIMESTAMP' },
        ],
      },
      {
        name: 'products',
        columns: [
          { name: 'id', type: 'SERIAL', isPrimaryKey: true },
          { name: 'name', type: 'VARCHAR(255)' },
          { name: 'description', type: 'TEXT' },
          { name: 'price', type: 'DECIMAL(10,2)' },
          { name: 'stock', type: 'INTEGER' },
          { name: 'category_id', type: 'INTEGER', isForeignKey: true },
        ],
      },
      {
        name: 'categories',
        columns: [
          { name: 'id', type: 'SERIAL', isPrimaryKey: true },
          { name: 'name', type: 'VARCHAR(100)' },
          { name: 'parent_id', type: 'INTEGER', isForeignKey: true },
        ],
      },
      {
        name: 'orders',
        columns: [
          { name: 'id', type: 'SERIAL', isPrimaryKey: true },
          { name: 'user_id', type: 'INTEGER', isForeignKey: true },
          { name: 'total', type: 'DECIMAL(10,2)' },
          { name: 'status', type: 'VARCHAR(50)' },
          { name: 'created_at', type: 'TIMESTAMP' },
        ],
      },
      {
        name: 'order_items',
        columns: [
          { name: 'id', type: 'SERIAL', isPrimaryKey: true },
          { name: 'order_id', type: 'INTEGER', isForeignKey: true },
          { name: 'product_id', type: 'INTEGER', isForeignKey: true },
          { name: 'quantity', type: 'INTEGER' },
          { name: 'price', type: 'DECIMAL(10,2)' },
        ],
      },
      {
        name: 'reviews',
        columns: [
          { name: 'id', type: 'SERIAL', isPrimaryKey: true },
          { name: 'user_id', type: 'INTEGER', isForeignKey: true },
          { name: 'product_id', type: 'INTEGER', isForeignKey: true },
          { name: 'rating', type: 'INTEGER' },
          { name: 'comment', type: 'TEXT' },
          { name: 'created_at', type: 'TIMESTAMP' },
        ],
      },
    ],
    relationships: [
      { fromTable: 'products', fromColumn: 'category_id', toTable: 'categories', toColumn: 'id' },
      { fromTable: 'orders', fromColumn: 'user_id', toTable: 'users', toColumn: 'id' },
      { fromTable: 'order_items', fromColumn: 'order_id', toTable: 'orders', toColumn: 'id' },
      { fromTable: 'order_items', fromColumn: 'product_id', toTable: 'products', toColumn: 'id' },
      { fromTable: 'reviews', fromColumn: 'user_id', toTable: 'users', toColumn: 'id' },
      { fromTable: 'reviews', fromColumn: 'product_id', toTable: 'products', toColumn: 'id' },
    ],
  },
  {
    id: 'blog',
    name: 'Blog Platform',
    description: 'Blog with posts, comments, tags, and authors',
    icon: '📝',
    tables: [
      {
        name: 'authors',
        columns: [
          { name: 'id', type: 'SERIAL', isPrimaryKey: true },
          { name: 'name', type: 'VARCHAR(255)' },
          { name: 'email', type: 'VARCHAR(255)' },
          { name: 'bio', type: 'TEXT' },
          { name: 'avatar_url', type: 'VARCHAR(500)' },
        ],
      },
      {
        name: 'posts',
        columns: [
          { name: 'id', type: 'SERIAL', isPrimaryKey: true },
          { name: 'title', type: 'VARCHAR(255)' },
          { name: 'slug', type: 'VARCHAR(255)' },
          { name: 'content', type: 'TEXT' },
          { name: 'author_id', type: 'INTEGER', isForeignKey: true },
          { name: 'published', type: 'BOOLEAN' },
          { name: 'created_at', type: 'TIMESTAMP' },
        ],
      },
      {
        name: 'comments',
        columns: [
          { name: 'id', type: 'SERIAL', isPrimaryKey: true },
          { name: 'post_id', type: 'INTEGER', isForeignKey: true },
          { name: 'author_name', type: 'VARCHAR(255)' },
          { name: 'content', type: 'TEXT' },
          { name: 'created_at', type: 'TIMESTAMP' },
        ],
      },
      {
        name: 'tags',
        columns: [
          { name: 'id', type: 'SERIAL', isPrimaryKey: true },
          { name: 'name', type: 'VARCHAR(100)' },
          { name: 'slug', type: 'VARCHAR(100)' },
        ],
      },
      {
        name: 'post_tags',
        columns: [
          { name: 'post_id', type: 'INTEGER', isPrimaryKey: true, isForeignKey: true },
          { name: 'tag_id', type: 'INTEGER', isPrimaryKey: true, isForeignKey: true },
        ],
      },
    ],
    relationships: [
      { fromTable: 'posts', fromColumn: 'author_id', toTable: 'authors', toColumn: 'id' },
      { fromTable: 'comments', fromColumn: 'post_id', toTable: 'posts', toColumn: 'id' },
      { fromTable: 'post_tags', fromColumn: 'post_id', toTable: 'posts', toColumn: 'id' },
      { fromTable: 'post_tags', fromColumn: 'tag_id', toTable: 'tags', toColumn: 'id' },
    ],
  },
  {
    id: 'saas',
    name: 'SaaS Application',
    description: 'Multi-tenant SaaS with organizations, users, and subscriptions',
    icon: '🏢',
    tables: [
      {
        name: 'organizations',
        columns: [
          { name: 'id', type: 'SERIAL', isPrimaryKey: true },
          { name: 'name', type: 'VARCHAR(255)' },
          { name: 'slug', type: 'VARCHAR(100)' },
          { name: 'plan', type: 'VARCHAR(50)' },
          { name: 'created_at', type: 'TIMESTAMP' },
        ],
      },
      {
        name: 'users',
        columns: [
          { name: 'id', type: 'SERIAL', isPrimaryKey: true },
          { name: 'org_id', type: 'INTEGER', isForeignKey: true },
          { name: 'email', type: 'VARCHAR(255)' },
          { name: 'name', type: 'VARCHAR(255)' },
          { name: 'role', type: 'VARCHAR(50)' },
          { name: 'created_at', type: 'TIMESTAMP' },
        ],
      },
      {
        name: 'subscriptions',
        columns: [
          { name: 'id', type: 'SERIAL', isPrimaryKey: true },
          { name: 'org_id', type: 'INTEGER', isForeignKey: true },
          { name: 'plan_id', type: 'INTEGER', isForeignKey: true },
          { name: 'status', type: 'VARCHAR(50)' },
          { name: 'starts_at', type: 'TIMESTAMP' },
          { name: 'ends_at', type: 'TIMESTAMP' },
        ],
      },
      {
        name: 'plans',
        columns: [
          { name: 'id', type: 'SERIAL', isPrimaryKey: true },
          { name: 'name', type: 'VARCHAR(100)' },
          { name: 'price', type: 'DECIMAL(10,2)' },
          { name: 'features', type: 'JSONB' },
        ],
      },
      {
        name: 'invoices',
        columns: [
          { name: 'id', type: 'SERIAL', isPrimaryKey: true },
          { name: 'subscription_id', type: 'INTEGER', isForeignKey: true },
          { name: 'amount', type: 'DECIMAL(10,2)' },
          { name: 'status', type: 'VARCHAR(50)' },
          { name: 'due_date', type: 'DATE' },
        ],
      },
    ],
    relationships: [
      { fromTable: 'users', fromColumn: 'org_id', toTable: 'organizations', toColumn: 'id' },
      { fromTable: 'subscriptions', fromColumn: 'org_id', toTable: 'organizations', toColumn: 'id' },
      { fromTable: 'subscriptions', fromColumn: 'plan_id', toTable: 'plans', toColumn: 'id' },
      { fromTable: 'invoices', fromColumn: 'subscription_id', toTable: 'subscriptions', toColumn: 'id' },
    ],
  },
  {
    id: 'social',
    name: 'Social Network',
    description: 'Social platform with users, posts, follows, and likes',
    icon: '👥',
    tables: [
      {
        name: 'users',
        columns: [
          { name: 'id', type: 'SERIAL', isPrimaryKey: true },
          { name: 'username', type: 'VARCHAR(50)' },
          { name: 'email', type: 'VARCHAR(255)' },
          { name: 'display_name', type: 'VARCHAR(100)' },
          { name: 'bio', type: 'TEXT' },
          { name: 'avatar_url', type: 'VARCHAR(500)' },
        ],
      },
      {
        name: 'posts',
        columns: [
          { name: 'id', type: 'SERIAL', isPrimaryKey: true },
          { name: 'user_id', type: 'INTEGER', isForeignKey: true },
          { name: 'content', type: 'TEXT' },
          { name: 'media_url', type: 'VARCHAR(500)' },
          { name: 'created_at', type: 'TIMESTAMP' },
        ],
      },
      {
        name: 'follows',
        columns: [
          { name: 'follower_id', type: 'INTEGER', isPrimaryKey: true, isForeignKey: true },
          { name: 'following_id', type: 'INTEGER', isPrimaryKey: true, isForeignKey: true },
          { name: 'created_at', type: 'TIMESTAMP' },
        ],
      },
      {
        name: 'likes',
        columns: [
          { name: 'user_id', type: 'INTEGER', isPrimaryKey: true, isForeignKey: true },
          { name: 'post_id', type: 'INTEGER', isPrimaryKey: true, isForeignKey: true },
          { name: 'created_at', type: 'TIMESTAMP' },
        ],
      },
      {
        name: 'messages',
        columns: [
          { name: 'id', type: 'SERIAL', isPrimaryKey: true },
          { name: 'sender_id', type: 'INTEGER', isForeignKey: true },
          { name: 'receiver_id', type: 'INTEGER', isForeignKey: true },
          { name: 'content', type: 'TEXT' },
          { name: 'read', type: 'BOOLEAN' },
          { name: 'created_at', type: 'TIMESTAMP' },
        ],
      },
    ],
    relationships: [
      { fromTable: 'posts', fromColumn: 'user_id', toTable: 'users', toColumn: 'id' },
      { fromTable: 'follows', fromColumn: 'follower_id', toTable: 'users', toColumn: 'id' },
      { fromTable: 'follows', fromColumn: 'following_id', toTable: 'users', toColumn: 'id' },
      { fromTable: 'likes', fromColumn: 'user_id', toTable: 'users', toColumn: 'id' },
      { fromTable: 'likes', fromColumn: 'post_id', toTable: 'posts', toColumn: 'id' },
      { fromTable: 'messages', fromColumn: 'sender_id', toTable: 'users', toColumn: 'id' },
      { fromTable: 'messages', fromColumn: 'receiver_id', toTable: 'users', toColumn: 'id' },
    ],
  },
  {
    id: 'inventory',
    name: 'Inventory Management',
    description: 'Warehouse inventory with products, suppliers, and stock tracking',
    icon: '📦',
    tables: [
      {
        name: 'warehouses',
        columns: [
          { name: 'id', type: 'SERIAL', isPrimaryKey: true },
          { name: 'name', type: 'VARCHAR(255)' },
          { name: 'location', type: 'VARCHAR(255)' },
          { name: 'capacity', type: 'INTEGER' },
        ],
      },
      {
        name: 'products',
        columns: [
          { name: 'id', type: 'SERIAL', isPrimaryKey: true },
          { name: 'sku', type: 'VARCHAR(50)' },
          { name: 'name', type: 'VARCHAR(255)' },
          { name: 'unit_price', type: 'DECIMAL(10,2)' },
          { name: 'reorder_level', type: 'INTEGER' },
        ],
      },
      {
        name: 'suppliers',
        columns: [
          { name: 'id', type: 'SERIAL', isPrimaryKey: true },
          { name: 'name', type: 'VARCHAR(255)' },
          { name: 'contact_email', type: 'VARCHAR(255)' },
          { name: 'phone', type: 'VARCHAR(50)' },
        ],
      },
      {
        name: 'stock',
        columns: [
          { name: 'id', type: 'SERIAL', isPrimaryKey: true },
          { name: 'warehouse_id', type: 'INTEGER', isForeignKey: true },
          { name: 'product_id', type: 'INTEGER', isForeignKey: true },
          { name: 'quantity', type: 'INTEGER' },
          { name: 'last_updated', type: 'TIMESTAMP' },
        ],
      },
      {
        name: 'purchase_orders',
        columns: [
          { name: 'id', type: 'SERIAL', isPrimaryKey: true },
          { name: 'supplier_id', type: 'INTEGER', isForeignKey: true },
          { name: 'status', type: 'VARCHAR(50)' },
          { name: 'total', type: 'DECIMAL(10,2)' },
          { name: 'created_at', type: 'TIMESTAMP' },
        ],
      },
    ],
    relationships: [
      { fromTable: 'stock', fromColumn: 'warehouse_id', toTable: 'warehouses', toColumn: 'id' },
      { fromTable: 'stock', fromColumn: 'product_id', toTable: 'products', toColumn: 'id' },
      { fromTable: 'purchase_orders', fromColumn: 'supplier_id', toTable: 'suppliers', toColumn: 'id' },
    ],
  },
];

// Column type descriptions for tooltips
export const columnTypeDescriptions: Record<string, string> = {
  'SERIAL': 'Auto-incrementing integer, commonly used for primary keys',
  'INTEGER': 'Whole number, typically -2147483648 to 2147483647',
  'BIGINT': 'Large whole number for very large values',
  'DECIMAL': 'Exact numeric with specified precision, ideal for money',
  'VARCHAR': 'Variable-length string with maximum length',
  'TEXT': 'Unlimited length string for large content',
  'BOOLEAN': 'True/False value',
  'TIMESTAMP': 'Date and time with timezone support',
  'DATE': 'Date only (year, month, day)',
  'JSONB': 'Binary JSON for structured data storage',
  'UUID': 'Universally unique identifier',
};

// Get description for a column type
export const getColumnTypeDescription = (type: string): string => {
  const baseType = type.split('(')[0].toUpperCase();
  return columnTypeDescriptions[baseType] || 'Standard SQL data type';
};
