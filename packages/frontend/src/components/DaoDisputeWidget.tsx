import { useApp } from '../context/WebSocketContext';
import { useEffect, useState, useMemo } from 'react';

export const DaoDisputeWidget = () => {
    const { activity } = useApp();

    // Find the most recent dispute session
    const recentDispute = useMemo(() => {
        let dispute: any = { active: false, taskId: null, startMsg: null, votes: [], end: null };
        
        // iterate backwards to find the latest
        for (let i = activity.length - 1; i >= 0; i--) {
            const act = activity[i];
            // If we find an end event, and haven't started tracking one, that means the latest is already finished.
            // We can still show it temporarily.
            if (act.type === 'dao:dispute_end') {
                if (!dispute.end) dispute.end = act;
            }
            if (act.type === 'dao:vote') {
                if (!dispute.votes.includes(act)) dispute.votes.push(act);
            }
            if (act.type === 'dao:dispute_start') {
                dispute.active = true;
                dispute.taskId = act.taskId;
                dispute.startMsg = act;
                break; // found the latest start
            }
        }
        return dispute;
    }, [activity]);

    if (!recentDispute.active) return null;

    return (
        <div className="bg-zinc-950 border border-purple-500/20 rounded-2xl p-6 shadow-2xl relative overflow-hidden mb-6 animate-fade-in shadow-purple-900/10">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-500/50 via-pink-500/50 to-red-500/50 animate-pulse"></div>
            
            <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-purple-400 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping"></span>
                      DAO Dispute Tribunal Active
                  </h3>
                  <p className="text-white text-lg mt-1 font-light">Task {recentDispute.taskId}</p>
                </div>
                {recentDispute.startMsg?.originalReason && (
                   <div className="bg-red-500/10 text-red-400 border border-red-500/20 px-3 py-1.5 rounded-lg text-xs max-w-xs text-right">
                     Failed AI Router QA: <strong>{recentDispute.startMsg.originalReason}</strong>
                   </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                {[...Array(3)].map((_, i) => {
                    const vote = recentDispute.votes[i];
                    return (
                        <div key={i} className="bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col items-center justify-center text-center py-6 relative">
                            {vote ? (
                                <>
                                  <div className={`text-3xl mb-2 ${vote.vote === 'VALID' ? 'text-emerald-400' : 'text-red-400'}`}>
                                      {vote.vote === 'VALID' ? '✅' : '❌'}
                                  </div>
                                  <p className="text-white text-sm font-medium mb-1 line-clamp-1">{vote.judge}</p>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full border mb-3 ${vote.vote === 'VALID' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                      VOTED: {vote.vote}
                                  </span>
                                  <div className="text-zinc-500 text-[10px] italic h-8 line-clamp-2">"{vote.reason}"</div>
                                </>
                            ) : (
                                <>
                                  <div className="w-8 h-8 rounded-full border-t-2 border-r-2 border-purple-500 animate-spin mb-3"></div>
                                  <p className="text-zinc-400 text-xs font-medium">Awaiting Judge...</p>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            {recentDispute.end && (
                <div className="mt-6 p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-center animate-fade-in">
                   <h4 className="text-purple-300 font-bold tracking-widest uppercase text-sm mb-1">{recentDispute.end.result}</h4>
                   <p className="text-white text-xs">{recentDispute.end.message}</p>
                </div>
            )}
        </div>
    );
};