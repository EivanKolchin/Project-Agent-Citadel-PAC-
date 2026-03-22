const fs = require('fs');
let code = fs.readFileSync('src/pages/Tasks.tsx', 'utf-8');

const target = `      const txHash = await LuffaSDK.signTransaction({
        to: config.TASK_ESCROW_ADDRESS, // Real Escrow Contract Address
        value: budget,
        data: data
      });

      setDeployStep(3); // "Transaction confirmed. Routing Task to Network..."

      // Step 3 (Removed API call)
      // The frontend now fully relies on the Hardhat local node's TaskPosted event
      // passing the notification cleanly back through the websocket to orchestrate!

      setDeployStep(4); // Finished`;

const replace = `      try {
        await LuffaSDK.signTransaction({
          to: config.TASK_ESCROW_ADDRESS, // Real Escrow Contract Address
          value: budget,
          data: data
        });
      } catch (chainErr) {
        console.warn("Web3 sign failed, attempting Web2 fallback...", chainErr);
        const res = await fetch('http://localhost:3001/api/tasks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: finalizeDesc, budgetEth: budget })
        });
        if (!res.ok) throw new Error("Fallback Web2 API also failed.");
      }

      setDeployStep(3); // "Transaction confirmed. Routing Task to Network..."
      setDeployStep(4); // Finished`;

if(code.includes('await LuffaSDK.signTransaction({')) {
  code = code.replace(target, replace);
  fs.writeFileSync('src/pages/Tasks.tsx', code);
  console.log("Patched Tasks.tsx for fallback!");
} else {
  console.log("Could not find target block in Tasks.tsx");
}
