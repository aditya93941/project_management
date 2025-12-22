
import React, { useEffect, useState } from 'react';

export default function PermissionDebugger({ userId, projectId, apiUrl }) {
    const [logs, setLogs] = useState([]);
    const [permissions, setPermissions] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const addLog = (msg, data) => {
        setLogs(prev => [...prev, { msg, data, time: new Date().toISOString() }]);
    };

    const runCheck = async () => {
        setLoading(true);
        setError(null);
        setLogs([]);
        
        try {
            const token = localStorage.getItem('auth_token');
            addLog('Token exists?', !!token);
            
            if (!token) {
                setError('No token');
                return;
            }

            addLog('Fetching from', `${apiUrl}/temporary-permissions/my`);
            const res = await fetch(`${apiUrl}/temporary-permissions/my`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            addLog('Response status', res.status);
            
            if (!res.ok) {
                throw new Error(res.statusText);
            }

            const json = await res.json();
            addLog('Raw JSON', json);
            
            const perms = json.data || json;
            setPermissions(perms);

            // Analysis
            const targetId = String(projectId).trim();
            addLog('Target Project ID', targetId);

            perms.forEach((p, i) => {
                const pIdObj = p.projectId;
                let extractedId = null;
                if (pIdObj) {
                    if (typeof pIdObj === 'object') {
                        extractedId = pIdObj._id || pIdObj.id || 'N/A';
                    } else {
                        extractedId = String(pIdObj);
                    }
                }
                
                const normalized = String(extractedId).trim();
                const match = normalized.toLowerCase() === targetId.toLowerCase();
                
                addLog(`Perm #${i}`, {
                    id: p._id,
                    projectIdRaw: pIdObj,
                    extractedId,
                    normalized,
                    match,
                    isActive: p.isActive,
                    expiresAt: p.expiresAt
                });
            });

        } catch (e) {
            setError(e.message);
            addLog('Error', e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed bottom-4 right-4 z-50 p-4 bg-black text-white border border-gray-700 rounded-lg shadow-xl w-96 max-h-[500px] overflow-auto text-xs font-mono opacity-90">
            <h3 className="font-bold flex justify-between">
                <span>Permission Debugger</span>
                <button onClick={runCheck} className="px-2 bg-red-600 rounded">Run</button>
            </h3>
            <div className="mt-2">
                <div>UserId: {userId}</div>
                <div>ProjId: {projectId}</div>
                <div>Status: {loading ? 'Loading...' : error ? 'Error' : 'Idx'}</div>
                {error && <div className="text-red-400">{error}</div>}
            </div>
            <div className="mt-2 space-y-1">
                {logs.map((l, i) => (
                    <div key={i} className="border-b border-gray-800 pb-1">
                        <div className="text-green-400">{l.msg}</div>
                        {l.data !== undefined && (
                            <pre className="whitespace-pre-wrap text-gray-400">
                                {typeof l.data === 'object' ? JSON.stringify(l.data, null, 2) : String(l.data)}
                            </pre>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
