const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const target = `const DummyModeBanner = () => {
  const [isDummy, setIsDummy] = useState(localStorage.getItem('dummy_mode') === 'true');

  useEffect(() => {
    const handleStorage = () => setIsDummy(localStorage.getItem('dummy_mode') === 'true');`;

const replacer = `const DummyModeBanner = () => {
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
  }, [provider]);

  useEffect(() => {
    const handleStorage = () => {
      const mode = localStorage.getItem('dummy_mode') === 'true';
      if (provider && mode) {
        localStorage.removeItem('dummy_mode');
        setIsDummy(false);
      } else {
        setIsDummy(mode);
      }
    };`;

if(code.includes('const [isDummy, setIsDummy] = useState(localStorage.getItem(\'dummy_mode\') === \'true\');')) {
	code = code.replace(target, replacer);
	fs.writeFileSync('src/App.tsx', code);
	console.log("Patched App.tsx for DummyModeBanner!");
} else {
	console.log("Did not find DummyModeBanner target string.");
}
