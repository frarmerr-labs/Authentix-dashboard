'use client';

import { Component, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackLabel?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    console.error('[ErrorBoundary] Component crashed:', error);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-full w-full gap-3 p-6 text-center">
          <AlertCircle className="w-8 h-8 text-destructive/60" />
          <div>
            <p className="text-sm font-medium text-foreground">
              {this.props.fallbackLabel ?? 'Something went wrong'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {this.state.error?.message ?? 'An unexpected error occurred.'}
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={this.handleRetry}>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Retry
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
