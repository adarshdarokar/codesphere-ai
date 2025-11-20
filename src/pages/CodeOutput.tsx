import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Maximize, Minimize } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CodeOutput = () => {
  const [output, setOutput] = useState('');
  const [htmlPreview, setHtmlPreview] = useState('');
  const [language, setLanguage] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const code = localStorage.getItem('codeToRun');
    const lang = localStorage.getItem('codeLanguage');
    
    if (!code || !lang) {
      navigate('/code');
      return;
    }

    setLanguage(lang);

    try {
      if (lang === 'javascript') {
        // Capture console output
        const logs: string[] = [];
        const originalLog = console.log;
        console.log = (...args) => {
          logs.push(args.map(arg => 
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
          ).join(' '));
        };

        try {
          eval(code);
          setOutput(logs.join('\n') || 'Code executed successfully (no output)');
        } finally {
          console.log = originalLog;
        }
      } else if (lang === 'html') {
        setHtmlPreview(code);
        setOutput('');
      } else {
        setOutput(`Note: Direct execution only supported for JavaScript and HTML.\nFor ${lang}, use an appropriate runtime environment.`);
      }
    } catch (error: any) {
      setOutput(`Error: ${error.message}`);
    }
  }, [navigate]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/50">
        <div className="flex items-center gap-3">
          <Button 
            onClick={() => navigate('/code')} 
            variant="ghost" 
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Editor
          </Button>
          <div className="h-4 w-px bg-border" />
          <span className="text-sm">
            {language === 'html' ? 'Live Preview' : 'Output'}
          </span>
        </div>
        <Button
          onClick={toggleFullscreen}
          variant="ghost"
          size="sm"
        >
          {isFullscreen ? (
            <>
              <Minimize className="w-4 h-4 mr-2" />
              Exit Fullscreen
            </>
          ) : (
            <>
              <Maximize className="w-4 h-4 mr-2" />
              Fullscreen
            </>
          )}
        </Button>
      </div>

      {/* Output Area */}
      <div className="flex-1 overflow-auto bg-background">
        {language === 'html' && htmlPreview ? (
          <iframe
            srcDoc={htmlPreview}
            className="w-full h-full border-0"
            title="HTML Preview"
            sandbox="allow-scripts"
          />
        ) : output ? (
          <pre className="p-4 text-sm font-mono whitespace-pre-wrap">
            {output}
          </pre>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <div className="text-center space-y-2">
              <ArrowLeft className="w-12 h-12 mx-auto opacity-50" />
              <p>No output to display</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeOutput;
