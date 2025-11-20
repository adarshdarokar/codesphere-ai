import React, { useState } from 'react';
import { Video as VideoIcon, Sparkles, Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const VideoGen = () => {
  const [prompt, setPrompt] = useState('');
  const [duration, setDuration] = useState('3');
  const [style, setStyle] = useState('realistic');
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState('');
  const [predictionId, setPredictionId] = useState('');

  const checkVideoStatus = async (id: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('check-video-status', {
        body: { predictionId: id },
      });

      if (error) throw error;

      if (data.status === 'succeeded' && data.output) {
        setVideoUrl(data.output);
        setLoading(false);
        toast.success('Video generated successfully!');
        return true;
      } else if (data.status === 'failed') {
        setLoading(false);
        toast.error('Video generation failed');
        return true;
      }
      return false;
    } catch (error: any) {
      console.error('Error checking status:', error);
      return false;
    }
  };

  const handleGenerate = async () => {
    if (!prompt.trim() || loading) return;

    setLoading(true);
    setVideoUrl('');
    setPredictionId('');

    try {
      const { data, error } = await supabase.functions.invoke('generate-video', {
        body: { prompt: prompt.trim(), duration: parseInt(duration), style },
      });

      if (error) {
        console.error('Edge function error:', error);
        throw new Error(error.message || 'Failed to start video generation');
      }

      if (data.predictionId) {
        setPredictionId(data.predictionId);
        toast.success('Video generation started!');

        // Poll for status
        const pollInterval = setInterval(async () => {
          const isDone = await checkVideoStatus(data.predictionId);
          if (isDone) {
            clearInterval(pollInterval);
          }
        }, 3000);

        // Stop polling after 5 minutes
        setTimeout(() => clearInterval(pollInterval), 300000);
      }
    } catch (error: any) {
      console.error('Error generating video:', error);
      const errorMessage = error.message || 'Failed to generate video';
      
      // Check if it's a billing/credit issue
      if (errorMessage.includes('402') || errorMessage.includes('Insufficient credit')) {
        toast.error('Replicate API: Insufficient credits. Please add credits to your Replicate account.');
      } else {
        toast.error(errorMessage);
      }
      
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!videoUrl) return;
    const link = document.createElement('a');
    link.href = videoUrl;
    link.download = `video-${Date.now()}.mp4`;
    link.click();
    toast.success('Video downloaded!');
  };

  return (
    <div className="flex flex-col h-full p-6 space-y-6 overflow-y-auto custom-scrollbar">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="p-3 bg-accent/10 rounded-2xl">
              <VideoIcon className="w-8 h-8 text-accent" />
            </div>
          </div>
          <h1 className="text-3xl font-bold gradient-text">AI Video Generator</h1>
          <p className="text-muted-foreground">
            Create AI-powered videos from text descriptions.
          </p>
        </div>

        {/* Input Section */}
        <Card className="p-6 glass">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Video Description</label>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the video you want to generate... (e.g., 'A time-lapse of a flower blooming in a garden')"
                className="min-h-[120px] resize-none bg-background"
                disabled={loading}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Duration</label>
                <select 
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full p-2 rounded-md bg-background border border-border"
                  disabled={loading}
                >
                  <option value="3">3 seconds</option>
                  <option value="5">5 seconds</option>
                  <option value="10">10 seconds</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Style</label>
                <select 
                  value={style}
                  onChange={(e) => setStyle(e.target.value)}
                  className="w-full p-2 rounded-md bg-background border border-border"
                  disabled={loading}
                >
                  <option value="realistic">Realistic</option>
                  <option value="artistic">Artistic</option>
                  <option value="animated">Animated</option>
                </select>
              </div>
            </div>

            <Button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="w-full"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating Video...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate Video
                </>
              )}
            </Button>
          </div>
        </Card>

        {/* Video Preview */}
        {(videoUrl || loading) && (
          <Card className="p-6 glass">
            <h3 className="text-lg font-semibold mb-4">Generated Video</h3>
            {loading ? (
              <div className="flex flex-col items-center justify-center min-h-[300px] space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-accent" />
                <p className="text-muted-foreground">Generating your video...</p>
                <p className="text-sm text-muted-foreground">This may take a few minutes</p>
              </div>
            ) : videoUrl ? (
              <div className="space-y-4">
                <video
                  src={videoUrl}
                  controls
                  className="w-full rounded-lg"
                  autoPlay
                  loop
                />
                <Button onClick={handleDownload} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Download Video
                </Button>
              </div>
            ) : null}
          </Card>
        )}

        {/* Example Prompts */}
        <Card className="p-6 glass">
          <h3 className="text-lg font-semibold mb-4">Example Video Prompts</h3>
          <div className="grid gap-3">
            {[
              'A drone flying through a futuristic city at sunset',
              'Ocean waves crashing on a beach in slow motion',
              'A rotating 3D model of a spacecraft',
              'Northern lights dancing over a snowy landscape',
              'Close-up of raindrops on a window',
            ].map((example) => (
              <button
                key={example}
                onClick={() => setPrompt(example)}
                disabled={loading}
                className="text-left p-3 rounded-lg bg-background hover:bg-accent/10 transition-colors text-sm"
              >
                {example}
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default VideoGen;
