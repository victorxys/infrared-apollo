import { useEffect, useState, useCallback } from 'react';
import { AsyncDuckDBConnection, AsyncDuckDB } from '@duckdb/duckdb-wasm';
import { initDuckDB } from './lib/duckdb';
import { buildSql } from './lib/sqlBuilder';
import { DropZone } from './components/DropZone';
import { DataGrid } from './components/DataGrid';
import { SchemaViewer } from './components/SchemaViewer';
import { SqlEditor } from './components/SqlEditor';

import { LoadingSpinner } from './components/LoadingSpinner';
import { Database, AlertCircle, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { clsx } from 'clsx';
import type { GridReadyEvent, IDatasource } from 'ag-grid-community';

interface SchemaItem {
  name: string;
  type: string;
}

function App() {
  const [db, setDb] = useState<AsyncDuckDB | null>(null);
  const [conn, setConn] = useState<AsyncDuckDBConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fileName, setFileName] = useState<string | null>(null);
  const [schema, setSchema] = useState<SchemaItem[]>([]);
  // const [data, setData] = useState<any[]>([]); // Not used in infinite mode
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Pagination state
  const [viewMode, setViewMode] = useState<'file' | 'query'>('file');
  const [currentTableName, setCurrentTableName] = useState('parquet_file');

  // Initialize DuckDB
  useEffect(() => {
    const init = async () => {
      try {
        const { db, conn } = await initDuckDB();
        setDb(db);
        setConn(conn);
      } catch (e) {
        console.error("Failed to initialize DuckDB", e);
        setError("Failed to initialize database engine.");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  // Grid Datasource
  const onGridReady = useCallback((params: GridReadyEvent) => {
    if (!conn) return;

    const datasource: IDatasource = {
      getRows: async (params) => {
        try {
          const tableName = currentTableName;
          const { query, countQuery } = buildSql(tableName, params);

          console.log("Executing SQL:", query);

          // 1. Get total count
          const countResult = await conn.query(countQuery);
          const totalRows = Number(countResult.toArray()[0].total);

          // 2. Get data
          const dataResult = await conn.query(query);
          const rows = dataResult.toArray().map((row) => row.toJSON());

          params.successCallback(rows, totalRows);

        } catch (err: any) {
          console.error("Grid Fetch Error", err);
          params.failCallback();
          setError("Failed to fetch data: " + err.message);
        }
      }
    };

    params.api.setGridOption('datasource', datasource);
  }, [conn, currentTableName]);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!conn || !db) return;

    setProcessing(true);
    setError(null);
    setFileName(file.name);
    setSchema([]);
    setViewMode('file');
    setCurrentTableName('parquet_file');

    try {
      // Register file
      await db!.registerFileBuffer(file.name, new Uint8Array(await file.arrayBuffer()));

      // Create table alias for easier querying
      await conn.query(`DROP VIEW IF EXISTS parquet_file`);
      await conn.query(`CREATE VIEW parquet_file AS SELECT * FROM '${file.name}'`);
      await conn.query(`DROP VIEW IF EXISTS current_query_view`); // cleanup

      // Describe schema
      const schemaResult = await conn.query(`DESCRIBE parquet_file`);
      const schemaData = schemaResult.toArray().map((row: any) => ({
        name: row.column_name,
        type: row.column_type
      }));
      setSchema(schemaData);

    } catch (err: any) {
      console.error(err);
      setError("Failed to process parquet file: " + err.message);
    } finally {
      setProcessing(false);
    }
  }, [conn, db]);

  const handleRunQuery = useCallback(async (query: string) => {
    if (!conn) return;
    setProcessing(true);
    setError(null);
    setViewMode('query');

    try {
      // Create a view for the custom query so we can paginate over it!
      await conn.query(`DROP VIEW IF EXISTS current_query_view`);
      await conn.query(`CREATE VIEW current_query_view AS ${query}`);

      setCurrentTableName('current_query_view');

      // Update schema for the new view
      const schemaResult = await conn.query(`DESCRIBE current_query_view`);
      const schemaData = schemaResult.toArray().map((row: any) => ({
        name: row.column_name,
        type: row.column_type
      }));
      setSchema(schemaData);

    } catch (err: any) {
      let errorMessage = "Query error: " + err.message;
      if (err.message.includes('Binder Error') && err.message.includes('Referenced column') && err.message.includes('not found')) {
        errorMessage += " \nTip: Double check your quotes. String literals in SQL must be wrapped in single quotes (e.g. 'value'), not double quotes.";
      }
      setError(errorMessage);
    } finally {
      setProcessing(false);
    }
  }, [conn]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-100">
        <LoadingSpinner />
        <span className="ml-2">Initializing Database Engine...</span>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col font-sans text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-sm px-6 py-4 flex items-center space-x-3 shadow-sm z-10">
        <div className="bg-blue-600/90 p-2 rounded-lg shadow-lg shadow-blue-900/20">
          <Database className="w-5 h-5 text-white" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-sm">
          Parquet Viewer
        </h1>
        {fileName && (
          <span className="text-sm px-3 py-1 bg-zinc-800 rounded-full text-zinc-300 border border-zinc-700">
            {fileName}
          </span>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-6">

          {error && (
            <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg flex items-center space-x-3 text-red-200">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {!fileName ? (
            <div className="max-w-xl mx-auto mt-20">
              <DropZone onFileSelect={handleFileSelect} />
            </div>
          ) : (
            <div className="flex gap-6 h-[calc(100vh-140px)]">
              {/* Sidebar */}
              <div
                className={clsx(
                  "space-y-6 overflow-y-auto pr-2 custom-scrollbar transition-all duration-300 ease-in-out",
                  isSidebarOpen ? "w-80 flex-shrink-0" : "w-0 overflow-hidden opacity-0 p-0 margin-0"
                )}
              >
                <div className="bg-[#1a1a1a] border border-gray-800 rounded-lg p-4 min-w-[300px]">
                  <SqlEditor onRunQuery={handleRunQuery} isLoading={processing} />
                </div>
                <div className="min-w-[300px]">
                  <SchemaViewer schema={schema} />
                </div>
                <button
                  onClick={() => { setFileName(null); setSchema([]); }}
                  className="w-full min-w-[300px] py-2 px-4 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-sm transition-colors"
                >
                  Load Another File
                </button>
              </div>

              {/* Main Grid Area */}
              <div className="flex-1 flex flex-col h-full min-h-[500px] min-w-0">
                <div className="flex justify-between items-center mb-2">
                  <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="p-1.5 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-zinc-100 transition-colors"
                    title={isSidebarOpen ? "Close Sidebar" : "Open Sidebar"}
                  >
                    {isSidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
                  </button>
                </div>
                {processing ? (
                  <div className="flex-1 flex items-center justify-center bg-[#1a1a1a] border border-gray-800 rounded-lg">
                    <LoadingSpinner />
                  </div>
                ) : (
                  <DataGrid
                    key={currentTableName}
                    schema={schema}
                    onGridReady={onGridReady}
                  />
                )}
                <div className="mt-2 flex justify-between items-center text-xs text-gray-500">
                  <span>
                    {viewMode === 'query' ? "Viewing Custom Query Results" : "Viewing File Content"}
                  </span>
                  <span>
                    {/* Infinite Scroll - Filter/Sort supported */}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main >
    </div >
  );
}

export default App;
