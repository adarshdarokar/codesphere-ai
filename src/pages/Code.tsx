import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Play, Code as CodeIcon, Download } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '@/contexts/ThemeContext';

const Code = () => {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const navigate = useNavigate();
  const { theme } = useTheme();

  const handleRunCode = () => {
    if (!code.trim()) return;

    // Store code and language in localStorage for output page
    localStorage.setItem('codeToRun', code);
    localStorage.setItem('codeLanguage', language);
    
    // Navigate to output page
    navigate('/code/output');
    toast.success('Running code...');
  };

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `code.${language === 'javascript' ? 'js' : language === 'html' ? 'html' : language === 'python' ? 'py' : 'txt'}`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('Code downloaded!');
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Top Bar - VS Code Style */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <CodeIcon className="w-5 h-5 text-primary" />
            <h1 className="text-sm font-semibold">Code Editor</h1>
          </div>
          <Select value={language} onValueChange={setLanguage}>
            <SelectTrigger className="w-[140px] h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="javascript">JavaScript</SelectItem>
              <SelectItem value="html">HTML</SelectItem>
              <SelectItem value="typescript">TypeScript</SelectItem>
              <SelectItem value="python">Python</SelectItem>
              <SelectItem value="java">Java</SelectItem>
              <SelectItem value="cpp">C++</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleDownload} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
          <Button onClick={handleRunCode} disabled={!code.trim()} size="sm">
            <Play className="w-4 h-4 mr-2" />
            Run Code
          </Button>
        </div>
      </div>

      {/* Editor Area - Full Screen */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center px-4 py-1 bg-muted/50 border-b">
          <span className="text-xs text-muted-foreground">main.{language === 'javascript' ? 'js' : language === 'html' ? 'html' : language === 'python' ? 'py' : 'txt'}</span>
        </div>
        <Textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder={`// Write your ${language} code here...`}
          className="flex-1 font-mono text-sm resize-none border-0 rounded-none focus-visible:ring-0 bg-background"
          style={{ lineHeight: '1.6' }}
        />
      </div>

      {/* Example Snippets */}
      <div className="border-t bg-muted/50 p-4">
        <div className="max-w-6xl mx-auto">
          <h3 className="text-sm font-semibold mb-3">Example Snippets</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                lang: 'javascript',
                code: 'console.log("Hello, World!");\nconsole.log("Current time:", new Date().toLocaleTimeString());',
                desc: 'Hello World',
              },
              {
                lang: 'html',
                code: '<!DOCTYPE html>\n<html>\n<body>\n  <h1 style="color: blue;">Hello World</h1>\n  <p>This is a live preview!</p>\n</body>\n</html>',
                desc: 'HTML Page',
              },
              {
                lang: 'javascript',
                code: 'function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}\nconsole.log("Fibonacci(10):", fibonacci(10));',
                desc: 'Fibonacci',
              },
            ].map((example, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setLanguage(example.lang);
                  setCode(example.code);
                }}
                className="text-left p-3 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium">{example.desc}</span>
                  <span className="text-xs text-muted-foreground">{example.lang}</span>
                </div>
                <pre className="text-xs text-muted-foreground overflow-hidden line-clamp-2">
                  {example.code}
                </pre>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Code;
