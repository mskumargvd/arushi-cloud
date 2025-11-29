import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';

const SecurityScore = ({ agents }) => {
    // Calculate Score
    let score = 100;
    let issues = [];

    const totalAgents = agents.length;
    const offlineAgents = agents.filter(a => a.status === 'offline').length;
    const highLoadAgents = agents.filter(a => a.stats && a.stats.cpu > 90).length;

    if (totalAgents === 0) {
        score = 100; // Default if no agents
        issues.push("No agents connected");
    } else {
        if (offlineAgents > 0) {
            const penalty = offlineAgents * 20;
            score -= penalty;
            issues.push(`${offlineAgents} agent(s) offline (-${penalty})`);
        }
        if (highLoadAgents > 0) {
            const penalty = highLoadAgents * 10;
            score -= penalty;
            issues.push(`${highLoadAgents} agent(s) high load (-${penalty})`);
        }
    }

    // Clamp score
    score = Math.max(0, Math.min(100, score));

    // Determine Color & Icon
    let color = 'text-emerald-500';
    let bgColor = 'bg-emerald-500/10';
    let borderColor = 'border-emerald-500/20';
    let Icon = ShieldCheck;

    if (score < 80) {
        color = 'text-yellow-500';
        bgColor = 'bg-yellow-500/10';
        borderColor = 'border-yellow-500/20';
        Icon = ShieldAlert;
    }
    if (score < 50) {
        color = 'text-red-500';
        bgColor = 'bg-red-500/10';
        borderColor = 'border-red-500/20';
        Icon = ShieldX;
    }

    return (
        <div className={`rounded-xl border ${borderColor} ${bgColor} p-6 relative overflow-hidden`}>
            <div className="flex items-center justify-between relative z-10">
                <div>
                    <h3 className="text-lg font-bold text-white mb-1">Security Score</h3>
                    <p className="text-sm text-slate-400">Infrastructure Health Index</p>
                </div>
                <div className="flex items-center space-x-3">
                    <div className={`text-4xl font-black ${color}`}>
                        {score}
                    </div>
                    <Icon className={`w-8 h-8 ${color}`} />
                </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4 h-2 bg-slate-700/50 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full ${score < 50 ? 'bg-red-500' : score < 80 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                />
            </div>

            {/* Issues List */}
            {issues.length > 0 && score < 100 && (
                <div className="mt-4 space-y-1">
                    {issues.map((issue, i) => (
                        <div key={i} className="text-xs font-medium text-slate-400 flex items-center space-x-1">
                            <div className={`w-1.5 h-1.5 rounded-full ${color}`} />
                            <span>{issue}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Background Decoration */}
            <div className={`absolute -bottom-4 -right-4 w-24 h-24 rounded-full blur-2xl opacity-20 ${score < 50 ? 'bg-red-500' : score < 80 ? 'bg-yellow-500' : 'bg-emerald-500'}`} />
        </div>
    );
};

export default SecurityScore;
