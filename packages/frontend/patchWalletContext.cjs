const fs = require('fs');

let code = fs.readFileSync('src/context/WalletContext.tsx', 'utf-8');

const target = `setChainId(Number(network.chainId));`;
const replacer = `setChainId(Number(network.chainId));
        localStorage.removeItem('dummy_mode');
        window.dispatchEvent(new Event('storage'));`;

if (code.includes(target)) {
  code = code.replace(target, replacer);
  fs.writeFileSync('src/context/WalletContext.tsx', code);
  console.log("Patched WalletContext.tsx");
} else {
  console.log("Target not found");
}
