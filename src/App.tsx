import { useEffect, useState, useCallback } from 'react';
import { AsyncDuckDBConnection, AsyncDuckDB } from '@duckdb/duckdb-wasm';
import { initDuckDB } from './lib/duckdb';
import { DropZone } from './components/DropZone';
import { DataGrid } from './components/DataGrid';
import { SchemaViewer } from './components/SchemaViewer';
import { SqlEditor } from './components/SqlEditor';

import { LoadingSpinner } from './components/LoadingSpinner';
import { Database, AlertCircle, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { clsx } from 'clsx';

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
  const [data, setData] = useState<any[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Pagination state
  const [page, setPage] = useState(1);
  const [pageSize] = useState(1000);
  const [totalRows, setTotalRows] = useState(0);
  const [viewMode, setViewMode] = useState<'file' | 'query'>('file');

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

  const fetchPage = useCallback(async (pageNum: number) => {
    if (!conn) return;
    setProcessing(true);
    try {
      const offset = (pageNum - 1) * pageSize;
      const dataResult = await conn.query(`SELECT * FROM parquet_file LIMIT ${pageSize} OFFSET ${offset}`);
      setData(dataResult.toArray().map((row) => row.toJSON()));
      setPage(pageNum);
    } catch (err: any) {
      console.error(err);
      setError("Failed to fetch page: " + err.message);
    } finally {
      setProcessing(false);
    }
  }, [conn, pageSize]);

  const handleFileSelect = useCallback(async (file: File) => {
    if (!conn || !db) return;

    setProcessing(true);
    setError(null);
    setFileName(file.name);
    setData([]);
    setSchema([]);
    setViewMode('file');

    try {
      // Register file
      await db!.registerFileBuffer(file.name, new Uint8Array(await file.arrayBuffer()));

      // Create table alias for easier querying
      await conn.query(`DROP VIEW IF EXISTS parquet_file`);
      await conn.query(`CREATE VIEW parquet_file AS SELECT * FROM '${file.name}'`);

      // Describe schema
      const schemaResult = await conn.query(`DESCRIBE parquet_file`);
      const schemaData = schemaResult.toArray().map((row: any) => ({
        name: row.column_name,
        type: row.column_type
      }));
      setSchema(schemaData);

      // Get total rows
      const countResult = await conn.query(`SELECT COUNT(*) as total FROM parquet_file`);
      const total = Number(countResult.toArray()[0].total);
      setTotalRows(total);

      // Fetch first page
      // We manually call the logic of fetchPage here to avoid dependency issues or waiting for state updates
      const dataResult = await conn.query(`SELECT * FROM parquet_file LIMIT ${pageSize} OFFSET 0`);
      setData(dataResult.toArray().map((row) => row.toJSON()));
      setPage(1);

    } catch (err: any) {
      console.error(err);
      setError("Failed to process parquet file: " + err.message);
    } finally {
      setProcessing(false);
    }
  }, [conn, db, pageSize]);

  const handleRunQuery = useCallback(async (query: string) => {
    if (!conn) return;
    setProcessing(true);
    setError(null);
    setViewMode('query');
    try {
      const result = await conn.query(query);
      setData(result.toArray().map((row) => row.toJSON()));

      // Optionally update schema if query changes columns (too complex for now, keep file schema)
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
                  onClick={() => { setFileName(null); setData([]); setSchema([]); }}
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
                    rowData={data}
                    schema={schema}
                    emptyMessage={viewMode === 'query' ? "Query returned 0 results" : "No data on this page"}
                    emptySubMessage={viewMode === 'query'
                      ? "Check your WHERE clause. Text values must match exactly (case-sensitive) and have no hidden whitespace. Try using LIKE '%value%' to find it."
                      : "Try navigating to another page."}
                  />
                )}
                <div className="mt-2 flex justify-between items-center text-xs text-gray-500">
                  <div>
                    {viewMode === 'file' ? (
                      <span>Showing page {page} of {Math.ceil(totalRows / pageSize)} ({totalRows} total rows)</span>
                    ) : (
                      <span>Showing {data.length} rows (Custom Query)</span>
                    )}
                  </div>

                  {viewMode === 'file' && totalRows > pageSize && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => fetchPage(page - 1)}
                        disabled={page === 1 || processing}
                        className="px-3 py-1 bg-zinc-800 rounded hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-300 transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => fetchPage(page + 1)}
                        disabled={page * pageSize >= totalRows || processing}
                        className="px-3 py-1 bg-zinc-800 rounded hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-300 transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  )}
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
