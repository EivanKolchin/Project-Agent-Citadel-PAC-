const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const target1 = `const DummyModeBanner = () => {
  const { provider } = useWallet();
  const [isDummy, setIsDummy] = useState(() => {
    if (provider) return false;
    return localStorage.getItem('dummy_mode') === 'true';
  });

  useEffect(() => {
    if (provider) {
       localStorage.removeItem('dummy_mode');
       setIsDummy(false);
    }
  }, [provider]);`;

const replacer1 = `const DummyModeBanner = () => {
  const { provider } = useWallet();
  const { config } = useApp();
  
  const [isDummy, setIsDummy] = useState(() => {
    if (provider) return false;
    return localStorage.getItem('dummy_mode') === 'true';
  });

  useEffect(() => {
    if (provider || config?.rpcConnected) {
       localStorage.removeItem('dummy_mode');
       setIsDummy(false);
    }
  }, [provider, config?.rpcConnected]);`;

const target2 = `  useEffect(() => {
    const handleStorage = () => {
      const mode = localStorage.getItem('dummy_mode') === 'true';
      if (provider && mode) {
        localStorage.removeItem('dummy_mode');
        setIsDummy(false);
      } else {
        setIsDummy(mode);
      }
    };
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(handleStorage, 2000);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);`;

const replacer2 = `  useEffect(() => {
    const handleStorage = () => {
      const mode = localStorage.getItem('dummy_mode') === 'true';
      if ((provider || config?.rpcConnected) && mode) {
        localStorage.removeItem('dummy_mode');
        setIsDummy(false);
      } else {
        setIsDummy(mode);
      }
    };
    window.addEventListener('storage', handleStorage);
    const interval = setInterval(handleStorage, 2000);
    return () => {
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, [provider, config?.rpcConnected]);`;

if (code.includes('const { provider } = useWallet();')) {
  code = code.replace(target1, replacer1).replace(target2, replacer2);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Patched App.tsx with rpcConnected check");
} else {
  console.log("Could not find DummyModeBanner target string.");
}
