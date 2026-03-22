const fs = require('fs');
const path = 'packages/frontend/src/pages/Agents.tsx';
let code = fs.readFileSync(path, 'utf8');

const importReplacement = `import { useApp } from '../context/WebSocketContext';
import { useState } from 'react';
import { LuffaSDK } from '../lib/luffa';
import { Interface } from 'ethers';
import { useEthPrice } from '../hooks/useEthPrice';
import { AgentLeaderboard } from '../components/AgentLeaderboard';`;

code = code.replace(/import \{ useApp \} from '\.\.\/context\/WebSocketContext';\r?\nimport \{ useState \} from 'react';\r?\nimport \{ LuffaSDK \} from '\.\.\/lib\/luffa';\r?\nimport \{ Interface \} from 'ethers';\r?\nimport \{ useEthPrice \} from '\.\.\/hooks\/useEthPrice';/, importReplacement);

const htmlReplacement = `      {regStatus && (
        <div className="bg-white/10 border border-white/20 text-white backdrop-b
lur-md px-5 py-3 rounded-xl text-sm animate-pulse shadow-xl">
          {regStatus}
        </div>
      )}

      <AgentLeaderboard />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">`;

code = code.replace(/\{regStatus && \([\s\S]*?\}\)\}\s*<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">/, htmlReplacement);

fs.writeFileSync(path, code);
console.log("Agents.tsx updated with AgentLeaderboard");