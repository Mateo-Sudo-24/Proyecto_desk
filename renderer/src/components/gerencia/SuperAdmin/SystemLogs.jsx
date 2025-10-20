import React, { useEffect, useState } from "react";
import { Loader2, RefreshCw, Filter } from "lucide-react";
import useFetch from "../../../hooks/useFetch";

const SystemLogs = () => {
  const { fetchDataBackend } = useFetch();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lines, setLines] = useState(100);
  const [level, setLevel] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const getLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (lines) params.append("lines", lines);
      if (level) params.append("level", level);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);

      const url = `/admin/system/logs?${params.toString()}`;
      const res = await fetchDataBackend(url, null, "GET");
      if (res.success) setLogs(res.data?.logs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getLogs();
  }, []);

  const handleFilterApply = () => getLogs();

  return (
    <div className="bg-white rounded-2xl shadow p-4 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Filter className="text-purple-500" size={22} />
          Logs del Sistema
        </h2>
        <button
          onClick={getLogs}
          title="Actualizar logs"
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded flex items-center gap-1"
        >
          <RefreshCw size={16} /> Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-4 items-end">
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Líneas</label>
          <input
            type="number"
            min="1"
            value={lines}
            onChange={(e) => setLines(e.target.value)}
            className="border rounded p-1 w-24"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Nivel</label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value)}
            className="border rounded p-1 w-32"
          >
            <option value="">Todos</option>
            <option value="info">Info</option>
            <option value="error">Error</option>
            <option value="warning">Warning</option>
          </select>
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Desde</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border rounded p-1"
          />
        </div>
        <div className="flex flex-col">
          <label className="text-sm text-gray-600">Hasta</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border rounded p-1"
          />
        </div>
        <button
          onClick={handleFilterApply}
          className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded"
        >
          Aplicar filtros
        </button>
      </div>

      {/* Tabla de logs */}
      {loading ? (
        <div className="flex justify-center items-center h-full">
          <Loader2 className="animate-spin text-blue-500" size={32} />
          <span className="ml-2 text-gray-600">Cargando logs...</span>
        </div>
      ) : (
        <div className="overflow-x-auto max-h-[400px]">
          <table className="min-w-full text-sm text-gray-700 border">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                <th className="p-2 border-b text-left">Fecha / Hora</th>
                <th className="p-2 border-b text-left">Nivel</th>
                <th className="p-2 border-b text-left">Mensaje</th>
                <th className="p-2 border-b text-left">Usuario / Cliente</th>
                <th className="p-2 border-b text-left">Target / Rol</th>
              </tr>
            </thead>
            <tbody>
              {logs.length > 0 ? (
                logs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="p-2 border-b">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td
                      className={`p-2 border-b font-semibold ${
                        log.level === "error"
                          ? "text-red-600"
                          : log.level === "warning"
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`}
                    >
                      {log.level || "-"}
                    </td>
                    <td className="p-2 border-b">{log.message || "-"}</td>
                    <td className="p-2 border-b">
                      {log.performedBy?.username || log.email || "-"}
                    </td>
                    <td className="p-2 border-b">
                      {log.target?.username || log.target?.role || "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="p-2 text-center text-gray-500">
                    No se encontraron logs.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SystemLogs;
