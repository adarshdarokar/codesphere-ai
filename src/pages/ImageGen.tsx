import React, { useState } from 'react';
import { Image as ImageIcon, Loader2, Download, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ImageGen = () => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-image', {
        body: { prompt: prompt.trim() },
      });

      if (error) throw error;

      if (data.imageUrl) {
        setGeneratedImage(data.imageUrl);
        toast.success('Image generated successfully!');
      } else {
        throw new Error('No image data received');
      }
    } catch (error: any) {
      console.error('Error generating image:', error);
      toast.error(error.message || 'Failed to generate image');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImage) return;

    const link = document.createElement('a');
    link.href = generatedImage;
    link.download = `codesphere-ai-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Image downloaded!');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  return (
    <div className="flex flex-col h-full p-6 space-y-6 overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 bg-accent/10 rounded-2xl">
              <ImageIcon className="w-8 h-8 text-accent" />
            </div>
          </div>
          <h1 className="text-3xl font-bold gradient-text">AI Image Generator</h1>
          <p className="text-muted-foreground">
            Generate stunning images with AI. Powered by Lovable AI.
          </p>
        </div>

        {/* Input Section */}
        <Card className="p-6 glass">
          <div className="space-y-4">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the image you want to generate... (e.g., 'A futuristic cityscape at sunset with flying cars')"
              className="min-h-[120px] resize-none bg-background"
              disabled={loading}
            />
            <Button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Image
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Generated Image Display */}
        {generatedImage && (
          <Card className="p-6 glass animate-fade-in">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Generated Image</h3>
                <Button
                  onClick={handleDownload}
                  variant="outline"
                  size="sm"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
              <div className="relative rounded-xl overflow-hidden bg-muted">
                <img
                  src={generatedImage}
                  alt="Generated"
                  className="w-full h-auto"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                <strong>Prompt:</strong> {prompt}
              </p>
            </div>
          </Card>
        )}

        {/* Example Prompts */}
        {!generatedImage && (
          <Card className="p-6 glass">
            <h3 className="text-lg font-semibold mb-4">Example Prompts</h3>
            <div className="grid gap-3">
              {[
                'A futuristic cyberpunk city at night with neon lights',
                'A serene mountain landscape with aurora borealis',
                'A cute robot character in a cartoon style',
                'An abstract digital art piece with vibrant colors',
              ].map((example) => (
                <button
                  key={example}
                  onClick={() => setPrompt(example)}
                  className="text-left p-3 rounded-lg bg-background hover:bg-accent/10 transition-colors text-sm"
                  disabled={loading}
                >
                  {example}
                </button>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default ImageGen;
