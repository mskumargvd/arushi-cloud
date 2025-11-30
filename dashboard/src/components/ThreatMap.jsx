import React, { useState, useEffect, useMemo } from 'react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from 'react-simple-maps';
import { Tooltip } from 'react-tooltip';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, AlertOctagon, Activity } from 'lucide-react';

const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const ThreatMap = ({ socket }) => {
    const [threats, setThreats] = useState([]);
    const [tooltipContent, setTooltipContent] = useState("");

    // Cache for IP -> Geo to avoid API rate limits
    const [geoCache, setGeoCache] = useState({});

    useEffect(() => {
        if (!socket) return;

        const handleThreatUpdate = async (data) => {
            // data = { src_ip, dest_ip, proto, signature, severity }
            console.log("Threat received:", data);

            let coords = [0, 0];
            
            // 1. Check Cache
            if (geoCache[data.src_ip]) {
                coords = geoCache[data.src_ip];
            } else {
                // 2. Fetch from Free API (Client-side)
                // Note: In production, do this on the server to hide API keys and cache better.
                try {
                    const res = await fetch(`http://ip-api.com/json/${data.src_ip}`);
                    const geo = await res.json();
                    if (geo.status === 'success') {
                        coords = [geo.lon, geo.lat];
                        setGeoCache(prev => ({ ...prev, [data.src_ip]: coords }));
                    }
                } catch (e) {
                    console.error("GeoIP Error:", e);
                }
            }

            const newThreat = {
                id: Date.now() + Math.random(),
                coordinates: coords,
                ...data
            };

            // Keep last 20 threats
            setThreats(prev => [...prev.slice(-19), newThreat]);
        };

        socket.on('threat_update', handleThreatUpdate);

        return () => {
            socket.off('threat_update', handleThreatUpdate);
        };
    }, [socket, geoCache]);

    return (
        <div className="bg-[#1e293b] rounded-xl border border-slate-700 p-6 h-[600px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                        <AlertOctagon className="w-5 h-5 text-red-500" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white">Live Threat Map</h3>
                        <p className="text-xs text-slate-500">Real-time Attack Visualization</p>
                    </div>
                </div>
                <div className="flex items-center space-x-2 text-xs text-slate-400">
                    <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
                    <span>Monitoring Active</span>
                </div>
            </div>

            <div className="flex-1 w-full h-full bg-slate-900/50 rounded-lg overflow-hidden relative">
                <ComposableMap projection="geoMercator" projectionConfig={{ scale: 100 }}>
                    <ZoomableGroup center={[0, 0]} zoom={1}>
                        <Geographies geography={geoUrl}>
                            {({ geographies }) =>
                                geographies.map((geo) => (
                                    <Geography
                                        key={geo.rsmKey}
                                        geography={geo}
                                        fill="#334155"
                                        stroke="#1e293b"
                                        strokeWidth={0.5}
                                        style={{
                                            default: { outline: "none" },
                                            hover: { fill: "#475569", outline: "none" },
                                            pressed: { fill: "#475569", outline: "none" },
                                        }}
                                    />
                                ))
                            }
                        </Geographies>

                        {threats.map((threat) => (
                            <Marker key={threat.id} coordinates={threat.coordinates}>
                                <circle
                                    r={4}
                                    fill="#ef4444"
                                    stroke="#fff"
                                    strokeWidth={1}
                                    data-tooltip-id="threat-tooltip"
                                    data-tooltip-content={`${threat.src_ip} - ${threat.signature}`}
                                    className="animate-ping opacity-75"
                                />
                                <circle
                                    r={2}
                                    fill="#ef4444"
                                />
                            </Marker>
                        ))}
                    </ZoomableGroup>
                </ComposableMap>
                <Tooltip id="threat-tooltip" />
                
                {/* Overlay List */}
                <div className="absolute bottom-4 left-4 w-64 bg-slate-800/90 backdrop-blur border border-slate-700 rounded-lg p-3 max-h-48 overflow-y-auto">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Recent Alerts</h4>
                    <div className="space-y-2">
                        <AnimatePresence>
                            {threats.slice().reverse().map(threat => (
                                <motion.div 
                                    key={threat.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0 }}
                                    className="text-xs text-slate-300 border-l-2 border-red-500 pl-2"
                                >
                                    <div className="font-bold text-red-400">{threat.src_ip}</div>
                                    <div className="truncate">{threat.signature}</div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ThreatMap;
